import {interpolate, Sequence, useCurrentFrame, useVideoConfig} from "remotion";
import {AnimatedFace} from "../components/AnimatedFace";
import {EditorialFrame} from "../components/EditorialFrame";
import {Reveal} from "../components/Reveal";
import {colors} from "../styles";

export type ProjectTeaserProps = {
  description: string;
  name: string;
  status: string;
  year: number;
};

export function ProjectTeaser({description, name, status, year}: ProjectTeaserProps) {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();
  const lineWidth = interpolate(frame, [0.5 * fps, durationInFrames - fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <EditorialFrame label="Projects" marker={`${year} / ${status}`}>
      <AnimatedFace
        drift={-40}
        right={-190}
        rotateFrom={4}
        rotateTo={-4}
        top={-40}
        variant="double"
        width={1020}
      />
      <Sequence premountFor={fps}>
        <Reveal delay={Math.round(0.2 * fps)} style={{left: 82, position: "absolute", top: 230}}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "0.18em",
              marginBottom: 30,
              textTransform: "uppercase",
            }}
          >
            Featured project
          </div>
          <h1
            style={{
              fontSize: 174,
              fontWeight: 650,
              letterSpacing: "-0.075em",
              lineHeight: 0.85,
              margin: 0,
            }}
          >
            {name}
          </h1>
        </Reveal>
      </Sequence>
      <Reveal
        delay={Math.round(1.15 * fps)}
        style={{bottom: 128, left: 82, position: "absolute", width: 690}}
      >
        <p
          style={{
            color: colors.muted,
            fontSize: 36,
            letterSpacing: "-0.03em",
            lineHeight: 1.28,
            margin: 0,
          }}
        >
          {description}
        </p>
        <div
          style={{
            backgroundColor: colors.foreground,
            height: 2,
            marginTop: 36,
            transform: `scaleX(${lineWidth})`,
            transformOrigin: "left center",
            width: 620,
          }}
        />
      </Reveal>
    </EditorialFrame>
  );
}
