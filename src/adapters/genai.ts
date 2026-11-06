/**
 * Generative-service adapters. Today only cost estimation is wired, because no spend is
 * approved (EUR 0). A `generate` method is deliberately absent: adding it is the
 * decision point documented in docs/higgsfield.md and docs/roadmap.md.
 */
export type EstimateRequest = { model: string; input: Record<string, unknown> };

export type GenAiAdapter = {
  readonly name: string;
  /** Ask the provider what one request would cost, in USD, without generating anything. */
  estimateUsd(req: EstimateRequest): Promise<number>;
};

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export const createHiggsfieldAdapter = (opts: { keyId: string; keySecret: string; fetchImpl?: FetchLike; baseUrl?: string }): GenAiAdapter => {
  const baseUrl = opts.baseUrl ?? "https://api.higgsfield.ai";
  const fetchImpl = opts.fetchImpl ?? (fetch as unknown as FetchLike);
  return {
    name: "higgsfield",
    async estimateUsd({ model, input }) {
      if (!/^[\w.-]+(\/[\w.-]+)+$/.test(model)) throw new Error(`model id looks wrong: ${model}`);
      const res = await fetchImpl(`${baseUrl}/estimate/${model}`, {
        method: "POST",
        headers: { Authorization: `Key ${opts.keyId}:${opts.keySecret}`, "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`estimate failed: HTTP ${res.status}`);
      const body = (await res.json()) as { usd?: string | number };
      const usd = Number(body.usd);
      if (!Number.isFinite(usd) || usd < 0) throw new Error(`estimate response had no usable "usd" field`);
      return usd;
    },
  };
};

/** Budget policy from the brief: nothing approved by default, hard cap EUR 20/month. */
export const budgetPolicy = (env: Record<string, string | undefined>) => {
  const cap = Number(env.GENAI_MONTHLY_CAP_EUR ?? "0");
  if (!Number.isFinite(cap) || cap < 0) throw new Error("GENAI_MONTHLY_CAP_EUR must be a non-negative number");
  if (cap > 20) throw new Error("GENAI_MONTHLY_CAP_EUR above the EUR 20/month ceiling set by the brief");
  return { approvedEur: cap, ceilingEur: 20, spendAllowed: cap > 0 };
};
