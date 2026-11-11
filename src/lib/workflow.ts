/**
 * The workflow as the console shows it (pure): the steps a post goes through, the tool
 * behind each step and whether that tool is actually connected, and, for one post, what it
 * was made with. Nothing here is decorative: a status is "ok" only when the fact behind it
 * was measured by the caller.
 */
import type { PostSpec } from "../schemas/post.ts";
import { CONTEXT_PREFIX, isGenerated } from "./context.ts";

export type ToolStatus = "ok" | "missing" | "manual";
export type Tool = { name: string; status: ToolStatus; note: string };
export type Step = { n: number; title: string; what: string; tools: Tool[]; count?: string };

export type WorkflowFacts = {
  dishes: { chef: number; class: number };
  claudeCli: boolean;
  contextApproved: number;
  unsplashKey: boolean;
  generatedClips: number;
  higgsfieldApiKey: boolean;
  elevenLabsKey: boolean;
  soundBeds: number;
  stockTracks: number;
  standardVersion: string | null;
  ffmpeg: boolean;
  mediaHost: boolean;
  bufferKey: boolean;
  channels: string[];
  autopilotInstalled: boolean;
  weekdays: number[];
  langs: string[];
  autopublish: boolean;
  measured: number;
};

const DAYS = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const tool = (name: string, ok: boolean, yes: string, no: string): Tool => ({ name, status: ok ? "ok" : "missing", note: ok ? yes : no });

export const workflowSteps = (f: WorkflowFacts): Step[] => [
  {
    n: 1, title: "Archivio", what: "Le foto della casa vengono misurate, descritte, classificate a confronti e raggruppate per piatto.",
    tools: [{ name: "Analisi locale (Python)", status: "ok", note: "nitidezza, luce, doppioni" }, tool("Claude (visione)", f.claudeCli, "abbonamento, nessun costo extra", "comando claude non trovato")],
    count: `${f.dishes.chef} piatti chef · ${f.dishes.class} lezione`,
  },
  {
    n: 2, title: "Contesto", what: "Foto con licenza libera di Sicilia, mare e materia prima. Entrano solo dopo la tua approvazione.",
    tools: [{ name: "Wikimedia Commons", status: "ok", note: "senza chiave" }, tool("Unsplash", f.unsplashKey, "chiave presente", "chiave mancante: inseriscila in Collegamenti")],
    count: `${f.contextApproved} approvate`,
  },
  {
    n: 3, title: "Movimento", what: "Un modello anima una foto di contesto approvata (mai cibo, tavola, cucina o persone). Il post viene dichiarato come contenuto AI.",
    tools: [{ name: "Higgsfield (crediti abbonamento)", status: "manual", note: "si lancia da una sessione Claude" }, tool("Higgsfield API", f.higgsfieldApiKey, "chiavi presenti, a pagamento in USD: non usata", "chiavi assenti")],
    count: `${f.generatedClips} clip`,
  },
  {
    n: 4, title: "Suono", what: "Basi sonore della casa per i reel; senza, restano i brani con credito in didascalia.",
    tools: [tool("ElevenLabs", f.elevenLabsKey, "chiave presente", "chiave mancante: inseriscila in Collegamenti")],
    count: f.soundBeds ? `${f.soundBeds} basi` : `${f.stockTracks} brani con credito`,
  },
  {
    n: 5, title: "Scrittura", what: "Un modello sceglie le foto e scrive i testi dentro il disciplinare; un secondo passaggio confronta ogni testo con la sua foto.",
    tools: [tool("Claude (testi e revisione)", f.claudeCli, "abbonamento", "comando claude non trovato")],
    count: f.standardVersion ? `disciplinare ${f.standardVersion}` : "nessun disciplinare",
  },
  {
    n: 6, title: "Montaggio", what: "Il controllo automatico blocca ciò che viola le regole; poi si montano reel e carosello.",
    tools: [{ name: "Controllo qualità (locale)", status: "ok", note: "regole del disciplinare" }, { name: "Remotion", status: "ok", note: "reel 1080x1920, carosello 1080x1350" }, tool("ffmpeg", f.ffmpeg, "audio a -14 LUFS", "non trovato")],
  },
  {
    n: 7, title: "Approvazione", what: "Guardi il post qui e decidi. Niente esce senza il tuo sì.",
    // With automatic publishing on, this step is skipped: shown in orange, never as a green light.
    tools: [{ name: "Questa console", status: f.autopublish ? "manual" : "ok", note: f.autopublish ? "ATTENZIONE: pubblicazione automatica attiva, i post escono senza essere guardati" : "approvazione manuale" }],
  },
  {
    n: 8, title: "Pubblicazione", what: "I file vanno su un indirizzo pubblico e Buffer li programma sui canali.",
    tools: [tool("GitHub Pages (file)", f.mediaHost, "pronto", "non configurato"), tool("Buffer", f.bufferKey && f.channels.length > 0, f.channels.join(", "), f.bufferKey ? "nessun canale rilevato" : "chiave mancante")],
    count: `${f.weekdays.length ? f.weekdays.map((d) => DAYS[d] ?? "?").join(", ") : "a intervallo"} · ${f.langs.join(", ").toUpperCase()}`,
  },
  {
    n: 9, title: "Risultati", what: "Le metriche tornano da Buffer e si leggono per serie, dopo almeno cinque post misurati.",
    tools: [tool("Buffer (metriche)", f.bufferKey, "collegato", "chiave mancante"), tool("Agente delle 10:30", f.autopilotInstalled, "installato", "non installato")],
    count: `${f.measured} misurati`,
  },
];

/** What one post was made with, in plain words, from its spec. */
export const madeWith = (spec: PostSpec): string[] => {
  const reel = spec.reel ? [spec.reel.hook, ...spec.reel.scenes] : [];
  const media = [...reel.flatMap((m) => [m.image, m.video]), ...(spec.carousel?.slides ?? []).map((s) => ("image" in s ? s.image : undefined))].filter((m): m is string => Boolean(m));
  const unique = [...new Set(media)];
  const generated = unique.filter((m) => isGenerated(m)).length;
  const context = unique.filter((m) => m.startsWith(CONTEXT_PREFIX)).length;
  const own = unique.length - generated - context;
  const details = (spec.carousel?.slides ?? []).filter((s) => s.type === "photo" && s.detail).length;
  const audio = spec.reel?.audio;
  const out = [`${own} foto della casa`];
  if (context) out.push(`${context} foto di contesto con licenza`);
  if (generated) out.push(`${generated} clip animato da Higgsfield (dichiarato AI)`);
  if (details) out.push(`${details} dettaglio`);
  if (spec.reel) out.push(!audio ? "reel senza audio" : audio.src.includes("audio/beds/") ? "suono: ElevenLabs" : `musica: ${audio.attribution?.split(",")[0].replace(/"/g, "").trim() || "brano di archivio"}`);
  out.push("testi: Claude", "montaggio: Remotion");
  return out;
};
