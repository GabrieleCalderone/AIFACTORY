/**
 * RistHome Content Intelligence console (local, no dependencies).
 *
 *   npm run dashboard  -> prints http://127.0.0.1:4747/?t=<session token> and opens it
 *
 * Security: binds to 127.0.0.1; every request needs the per-launch token (header or ?t=);
 * Host/Origin must be local; POST bodies must be JSON; .env writes are limited to an allow-list;
 * jobs are fixed commands; static files are served only from out/ and public/assets/.
 * The UI shows backend facts only: pipeline states, Buffer ids, measured metrics.
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  createReadStream,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import http from "node:http";
import path from "node:path";
import { createBufferClient } from "../src/adapters/buffer.ts";
import { monthSpendEur, type SpendEntry } from "../src/adapters/higgsfield.ts";
import { captionFor, parseChannels, publicTitle } from "../src/lib/channels.ts";
import { buildCaption } from "../src/lib/timeline.ts";
import { readExperiments } from "../src/lib/data.ts";
import {
  defaultState,
  isDue,
  nextSlot,
  planNext,
  type AutopilotState,
} from "../src/lib/autopilot.ts";
import { loadPipeline, setState } from "../src/lib/pipeline-io.ts";
import { appendLabel, buildLabel, type Decision } from "../src/lib/labels.ts";
import { contextRows, generatedRows, loadStandard } from "../src/lib/gate-io.ts";
import { madeWith, workflowSteps } from "../src/lib/workflow.ts";
import { createTickets, proofOf, proofOk } from "../src/lib/console-auth.ts";
import { PostSpec } from "../src/schemas/post.ts";
import { recentLiveSlugs, summarize, type State } from "../src/lib/pipeline.ts";
import { isHeldBack, type AssetOverride } from "../src/lib/review.ts";
import { summarizeRegistry, type Registry } from "../src/lib/registry.ts";
import type { Override, Verdict } from "../src/lib/visual-score.ts";

const PORT = Number(process.env.DASHBOARD_PORT ?? 4747);
const ROOT = process.cwd();
/** Whether a program the workflow depends on can be started on this machine (checked once per launch). */
const found = new Map<string, boolean>();
const onPath = (program: "claude" | "ffmpeg"): boolean => {
  if (!found.has(program)) found.set(program, spawnSync("/usr/bin/which", [program], { encoding: "utf8" }).status === 0);
  return found.get(program)!;
};
/**
 * A new token at every launch by default. With --stable-token (the always-on agent) the token
 * is kept in .console-token, readable by this user only and never committed, so the bookmarked
 * link keeps working after a restart. Delete the file to change it.
 */
const TOKEN_FILE = ".console-token";
const TOKEN = ((): string => {
  if (!process.argv.includes("--stable-token")) return randomBytes(24).toString("hex");
  const kept = existsSync(TOKEN_FILE) ? readFileSync(TOKEN_FILE, "utf8").trim() : "";
  if (/^[a-f0-9]{48}$/.test(kept)) return kept;
  const fresh = randomBytes(24).toString("hex");
  writeFileSync(TOKEN_FILE, fresh + "\n", { mode: 0o600 });
  return fresh;
})();
const tickets = createTickets();
const tokenOk = (c: string | null | undefined) =>
  Boolean(
    c &&
    c.length === TOKEN.length &&
    timingSafeEqual(Buffer.from(c), Buffer.from(TOKEN)),
  );
const LOCAL_HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
const sameOrigin = (req: http.IncomingMessage): boolean => {
  if (!LOCAL_HOSTS.has(req.headers.host ?? "")) return false;
  const origin = req.headers.origin;
  if (origin && !LOCAL_HOSTS.has(origin.replace(/^https?:\/\//, "")))
    return false;
  const site = req.headers["sec-fetch-site"];
  return !site || site === "same-origin" || site === "none";
};

const ENV_KEYS = [
  "BUFFER_API_KEY",
  "BUFFER_CHANNELS",
  "MEDIA_REPO_DIR",
  "MEDIA_BASE_URL",
  "MEDIA_SUBDIR",
  "GENAI_MONTHLY_CAP_EUR",
  "HF_API_KEY_ID",
  "HF_API_KEY_SECRET",
  "AUTOPUBLISH",
  "UNSPLASH_ACCESS_KEY",
  "ELEVENLABS_API_KEY",
] as const;
const SECRET_KEYS = new Set([
  "BUFFER_API_KEY",
  "HF_API_KEY_ID",
  "HF_API_KEY_SECRET",
  "UNSPLASH_ACCESS_KEY",
  "ELEVENLABS_API_KEY",
]);
const JOBS: Record<string, string[]> = {
  "autopilot-dry": ["scripts/autopilot.ts", "--force", "--dry-run"],
  autopilot: ["scripts/autopilot.ts", "--force"],
  metrics: ["scripts/sync-metrics.ts"],
  report: ["scripts/report.ts"],
  validate: ["scripts/validate-data.ts"],
  "render-all": ["scripts/render.ts", "--all", "--qa"],
  "build-pool": ["scripts/build-pool.ts"],
  "score-assets": ["scripts/score-assets.ts"],
  "registry-sync": ["scripts/registry-sync.ts"],
  "publish-post": ["scripts/publish-post.ts"],
  "publish-draft": ["scripts/publish.ts"],
  render: ["scripts/render.ts"],
  "studio-estimate": ["scripts/genai-studio.ts"],
  "studio-run": ["scripts/genai-studio.ts"],
  check: ["--run", "check"],
  score: ["scripts/score-post.ts"],
  "context-approve": ["scripts/source-context.ts", "approve"],
  "context-reject": ["scripts/source-context.ts", "reject"],
  "beds-make": ["scripts/sound-beds.ts", "make"],
  "beds-use": ["scripts/sound-beds.ts", "use"],
};

type Job = {
  id: number;
  name: string;
  startedAt: string;
  endedAt?: string;
  code?: number;
  log: string[];
};
const jobs: Job[] = [];
let nextJobId = 1;
/** .env, then .env.local over it (where the ElevenLabs onboarding saves its key). Values never leave this process. */
const readEnvFile = (): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const file of [".env", ".env.local"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && m[2].trim()) out[m[1]] = m[2].trim().replace(/^(["'])(.*)\1$/, "$2");
      else if (m && !(m[1] in out)) out[m[1]] = "";
    }
  }
  return out;
};
const writeEnv = (updates: Record<string, string>) => {
  const lines = existsSync(".env")
    ? readFileSync(".env", "utf8").split("\n")
    : readFileSync(".env.example", "utf8").split("\n");
  for (const [k, v] of Object.entries(updates)) {
    if (!(ENV_KEYS as readonly string[]).includes(k))
      throw new Error(`key ${k} not allowed`);
    if (/[\r\n]/.test(v)) throw new Error("newline in value");
    const idx = lines.findIndex((l) => l.startsWith(`${k}=`));
    if (idx >= 0) lines[idx] = `${k}=${v}`;
    else lines.push(`${k}=${v}`);
  }
  writeFileSync(".env", lines.join("\n").replace(/\n*$/, "\n"));
};
const envNow = () => ({ ...process.env, ...readEnvFile() });
const redact = (line: string) =>
  line
    .replace(/(Key |Bearer )[A-Za-z0-9:_-]{8,}/g, "$1***")
    .replace(/([A-Z_]*(KEY|SECRET|TOKEN)[A-Z_]*=)[^\s]+/g, "$1***");

const runJob = (name: string, extra: string[] = []): Job => {
  const args = JOBS[name];
  if (!args) throw new Error(`unknown job ${name}`);
  const job: Job = {
    id: nextJobId++,
    name,
    startedAt: new Date().toISOString(),
    log: [],
  };
  jobs.unshift(job);
  const child =
    args[0] === "--run"
      ? spawn("npm", ["run", args[1]], { cwd: ROOT, env: envNow() })
      : spawn("node", ["--env-file-if-exists=.env", ...args, ...extra], {
          cwd: ROOT,
          env: envNow(),
        });
  const push = (chunk: Buffer) => {
    for (const line of chunk.toString().split("\n"))
      if (
        line.trim() &&
        !/MODULE_TYPELESS|Reparsing|eliminate this warning|trace-warnings/.test(
          line,
        )
      )
        job.log.push(redact(line));
    if (job.log.length > 400) job.log.splice(0, job.log.length - 400);
  };
  child.stdout.on("data", push);
  child.stderr.on("data", push);
  child.on("close", (code) => {
    job.code = code ?? -1;
    job.endedAt = new Date().toISOString();
  });
  return job;
};

const readJson = <T>(file: string, fallback: T): T =>
  existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback;

const status = () => {
  const env = envNow();
  let channels: Record<string, string> = {};
  let channelsError = "";
  try {
    channels = parseChannels(env) as Record<string, string>;
  } catch (e) {
    channelsError = e instanceof Error ? e.message : String(e);
  }
  const state: AutopilotState = {
    ...defaultState,
    ...readJson<Partial<AutopilotState>>("data/autopilot.json", {}),
  };
  const exps = readExperiments();
  const plan = planNext(
    state,
    exps.records.map((r) => ({
      experiment_id: r.experiment_id,
      variant_id: r.variant_id,
      archetype: r.archetype,
      status: r.status,
    })),
  );
  const now = new Date();
  const pipeline = loadPipeline();
  const publications = readJson<Record<string, unknown>[]>(
    "data/publications.json",
    [],
  );
  const scoreOf = (slug: string) => {
    const sc = pipeline[slug]?.evidence?.scorecard;
    const postFile = path.join("content/posts", `${slug}.json`);
    if (!sc || !existsSync(postFile)) return null;
    return { ...sc, current: createHash("sha256").update(readFileSync(postFile)).digest("hex") === sc.sha };
  };
  const audioTracks = readJson<{ src: string }[]>("content/audio.json", []);
  // What a post was made with, read from its own file; a file that no longer parses says nothing.
  const madeOf = (slug: string): string[] => {
    const parsed = PostSpec.safeParse(readJson<unknown>(path.join("content/posts", `${slug}.json`), null));
    return parsed.success ? madeWith(parsed.data) : [];
  };
  // The words as each channel will show them (same rules as scripts/publish.ts).
  const captionsOf = (slug: string): Record<string, string> => {
    const parsed = PostSpec.safeParse(readJson<unknown>(path.join("content/posts", `${slug}.json`), null));
    if (!parsed.success) return {};
    const spec = parsed.data;
    const full = buildCaption(spec);
    const hook = publicTitle(spec);
    return Object.fromEntries((["instagram", "tiktok", "facebook"] as const).map((pf) => [pf, captionFor(pf, full, spec.hashtags, hook)]));
  };
  const posts = existsSync("out")
    ? readdirSync("out")
        .filter((d) => existsSync(path.join("out", d, "manifest.json")))
        .map((slug) => {
          const m = readJson<{
            title: string;
            lang: string;
            renderedAt: string;
            warnings: string[];
            reel?: { durationSec: number };
            carousel?: { file: string }[];
            experiment: {
              id: string | null;
              variant: string | null;
              archetype: string;
            };
          }>(path.join("out", slug, "manifest.json"), {
            title: slug,
            lang: "it",
            renderedAt: "",
            warnings: [],
            experiment: { id: null, variant: null, archetype: "" },
          });
          const dir = path.join("out", slug);
          const hosted = readJson<{ dryRun?: boolean } | null>(
            path.join(dir, "hosted.json"),
            null,
          );
          const pubs = publications.filter((p) => p.slug === slug);
          return {
            slug,
            title: m.title,
            lang: m.lang,
            renderedAt: m.renderedAt,
            warnings: m.warnings,
            experiment: m.experiment,
            state: pipeline[slug]?.state ?? "UNTRACKED",
            history: pipeline[slug]?.history.slice(-3) ?? [],
            reel: existsSync(path.join(dir, "reel.mp4"))
              ? `/out/${slug}/reel.mp4`
              : null,
            cover: existsSync(path.join(dir, "reel-cover.jpg"))
              ? `/out/${slug}/reel-cover.jpg`
              : null,
            durationSec: m.reel?.durationSec ?? null,
            slides: (m.carousel ?? []).map(
              (s) => `/out/${slug}/${path.basename(s.file)}`,
            ),
            storyboard: existsSync(path.join(dir, "storyboard.html"))
              ? `/out/${slug}/storyboard.html`
              : null,
            caption: existsSync(path.join(dir, "caption.txt"))
              ? readFileSync(path.join(dir, "caption.txt"), "utf8")
              : "",
            made: madeOf(slug),
            // the editorial score, only while it is of the post as it is now
            score: scoreOf(slug),
            captions: captionsOf(slug),
            note: pipeline[slug]?.history.at(-1)?.note ?? "",
            hosted: hosted ? (hosted.dryRun ? "dry-run" : "public") : "no",
            publications: pubs,
          };
        })
        .sort((a, b) => (a.renderedAt < b.renderedAt ? 1 : -1))
    : [];
  const pool = readJson<
    {
      file: string;
      tier_best?: string;
      blocked?: boolean;
      scores?: Record<string, { Q: number; tier: string }>;
    }[]
  >("public/assets/pool/manifest.json", []);
  // The archive as the author sees it: fit photos that are not held back, different shots of one dish counted once.
  const heldBack = readJson<Record<string, AssetOverride>>("data/asset-overrides.json", {});
  const subjects = readJson<{ groups?: Record<string, string> }>("data/asset-subjects.json", {}).groups ?? {};
  const archive = (service: string) => {
    const fit = pool.filter((r) => ["usable", "premium"].includes(r.scores?.[`${service}:carousel`]?.tier ?? "") && !isHeldBack(heldBack[r.file]));
    return { photos: fit.length, dishes: new Set(fit.map((r) => subjects[r.file] ?? r.file)).size };
  };
  const ledger = readJson<SpendEntry[]>("data/genai-spend.json", []);
  const registry = readJson<Registry | null>("data/media-registry.json", null);
  const logs = existsSync("logs")
    ? readdirSync("logs")
        .filter((f) => f.startsWith("autopilot-"))
        .sort()
        .slice(-1)
        .map((f) =>
          readFileSync(path.join("logs", f), "utf8")
            .split("\n")
            .slice(-30)
            .map(redact),
        )
    : [];
  return {
    now: now.toISOString(),
    setup: {
      bufferKey: Boolean(env.BUFFER_API_KEY),
      channels,
      channelsError,
      mediaRepo: Boolean(
        env.MEDIA_REPO_DIR && existsSync(path.join(env.MEDIA_REPO_DIR, ".git")),
      ),
      mediaBase: env.MEDIA_BASE_URL ?? "",
      gitRemote:
        existsSync(".git/config") &&
        /\[remote "origin"\]/.test(readFileSync(".git/config", "utf8")),
      launchd: existsSync(
        path.join(
          homedir(),
          "Library/LaunchAgents/it.risthome.autopilot.plist",
        ),
      ),
      stop: existsSync("STOP"),
      autopublish: env.AUTOPUBLISH === "true",
      higgsfieldKey: Boolean(env.HF_API_KEY_ID && env.HF_API_KEY_SECRET),
      genaiCapEur: Number(env.GENAI_MONTHLY_CAP_EUR ?? 0),
      genaiSpentEur: Number(monthSpendEur(ledger, now).toFixed(2)),
      pool: pool.length,
      archive: { chef: archive("chef"), class: archive("class") },
      poolBlocked: pool.filter((r) => r.blocked).length,
      registry: registry ? summarizeRegistry(registry) : null,
    },
    autopilot: {
      state,
      due: isDue(state, now),
      nextSlot: nextSlot(state, now).toISOString(),
      plan,
    },
    workflow: workflowSteps({
      dishes: { chef: archive("chef").dishes, class: archive("class").dishes },
      claudeCli: onPath("claude"),
      contextApproved: contextRows().length,
      unsplashKey: Boolean(env.UNSPLASH_ACCESS_KEY?.trim()),
      generatedClips: generatedRows().length,
      higgsfieldApiKey: Boolean(env.HF_API_KEY_ID && env.HF_API_KEY_SECRET),
      elevenLabsKey: Boolean(env.ELEVENLABS_API_KEY?.trim()),
      soundBeds: audioTracks.filter((t) => t.src.includes("audio/beds/")).length,
      stockTracks: audioTracks.filter((t) => !t.src.includes("audio/beds/")).length,
      standardVersion: loadStandard()?.version ?? null,
      ffmpeg: onPath("ffmpeg"),
      mediaHost: Boolean(env.MEDIA_REPO_DIR && existsSync(path.join(env.MEDIA_REPO_DIR, ".git")) && env.MEDIA_BASE_URL),
      bufferKey: Boolean(env.BUFFER_API_KEY),
      channels: Object.keys(channels),
      autopilotInstalled: existsSync(path.join(homedir(), "Library/LaunchAgents/it.risthome.autopilot.plist")),
      weekdays: state.weekdays ?? [],
      langs: state.langs,
      autopublish: env.AUTOPUBLISH === "true",
      measured: exps.records.filter((e) => e.status === "measured").length,
    }),
    pipeline: summarize(pipeline),
    posts,
    experiments: exps.records,
    dataIssues: exps.issues,
    publications,
    recentLog: logs[0] ?? [],
    jobs: jobs.slice(0, 6).map((j) => ({ ...j, log: j.log.slice(-15) })),
  };
};

const mediaList = (service: string, format: string) => {
  const pool = readJson<
    {
      file: string;
      source: string;
      width: number;
      height: number;
      people: string;
      subject?: string;
      tags?: string[];
      scores?: Record<string, { Q: number; tier: string }>;
    }[]
  >("public/assets/pool/manifest.json", []);
  const scores = readJson<{
    verdicts: Record<string, Record<string, Verdict>>;
  }>("data/asset-scores.json", { verdicts: {} });
  const overrides = readJson<Record<string, Override>>(
    "data/asset-overrides.json",
    {},
  );
  const usage = readJson<Record<string, string[]>>("data/asset-usage.json", {});
  const key = `${service}:${format}`;
  // The current standard: place by comparison, one photo per dish, closer looks, resting after use.
  const board = readJson<Record<string, { order?: { file: string; rank: number }[] }>>("data/asset-rank.json", {})[`${service}:carousel`];
  const placeOf = new Map((board?.order ?? []).map((o) => [o.file, o.rank]));
  const groups = readJson<{ groups?: Record<string, string> }>("data/asset-subjects.json", {}).groups ?? {};
  const shots = new Map<string, number>();
  for (const g of Object.values(groups)) shots.set(g, (shots.get(g) ?? 0) + 1);
  const details = readJson<Record<string, { what?: string; dropped?: boolean } | null>>("data/asset-details.json", {});
  const resting = new Set(recentLiveSlugs(loadPipeline(), 8));
  const [W, H] = format === "reel" ? [1080, 1920] : [1080, 1350];
  return pool
    .map((r) => {
      const v = scores.verdicts[r.file]?.[key];
      const o = overrides[r.file] as (Override & { reviewerFlag?: string }) | undefined;
      const fit = Boolean(v && !v.blocked && v.tier !== "excluded");
      const status = v?.blocked ? "bloccata" : o?.exclude ? "esclusa" : o?.reviewerFlag ? "da rivedere" : !fit ? "fuori standard" : (usage[r.file] ?? []).some((sl) => resting.has(sl)) ? "a riposo" : "in uso";
      return {
        status,
        place: placeOf.get(r.file) ?? null,
        dish: groups[r.file] ?? null,
        shots: groups[r.file] ? (shots.get(groups[r.file]) ?? 1) : 1,
        detail: details[r.file] && !details[r.file]!.dropped ? (details[r.file]!.what ?? "") : null,
        // how the photo is shown: whole inside the mat or the plate when filling the frame would enlarge it too much
        plate: Math.max(W / r.width, H / r.height) > 1.5,
        file: r.file,
        url: `/pool/${r.file}`,
        source: path.basename(r.source ?? ""),
        width: r.width,
        height: r.height,
        people: r.people,
        subject: r.subject ?? "",
        tags: r.tags ?? [],
        Q: v?.Q ?? null,
        tier: v?.tier ?? "unscored",
        parts: v?.parts ?? null,
        reasons: v?.reasons ?? [],
        override: overrides[r.file] ?? null,
        used: usage[r.file] ?? [],
      };
    })
    .sort((a, b) => (a.place ?? 999) - (b.place ?? 999) || (b.Q ?? -1) - (a.Q ?? -1));
};

const json = (res: http.ServerResponse, code: number, body: unknown) => {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
};
const readBody = (req: http.IncomingMessage): Promise<Record<string, string>> =>
  new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 1e6) reject(new Error("body too large"));
    });
    req.on("end", () => {
      try {
        resolve(data ? (JSON.parse(data) as Record<string, string>) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
const html = readFileSync(path.join(ROOT, "scripts/dashboard.html"), "utf8");
const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".html": "text/html; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
};
const serveStatic = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  rel: string,
  rootDir: string,
) => {
  const file = path.resolve(ROOT, rel);
  const base = path.resolve(ROOT, rootDir) + path.sep;
  if (!file.startsWith(base) || !existsSync(file) || !statSync(file).isFile())
    return json(res, 404, { error: "not found" });
  res.writeHead(200, {
    "Content-Type":
      MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream",
    "Content-Length": statSync(file).size,
  });
  if (req.method === "HEAD") return res.end();
  return createReadStream(file).pipe(res);
};
const slugOk = (s: string | undefined) => Boolean(s && /^[a-z0-9-]+$/.test(s));
/** Each decision taken in the console is kept as a label the reviewers are later measured against. */
const recordLabel = (slug: string, decision: Decision, note?: string) => {
  try {
    const file = path.join(ROOT, "content/posts", `${slug}.json`);
    const parsed = existsSync(file) ? PostSpec.safeParse(JSON.parse(readFileSync(file, "utf8"))) : null;
    appendLabel(buildLabel({ slug, decision, note, source: "console", at: new Date(), standard: loadStandard()?.version, spec: parsed?.success ? parsed.data : null }));
  } catch (e) {
    console.error(`label not recorded for ${slug}: ${e instanceof Error ? e.message : e}`);
  }
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  try {
    if (!sameOrigin(req)) return json(res, 403, { error: "forbidden origin" });
    // The launcher (scripts/open-console.ts) never sends the token: it signs a challenge this console
    // chose, the console signs back, and the browser gets a ticket that works once for a few seconds.
    if (req.method === "GET" && url.pathname === "/api/challenge") return json(res, 200, { challenge: tickets.challenge() });
    if (req.method === "POST" && url.pathname === "/api/ticket") {
      if (!(req.headers["content-type"] ?? "").startsWith("application/json")) return json(res, 415, { error: "JSON only" });
      const body = (await readBody(req)) as Record<string, unknown>;
      const signed = `${String(body.challenge)}${String(body.nonce)}`;
      // The challenge is spent by this attempt, and nothing derived from the token is given to a caller that has not proved it knows the token.
      const ticket = tickets.issue(body.challenge);
      if (!ticket || !proofOk(TOKEN, "ticket", signed, body.at, body.proof)) {
        tickets.redeem(ticket);
        return json(res, 401, { error: "bad proof" });
      }
      const at = Date.now();
      return json(res, 200, { ticket, at, proof: proofOf(TOKEN, "server", signed, at) });
    }
    if (req.method === "GET" && url.pathname === "/" && tickets.redeem(url.searchParams.get("k"))) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(html.replace("__TOKEN__", TOKEN));
    }
    const token =
      req.headers["x-console-token"]?.toString() ?? url.searchParams.get("t");
    if (!tokenOk(token)) {
      res.writeHead(401, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(
        "<p>Sessione non valida o scaduta: apri la console con <code>npm run console</code> (o <code>npm run dashboard</code>).</p>",
      );
    }
    if (
      req.method === "POST" &&
      !(req.headers["content-type"] ?? "").startsWith("application/json")
    )
      return json(res, 415, { error: "JSON only" });
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(html.replace("__TOKEN__", TOKEN));
    }
    if (req.method === "GET" && url.pathname === "/api/health")
      return json(res, 200, {
        ok: true,
        time: new Date().toISOString(),
        jobsRunning: jobs.filter((j) => !j.endedAt).length,
      });
    if (req.method === "GET" && url.pathname === "/api/status")
      return json(res, 200, status());
    if (req.method === "GET" && url.pathname === "/api/jobs")
      return json(res, 200, jobs.slice(0, 10));
    if (req.method === "GET" && url.pathname === "/api/media")
      return json(
        res,
        200,
        mediaList(
          url.searchParams.get("service") ?? "class",
          url.searchParams.get("format") ?? "reel",
        ),
      );
    if (req.method === "GET" && url.pathname === "/api/pipeline")
      return json(res, 200, loadPipeline());
    if (req.method === "GET" && url.pathname === "/api/env") {
      const env = readEnvFile();
      return json(
        res,
        200,
        Object.fromEntries(
          ENV_KEYS.map((k) => [
            k,
            SECRET_KEYS.has(k) ? (env[k] ? "***set***" : "") : (env[k] ?? ""),
          ]),
        ),
      );
    }
    if (req.method === "POST" && url.pathname === "/api/run") {
      const body = await readBody(req);
      const extra: string[] = [];
      if (body.slug && slugOk(body.slug))
        extra.push(path.join("content/posts", `${body.slug}.json`));
      if (body.job === "publish-draft") extra.push("--draft");
      if (body.job === "render") extra.push("--qa");
      if (body.job === "studio-estimate" || body.job === "studio-run") {
        if (!body.prompt || !body.model)
          return json(res, 400, { error: "model and prompt required" });
        extra.push("--model", body.model, "--prompt", body.prompt);
        if (body.imageUrl) extra.push("--image-url", body.imageUrl);
        if (body.job === "studio-run") extra.push("--run");
      }
      return json(res, 200, { id: runJob(body.job, extra).id });
    }
    if (req.method === "POST" && url.pathname === "/api/stop") {
      if (existsSync("STOP")) unlinkSync("STOP");
      else
        writeFileSync(
          "STOP",
          `paused from console ${new Date().toISOString()}\n`,
        );
      return json(res, 200, { stop: existsSync("STOP") });
    }
    if (req.method === "POST" && url.pathname === "/api/env") {
      writeEnv(await readBody(req));
      return json(res, 200, { ok: true });
    }
    if (req.method === "POST" && url.pathname === "/api/approve") {
      const body = await readBody(req);
      if (!slugOk(body.slug)) return json(res, 400, { error: "bad slug" });
      // The approval covers the post exactly as it is now: its hash is kept, and publishing checks it.
      const postFile = path.join("content/posts", `${body.slug}.json`);
      if (!existsSync(postFile)) return json(res, 404, { error: "post file not found" });
      const approvedSha = createHash("sha256").update(readFileSync(postFile)).digest("hex");
      const rec = setState(body.slug, "APPROVED", "approved in the console", { approvedSha });
      recordLabel(body.slug, "approved");
      return json(res, 200, { state: rec.state });
    }
    if (req.method === "POST" && url.pathname === "/api/reject") {
      const body = await readBody(req);
      if (!slugOk(body.slug)) return json(res, 400, { error: "bad slug" });
      const rec = setState(
        body.slug,
        "REJECTED",
        (body.note ?? "rejected in the console").slice(0, 200),
      );
      recordLabel(body.slug, "rejected", typeof body.note === "string" ? body.note : undefined);
      return json(res, 200, { state: rec.state });
    }
    if (req.method === "POST" && url.pathname === "/api/override") {
      const body = await readBody(req);
      if (!body.file || !/^[\w.-]+\.(jpe?g|png|webp)$/i.test(body.file))
        return json(res, 400, { error: "bad file" });
      const overrides = readJson<Record<string, Override>>(
        "data/asset-overrides.json",
        {},
      );
      if (body.action === "clear") delete overrides[body.file];
      else if (body.action === "include" || body.action === "exclude")
        overrides[body.file] = {
          [body.action]: true,
          note: (body.note ?? "").slice(0, 120),
        };
      else
        return json(res, 400, {
          error: "action must be include|exclude|clear",
        });
      writeFileSync(
        "data/asset-overrides.json",
        JSON.stringify(overrides, null, 2) + "\n",
      );
      runJob("score-assets");
      return json(res, 200, { ok: true });
    }
    if (req.method === "POST" && url.pathname === "/api/buffer/verify") {
      const env = envNow();
      if (!env.BUFFER_API_KEY)
        return json(res, 400, { error: "BUFFER_API_KEY mancante" });
      const buffer = createBufferClient({ apiKey: env.BUFFER_API_KEY });
      return json(res, 200, await buffer.verifyAuth());
    }
    if (req.method === "POST" && url.pathname === "/api/buffer/detect") {
      const env = envNow();
      if (!env.BUFFER_API_KEY)
        return json(res, 400, { error: "BUFFER_API_KEY mancante" });
      const buffer = createBufferClient({ apiKey: env.BUFFER_API_KEY });
      const found: {
        platform: string;
        id: string;
        name: string;
        org: string;
      }[] = [];
      for (const org of await buffer.organizations()) {
        for (const ch of await buffer.channels(org.id)) {
          const service = ch.service.toLowerCase();
          const platform = service.includes("instagram")
            ? "instagram"
            : service.includes("tiktok")
              ? "tiktok"
              : service.includes("facebook")
                ? "facebook"
                : service.includes("youtube")
                  ? "youtube"
                  : "";
          if (platform && !ch.isDisconnected)
            found.push({
              platform,
              id: ch.id,
              name: ch.displayName ?? ch.name,
              org: org.name ?? org.id,
            });
        }
      }
      const map = new Map<string, string>();
      for (const f of found)
        if (!map.has(f.platform)) map.set(f.platform, f.id);
      const value = [...map].map(([p, id]) => `${p}:${id}`).join(",");
      if (value) writeEnv({ BUFFER_CHANNELS: value });
      return json(res, 200, { found, BUFFER_CHANNELS: value });
    }
    if (
      (req.method === "GET" || req.method === "HEAD") &&
      url.pathname.startsWith("/out/")
    )
      return serveStatic(
        req,
        res,
        decodeURIComponent(url.pathname.slice(1)),
        "out",
      );
    if (
      (req.method === "GET" || req.method === "HEAD") &&
      url.pathname.startsWith("/pool/")
    )
      return serveStatic(
        req,
        res,
        path.join(
          "public/assets/pool",
          decodeURIComponent(url.pathname.slice(6)),
        ),
        "public/assets/pool",
      );
    if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/context/"))
      return serveStatic(req, res, path.join("public/assets/context", decodeURIComponent(url.pathname.slice(9))), "public/assets/context");
    // Context pictures (licensed photographs of the place): what was found, and a person's yes or no.
    if (req.method === "GET" && url.pathname === "/api/context") {
      const registry = readJson<Record<string, { id: string; status: string; file?: string; width?: number; height?: number; credit: string | null; licence: string; library?: string; pageUrl: string; review?: { category?: string; subject?: string; reasons?: string[] } }>>("data/context-registry.json", {});
      const usage = readJson<Record<string, string[]>>("data/asset-usage.json", {});
      return json(
        res,
        200,
        Object.values(registry)
          .filter((e) => e.file && existsSync(path.join("public/assets/context", e.file)) && ["reviewed", "approved", "rejected"].includes(e.status))
          .map((e) => ({ id: e.id, status: e.status, url: `/context/${e.file}`, width: e.width, height: e.height, credit: e.credit ?? e.licence, library: e.library ?? "Wikimedia Commons", source: e.pageUrl, category: e.review?.category ?? "", subject: e.review?.subject ?? "", why: e.review?.reasons ?? [], used: usage[e.file!] ?? [] })),
      );
    }
    if (req.method === "POST" && url.pathname === "/api/context") {
      const body = await readBody(req);
      // ids go to a command line: only the two shapes the libraries produce
      if (!/^(u-[A-Za-z0-9_-]{5,20}|\d{1,12})$/.test(body.id ?? "") || !["approve", "reject"].includes(body.action)) return json(res, 400, { error: "bad id or action" });
      return json(res, 200, { id: runJob(`context-${body.action}`, [body.id]).id });
    }
    if (
      (req.method === "GET" || req.method === "HEAD") &&
      url.pathname.startsWith("/generated/")
    )
      return serveStatic(
        req,
        res,
        path.join(
          "public/assets/generated",
          decodeURIComponent(url.pathname.slice(11)),
        ),
        "public/assets/generated",
      );
    return json(res, 404, { error: "not found" });
  } catch (e) {
    return json(res, 500, {
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  const link = `http://127.0.0.1:${PORT}/?t=${TOKEN}`;
  console.log(`RistHome console: ${link}`);
  if (process.argv.includes("--open")) spawn("open", [link]);
});
void (0 as unknown as State);
