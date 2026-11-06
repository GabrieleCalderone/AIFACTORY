import type { CSSProperties, PropsWithChildren } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";

type Props = PropsWithChildren<{
  readonly delay?: number; // frames
  readonly duration?: number; // frames
  readonly rise?: number; // px
  readonly style?: CSSProperties;
}>;

/** Fade-and-rise entrance for text blocks. */
export const Reveal: React.FC<Props> = ({ delay = 0, duration = 14, rise = 28, style, children }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div style={{ opacity: t, transform: `translateY(${(1 - t) * rise}px)`, ...style }}>
      {children}
    </div>
  );
};
