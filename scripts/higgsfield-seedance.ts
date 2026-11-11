/**
 * Example of the official Higgsfield SDK (@higgsfield/client) with Seedance 2.5 text-to-video.
 * THIS MAKES A BILLABLE REQUEST on the Higgsfield API account.
 *
 *   node --env-file-if-exists=.env.local --env-file-if-exists=.env scripts/higgsfield-seedance.ts --yes
 *
 * Credentials stay in the environment: HF_CREDENTIALS ("key-id:key-secret") in .env.local, or
 * the HF_API_KEY_ID and HF_API_KEY_SECRET this project already keeps in .env. They are never
 * printed. Without --yes nothing is sent.
 */
import { config, higgsfield, HiggsfieldError } from "@higgsfield/client/v2";
import { credentialPair } from "../src/adapters/genai.ts";

const MODEL = "bytedance/seedance-2.5/text-to-video";
const input = { prompt: "A cinematic scene at sunset", duration: 5, resolution: "720p", aspect_ratio: "16:9" };

const pair = process.env.HF_API_KEY_ID && process.env.HF_API_KEY_SECRET ? credentialPair(process.env.HF_API_KEY_ID, process.env.HF_API_KEY_SECRET) : "";
const credentials = process.env.HF_CREDENTIALS?.trim() || pair;
if (!/^[^:\s]+:[^:\s]+$/.test(credentials)) {
  console.error("[higgsfield] no credentials: set HF_CREDENTIALS=key-id:key-secret in .env.local (enter it locally, never in chat)");
  process.exit(2);
}
if (!process.argv.includes("--yes")) {
  console.error(`[higgsfield] not sent: this would be a billable request to ${MODEL} (${input.duration} s, ${input.resolution}). Add --yes to send it.`);
  process.exit(2);
}
config({ credentials });

try {
  const result = await higgsfield.subscribe(MODEL, { input, withPolling: true });
  if (result.status === "completed" && result.video?.url) {
    console.log(`[higgsfield] completed: ${result.video.url}`);
  } else {
    // failed, nsfw (moderated), canceled, or completed without a file: none of these is a success
    console.error(`[higgsfield] no video: request ${result.request_id} ended as "${result.status}"${result.status === "nsfw" ? " (refused by moderation)" : ""}`);
    process.exit(1);
  }
} catch (e) {
  // SDK errors carry a message and a class name; the request and its headers are never printed
  const name = e instanceof HiggsfieldError ? e.constructor.name : "Error";
  console.error(`[higgsfield] request not completed: ${name}: ${e instanceof Error ? e.message.slice(0, 200) : "unknown error"}`);
  process.exit(1);
}
