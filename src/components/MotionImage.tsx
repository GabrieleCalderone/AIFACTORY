import { Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { ReelMotion } from "../schemas/post";

type Props = {
  readonly src: string;
  readonly motion: ReelMotion;
  readonly durationInFrames: number;
  /** CSS filter chain from the product look (editorial colour grade). */
  readonly grade?: string;
  /** Vignette strength 0-1 from the product look. */
  readonly vignette?: number;
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * A still photo with a camera move. The four Higgsfield-style presets are
 * re-created locally on a 2D plane: a dolly-in is a slow push that settles,
 * a crash zoom punches in within ~0.35s with a short motion blur, an arc tilts
 * the plane in perspective while pushing in. No external service involved.
 */
export const MotionImage: React.FC<Props> = ({ src, motion, durationInFrames, grade, vignette = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.33, 0, 0.67, 1),
  });

  let transform = "";
  let filter = "none";
  switch (motion) {
    case "zoom-in":
      transform = `scale(${interpolate(progress, [0, 1], [1.04, 1.18])})`;
      break;
    case "zoom-out":
      transform = `scale(${interpolate(progress, [0, 1], [1.18, 1.04])})`;
      break;
    case "pan-left":
      transform = `translateX(${interpolate(progress, [0, 1], [3, -3])}%) scale(1.14)`;
      break;
    case "pan-right":
      transform = `translateX(${interpolate(progress, [0, 1], [-3, 3])}%) scale(1.14)`;
      break;
    case "dolly-in": {
      const push = interpolate(frame, [0, durationInFrames], [0, 1], {
        ...clamp,
        easing: Easing.bezier(0.2, 0, 0.1, 1),
      });
      transform = `translateY(${interpolate(push, [0, 1], [0, -1.5])}%) scale(${interpolate(push, [0, 1], [1.0, 1.24])})`;
      break;
    }
    case "crash-zoom-in": {
      const crashFrames = Math.round(0.35 * fps);
      const crash = interpolate(frame, [0, crashFrames], [0, 1], {
        ...clamp,
        easing: Easing.out(Easing.cubic),
      });
      const drift = interpolate(frame, [crashFrames, durationInFrames], [0, 1], clamp);
      transform = `scale(${interpolate(crash, [0, 1], [1.0, 1.34]) + drift * 0.04})`;
      const blur = interpolate(frame, [0, crashFrames * 0.5, crashFrames], [0, 5, 0], clamp);
      filter = blur > 0.2 ? `blur(${blur}px)` : "none";
      break;
    }
    case "arc-left":
    case "arc-right": {
      const sign = motion === "arc-left" ? 1 : -1;
      const rotate = interpolate(progress, [0, 1], [-6 * sign, 6 * sign]);
      const shift = interpolate(progress, [0, 1], [2 * sign, -2 * sign]);
      transform = `perspective(1600px) rotateY(${rotate}deg) translateX(${shift}%) scale(${interpolate(progress, [0, 1], [1.16, 1.22])})`;
      break;
    }
    default:
      transform = "scale(1.1)";
  }

  const grading = [grade, filter !== "none" ? filter : ""].filter(Boolean).join(" ") || "none";
  return (
    <>
      <Img
        src={staticFile(src)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform,
          transformOrigin: "50% 50%",
          filter: grading,
          willChange: "transform",
        }}
      />
      {vignette > 0 ? (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,${vignette}) 100%)` }} />
      ) : null}
    </>
  );
};
