import type { MetadataRoute } from "next";
import { getAllProjects, getAllResources, getAllTools, getAllWriting } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nomu.dev";
  const staticPages = ["", "/home", "/writing", "/projects", "/tools", "/resources", "/about"];
  return [
    ...staticPages.map((path) => ({ url: `${origin}${path}`, changeFrequency: "monthly" as const, priority: path === "" ? 1 : 0.8 })),
    ...getAllWriting().map(({ metadata }) => ({ url: `${origin}/writing/${metadata.slug}`, lastModified: metadata.updatedAt ?? metadata.publishedAt, changeFrequency: "yearly" as const, priority: 0.7 })),
    ...getAllProjects().map(({ metadata }) => ({ url: `${origin}/projects/${metadata.slug}`, changeFrequency: "yearly" as const, priority: 0.6 })),
    ...getAllTools().map(({ metadata }) => ({ url: `${origin}/tools/${metadata.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...getAllResources().map(({ metadata }) => ({ url: `${origin}/resources/${metadata.slug}`, changeFrequency: "monthly" as const, priority: 0.6 }))
  ];
}
