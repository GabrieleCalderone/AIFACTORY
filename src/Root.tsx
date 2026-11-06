import { Composition, Folder, Still } from "remotion";
import "./brand/fonts";
import pastaClass from "../content/posts/pasta-class-palermo.json";
import { CAROUSEL, CarouselSlide } from "./compositions/CarouselSlide";
import { REEL, Reel } from "./compositions/Reel";
import { reelDurationInFrames } from "./lib/timeline";
import { parsePostSpec, type PostSpecInput } from "./schemas/post";

/**
 * Two templates, driven entirely by a post spec (content/posts/<slug>.json).
 * The CLI (scripts/render.ts) passes the spec as inputProps; the Studio preview
 * uses the pasta-class post as its default so the templates are never empty.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="RistHome">
      <Composition
        id="Reel"
        component={Reel}
        durationInFrames={600}
        fps={REEL.fps}
        width={REEL.width}
        height={REEL.height}
        defaultProps={{ spec: pastaClass as PostSpecInput }}
        calculateMetadata={({ props }) => {
          const spec = parsePostSpec(props.spec);
          if (!spec.reel) {
            throw new Error(`post "${spec.slug}" has no reel section`);
          }
          return {
            durationInFrames: reelDurationInFrames(spec.reel, REEL.fps),
            defaultOutName: `${spec.slug}-reel`,
          };
        }}
      />
      <Still
        id="CarouselSlide"
        component={CarouselSlide}
        width={CAROUSEL.width}
        height={CAROUSEL.height}
        defaultProps={{ spec: pastaClass as PostSpecInput, slideIndex: 0 }}
      />
    </Folder>
  );
};
