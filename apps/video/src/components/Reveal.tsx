import type {CSSProperties, ReactNode} from "react";
import {interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  distance?: number;
  style?: CSSProperties;
};

export function Reveal({children, delay = 0, distance = 36, style}: RevealProps) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const progress = spring({
    config: {damping: 200},
    durationInFrames: Math.round(0.9 * fps),
    fps,
    frame: frame - delay,
  });
  const y = interpolate(progress, [0, 1], [distance, 0]);

  return (
    <div style={{...style, opacity: progress, transform: `translateY(${y}px)`}}>
      {children}
    </div>
  );
}
