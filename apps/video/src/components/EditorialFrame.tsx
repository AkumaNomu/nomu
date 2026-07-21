import type {CSSProperties, ReactNode} from "react";
import {AbsoluteFill} from "remotion";
import {canvasStyle, colors} from "../styles";

type EditorialFrameProps = {
  children: ReactNode;
  label: string;
  marker?: string;
  style?: CSSProperties;
};

export function EditorialFrame({
  children,
  label,
  marker = "NOMU / FIELD NOTES",
  style,
}: EditorialFrameProps) {
  return (
    <AbsoluteFill style={{...canvasStyle, ...style}}>
      <div
        style={{
          alignItems: "center",
          borderBottom: `1px solid ${colors.line}`,
          display: "flex",
          fontSize: 22,
          fontWeight: 650,
          justifyContent: "space-between",
          left: 72,
          letterSpacing: "-0.02em",
          paddingBottom: 22,
          position: "absolute",
          right: 72,
          top: 42,
        }}
      >
        <span>{label}</span>
        <span style={{fontSize: 14, fontWeight: 600, letterSpacing: "0.14em"}}>
          {marker}
        </span>
      </div>
      {children}
    </AbsoluteFill>
  );
}
