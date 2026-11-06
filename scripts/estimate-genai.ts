/**
 * Dry-run cost check for a generative request. Prints the provider's estimate when API keys
 * are configured (node --env-file=.env scripts/estimate-genai.ts ...), otherwise explains
 * that no key is set. Never generates anything.
 *
 *   node --env-file=.env scripts/estimate-genai.ts --model higgsfield-ai/soul/v2/standard --prompt "chef hands plating cannoli"
 */
import { parseArgs } from "node:util";
import { budgetPolicy, createHiggsfieldAdapter } from "../src/adapters/genai.ts";

const { values } = parseArgs({ options: { model: { type: "string", default: "higgsfield-ai/soul/v2/standard" }, prompt: { type: "string", default: "" } } });
const policy = budgetPolicy(process.env);
console.log(`budget: approved EUR ${policy.approvedEur}/month (ceiling EUR ${policy.ceilingEur}); spend allowed: ${policy.spendAllowed ? "yes" : "no"}`);
const keyId = process.env.HF_API_KEY_ID;
const keySecret = process.env.HF_API_KEY_SECRET;
if (!keyId || !keySecret) {
  console.log("no HF_API_KEY_ID/HF_API_KEY_SECRET in the environment: dry run, nothing was called. Copy .env.example to .env once a key is approved.");
  process.exit(0);
}
const adapter = createHiggsfieldAdapter({ keyId, keySecret });
adapter
  .estimateUsd({ model: values.model, input: { prompt: values.prompt } })
  .then((usd) => console.log(`${adapter.name} estimate for ${values.model}: USD ${usd.toFixed(3)} (no generation was requested)`))
  .catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
