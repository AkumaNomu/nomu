import {Sequence, useVideoConfig} from "remotion";
import {AnimatedFace} from "../components/AnimatedFace";
import {EditorialFrame} from "../components/EditorialFrame";
import {Reveal} from "../components/Reveal";
import {colors} from "../styles";

const lines = ["I build, learn,", "test, and", "break things."];

export function SiteIntro() {
  const {fps} = useVideoConfig();

  return (
    <EditorialFrame label="Home">
      <AnimatedFace
        drift={60}
        right={-180}
        rotateFrom={-7}
        rotateTo={0}
        top={-110}
        variant="single"
        width={1060}
      />
      {lines.map((line, index) => (
        <Sequence
          key={line}
          from={Math.round(index * 0.22 * fps)}
          premountFor={fps}
        >
          <Reveal
            style={{
              left: 80,
              position: "absolute",
              top: 178 + index * 115,
              width: 940,
            }}
          >
            <div
              style={{
                fontSize: 122,
                fontWeight: 650,
                letterSpacing: "-0.07em",
                lineHeight: 0.94,
              }}
            >
              {line}
            </div>
          </Reveal>
        </Sequence>
      ))}
      <Reveal
        delay={Math.round(1.25 * fps)}
        style={{bottom: 112, left: 84, position: "absolute", width: 720}}
      >
        <p
          style={{
            color: colors.muted,
            fontSize: 32,
            letterSpacing: "-0.025em",
            lineHeight: 1.35,
            margin: 0,
          }}
        >
          Documenting experiments, creative work, research ideas, and reflections in public.
        </p>
      </Reveal>
    </EditorialFrame>
  );
}
