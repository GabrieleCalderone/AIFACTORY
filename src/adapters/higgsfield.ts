/**
 * Higgsfield API client (https://docs.higgsfield.ai): one integration point per model.
 *   POST   {base}/{model-path}            -> { status: "queued", request_id, status_url, cancel_url }
 *   GET    status_url                     -> { status: queued|in_progress|completed|failed|nsfw|canceled, ... outputs with urls }
 *   POST   cancel_url
 *   POST   {base}/estimate/{model-path}   -> { usd }
 * Auth header: `Authorization: Key <id>:<secret>`. Outputs stay available for about seven days,
 * so finished files are downloaded into public/assets/generated/ with provenance.
 *
 * Budget: data/genai-spend.json ledger; nothing is submitted when the month's spend plus the
 * estimate would exceed GENAI_MONTHLY_CAP_EUR (default 0 = nothing approved; ceiling 20).
 */
import { estimateUrl } from "./genai.ts";

export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  arrayBuffer?(): Promise<ArrayBuffer>;
}>;

export type Submission = {
  requestId: string;
  statusUrl: string;
  cancelUrl: string;
  status: string;
};
export type StatusResult = {
  status: string;
  done: boolean;
  outputs: string[];
  raw: unknown;
};

const MODEL_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Validate a model path such as "higgsfield-ai/soul/v2/standard" and return the submit URL. */
export const modelUrl = (baseUrl: string, model: string): string => {
  const segments = model.split("/");
  if (
    segments.length < 2 ||
    segments.some((s) => !MODEL_SEGMENT.test(s) || s === "." || s === "..")
  )
    throw new Error(`model id looks wrong: ${model}`);
  const url = new URL(
    `/${segments.map(encodeURIComponent).join("/")}`,
    baseUrl,
  );
  if (
    url.origin !== new URL(baseUrl).origin ||
    url.pathname.startsWith("/requests") ||
    url.pathname.startsWith("/estimate")
  )
    throw new Error(`refusing model path ${model}`);
  return url.href;
};

/** Only follow status/cancel links that stay on the API origin under /requests/. */
const assertRequestLink = (
  baseUrl: string,
  link: string,
  kind: string,
): string => {
  const url = new URL(link);
  if (
    url.origin !== new URL(baseUrl).origin ||
    !url.pathname.startsWith("/requests/")
  )
    throw new Error(`${kind} link outside the API: ${link}`);
  return url.href;
};

/** Output hosts we are willing to download from (https only). Override with HF_OUTPUT_HOSTS="cdn.example,other.example". */
export const defaultOutputHosts = ["higgsfield.ai"];
const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[::1\]|::1|172\.(1[6-9]|2\d|3[01])\.)/i;

export const isAllowedOutputUrl = (raw: string, allowedHosts: string[] = defaultOutputHosts): boolean => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  if (PRIVATE_HOST.test(host) || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  if (!/\.(?:png|jpe?g|webp|mp4|mov|webm|gif)$/i.test(url.pathname)) return false;
  return allowedHosts.some((h) => host === h.toLowerCase() || host.endsWith(`.${h.toLowerCase()}`));
};

/** Collect media URLs from a status payload, keeping only allowed https hosts; rejected ones are reported for the operator. */
export const extractOutputs = (payload: unknown, allowedHosts: string[] = defaultOutputHosts): string[] => {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") {
      if (/^https?:\/\//i.test(v) && isAllowedOutputUrl(v, allowedHosts)) out.push(v);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(payload);
  return [...new Set(out)];
};

export const rejectedOutputs = (payload: unknown, allowedHosts: string[] = defaultOutputHosts): string[] => {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") {
      if (/^https?:\/\/\S+\.(?:png|jpe?g|webp|mp4|mov|webm|gif)(?:\?\S*)?$/i.test(v) && !isAllowedOutputUrl(v, allowedHosts)) out.push(v);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(payload);
  return [...new Set(out)];
};

const TERMINAL = new Set([
  "completed",
  "failed",
  "nsfw",
  "canceled",
  "cancelled",
]);

export const createHiggsfieldClient = (opts: {
  keyId: string;
  keySecret: string;
  fetchImpl?: FetchLike;
  baseUrl?: string;
}) => {
  const baseUrl = opts.baseUrl ?? "https://api.higgsfield.ai";
  const fetchImpl = opts.fetchImpl ?? (fetch as unknown as FetchLike);
  if (!opts.keyId || !opts.keySecret)
    throw new Error("Higgsfield key id and secret are required");
  const headers = {
    Authorization: `Key ${opts.keyId}:${opts.keySecret}`,
    "Content-Type": "application/json",
  };
  const call = async (
    url: string,
    method: string,
    body?: unknown,
  ): Promise<unknown> => {
    const res = await fetchImpl(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok)
      throw new Error(
        `Higgsfield HTTP ${res.status} on ${new URL(url).pathname}`,
      );
    return res.json();
  };
  return {
    async estimateUsd(
      model: string,
      input: Record<string, unknown>,
    ): Promise<number> {
      const body = (await call(estimateUrl(baseUrl, model), "POST", input)) as {
        usd?: string | number;
      };
      const usd = Number(body.usd);
      if (!Number.isFinite(usd) || usd < 0)
        throw new Error("estimate response had no usable usd field");
      return usd;
    },
    async submit(
      model: string,
      input: Record<string, unknown>,
    ): Promise<Submission> {
      const body = (await call(modelUrl(baseUrl, model), "POST", input)) as {
        request_id?: string;
        status_url?: string;
        cancel_url?: string;
        status?: string;
      };
      if (!body.request_id || !body.status_url)
        throw new Error("submit response had no request_id/status_url");
      return {
        requestId: body.request_id,
        statusUrl: assertRequestLink(baseUrl, body.status_url, "status"),
        cancelUrl: body.cancel_url
          ? assertRequestLink(baseUrl, body.cancel_url, "cancel")
          : `${baseUrl}/requests/${encodeURIComponent(body.request_id)}/cancel`,
        status: body.status ?? "queued",
      };
    },
    async status(statusUrl: string): Promise<StatusResult> {
      const raw = (await call(
        assertRequestLink(baseUrl, statusUrl, "status"),
        "GET",
      )) as { status?: string };
      const status = String(raw.status ?? "unknown").toLowerCase();
      return {
        status,
        done: TERMINAL.has(status),
        outputs: status === "completed" ? extractOutputs(raw) : [],
        raw,
      };
    },
    async cancel(cancelUrl: string): Promise<void> {
      await call(assertRequestLink(baseUrl, cancelUrl, "cancel"), "POST");
    },
    /** Poll until a terminal state; `sleep` is injectable for tests. */
    async waitFor(
      statusUrl: string,
      o: {
        intervalMs?: number;
        timeoutMs?: number;
        sleep?: (ms: number) => Promise<void>;
      } = {},
    ): Promise<StatusResult> {
      const interval = o.intervalMs ?? 5000;
      const deadline = Date.now() + (o.timeoutMs ?? 10 * 60 * 1000);
      const sleep = o.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
      for (;;) {
        const s = await this.status(statusUrl);
        if (s.done) return s;
        if (Date.now() > deadline)
          throw new Error("timed out waiting for the generation");
        await sleep(interval);
      }
    },
  };
};

/** Spend ledger and monthly cap (EUR). USD is converted with a fixed conservative rate. */
export type SpendEntry = {
  at: string;
  model: string;
  usd: number;
  requestId?: string;
  slug?: string;
  note?: string;
};
export const USD_TO_EUR = 0.95;

export const monthSpendEur = (
  ledger: SpendEntry[],
  now = new Date(),
): number => {
  const ym = now.toISOString().slice(0, 7);
  return ledger
    .filter((e) => e.at.slice(0, 7) === ym)
    .reduce((s, e) => s + e.usd * USD_TO_EUR, 0);
};

export const canSpend = (
  ledger: SpendEntry[],
  estimateUsd: number,
  capEur: number,
  now = new Date(),
): { ok: boolean; reason: string; monthEur: number } => {
  const monthEur = monthSpendEur(ledger, now);
  const after = monthEur + estimateUsd * USD_TO_EUR;
  if (capEur <= 0)
    return {
      ok: false,
      reason: "no generative budget approved (GENAI_MONTHLY_CAP_EUR=0)",
      monthEur,
    };
  if (after > capEur)
    return {
      ok: false,
      reason: `would reach EUR ${after.toFixed(2)} this month, above the cap of EUR ${capEur}`,
      monthEur,
    };
  return {
    ok: true,
    reason: `EUR ${after.toFixed(2)} of ${capEur} after this request`,
    monthEur,
  };
};

/** Provenance record stored next to any generated file. */
export type Provenance = {
  kind: "generated";
  provider: "higgsfield";
  model: string;
  prompt: string;
  inputAssets: string[];
  requestId: string;
  usd: number;
  createdAt: string;
  license: string;
  synthetic: true;
};
