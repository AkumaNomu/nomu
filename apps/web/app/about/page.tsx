import type { Metadata } from "next";
import { ArrowIcon } from "@personal/design-system";
import { AnimatedGroup, AnimatedItem } from "@/components/motion/AnimatedGroup";
import { getPage } from "@/lib/content";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "About", description: "About Nomu's work, interests, and approach.", alternates: { canonical: "/about" } };

export default function AboutPage() {
  const page = getPage("about"); if (!page) throw new Error("Missing about content");
  const sections = [...page.body.matchAll(/^##\s+(.+)\n\n([\s\S]*?)(?=\n\n##|$)/gm)].map((match) => ({ title: match[1], body: match[2].trim() }));
  return <div className={`${styles.about} site-shell`}><h1 className="sr-only">About</h1><AnimatedGroup className={styles.grid}>{sections.map((section, index) => <AnimatedItem className={styles.sectionItem} key={section.title}><section data-section={section.title.toLowerCase().replaceAll(" ", "-")}><span className={styles.index} aria-hidden="true">0{index + 1}</span><h2>{section.title}</h2>{section.title === "Elsewhere" ? <ul><li><a href="mailto:hello@nomu.dev">Email<ArrowIcon /></a></li><li><a href="https://github.com/">GitHub<ArrowIcon /></a></li><li><a href="https://www.linkedin.com/">LinkedIn<ArrowIcon /></a></li><li><a href="/feed.xml">RSS<ArrowIcon /></a></li></ul> : <p>{section.body}</p>}</section></AnimatedItem>)}</AnimatedGroup></div>;
}
