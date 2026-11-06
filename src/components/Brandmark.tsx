import { Img, staticFile } from "remotion";

type Props = {
  readonly variant?: "white" | "dark";
  readonly width?: number;
  readonly top?: number;
  readonly left?: number;
};

/** Small logo pinned near the top-left corner, inside the platform safe area. */
export const Brandmark: React.FC<Props> = ({ variant = "white", width = 290, top = 150, left = 72 }) => (
  <Img
    src={staticFile(variant === "white" ? "brand/logo-white.png" : "brand/logo.png")}
    style={{ position: "absolute", top, left, width, opacity: 0.95 }}
  />
);
