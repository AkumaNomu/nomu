import {FaceGeometry} from "@personal/shared-scenes";
import {interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {EditorialFrame} from "../components/EditorialFrame";
import {Reveal} from "../components/Reveal";
import {colors, faceStyle} from "../styles";

export type MusicVisualizerProps = {
  artist: string;
  title: string;
};

const bars = [0.62, 0.88, 0.48, 0.76, 1, 0.57, 0.82, 0.42, 0.7, 0.92, 0.54, 0.78];

export function MusicVisualizer({artist, title}: MusicVisualizerProps) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <EditorialFrame label="Currently listening" marker="NO AUTOPLAY">
      <FaceGeometry
        variant="wide"
        style={{
          ...faceStyle(),
          left: -110,
          position: "absolute",
          top: 210,
          transform: `rotate(${interpolate(frame, [0, 8 * fps], [-4, 2], {
            extrapolateRight: "clamp",
          })}deg)`,
          width: 720,
        }}
      />
      <Reveal delay={Math.round(0.25 * fps)} style={{left: 624, position: "absolute", top: 278}}>
        <h1
          style={{
            fontSize: 94,
            fontWeight: 650,
            letterSpacing: "-0.065em",
            lineHeight: 0.92,
            margin: 0,
          }}
        >
          {title}
        </h1>
        <div style={{color: colors.muted, fontSize: 38, marginTop: 18}}>{artist}</div>
      </Reveal>
      <div
        style={{
          alignItems: "end",
          bottom: 94,
          display: "flex",
          gap: 14,
          left: 624,
          position: "absolute",
        }}
      >
        {bars.map((bar, index) => {
          const pulse = 0.52 + 0.48 * Math.sin(frame / 5 + index * 1.7);
          return (
            <div
              key={`${bar}-${index}`}
              style={{
                background: colors.foreground,
                height: 42 + bar * pulse * 190,
                width: 16,
              }}
            />
          );
        })}
      </div>
    </EditorialFrame>
  );
}
