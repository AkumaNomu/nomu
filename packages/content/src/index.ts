export type WritingMetadata = {
  title: string;
  slug: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  category: string;
  tags: string[];
  featured?: boolean;
  draft?: boolean;
  readingTime: string;
  cover?: string;
};

export type ProjectStatus = "planning" | "building" | "shipped" | "paused" | "archived";

export type ProjectMetadata = {
  title: string;
  slug: string;
  description: string;
  year: number;
  status: ProjectStatus;
  role?: string;
  technologies: string[];
  featured?: boolean;
  repository?: string;
  website?: string;
};

export type ToolStatus = "live" | "experimental" | "paused";

export type ToolMetadata = {
  title: string;
  slug: string;
  description: string;
  status: ToolStatus;
  featured?: boolean;
  category: string;
};

export type PageMetadata = {
  title: string;
  slug: string;
  description: string;
  navLabel?: string;
};
