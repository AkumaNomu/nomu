import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { AnimatedGroup, AnimatedItem } from "@/components/motion/AnimatedGroup";
import styles from "./ToolShell.module.css";

type ToolShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function ToolShell({ title, description, children }: ToolShellProps) {
  return (
    <div className={styles.page}>
      <h1 className="sr-only">{title}</h1>
      <p className="sr-only">{description}</p>
      <AnimatedGroup>
        <AnimatedItem>
          <header className={styles.header}>
            <Link className={styles.back} href="/tools">
              <ArrowLeft aria-hidden="true" size={16} /> All tools
            </Link>
          </header>
        </AnimatedItem>
        <AnimatedItem>
          <section className={styles.workbench} aria-label={`${title} interface`}>
            {children}
          </section>
        </AnimatedItem>
      </AnimatedGroup>
    </div>
  );
}
