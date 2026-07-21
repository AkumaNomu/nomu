import type { Metadata } from "next";
import { ProjectExplorer } from "@/components/ProjectExplorer";
import { tools } from "./tools-data";
import { QuickAccessGrid } from "./QuickAccessGrid";

export const metadata: Metadata = {
  title: "Tools",
  description: "Small, focused online tools for attention, accessibility, and clearer work.",
};

export default function ToolsPage() {
  return (
    <div className="site-shell">
      <h1 className="sr-only">Tools</h1>
      <QuickAccessGrid />
      <ProjectExplorer label="tools" filters groupLabel="Category" items={tools.map((tool) => ({ slug: tool.slug, title: tool.name, description: tool.description, status: tool.status.toLowerCase(), group: tool.category, searchText: tool.category, href: `/tools/${tool.slug}` }))} />
    </div>
  );
}
