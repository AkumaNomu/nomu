import Link from "next/link";
import type { Route } from "next";
import { FaceGeometry, type FaceVariant } from "@personal/shared-scenes";
import { ArrowIcon } from "@personal/design-system";
import styles from "./Editorial.module.css";

export function FaceField({ variant = "single", className = "" }: { variant?: FaceVariant; className?: string }) {
  return <div className={`${styles.faceField} ${className}`} data-face-motion aria-hidden="true"><FaceGeometry variant={variant} /></div>;
}

export function EyeSlit({ className = "" }: { className?: string }) { return <span className={`${styles.eyeSlit} ${className}`} aria-hidden="true" />; }
export function SmileCutout({ className = "" }: { className?: string }) { return <span className={`${styles.smileCutout} ${className}`} aria-hidden="true" />; }
export const AbstractFaceCrop = FaceField;

export function SectionRule({ title, href, linkLabel }: { title: string; href?: Route; linkLabel?: string }) {
  return <div className={styles.sectionRule}><h2 className="eyebrow">{title}</h2>{href ? <Link href={href} aria-label={linkLabel ?? `View ${title}`}><ArrowIcon /></Link> : null}</div>;
}

export function ArrowLink({ href, children }: { href: Route; children: React.ReactNode }) {
  return <Link href={href} className="arrow-link">{children}<ArrowIcon /></Link>;
}
