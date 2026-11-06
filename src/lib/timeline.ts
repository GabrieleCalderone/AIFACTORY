import type { PostSpec, Reel } from "../schemas/post.ts";

/** Instagram Reels hard limit used as a guard rail (seconds). */
export const MAX_REEL_SECONDS = 90;

export const secondsToFrames = (seconds: number, fps: number): number => Math.round(seconds * fps);

export type ReelSequence = {
  readonly name: string;
  readonly durationInFrames: number;
};

export type ReelTimeline = {
  readonly sequences: ReadonlyArray<ReelSequence>;
  readonly transitionInFrames: number;
  readonly totalInFrames: number;
};

/**
 * Pure timeline math shared by the composition (calculateMetadata) and the CLI.
 * TransitionSeries overlaps adjacent scenes, so each cut removes one transition
 * from the total. A scene must be longer than the two transitions that can
 * touch it, otherwise Remotion throws at render time; fail early instead.
 */
export const reelTimeline = (reel: Reel, fps: number): ReelTimeline => {
  const transitionInFrames = secondsToFrames(reel.transitionSec, fps);
  const sequences: ReelSequence[] = [
    { name: "Hook", durationInFrames: secondsToFrames(reel.hook.durationSec, fps) },
    ...reel.scenes.map((scene, i) => ({
      name: `Scene ${i + 1}`,
      durationInFrames: secondsToFrames(scene.durationSec, fps),
    })),
    { name: "CTA", durationInFrames: secondsToFrames(reel.cta.durationSec, fps) },
  ];
  for (const seq of sequences) {
    if (seq.durationInFrames <= transitionInFrames * 2) {
      throw new Error(
        `${seq.name} lasts ${seq.durationInFrames} frames but must exceed two transitions (${transitionInFrames * 2} frames); shorten transitionSec or lengthen the scene`,
      );
    }
  }
  const cuts = sequences.length - 1;
  const totalInFrames = sequences.reduce((sum, s) => sum + s.durationInFrames, 0) - transitionInFrames * cuts;
  if (totalInFrames > MAX_REEL_SECONDS * fps) {
    throw new Error(`reel is ${totalInFrames / fps}s, above the ${MAX_REEL_SECONDS}s Instagram limit`);
  }
  return { sequences, transitionInFrames, totalInFrames };
};

export const reelDurationInFrames = (reel: Reel, fps: number): number => reelTimeline(reel, fps).totalInFrames;

/** Caption text ready to paste into Instagram: body, blank line, hashtags. */
export const buildCaption = (spec: Pick<PostSpec, "caption" | "hashtags">): string => {
  const body = spec.caption.trim();
  return spec.hashtags.length === 0 ? body : `${body}\n\n${spec.hashtags.join(" ")}`;
};
