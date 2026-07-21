import type {CSSProperties} from "react";

export const colors = {
  background: "#f5f3ee",
  foreground: "#090909",
  muted: "#77736d",
  line: "rgba(9, 9, 9, 0.18)",
} as const;

export const fontFamily =
  'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';

export const canvasStyle: CSSProperties = {
  backgroundColor: colors.background,
  color: colors.foreground,
  fontFamily,
  overflow: "hidden",
};

export const faceStyle = (cutout = colors.background): CSSProperties =>
  ({
    color: colors.foreground,
    "--face-cutout": cutout,
  }) as CSSProperties;
