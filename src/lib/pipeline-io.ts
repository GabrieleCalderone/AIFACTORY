import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  assertEvidence,
  transition,
  type Pipeline,
  type Record_,
  type State,
} from "./pipeline.ts";

export const PIPELINE_FILE = "data/pipeline.json";

export const loadPipeline = (file = PIPELINE_FILE): Pipeline =>
  existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Pipeline) : {};

export const savePipeline = (pipeline: Pipeline, file = PIPELINE_FILE): void =>
  writeFileSync(file, JSON.stringify(pipeline, null, 2) + "\n");

/** Move a post to a state, attach evidence, validate it and persist. Returns the record. */
export const setState = (
  slug: string,
  to: State,
  note?: string,
  evidence?: Record_["evidence"],
  file = PIPELINE_FILE,
): Record_ => {
  const pipeline = loadPipeline(file);
  if (!pipeline[slug] && to !== "DISCOVERED")
    transition(pipeline, slug, "DISCOVERED", "backfilled");
  const rec = transition(pipeline, slug, to, note);
  if (evidence) rec.evidence = { ...(rec.evidence ?? {}), ...evidence };
  assertEvidence(rec);
  savePipeline(pipeline, file);
  return rec;
};

export const stateOf = (slug: string, file = PIPELINE_FILE): State | null =>
  loadPipeline(file)[slug]?.state ?? null;

/** Attach evidence to a post without moving it to another state. */
export const addEvidence = (slug: string, evidence: NonNullable<Record_["evidence"]>, file = PIPELINE_FILE): Record_ => {
  const pipeline = loadPipeline(file);
  const rec = pipeline[slug];
  if (!rec) throw new Error(`${slug} is not in the pipeline`);
  rec.evidence = { ...(rec.evidence ?? {}), ...evidence };
  savePipeline(pipeline, file);
  return rec;
};
