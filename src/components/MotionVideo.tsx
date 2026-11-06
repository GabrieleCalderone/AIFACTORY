import { Video } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";

type Props = { readonly src: string; readonly trimSec: number };

/** A real clip filling the frame: looped so it never runs out, muted so music can be added at posting time. */
export const MotionVideo: React.FC<Props> = ({ src, trimSec }) => {
  const { fps } = useVideoConfig();
  return (
    <Video
      src={staticFile(src)}
      trimBefore={Math.round(trimSec * fps)}
      loop
      muted
      objectFit="cover"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
};
