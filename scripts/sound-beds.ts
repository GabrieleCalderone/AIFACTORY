/**
 * The house's own sound for reels, made with ElevenLabs sound generation: quiet beds of a
 * real place (a kitchen at work, the sea, a table being laid) instead of stock music that
 * needs a credit line in the caption. No voices, no melody that could be mistaken for a song.
 *
 *   node --env-file-if-exists=.env scripts/sound-beds.ts list              the beds and which exist
 *   node --env-file-if-exists=.env scripts/sound-beds.ts make [name...]    generate the missing ones (or the named ones again)
 *   node --env-file-if-exists=.env scripts/sound-beds.ts use               content/audio.json lists the existing beds instead of the stock tracks
 *
 * Needs ELEVENLABS_API_KEY in .env. Each bed is one request of 22 seconds; files go to
 * public/audio/beds/ with a provenance record next to each (prompt, date, service).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const HOST = "api.elevenlabs.io";
const DIR = "public/audio/beds";
const SECONDS = 22;
const MAX_BYTES = 5 * 1024 * 1024;
const BEDS: { name: string; mood: string; prompt: string }[] = [
  { name: "kitchen-quiet", mood: "kitchen at work, calm", prompt: "Quiet professional kitchen ambience: a knife on a wooden board, a pan gently sizzling, a soft clink of a plate, calm and unhurried, close and warm, no voices, no music" },
  { name: "sea-terrace", mood: "sea, open air, calm", prompt: "Calm Mediterranean seaside terrace in the evening: small waves on rocks, a light breeze, distant cicadas, very soft and spacious, no voices, no music" },
  { name: "table-laid", mood: "table, glasses, warm", prompt: "A dinner table being laid in a quiet room: linen, cutlery placed softly, a glass set down, wine poured slowly, warm and intimate, no voices, no music" },
  { name: "pasta-board", mood: "hands at work, wood, flour", prompt: "Fresh pasta being made by hand on a wooden board: dough kneaded and rolled, flour dusted, a soft rhythmic scrape, close and tactile, quiet room, no voices, no music" },
];

const [command, ...names] = process.argv.slice(2);
const fileOf = (name: string) => path.join(DIR, `${name}.mp3`);

const make = async () => {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    console.error("[beds] ELEVENLABS_API_KEY is not set: put it in .env and run with node --env-file-if-exists=.env");
    process.exit(2);
  }
  mkdirSync(DIR, { recursive: true });
  const todo = BEDS.filter((b) => (names.length ? names.includes(b.name) : !existsSync(fileOf(b.name))));
  if (!todo.length) return console.log("[beds] nothing to make");
  for (const bed of todo) {
    const res = await fetch(`https://${HOST}/v1/sound-generation`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text: bed.prompt, duration_seconds: SECONDS, prompt_influence: 0.5 }),
      redirect: "error",
    });
    if (!res.ok) {
      // the body of an error may echo the request: only the status is printed
      console.error(`[beds] ${bed.name}: ElevenLabs HTTP ${res.status}; not made`);
      continue;
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length < 10_000 || bytes.length > MAX_BYTES) {
      console.error(`[beds] ${bed.name}: unexpected size ${bytes.length} bytes; not kept`);
      continue;
    }
    const raw = `${fileOf(bed.name)}.raw.mp3`;
    writeFileSync(raw, bytes);
    // A steady quiet level and a clean stereo MP3, whatever came back (the render brings the whole reel to -14 LUFS); a file ffmpeg cannot read is not kept.
    try {
      execFileSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-af", "loudnorm=I=-20:TP=-2:LRA=11", "-ar", "44100", "-ac", "2", "-b:a", "192k", `${fileOf(bed.name)}.tmp.mp3`]);
      renameSync(`${fileOf(bed.name)}.tmp.mp3`, fileOf(bed.name));
      writeFileSync(`${fileOf(bed.name)}.provenance.json`, JSON.stringify({ service: "ElevenLabs sound generation", prompt: bed.prompt, seconds: SECONDS, madeAt: new Date().toISOString(), operation: "generated" }, null, 2) + "\n");
      console.log(`[beds] ${bed.name}: made (${bytes.length} bytes)`);
    } catch {
      console.error(`[beds] ${bed.name}: the file returned is not readable audio; not kept`);
    } finally {
      execFileSync("rm", ["-f", raw, `${fileOf(bed.name)}.tmp.mp3`]);
    }
  }
};

const adopt = () => {
  const FILE = "content/audio.json";
  const tracks = JSON.parse(readFileSync(FILE, "utf8")) as { src: string; attribution: string; mood: string }[];
  const have = BEDS.filter((b) => existsSync(fileOf(b.name)));
  if (!have.length) return console.log("[beds] no bed exists yet: run make first");
  const beds = have.map((b) => ({ src: `audio/beds/${b.name}.mp3`, attribution: "", mood: b.mood }));
  // The house's own sound replaces the stock tracks: a reel never mixes the two.
  writeFileSync(FILE, JSON.stringify(beds, null, 2) + "\n");
  console.log(`[beds] ${FILE}: ${beds.length} bed(s) in use, ${tracks.filter((t) => !t.src.startsWith("audio/beds/")).length} stock track(s) set aside (still in public/audio)`);
};

if (command === "make") await make();
else if (command === "use") adopt();
else if (command === "list") for (const b of BEDS) console.log(`${existsSync(fileOf(b.name)) ? "made   " : "missing"} ${b.name} | ${b.mood}`);
else {
  console.error("usage: node --env-file-if-exists=.env scripts/sound-beds.ts list | make [name...] | use");
  process.exit(2);
}
