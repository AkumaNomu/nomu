"use client";

import { useEffect, useState } from "react";
import type { Comment } from "@/types/comments";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export function CommentsPanel({ slug }: { slug: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Failed to load comments.");
        setComments(payload.comments as Comment[]);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Failed to load comments.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [slug]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!author.trim() || !body.trim()) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, author, body })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Failed to post comment.");
      const created = payload.comment as Comment;
      setComments((current) => [created, ...current]);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="comments">
      <header className="comments-head">
        <h2 className="comments-title">Comments</h2>
        <p className="comments-meta">{loading ? "Loading…" : `${comments.length} total`}</p>
      </header>

      {error ? <p className="comments-error">{error}</p> : null}

      <form onSubmit={submit} className="comments-form">
        <label className="comments-field">
          <span className="comments-label">Name</span>
          <input className="comments-input" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={80} />
        </label>
        <label className="comments-field">
          <span className="comments-label">Comment</span>
          <textarea className="comments-textarea" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />
        </label>
        <button type="submit" className="comments-submit" disabled={sending || !author.trim() || !body.trim()}>
          {sending ? "Posting…" : "Post"}
        </button>
      </form>

      <div className="comments-list">
        {comments.map((comment) => (
          <article key={comment.id} className="comments-item">
            <div className="comments-item-head">
              <span className="comments-item-author">{comment.author}</span>
              <span className="comments-item-date">{formatDate(comment.createdAt)}</span>
            </div>
            <p className="comments-item-body">{comment.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

