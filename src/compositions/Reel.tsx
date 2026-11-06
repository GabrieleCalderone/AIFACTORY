import { Audio } from "@remotion/media";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { useMemo } from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../brand/theme";
import { Brandmark } from "../components/Brandmark";
import { Chip } from "../components/Chip";
import { MotionImage } from "../components/MotionImage";
import { MotionVideo } from "../components/MotionVideo";
import { Reveal } from "../components/Reveal";
import { Scrim } from "../components/Scrim";
import { reelTimeline } from "../lib/timeline";
import { parsePostSpec, type PostSpec, type PostSpecInput, type Reel as ReelSpec } from "../schemas/post";

import { REEL } from "../lib/formats";

export { REEL };

export type ReelProps = { readonly spec: PostSpecInput };

const copy = {
  en: { eyebrow: "RistHome · Palermo" },
  it: { eyebrow: "RistHome · Palermo" },
} as const;

const textBlock = {
  position: "absolute",
  left: theme.reelSafe.left,
  right: theme.reelSafe.right,
  bottom: theme.reelSafe.bottom,
  display: "flex",
  flexDirection: "column",
  gap: 22,
} as const;

const shadow = "0 2px 24px rgba(0,0,0,0.55)";

type Media = { image?: string; video?: string; trimSec: number; motion: ReelSpec["hook"]["motion"] };

const SceneMedia: React.FC<{ media: Media; durationInFrames: number }> = ({ media, durationInFrames }) =>
  media.video ? (
    <MotionVideo src={media.video} trimSec={media.trimSec} />
  ) : (
    <MotionImage src={media.image ?? ""} motion={media.motion} durationInFrames={durationInFrames} />
  );

const HookScene: React.FC<{ reel: ReelSpec; lang: PostSpec["lang"]; durationInFrames: number }> = ({ reel, lang, durationInFrames }) => (
  <AbsoluteFill style={{ backgroundColor: theme.colors.ink }}>
    <SceneMedia media={reel.hook} durationInFrames={durationInFrames} />
    <Scrim />
    <Brandmark />
    <div style={textBlock}>
      <Reveal delay={4}>
        <Chip>{copy[lang].eyebrow}</Chip>
      </Reveal>
      <Reveal delay={8}>
        <div
          style={{
            fontFamily: theme.fonts.display,
            fontWeight: 800,
            fontSize: 92,
            lineHeight: 1.04,
            color: theme.colors.white,
            textShadow: shadow,
            textWrap: "balance",
          }}
        >
          {reel.hook.title}
        </div>
      </Reveal>
      {reel.hook.subtitle ? (
        <Reveal delay={16}>
          <div style={{ fontFamily: theme.fonts.body, fontWeight: 500, fontSize: 44, lineHeight: 1.25, color: theme.colors.cream, textShadow: shadow }}>
            {reel.hook.subtitle}
          </div>
        </Reveal>
      ) : null}
    </div>
  </AbsoluteFill>
);

const ContentScene: React.FC<{ scene: ReelSpec["scenes"][number]; durationInFrames: number }> = ({ scene, durationInFrames }) => (
  <AbsoluteFill style={{ backgroundColor: theme.colors.ink }}>
    <SceneMedia media={scene} durationInFrames={durationInFrames} />
    <Scrim bottom={0.72} />
    <Brandmark />
    <div style={textBlock}>
      {scene.label ? (
        <Reveal delay={2}>
          <Chip tone="light">{scene.label}</Chip>
        </Reveal>
      ) : null}
      {scene.text ? (
        <Reveal delay={5}>
          <div style={{ fontFamily: theme.fonts.body, fontWeight: 700, fontSize: 60, lineHeight: 1.15, color: theme.colors.white, textShadow: shadow, textWrap: "balance" }}>
            {scene.text}
          </div>
        </Reveal>
      ) : null}
    </div>
  </AbsoluteFill>
);

const CtaScene: React.FC<{ reel: ReelSpec }> = ({ reel }) => (
  <AbsoluteFill
    style={{
      backgroundColor: theme.colors.ink,
      backgroundImage: `radial-gradient(ellipse at 50% 38%, ${theme.colors.accentDeep} 0%, rgba(110,31,38,0) 58%)`,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <div
      style={{
        position: "absolute",
        left: theme.reelSafe.left,
        right: theme.reelSafe.left,
        top: 480,
        bottom: theme.reelSafe.bottom,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 36,
      }}
    >
      <Reveal delay={2}>
        <Img src={staticFile("brand/logo-white.png")} style={{ width: 640 }} />
      </Reveal>
      <Reveal delay={8}>
        <div style={{ fontFamily: theme.fonts.display, fontWeight: 800, fontSize: 84, lineHeight: 1.06, color: theme.colors.white, textWrap: "balance" }}>
          {reel.cta.title}
        </div>
      </Reveal>
      {reel.cta.line ? (
        <Reveal delay={14}>
          <div style={{ fontFamily: theme.fonts.body, fontWeight: 500, fontSize: 44, lineHeight: 1.3, color: theme.colors.cream }}>{reel.cta.line}</div>
        </Reveal>
      ) : null}
      <Reveal delay={20}>
        <Chip size={34}>{theme.site}</Chip>
      </Reveal>
    </div>
  </AbsoluteFill>
);

const ReelAudio: React.FC<{ audio: NonNullable<ReelSpec["audio"]> }> = ({ audio }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fadeFrames = Math.round(audio.fadeOutSec * fps);
  const volume = interpolate(frame, [durationInFrames - fadeFrames, durationInFrames], [audio.volume, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <Audio src={staticFile(audio.src)} volume={volume} />;
};

export const Reel: React.FC<ReelProps> = ({ spec: rawSpec }) => {
  const spec = useMemo(() => parsePostSpec(rawSpec), [rawSpec]);
  const { fps } = useVideoConfig();
  if (!spec.reel) {
    throw new Error(`post "${spec.slug}" has no reel section`);
  }
  const reel = spec.reel;
  const timeline = reelTimeline(reel, fps);
  const transition = timeline.transitionInFrames;

  const items: React.ReactNode[] = [];
  const pushTransition = (key: string) => {
    if (transition > 0) {
      items.push(<TransitionSeries.Transition key={key} presentation={fade()} timing={linearTiming({ durationInFrames: transition })} />);
    }
  };
  items.push(
    <TransitionSeries.Sequence key="hook" durationInFrames={timeline.sequences[0].durationInFrames}>
      <HookScene reel={reel} lang={spec.lang} durationInFrames={timeline.sequences[0].durationInFrames} />
    </TransitionSeries.Sequence>,
  );
  reel.scenes.forEach((scene, i) => {
    const seq = timeline.sequences[i + 1];
    pushTransition(`t-${i}`);
    items.push(
      <TransitionSeries.Sequence key={`scene-${i}`} durationInFrames={seq.durationInFrames}>
        <ContentScene scene={scene} durationInFrames={seq.durationInFrames} />
      </TransitionSeries.Sequence>,
    );
  });
  pushTransition("t-cta");
  items.push(
    <TransitionSeries.Sequence key="cta" durationInFrames={timeline.sequences[timeline.sequences.length - 1].durationInFrames}>
      <CtaScene reel={reel} />
    </TransitionSeries.Sequence>,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.ink }}>
      <TransitionSeries>{items}</TransitionSeries>
      {reel.audio ? <ReelAudio audio={reel.audio} /> : null}
    </AbsoluteFill>
  );
};
