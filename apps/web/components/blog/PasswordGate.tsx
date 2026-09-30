"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { unlockPost } from "@/app/blog/[slug]/actions";
import styles from "./PasswordGate.module.css";

export function PasswordGate({ slug, hint }: { slug: string; hint?: string }) {
  const [error, formAction, pending] = useActionState(unlockPost, null);

  return (
    <form className={styles.gate} action={formAction}>
      <span className={styles.icon} aria-hidden="true"><Lock /></span>
      <h2 className={styles.title}>This post is locked</h2>
      <p className={styles.hint}>{hint ?? "Enter the password to read it."}</p>
      <input type="hidden" name="slug" value={slug} />
      <div className={styles.row}>
        <input
          className={styles.input}
          type="password"
          name="password"
          autoComplete="off"
          placeholder="Password"
          aria-label="Post password"
        />
        <button className={styles.submit} type="submit" disabled={pending}>
          {pending ? "Unlocking…" : "Unlock"}
        </button>
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </form>
  );
}
