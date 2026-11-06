import { useMemo } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { theme } from "../brand/theme";
import { lookForArchetype, type Look } from "../brand/looks";
import archetypes from "../../content/archetypes.json";
import { Chip } from "../components/Chip";
import { Scrim } from "../components/Scrim";
import { parsePostSpec, type CarouselSlide as SlideSpec, type PostSpec, type PostSpecInput } from "../schemas/post";

import { CAROUSEL, CAROUSEL_PHOTO_HEIGHT } from "../lib/formats";

export { CAROUSEL };

export type CarouselSlideProps = { readonly spec: PostSpecInput; readonly slideIndex: number };

const copy = {
  en: { swipe: "Swipe", eyebrow: "RistHome · Palermo" },
  it: { swipe: "Scorri", eyebrow: "RistHome · Palermo" },
} as const;

const pad = theme.carouselSafe;

const Cover: React.FC<{ slide: Extract<SlideSpec, { type: "cover" }>; lang: PostSpec["lang"]; look: Look }> = ({ slide, lang, look }) => (
  <AbsoluteFill style={{ backgroundColor: theme.colors.ink }}>
    <Img src={staticFile(slide.image)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: look.grade }} />
    <Scrim bottom={0.86} />
    <Img src={staticFile("brand/logo-white.png")} style={{ position: "absolute", top: pad.y, left: pad.x, width: 300 }} />
    <div style={{ position: "absolute", left: pad.x, right: pad.x, bottom: pad.y + 40, display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <Chip tone={look.chipTone}>{slide.kicker ?? look.eyebrow[lang] ?? copy[lang].eyebrow}</Chip>
      </div>
      <div style={{ fontFamily: theme.fonts.display, fontWeight: 800, fontSize: 88, lineHeight: 1.04, color: theme.colors.white, textShadow: "0 2px 24px rgba(0,0,0,0.5)", textWrap: "balance" }}>
        {slide.title}
      </div>
    </div>
    <div style={{ position: "absolute", right: pad.x, bottom: pad.y - 30, fontFamily: theme.fonts.body, fontWeight: 600, fontSize: 30, color: theme.colors.cream, letterSpacing: "0.08em" }}>
      {copy[lang].swipe} →
    </div>
  </AbsoluteFill>
);

const Photo: React.FC<{ slide: Extract<SlideSpec, { type: "photo" }>; page: string; look: Look }> = ({ slide, page, look }) => {
  const hasText = Boolean(slide.title || slide.body);
  const imageHeight = hasText ? CAROUSEL_PHOTO_HEIGHT : CAROUSEL.height;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.cream }}>
      <Img src={staticFile(slide.image)} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: imageHeight, objectFit: "cover", filter: look.grade }} />
      {hasText ? (
        <div style={{ position: "absolute", top: imageHeight, left: 0, right: 0, bottom: 0, padding: `56px ${pad.x}px ${pad.y}px`, display: "flex", flexDirection: "column", gap: 18 }}>
          {slide.title ? (
            <div style={{ fontFamily: theme.fonts.display, fontWeight: 700, fontSize: 64, lineHeight: 1.08, color: theme.colors.ink, textWrap: "balance" }}>{slide.title}</div>
          ) : null}
          {slide.body ? (
            <div style={{ fontFamily: theme.fonts.body, fontWeight: 400, fontSize: 38, lineHeight: 1.35, color: "#3a3532" }}>{slide.body}</div>
          ) : null}
        </div>
      ) : null}
      <div style={{ position: "absolute", right: pad.x, bottom: pad.y - 40, fontFamily: theme.fonts.body, fontWeight: 600, fontSize: 28, color: hasText ? theme.colors.accent : theme.colors.white, letterSpacing: "0.1em" }}>
        {page}
      </div>
    </AbsoluteFill>
  );
};

const Text: React.FC<{ slide: Extract<SlideSpec, { type: "text" }>; page: string }> = ({ slide, page }) => (
  <AbsoluteFill style={{ backgroundColor: theme.colors.cream, padding: `${pad.y + 60}px ${pad.x}px ${pad.y}px`, justifyContent: "center" }}>
    <div style={{ width: 120, height: 10, backgroundColor: theme.colors.accent, marginBottom: 44 }} />
    <div style={{ fontFamily: theme.fonts.display, fontWeight: 800, fontSize: 84, lineHeight: 1.06, color: theme.colors.ink, textWrap: "balance" }}>{slide.title}</div>
    {slide.body ? (
      <div style={{ marginTop: 40, fontFamily: theme.fonts.body, fontWeight: 400, fontSize: 42, lineHeight: 1.4, color: "#3a3532" }}>{slide.body}</div>
    ) : null}
    <Img src={staticFile("brand/logo.png")} style={{ position: "absolute", left: pad.x, bottom: pad.y, width: 280 }} />
    <div style={{ position: "absolute", right: pad.x, bottom: pad.y - 40, fontFamily: theme.fonts.body, fontWeight: 600, fontSize: 28, color: theme.colors.accent, letterSpacing: "0.1em" }}>{page}</div>
  </AbsoluteFill>
);

const Cta: React.FC<{ slide: Extract<SlideSpec, { type: "cta" }> }> = ({ slide }) => (
  <AbsoluteFill style={{ backgroundColor: theme.colors.ink, justifyContent: "center", alignItems: "center" }}>
    {slide.image ? (
      <>
        <Img src={staticFile(slide.image)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.35 }} />
        <Scrim bottom={0.6} top={0.6} />
      </>
    ) : (
      <AbsoluteFill style={{ backgroundImage: `radial-gradient(ellipse at 50% 40%, ${theme.colors.accentDeep} 0%, rgba(110,31,38,0) 60%)` }} />
    )}
    <div style={{ position: "absolute", left: pad.x, right: pad.x, top: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 36 }}>
      <Img src={staticFile("brand/logo-white.png")} style={{ width: 620 }} />
      <div style={{ fontFamily: theme.fonts.display, fontWeight: 800, fontSize: 80, lineHeight: 1.06, color: theme.colors.white, textWrap: "balance" }}>{slide.title}</div>
      {slide.body ? <div style={{ fontFamily: theme.fonts.body, fontWeight: 500, fontSize: 42, lineHeight: 1.3, color: theme.colors.cream }}>{slide.body}</div> : null}
      <Chip size={34}>{theme.site}</Chip>
    </div>
  </AbsoluteFill>
);

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
  const page = `${slideIndex + 1}/${slides.length}`;
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
