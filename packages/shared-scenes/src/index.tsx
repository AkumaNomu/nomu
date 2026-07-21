import type { CSSProperties } from "react";

export type FaceVariant = "single" | "double" | "tilted" | "wide";

export type FaceGeometryProps = {
  className?: string;
  style?: CSSProperties;
  variant?: FaceVariant;
  title?: string;
};

export function FaceGeometry({ className, style, variant = "single", title }: FaceGeometryProps) {
  const double = variant === "double";
  const tilted = variant === "tilted";
  return (
    <svg className={className} style={style} viewBox="0 0 720 920" role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <path d={variant === "wide" ? "M91 99C282-36 591 1 715 205v715H121C17 777-28 635 28 460 49 396 76 351 120 300 57 252 44 173 91 99Z" : "M210 16C446-34 687 123 720 355v565H212C83 845-4 702 9 535 18 420 54 341 135 254 86 174 104 72 210 16Z"} fill="currentColor" />
      <rect x={double ? 280 : 386} y="172" width="58" height="198" rx="29" fill="var(--face-cutout, #f5f3ee)" transform={tilted ? "rotate(-15 386 172)" : "rotate(-12 386 172)"} />
      {double ? <rect x="470" y="126" width="58" height="198" rx="29" fill="var(--face-cutout, #f5f3ee)" transform="rotate(-12 470 126)" /> : null}
      <path d="M278 590c105-78 244-95 391-51-61 144-170 221-314 230-59 4-113-9-162-37 19-58 48-105 85-142Z" fill="var(--face-cutout, #f5f3ee)" />
    </svg>
  );
}
