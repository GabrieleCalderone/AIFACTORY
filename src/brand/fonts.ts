import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

/**
 * Local variable fonts shipped in public/fonts (OFL licensed).
 * Each file covers its full weight axis, so one declaration per style is enough.
 */
export const fontsReady: Promise<void> = Promise.all([
  loadFont({ family: "Playfair Display", url: staticFile("fonts/PlayfairDisplay.ttf"), weight: "400 900", style: "normal" }),
  loadFont({ family: "Playfair Display", url: staticFile("fonts/PlayfairDisplay-Italic.ttf"), weight: "400 900", style: "italic" }),
  loadFont({ family: "Inter", url: staticFile("fonts/Inter.ttf"), weight: "100 900", style: "normal" }),
]).then(() => undefined);
