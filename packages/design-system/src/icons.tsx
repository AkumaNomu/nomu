import type { SVGProps } from "react";
import { ArrowRight, Pause, Play, Search, SkipForward } from "lucide-react";

type IconProps = SVGProps<SVGSVGElement>;

export function ArrowIcon(props: IconProps) {
  return <ArrowRight strokeWidth={1.7} aria-hidden="true" {...props} />;
}

export function SearchIcon(props: IconProps) {
  return <Search strokeWidth={1.7} aria-hidden="true" {...props} />;
}

export function PlayIcon(props: IconProps) {
  return <Play fill="currentColor" strokeWidth={0} aria-hidden="true" {...props} />;
}

export function PauseIcon(props: IconProps) {
  return <Pause fill="currentColor" strokeWidth={0} aria-hidden="true" {...props} />;
}

export function SkipIcon({ style, ...props }: IconProps) {
  return <SkipForward fill="currentColor" strokeWidth={0} style={style} aria-hidden="true" {...props} />;
}
