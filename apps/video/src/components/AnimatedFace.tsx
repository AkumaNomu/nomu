import {FaceGeometry, type FaceVariant} from "@personal/shared-scenes";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {faceStyle} from "../styles";

type AnimatedFaceProps = {
  variant?: FaceVariant;
  width: number;
  right?: number;
  top?: number;
  rotateFrom?: number;
  rotateTo?: number;
  drift?: number;
  opacity?: number;
};

export function AnimatedFace({
  variant = "single",
  width,
  right = -120,
  top = 70,
  rotateFrom = -8,
  rotateTo = 1,
  drift = 45,
  opacity = 1,
}: AnimatedFaceProps) {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const progress = interpolate(frame, [0, durationInFrames - 1], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <FaceGeometry
      variant={variant}
      style={{
        ...faceStyle(),
        opacity,
        position: "absolute",
        right,
        top: top + progress * drift,
        transform: `rotate(${rotateFrom + (rotateTo - rotateFrom) * progress}deg)`,
        width,
      }}
    />
  );
}
