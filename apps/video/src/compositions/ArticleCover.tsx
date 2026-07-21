import {Sequence, useVideoConfig} from "remotion";
import {AnimatedFace} from "../components/AnimatedFace";
import {EditorialFrame} from "../components/EditorialFrame";
import {Reveal} from "../components/Reveal";
import {colors} from "../styles";

export type ArticleCoverProps = {
  category: string;
  date: string;
  title: string;
};

export function ArticleCover({category, date, title}: ArticleCoverProps) {
  const {fps} = useVideoConfig();

  return (
    <EditorialFrame label="Writing" marker={date}>
      <AnimatedFace right={-250} top={135} variant="tilted" width={780} />
      <Sequence premountFor={fps}>
        <Reveal
          delay={Math.round(0.25 * fps)}
          style={{left: 72, position: "absolute", top: 238, width: 700}}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "0.15em",
              marginBottom: 34,
              textTransform: "uppercase",
            }}
          >
            {category}
          </div>
          <h1
            style={{
              fontSize: 98,
              fontWeight: 650,
              letterSpacing: "-0.065em",
              lineHeight: 0.94,
              margin: 0,
              maxWidth: 690,
            }}
          >
            {title}
          </h1>
        </Reveal>
      </Sequence>
      <div
        style={{
          bottom: 64,
          color: colors.muted,
          fontSize: 19,
          left: 72,
          letterSpacing: "0.02em",
          position: "absolute",
        }}
      >
        Notes on design, systems, and making.
      </div>
    </EditorialFrame>
  );
}
