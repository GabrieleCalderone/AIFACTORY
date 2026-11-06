/** List Buffer organizations and channels so BUFFER_CHANNEL_ID can be set: node --env-file-if-exists=.env scripts/buffer-channels.ts */
import { createBufferClient } from "../src/adapters/buffer.ts";

const apiKey = process.env.BUFFER_API_KEY;
if (!apiKey) {
  console.error("set BUFFER_API_KEY in .env first");
  process.exit(2);
}
const buffer = createBufferClient({ apiKey });
const orgs = await buffer.organizations();
for (const org of orgs) {
  console.log(`organization ${org.id} ${org.name ?? ""}`);
  for (const ch of await buffer.channels(org.id)) console.log(`  channel ${ch.id} ${ch.service} ${ch.displayName ?? ch.name}${ch.isDisconnected ? " (disconnected)" : ""}`);
}
