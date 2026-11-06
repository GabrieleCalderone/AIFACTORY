import type { PropsWithChildren } from "react";
import { theme } from "../brand/theme";

type Props = PropsWithChildren<{ readonly tone?: "accent" | "light"; readonly size?: number }>;

/** Small uppercase label with the brand red (or a light glass) background. */
export const Chip: React.FC<Props> = ({ tone = "accent", size = 30, children }) => (
  <span
    style={{
      display: "inline-block",
      fontFamily: theme.fonts.body,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      lineHeight: 1,
      padding: `${size * 0.45}px ${size * 0.7}px`,
      borderRadius: 999,
      color: tone === "accent" ? theme.colors.white : theme.colors.ink,
      backgroundColor: tone === "accent" ? theme.colors.accent : "rgba(255,255,255,0.88)",
    }}
  >
    {children}
  </span>
);
