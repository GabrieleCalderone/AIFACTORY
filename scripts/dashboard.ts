/**
 * Local control panel (no dependencies): status, previews, metrics, one-click actions.
 *
 *   npm run dashboard        -> http://127.0.0.1:4747 (binds to localhost only)
 *
 * Endpoints: GET /api/status, GET /api/jobs, POST /api/run {job, slug?}, POST /api/stop,
 * POST /api/env {key: value}, POST /api/buffer/detect, GET /out/<slug>/<file>.
 * Jobs are fixed commands (no shell), .env writes are limited to an allow-list of keys.
 */
import { spawn } from "node:child_process";
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
import { parseChannels } from "../src/lib/channels.ts";
import { readExperiments } from "../src/lib/data.ts";
import {
  advance,
  defaultState,
  isDue,
  nextSlot,
  planNext,
  type AutopilotState,
} from "../src/lib/autopilot.ts";

const PORT = Number(process.env.DASHBOARD_PORT ?? 4747);
const ROOT = process.cwd();
const ENV_KEYS = [
  "BUFFER_API_KEY",
  "BUFFER_CHANNELS",
  "MEDIA_REPO_DIR",
  "MEDIA_BASE_URL",
  "MEDIA_SUBDIR",
  "GENAI_MONTHLY_CAP_EUR",
] as const;
const JOBS: Record<string, string[]> = {
  "autopilot-dry": ["scripts/autopilot.ts", "--force", "--dry-run"],
  autopilot: ["scripts/autopilot.ts", "--force"],
  metrics: ["scripts/sync-metrics.ts"],
  report: ["scripts/report.ts"],
  validate: ["scripts/validate-data.ts"],
  "render-all": ["scripts/render.ts", "--all", "--qa"],
  "build-pool": ["scripts/build-pool.ts"],
  check: ["--run", "check"],
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

const readEnvFile = (): Record<string, string> => {
  if (!existsSync(".env")) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
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
  const isNpm = args[0] === "--run";
  const child = isNpm
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
        job.log.push(line);
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

const status = () => {
  const env = envNow();
  let channels: Record<string, string> = {};
  let channelsError = "";
  try {
    channels = parseChannels(env) as Record<string, string>;
  } catch (e) {
    channelsError = e instanceof Error ? e.message : String(e);
  }
  const statePath = "data/autopilot.json";
  const state: AutopilotState = existsSync(statePath)
    ? {
        ...defaultState,
        ...(JSON.parse(
          readFileSync(statePath, "utf8"),
        ) as Partial<AutopilotState>),
      }
    : defaultState;
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
  const posts = existsSync("out")
    ? readdirSync("out")
        .filter((d) => existsSync(path.join("out", d, "manifest.json")))
        .map((slug) => {
          const m = JSON.parse(
            readFileSync(path.join("out", slug, "manifest.json"), "utf8"),
          ) as {
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
          };
          const dir = path.join("out", slug);
          const caption = existsSync(path.join(dir, "caption.txt"))
            ? readFileSync(path.join(dir, "caption.txt"), "utf8")
            : "";
          const hosted = existsSync(path.join(dir, "hosted.json"))
            ? (JSON.parse(
                readFileSync(path.join(dir, "hosted.json"), "utf8"),
              ) as { dryRun?: boolean })
            : null;
          const published = existsSync(path.join(dir, "published.json"));
          return {
            slug,
            title: m.title,
            lang: m.lang,
            renderedAt: m.renderedAt,
            warnings: m.warnings,
            experiment: m.experiment,
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
            caption,
            hosted: hosted ? (hosted.dryRun ? "dry-run" : "public") : "no",
            published,
          };
        })
        .sort((a, b) => (a.renderedAt < b.renderedAt ? 1 : -1))
    : [];
  const publications = existsSync("data/publications.json")
    ? (JSON.parse(readFileSync("data/publications.json", "utf8")) as Record<
        string,
        unknown
      >[])
    : [];
  const poolManifest = "public/assets/pool/manifest.json";
  const pool = existsSync(poolManifest)
    ? (JSON.parse(readFileSync(poolManifest, "utf8")) as { people: string }[])
    : [];
  const logs = existsSync("logs")
    ? readdirSync("logs")
        .filter((f) => f.startsWith("autopilot-"))
        .sort()
        .slice(-1)
        .map((f) =>
          readFileSync(path.join("logs", f), "utf8").split("\n").slice(-30),
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
      pool: pool.length,
    },
    autopilot: {
      state,
      due: isDue(state, now),
      nextSlot: nextSlot(state, now).toISOString(),
      plan,
    },
    posts,
    experiments: exps.records,
    dataIssues: exps.issues,
    publications,
    recentLog: logs[0] ?? [],
    jobs: jobs.slice(0, 5).map((j) => ({ ...j, log: j.log.slice(-12) })),
  };
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
  ".png": "image/png",
  ".html": "text/html; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  try {
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(html);
    }
    if (req.method === "GET" && url.pathname === "/api/status")
      return json(res, 200, status());
    if (req.method === "GET" && url.pathname === "/api/jobs")
      return json(res, 200, jobs.slice(0, 10));
    if (req.method === "POST" && url.pathname === "/api/run") {
      const body = await readBody(req);
      const extra =
        body.slug && /^[a-z0-9-]+$/.test(body.slug)
          ? [path.join("content/posts", `${body.slug}.json`)]
          : [];
      const job = runJob(body.job, extra);
      return json(res, 200, { id: job.id });
    }
    if (req.method === "POST" && url.pathname === "/api/stop") {
      if (existsSync("STOP")) unlinkSync("STOP");
      else
        writeFileSync(
          "STOP",
          `paused from dashboard ${new Date().toISOString()}\n`,
        );
      return json(res, 200, { stop: existsSync("STOP") });
    }
    if (req.method === "POST" && url.pathname === "/api/env") {
      const body = await readBody(req);
      writeEnv(body);
      return json(res, 200, { ok: true });
    }
    if (req.method === "POST" && url.pathname === "/api/buffer/detect") {
      const env = envNow();
      if (!env.BUFFER_API_KEY)
        return json(res, 400, { error: "BUFFER_API_KEY mancante" });
      const buffer = createBufferClient({ apiKey: env.BUFFER_API_KEY });
      const orgs = await buffer.organizations();
      const found: {
        platform: string;
        id: string;
        name: string;
        org: string;
      }[] = [];
      for (const org of orgs) {
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
    if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/out/")) {
      const rel = decodeURIComponent(url.pathname.slice(1));
      const file = path.resolve(ROOT, rel);
      if (
        !file.startsWith(path.resolve(ROOT, "out") + path.sep) ||
        !existsSync(file) ||
        !statSync(file).isFile()
      )
        return json(res, 404, { error: "not found" });
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream",
        "Content-Length": statSync(file).size,
      });
      return createReadStream(file).pipe(res);
    }
    return json(res, 404, { error: "not found" });
  } catch (e) {
    return json(res, 500, {
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`RistHome console: http://127.0.0.1:${PORT}`);
  if (process.argv.includes("--open"))
    spawn("open", [`http://127.0.0.1:${PORT}`]);
});
void advance;
