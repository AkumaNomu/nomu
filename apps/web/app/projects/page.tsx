import type { Metadata } from "next";
import { ProjectExplorer } from "@/components/ProjectExplorer";
import { getAllProjects } from "@/lib/content";

export const metadata: Metadata = {
  title: "Projects",
  description: "Software, experiments, and creative systems built to understand and express ideas.",
  alternates: { canonical: "/projects" },
};

export default function ProjectsPage() {
  const projects = getAllProjects();

  return (
    <div className="site-shell">
      <h1 className="sr-only">Projects</h1>
      <ProjectExplorer label="projects" filters items={projects.map(({ metadata }) => ({
        slug: metadata.slug,
        title: metadata.title,
        description: metadata.description,
        group: String(metadata.year),
        status: metadata.status,
        role: metadata.role,
        technologies: metadata.technologies,
        icon: `/projects/${metadata.slug}/cover.png`,
        href: `/projects/${metadata.slug}`,
      }))} />
    </div>
  );
}
