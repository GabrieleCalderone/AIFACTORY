import { AbsoluteFill } from "remotion";

type Props = {
  readonly bottom?: number; // 0..1 strength at the bottom edge
  readonly top?: number;
};

/** Darkens the bottom (and lightly the top) of a photo so white text stays legible. */
export const Scrim: React.FC<Props> = ({ bottom = 0.82, top = 0.42 }) => (
  <AbsoluteFill
    style={{
      background: [
        `linear-gradient(to top, rgba(8,8,8,${bottom}) 0%, rgba(8,8,8,${bottom * 0.55}) 32%, rgba(8,8,8,0) 60%)`,
        `linear-gradient(to bottom, rgba(8,8,8,${top}) 0%, rgba(8,8,8,0) 24%)`,
      ].join(", "),
      pointerEvents: "none",
    }}
  />
);
