"use client";

import { useEffect, useState } from "react";
import { AccountPanel } from "@/components/account/AccountPanel";
import { type Account, useAccount } from "@/components/account/AccountProvider";
import { useToasts } from "@/components/ToastProvider";
import styles from "./Comments.module.css";

type CommentRow = { id: string; parent_id: string | null; author: string; body: string; created_at: string };
type CommentEntry = { id: string; author: string; body: string; createdAt: string; replies: CommentEntry[] };
type User = Account;

function buildTree(rows: CommentRow[]): CommentEntry[] {
  const entries = new Map(rows.map((row) => [row.id, { id: row.id, author: row.author, body: row.body, createdAt: row.created_at, replies: [] as CommentEntry[] }]));
  const roots: CommentEntry[] = [];
  rows.forEach((row) => {
    const entry = entries.get(row.id);
    const parent = row.parent_id ? entries.get(row.parent_id) : undefined;
    if (!entry) return;
    if (parent) parent.replies.push(entry); else roots.push(entry);
  });
  return roots;
}

function addReply(entries: CommentEntry[], parentId: string, reply: CommentEntry): CommentEntry[] {
  return entries.map((entry) => entry.id === parentId ? { ...entry, replies: [...entry.replies, reply] } : { ...entry, replies: addReply(entry.replies, parentId, reply) });
}


function Composer({ user, placeholder, onPost }: { user: User | null; placeholder: string; onPost: (body: string) => Promise<void> }) {
  const { showToast } = useToasts();
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  async function post() {
    if (!body.trim() || posting) return;
    setPosting(true);
    try { await onPost(body.trim()); setBody(""); showToast("Comment posted."); } catch (error) { showToast(error instanceof Error ? error.message : "Unable to post comment.", "error"); } finally { setPosting(false); }
  }
  return <div className={styles.composer}>
    <span className={styles.avatar}>{user?.username[0].toUpperCase() ?? "?"}</span>
    <div className={styles.composerMain}><textarea aria-label={placeholder} disabled={!user} maxLength={2000} placeholder={user ? placeholder : "Log in to join the conversation"} rows={1} value={body} onChange={(event) => setBody(event.target.value)} />{user ? <div className={styles.composerActions}><span>{body.length > 0 ? `${body.length}/2000` : ""}</span><button className={styles.primaryAction} type="button" disabled={!body.trim() || posting} onClick={post}>{posting ? "Posting…" : "Post"}</button></div> : null}</div>
  </div>;
}

function CommentItem({ entry, user, onPost }: { entry: CommentEntry; user: User | null; onPost: (body: string, parentId: string) => Promise<void> }) {
  const [replying, setReplying] = useState(false);
  const date = new Date(entry.createdAt);
  return <li className={styles.comment}>
    <article aria-labelledby={`comment-${entry.id}-author`}>
      <header className={styles.commentHeader}><span className={styles.avatar}>{entry.author[0].toUpperCase()}</span><div><strong id={`comment-${entry.id}-author`}>@{entry.author}</strong><time dateTime={entry.createdAt}>{Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en", { day: "numeric", month: "short" })}</time></div></header>
      <p className={styles.commentBody}>{entry.body}</p>
      <button className={styles.replyButton} type="button" onClick={() => setReplying((value) => !value)}>{replying ? "Cancel" : "Reply"}</button>
      {replying ? <Composer user={user} placeholder={`Reply to @${entry.author}`} onPost={(body) => onPost(body, entry.id)} /> : null}
    </article>
    {entry.replies.length ? <ol aria-label={`Replies to ${entry.author}`} className={styles.replies}>{entry.replies.map((reply) => <CommentItem entry={reply} key={reply.id} user={user} onPost={onPost} />)}</ol> : null}
  </li>;
}

export type CommentsProps = { slug: string };

export function Comments({ slug }: CommentsProps) {
  const { user } = useAccount();
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/comments?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (response) => { const payload = await response.json() as { comments?: CommentRow[]; error?: string }; if (!response.ok) throw new Error(payload.error); return payload.comments ?? []; })
      .then((rows) => setComments(buildTree(rows)))
      .catch((reason) => { setAvailable(false); setError(reason instanceof Error ? reason.message : "Unable to load comments."); })
      .finally(() => setLoading(false));
  }, [slug]);

  async function saveComment(body: string, parentId: string | null = null) {
    const response = await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, body, parentId }) });
    const payload = await response.json() as { comment?: CommentRow; error?: string };
    if (!response.ok || !payload.comment) throw new Error(payload.error ?? "Unable to save comment.");
    const next = { id: payload.comment.id, author: payload.comment.author, body: payload.comment.body, createdAt: payload.comment.created_at, replies: [] };
    setComments((current) => parentId ? addReply(current, parentId, next) : [...current, next]);
  }

  return <section aria-labelledby="comments-heading" className={styles.comments}>
    <div className={styles.headingRow}><h2 id="comments-heading">Comments</h2><span>{loading ? "Loading" : available ? `${comments.length} ${comments.length === 1 ? "thread" : "threads"}` : "Unavailable"}</span></div>
    <div className={styles.accountRow}><AccountPanel /></div>
    {available ? <Composer user={user} placeholder="Add a comment…" onPost={(body) => saveComment(body)} /> : <p className={styles.empty}>{error ?? "Comments are unavailable."}</p>}
    {!loading && available && comments.length === 0 ? <p className={styles.empty}>No comments yet. Start the conversation.</p> : null}
    {comments.length ? <ol aria-label="Comments" className={styles.list}>{comments.map((comment) => <CommentItem entry={comment} key={comment.id} user={user} onPost={(body, parentId) => saveComment(body, parentId)} />)}</ol> : null}
  </section>;
}
