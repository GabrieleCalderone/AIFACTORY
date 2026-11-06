/** Dotted-path assignment used by scripts/variant.ts: "reel.hook.title" or "carousel.slides.0.title". */
export const parseValue = (raw: string): string | number | boolean => {
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if (raw === "true") return true;
  if (raw === "false") return false;
  return raw;
};

export const applySet = (target: Record<string, unknown>, dotted: string, raw: string): void => {
  const keys = dotted.split(".");
  let node: unknown = target;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (node === null || typeof node !== "object") throw new Error(`cannot descend into ${keys.slice(0, i).join(".") || "root"}`);
    const container = node as Record<string, unknown> | unknown[];
    const next = Array.isArray(container) ? container[Number(k)] : container[k];
    if (next === undefined) throw new Error(`path ${keys.slice(0, i + 1).join(".")} does not exist`);
    node = next;
  }
  const last = keys[keys.length - 1];
  if (node === null || typeof node !== "object") throw new Error(`cannot set ${dotted}`);
  if (Array.isArray(node)) node[Number(last)] = parseValue(raw);
  else (node as Record<string, unknown>)[last] = parseValue(raw);
};
