import { useMemo } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { theme } from "../brand/theme";
import { lookForArchetype, type Look } from "../brand/looks";
import archetypes from "../../content/archetypes.json";
import { Scrim } from "../components/Scrim";
import { parsePostSpec, type CarouselSlide as SlideSpec, type PostSpec, type PostSpecInput } from "../schemas/post";

import { CAROUSEL, CAROUSEL_MAT } from "../lib/formats";

export { CAROUSEL };

export type CarouselSlideProps = { readonly spec: PostSpecInput; readonly slideIndex: number };

/**
 * One editorial system for every slide (docs/house-standard.md, "Carosello"):
 * a cream ground, the photograph whole inside the same mat, one serif for the words and one
 * small sans for the marks, neutrals only so the photograph carries the colour, hierarchy
 * from empty space rather than from size. Four type styles in all.
 */
const ground = theme.colors.cream;
const grey = "#8a827a";
const soft = "#3a3532";
const type = {
  title: { fontFamily: theme.fonts.display, fontWeight: 500, fontSize: 68, lineHeight: 1.1, color: theme.colors.ink, textWrap: "balance" },
  line: { fontFamily: theme.fonts.display, fontWeight: 500, fontSize: 46, lineHeight: 1.15, color: theme.colors.ink, textWrap: "balance" },
  body: { fontFamily: theme.fonts.display, fontWeight: 400, fontSize: 34, lineHeight: 1.42, color: soft },
  // caps on one line only, tracked 10%
  mark: { fontFamily: theme.fonts.body, fontWeight: 500, fontSize: 22, lineHeight: 1, letterSpacing: "0.1em", textTransform: "uppercase", color: grey },
} as const;

const copy = { en: { eyebrow: "RistHome · Palermo" }, it: { eyebrow: "RistHome · Palermo" } } as const;
const mat = CAROUSEL_MAT;
const textTop = (boxHeight: number) => mat.top + boxHeight + 44;

/** The foot of every cream slide: the wordmark, small and always in the same place, and the page. */
const Foot: React.FC<{ page?: string }> = ({ page }) => (
  <>
    <Img src={staticFile("brand/logo.png")} style={{ position: "absolute", left: mat.left, bottom: 150, width: 170 }} />
    {page ? <div style={{ position: "absolute", right: mat.left, bottom: 156, ...type.mark }}>{page}</div> : null}
  </>
);

const Matted: React.FC<{ image: string; look: Look; height: number }> = ({ image, look, height }) => (
  <div style={{ position: "absolute", left: mat.left, top: mat.top, width: mat.width, height }}>
    <Img src={staticFile(image)} style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "50% 100%", filter: look.grade }} />
  </div>
);

const Cover: React.FC<{ slide: Extract<SlideSpec, { type: "cover" }>; lang: PostSpec["lang"]; look: Look }> = ({ slide, lang, look }) => {
  const kicker = slide.kicker ?? look.eyebrow[lang] ?? copy[lang].eyebrow;
  if (slide.frame === "plate") {
    return (
      <AbsoluteFill style={{ backgroundColor: ground }}>
        <Matted image={slide.image} look={look} height={mat.coverHeight} />
        <div style={{ position: "absolute", left: mat.left, right: mat.left, top: textTop(mat.coverHeight), display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={type.mark}>{kicker}</div>
          <div style={type.title}>{slide.title}</div>
        </div>
        <Foot />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.ink }}>
      <Img src={staticFile(slide.image)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: look.grade }} />
      <Scrim bottom={0.8} />
      <div style={{ position: "absolute", left: mat.left, right: mat.left, bottom: 190, display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ ...type.mark, color: theme.colors.cream }}>{kicker}</div>
        <div style={{ ...type.title, fontSize: 76, color: theme.colors.white, textShadow: "0 2px 24px rgba(0,0,0,0.45)" }}>{slide.title}</div>
      </div>
      <Img src={staticFile("brand/logo-white.png")} style={{ position: "absolute", left: mat.left, top: 150, width: 200 }} />
    </AbsoluteFill>
  );
};

const Photo: React.FC<{ slide: Extract<SlideSpec, { type: "photo" }>; page: string; look: Look }> = ({ slide, page, look }) => (
  <AbsoluteFill style={{ backgroundColor: ground }}>
    <Matted image={slide.image} look={look} height={mat.height} />
    <div style={{ position: "absolute", left: mat.left, right: mat.left, top: textTop(mat.height), display: "flex", flexDirection: "column", gap: 12 }}>
      {slide.title ? <div style={type.line}>{slide.title}</div> : null}
      {slide.body ? <div style={type.body}>{slide.body}</div> : null}
    </div>
    <Foot page={page} />
  </AbsoluteFill>
);

const Text: React.FC<{ slide: Extract<SlideSpec, { type: "text" }>; page: string }> = ({ slide, page }) => (
  <AbsoluteFill style={{ backgroundColor: ground }}>
    <div style={{ position: "absolute", left: mat.left, right: mat.left + 60, top: mat.top, bottom: 260, display: "flex", flexDirection: "column", justifyContent: "center", gap: 36 }}>
      <div style={{ width: 64, height: 1, backgroundColor: theme.colors.ink }} />
      <div style={type.title}>{slide.title}</div>
      {slide.body ? <div style={type.body}>{slide.body}</div> : null}
    </div>
    <Foot page={page} />
  </AbsoluteFill>
);

/** The closing slide: the wordmark, one invitation, and a rule that ends the piece. Nothing else asks for anything. */
const Cta: React.FC<{ slide: Extract<SlideSpec, { type: "cta" }> }> = ({ slide }) => {
  // The invitation is said once: a body that only repeats "link in bio" is dropped.
  const repeats = slide.body ? slide.title.toLowerCase().includes(slide.body.trim().toLowerCase()) : true;
  return (
    <AbsoluteFill style={{ backgroundColor: ground }}>
      <div style={{ position: "absolute", left: mat.left, right: mat.left, top: mat.top, bottom: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 44 }}>
        <Img src={staticFile("brand/logo.png")} style={{ width: 380 }} />
        <div style={{ width: 64, height: 1, backgroundColor: theme.colors.ink }} />
        <div style={{ ...type.line, maxWidth: 760 }}>{slide.title}</div>
        {slide.body && !repeats ? <div style={type.body}>{slide.body}</div> : null}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 156, textAlign: "center", ...type.mark }}>{theme.site}</div>
    </AbsoluteFill>
  );
};

export const CarouselSlide: React.FC<CarouselSlideProps> = ({ spec: rawSpec, slideIndex }) => {
  const spec = useMemo(() => parsePostSpec(rawSpec), [rawSpec]);
  if (!spec.carousel) {
    throw new Error(`post "${spec.slug}" has no carousel section`);
  }
  const slides = spec.carousel.slides;
  const slide = slides[slideIndex];
  if (!slide) {
    throw new Error(`slide ${slideIndex} does not exist (post has ${slides.length} slides)`);
  }
  const page = `${slideIndex + 1} / ${slides.length}`;
  const look = lookForArchetype(spec.brief.archetype, archetypes.archetypes);
  switch (slide.type) {
    case "cover":
      return <Cover slide={slide} lang={spec.lang} look={look} />;
    case "photo":
      return <Photo slide={slide} page={page} look={look} />;
    case "text":
      return <Text slide={slide} page={page} />;
    case "cta":
      return <Cta slide={slide} />;
    default:
      return null;
  }
};
