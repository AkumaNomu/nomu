"use client";

import { useEffect, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useAccount } from "@/components/account/AccountProvider";
import { useToasts } from "@/components/ToastProvider";
import styles from "./PostReactions.module.css";

type Totals = { likes: number; dislikes: number; userReaction: 1 | -1 | null };

export function PostReactions({ slug }: { slug: string }) {
  const { user } = useAccount();
  const { showToast } = useToasts();
  const [totals, setTotals] = useState<Totals>({ likes: 0, dislikes: 0, userReaction: null });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/${encodeURIComponent(slug)}/reactions`, { cache: "no-store" })
      .then((response) => response.json() as Promise<Totals>)
      .then(setTotals)
      .catch(() => {});
  }, [slug]);

  async function react(reaction: 1 | -1) {
    if (pending) return;
    if (!user) { showToast("Log in to react to posts.", "error"); return; }

    const next = totals.userReaction === reaction ? null : reaction;
    const previous = totals;
    // Optimistic update — the API call reconciles the real counts right after.
    setTotals((current) => ({
      likes: current.likes + (next === 1 ? 1 : 0) - (current.userReaction === 1 ? 1 : 0),
      dislikes: current.dislikes + (next === -1 ? 1 : 0) - (current.userReaction === -1 ? 1 : 0),
      userReaction: next,
    }));

    setPending(true);
    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(slug)}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: next }),
      });
      const payload = await response.json() as Totals & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save reaction.");
      setTotals(payload);
    } catch (error) {
      setTotals(previous);
      showToast(error instanceof Error ? error.message : "Unable to save reaction.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.reactions} role="group" aria-label="React to this post">
      <button
        type="button"
        className={styles.button}
        aria-pressed={totals.userReaction === 1}
        onClick={() => void react(1)}
      >
        <ThumbsUp aria-hidden="true" size={16} /> {totals.likes}
      </button>
      <button
        type="button"
        className={styles.button}
        aria-pressed={totals.userReaction === -1}
        onClick={() => void react(-1)}
      >
        <ThumbsDown aria-hidden="true" size={16} /> {totals.dislikes}
      </button>
    </div>
  );
}
