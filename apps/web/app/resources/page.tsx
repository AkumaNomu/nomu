import type { Metadata } from "next";
import { ProjectExplorer } from "@/components/ProjectExplorer";
import { getAllResources } from "@/lib/content";

export const metadata: Metadata = { title: "Resources", description: "A small index of guides and sites worth bookmarking.", alternates: { canonical: "/resources" } };

export default function ResourcesPage() {
  const resources = getAllResources();
  return <div className="site-shell"><h1 className="sr-only">Resources</h1><ProjectExplorer label="resources" items={resources.map(({ metadata }) => ({ slug: metadata.slug, title: metadata.title, description: metadata.description, status: metadata.type, searchText: metadata.url, href: `/resources/${metadata.slug}` }))} /></div>;
}
