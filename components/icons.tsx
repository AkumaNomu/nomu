import type { LucideIcon, LucideProps } from "lucide-react";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  BookOpen,
  ChevronRight,
  Clock,
  ExternalLink,
  Feather,
  FileText,
  Gauge,
  History,
  Info,
  Library,
  Moon,
  Pause,
  Play,
  Search,
  Sun,
  Volume2,
  VolumeX,
  Volume1,
  X
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  arrow_forward: ArrowRight,
  east: ArrowRight,
  north_east: ArrowUpRight,
  chevron_right: ChevronRight,
  search: Search,
  speed: Gauge,
  graphic_eq: AudioLines,
  play_arrow: Play,
  pause: Pause,
  volume_up: Volume2,
  volume_down: Volume1,
  volume_off: VolumeX,
  open_in_new: ExternalLink,
  dark_mode: Moon,
  light_mode: Sun,
  article: FileText,
  auto_stories: BookOpen,
  history: History,
  info: Info,
  library: Library,
  feather: Feather,
  clock: Clock,
  close: X
};

export type IconName = keyof typeof ICON_MAP;

type SymbolIconProps = Omit<LucideProps, "ref"> & {
  name: string;
  className?: string;
};

export function SymbolIcon({ name, className = "", strokeWidth = 1.6, size, ...rest }: SymbolIconProps) {
  const Icon = ICON_MAP[name] ?? ChevronRight;
  return <Icon className={className} strokeWidth={strokeWidth} size={size} aria-hidden {...rest} />;
}
