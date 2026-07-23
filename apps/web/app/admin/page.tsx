"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";

type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  file_path: string;
  artwork_path?: string;
  duration_ms?: number;
  slug: string;
  lyrics_md?: string;
  notes_md?: string;
  created_at: string;
};

type GameEntry = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnail_path?: string;
  file_path: string;
  created_at: string;
};

type BlogMetadata = {
  title: string;
  slug: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  category: string;
  tags: string[];
  featured?: boolean;
  draft?: boolean;
  cover: string;
};

type ProjectMetadata = {
  title: string;
  slug: string;
  description: string;
  year: number;
  status: "planning" | "building" | "shipped" | "paused" | "archived";
  role?: string;
  technologies: string[];
  icon: string;
  featured?: boolean;
  repository?: string;
  website?: string;
};

type ContentEntry<T> = {
  slug: string;
  fileName: string;
  updatedAt: string;
  body: string;
  metadata: T;
};

type ToolEntry = {
  slug: string;
  name: string;
  description: string;
  status: "Live" | "Experimental" | "Paused";
  category: string;
  icon: string;
  hasContentFile: boolean;
  contentStatus: "live" | "experimental" | "paused" | null;
};

type CommentEntry = {
  id: string;
  slug: string;
  parent_id: string | null;
  author: string;
  body: string;
  created_at: string;
};

type DashboardData = {
  posts: ContentEntry<BlogMetadata>[];
  projects: ContentEntry<ProjectMetadata>[];
  tools: ToolEntry[];
  comments: CommentEntry[];
  tracks: Track[];
  games: GameEntry[];
};

type TrackForm = {
  title: string;
  artist: string;
  album: string;
  file_path: string;
  artwork_path: string;
  duration_ms: string;
  lyrics_md: string;
  notes_md: string;
};

type GameForm = {
  title: string;
  description: string;
  thumbnail_path: string;
  file_path: string;
};

type NewPostForm = {
  title: string;
  slug: string;
  description: string;
  publishedAt: string;
  category: string;
  tags: string;
  cover: string;
  body: string;
};

type NewProjectForm = {
  title: string;
  slug: string;
  description: string;
  year: string;
  status: ProjectMetadata["status"];
  role: string;
  technologies: string;
  icon: string;
  repository: string;
  website: string;
  body: string;
};

const emptyTrackForm: TrackForm = {
  title: "",
  artist: "",
  album: "",
  file_path: "",
  artwork_path: "",
  duration_ms: "",
  lyrics_md: "",
  notes_md: "",
};

const emptyGameForm: GameForm = {
  title: "",
  description: "",
  thumbnail_path: "",
  file_path: "",
};

const emptyPostForm: NewPostForm = {
  title: "",
  slug: "",
  description: "",
  publishedAt: new Date().toISOString().slice(0, 10),
  category: "Development",
  tags: "",
  cover: "/covers/",
  body: "",
};

const emptyProjectForm: NewProjectForm = {
  title: "",
  slug: "",
  description: "",
  year: String(new Date().getFullYear()),
  status: "planning",
  role: "",
  technologies: "",
  icon: "/project-icons/",
  repository: "",
  website: "",
  body: "",
};

function splitList(value: string) {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function SectionHeader({ title, note }: { title: string; note: string }) {
  return (
    <div className={styles.sectionHeader}>
      <h2>{title}</h2>
      <p>{note}</p>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [trackForm, setTrackForm] = useState<TrackForm>(emptyTrackForm);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [gameForm, setGameForm] = useState<GameForm>(emptyGameForm);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [newPostForm, setNewPostForm] = useState<NewPostForm>(emptyPostForm);
  const [newProjectForm, setNewProjectForm] = useState<NewProjectForm>(emptyProjectForm);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        router.push("/");
        return;
      }
      const payload = await res.json() as DashboardData & { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load admin dashboard");
      setData(payload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin dashboard");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchDashboard();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchDashboard]);

  function updatePost(slug: string, updater: (entry: ContentEntry<BlogMetadata>) => ContentEntry<BlogMetadata>) {
    setData((current) => current ? {
      ...current,
      posts: current.posts.map((entry) => entry.slug === slug ? updater(entry) : entry),
    } : current);
  }

  function updateProject(slug: string, updater: (entry: ContentEntry<ProjectMetadata>) => ContentEntry<ProjectMetadata>) {
    setData((current) => current ? {
      ...current,
      projects: current.projects.map((entry) => entry.slug === slug ? updater(entry) : entry),
    } : current);
  }

  function updateTool(slug: string, status: ToolEntry["status"]) {
    setData((current) => current ? {
      ...current,
      tools: current.tools.map((entry) => entry.slug === slug
        ? {
            ...entry,
            status,
            contentStatus: entry.hasContentFile ? status.toLowerCase() as ToolEntry["contentStatus"] : entry.contentStatus,
          }
        : entry),
    } : current);
  }

  async function savePost(entry: ContentEntry<BlogMetadata>) {
    setBusyKey(`post:${entry.slug}`);
    try {
      const res = await fetch(`/api/admin/content/blog/${encodeURIComponent(entry.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: entry.metadata, body: entry.body }),
      });
      const payload = await res.json() as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Unable to save post");
      setError(null);
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save post");
    } finally {
      setBusyKey(null);
    }
  }

  async function createPost(event: FormEvent) {
    event.preventDefault();
    setBusyKey("post:create");
    try {
      const res = await fetch("/api/admin/content/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: {
            title: newPostForm.title,
            slug: newPostForm.slug,
            description: newPostForm.description,
            publishedAt: newPostForm.publishedAt,
            category: newPostForm.category,
            tags: splitList(newPostForm.tags),
            featured: false,
            draft: true,
            cover: newPostForm.cover,
          },
          body: newPostForm.body,
        }),
      });
      const payload = await res.json() as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Unable to create post");
      setNewPostForm(emptyPostForm);
      setError(null);
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create post");
    } finally {
      setBusyKey(null);
    }
  }

  async function saveProject(entry: ContentEntry<ProjectMetadata>) {
    setBusyKey(`project:${entry.slug}`);
    try {
      const res = await fetch(`/api/admin/content/projects/${encodeURIComponent(entry.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: entry.metadata, body: entry.body }),
      });
      const payload = await res.json() as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Unable to save project");
      setError(null);
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save project");
    } finally {
      setBusyKey(null);
    }
  }

  async function createProject(event: FormEvent) {
    event.preventDefault();
    setBusyKey("project:create");
    try {
      const res = await fetch("/api/admin/content/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: {
            title: newProjectForm.title,
            slug: newProjectForm.slug,
            description: newProjectForm.description,
            year: Number.parseInt(newProjectForm.year, 10),
            status: newProjectForm.status,
            role: newProjectForm.role || undefined,
            technologies: splitList(newProjectForm.technologies),
            icon: newProjectForm.icon,
            featured: false,
            repository: newProjectForm.repository || undefined,
            website: newProjectForm.website || undefined,
          },
          body: newProjectForm.body,
        }),
      });
      const payload = await res.json() as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Unable to create project");
      setNewProjectForm(emptyProjectForm);
      setError(null);
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create project");
    } finally {
      setBusyKey(null);
    }
  }

  async function saveToolStatus(slug: string, status: ToolEntry["status"]) {
    setBusyKey(`tool:${slug}`);
    const previous = data?.tools.find((entry) => entry.slug === slug)?.status;
    updateTool(slug, status);

    try {
      const res = await fetch(`/api/admin/tools/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await res.json() as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Unable to update tool");
      setError(null);
      await fetchDashboard();
    } catch (err) {
      if (previous) updateTool(slug, previous);
      setError(err instanceof Error ? err.message : "Unable to update tool");
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteComment(id: string) {
    setBusyKey(`comment:${id}`);
    try {
      const res = await fetch(`/api/admin/comments/${encodeURIComponent(id)}`, { method: "DELETE" });
      const payload = await res.json() as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Unable to delete comment");
      setData((current) => current ? { ...current, comments: current.comments.filter((entry) => entry.id !== id) } : current);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete comment");
    } finally {
      setBusyKey(null);
    }
  }

  function loadTrack(track: Track) {
    setEditingTrackId(track.id);
    setTrackForm({
      title: track.title,
      artist: track.artist,
      album: track.album,
      file_path: track.file_path,
      artwork_path: track.artwork_path ?? "",
      duration_ms: track.duration_ms ? String(track.duration_ms) : "",
      lyrics_md: track.lyrics_md ?? "",
      notes_md: track.notes_md ?? "",
    });
  }

  function loadGame(game: GameEntry) {
    setEditingGameId(game.id);
    setGameForm({
      title: game.title,
      description: game.description ?? "",
      thumbnail_path: game.thumbnail_path ?? "",
      file_path: game.file_path,
    });
  }

  async function submitGame(event: FormEvent) {
    event.preventDefault();
    const method = editingGameId ? "PATCH" : "POST";
    const url = editingGameId ? `/api/admin/games/${encodeURIComponent(editingGameId)}` : "/api/admin/games";
    setBusyKey(editingGameId ? `game:${editingGameId}` : "game:new");

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameForm),
      });
      const payload = await res.json() as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Unable to save game");
      setGameForm(emptyGameForm);
      setEditingGameId(null);
      setError(null);
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save game");
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteGame(id: string) {
    setBusyKey(`game-delete:${id}`);
    try {
      const res = await fetch(`/api/admin/games/${encodeURIComponent(id)}`, { method: "DELETE" });
      const payload = await res.json() as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Unable to delete game");
      if (editingGameId === id) {
        setEditingGameId(null);
        setGameForm(emptyGameForm);
      }
      setData((current) => current ? { ...current, games: current.games.filter((entry) => entry.id !== id) } : current);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete game");
    } finally {
      setBusyKey(null);
    }
  }

  async function submitTrack(event: FormEvent) {
    event.preventDefault();
    const method = editingTrackId ? "PATCH" : "POST";
    const url = editingTrackId ? `/api/admin/music/${encodeURIComponent(editingTrackId)}` : "/api/admin/music";
    setBusyKey(editingTrackId ? `track:${editingTrackId}` : "track:new");

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...trackForm,
          duration_ms: trackForm.duration_ms ? Number.parseInt(trackForm.duration_ms, 10) : null,
        }),
      });
      const payload = await res.json() as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Unable to save track");
      setTrackForm(emptyTrackForm);
      setEditingTrackId(null);
      setError(null);
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save track");
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteTrack(id: string) {
    setBusyKey(`track-delete:${id}`);
    try {
      const res = await fetch(`/api/admin/music/${encodeURIComponent(id)}`, { method: "DELETE" });
      const payload = await res.json() as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Unable to delete track");
      if (editingTrackId === id) {
        setEditingTrackId(null);
        setTrackForm(emptyTrackForm);
      }
      setData((current) => current ? { ...current, tracks: current.tracks.filter((entry) => entry.id !== id) } : current);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete track");
    } finally {
      setBusyKey(null);
    }
  }

  if (loading) return <div className={styles.container}>Loading admin dashboard…</div>;

  return (
    <div className={styles.container}>
      <h1>Admin Dashboard</h1>
      <p className={styles.intro}>
        File-backed collections can be edited and published here. New slugs and removals still need registry work, so this panel stays inside the site&apos;s current storage model.
      </p>

      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.section}>
        <SectionHeader title="Posts" note={`${data?.posts.length ?? 0} blog files. Edit metadata, body, and publish state in place.`} />
        <form className={styles.form} onSubmit={createPost}>
          <div className={styles.inlineFields}>
            <input placeholder="New post title" required type="text" value={newPostForm.title} onChange={(event) => setNewPostForm((current) => ({ ...current, title: event.target.value }))} />
            <input placeholder="new-post-slug" pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$" required type="text" value={newPostForm.slug} onChange={(event) => setNewPostForm((current) => ({ ...current, slug: event.target.value }))} />
          </div>
          <input placeholder="Short description" required type="text" value={newPostForm.description} onChange={(event) => setNewPostForm((current) => ({ ...current, description: event.target.value }))} />
          <div className={styles.inlineFields}>
            <input required type="date" value={newPostForm.publishedAt} onChange={(event) => setNewPostForm((current) => ({ ...current, publishedAt: event.target.value }))} />
            <input placeholder="Category" required type="text" value={newPostForm.category} onChange={(event) => setNewPostForm((current) => ({ ...current, category: event.target.value }))} />
          </div>
          <div className={styles.inlineFields}>
            <input placeholder="tag-one, tag-two" type="text" value={newPostForm.tags} onChange={(event) => setNewPostForm((current) => ({ ...current, tags: event.target.value }))} />
            <input placeholder="/covers/example.png" required type="text" value={newPostForm.cover} onChange={(event) => setNewPostForm((current) => ({ ...current, cover: event.target.value }))} />
          </div>
          <textarea placeholder="Draft body" rows={6} value={newPostForm.body} onChange={(event) => setNewPostForm((current) => ({ ...current, body: event.target.value }))} />
          <div className={styles.actions}>
            <button disabled={busyKey === "post:create"} type="submit">{busyKey === "post:create" ? "Creating…" : "Create draft post"}</button>
          </div>
        </form>
        <div className={styles.editorGrid}>
          {data?.posts.map((entry) => (
            <details className={styles.card} key={entry.slug}>
              <summary className={styles.cardSummary}>
                <div>
                  <strong>{entry.metadata.title}</strong>
                  <span>{entry.slug}</span>
                </div>
                <div className={styles.badges}>
                  <span className={styles.badge}>{entry.metadata.draft ? "Draft" : "Published"}</span>
                  <span className={styles.badge}>Updated {formatDate(entry.updatedAt)}</span>
                </div>
              </summary>

              <div className={styles.cardBody}>
                <label>
                  Title
                  <input
                    type="text"
                    value={entry.metadata.title}
                    onChange={(event) => updatePost(entry.slug, (current) => ({
                      ...current,
                      metadata: { ...current.metadata, title: event.target.value },
                    }))}
                  />
                </label>
                <label>
                  Description
                  <textarea
                    rows={3}
                    value={entry.metadata.description}
                    onChange={(event) => updatePost(entry.slug, (current) => ({
                      ...current,
                      metadata: { ...current.metadata, description: event.target.value },
                    }))}
                  />
                </label>
                <div className={styles.inlineFields}>
                  <label>
                    Published at
                    <input
                      type="date"
                      value={entry.metadata.publishedAt}
                      onChange={(event) => updatePost(entry.slug, (current) => ({
                        ...current,
                        metadata: { ...current.metadata, publishedAt: event.target.value },
                      }))}
                    />
                  </label>
                  <label>
                    Category
                    <input
                      type="text"
                      value={entry.metadata.category}
                      onChange={(event) => updatePost(entry.slug, (current) => ({
                        ...current,
                        metadata: { ...current.metadata, category: event.target.value },
                      }))}
                    />
                  </label>
                </div>
                <div className={styles.inlineFields}>
                  <label>
                    Tags
                    <input
                      type="text"
                      value={entry.metadata.tags.join(", ")}
                      onChange={(event) => updatePost(entry.slug, (current) => ({
                        ...current,
                        metadata: { ...current.metadata, tags: splitList(event.target.value) },
                      }))}
                    />
                  </label>
                  <label>
                    Cover
                    <input
                      type="text"
                      value={entry.metadata.cover}
                      onChange={(event) => updatePost(entry.slug, (current) => ({
                        ...current,
                        metadata: { ...current.metadata, cover: event.target.value },
                      }))}
                    />
                  </label>
                </div>
                <div className={styles.checkRow}>
                  <label className={styles.checkbox}>
                    <input
                      checked={Boolean(entry.metadata.featured)}
                      type="checkbox"
                      onChange={(event) => updatePost(entry.slug, (current) => ({
                        ...current,
                        metadata: { ...current.metadata, featured: event.target.checked },
                      }))}
                    />
                    Featured
                  </label>
                  <label className={styles.checkbox}>
                    <input
                      checked={Boolean(entry.metadata.draft)}
                      type="checkbox"
                      onChange={(event) => updatePost(entry.slug, (current) => ({
                        ...current,
                        metadata: { ...current.metadata, draft: event.target.checked },
                      }))}
                    />
                    Draft
                  </label>
                </div>
                <label>
                  Body
                  <textarea
                    className={styles.codeArea}
                    rows={14}
                    value={entry.body}
                    onChange={(event) => updatePost(entry.slug, (current) => ({ ...current, body: event.target.value }))}
                  />
                </label>
                <div className={styles.actions}>
                  <button disabled={busyKey === `post:${entry.slug}`} onClick={() => void savePost(entry)} type="button">
                    {busyKey === `post:${entry.slug}` ? "Saving…" : "Save post"}
                  </button>
                  <button
                    className={styles.secondaryButton}
                    disabled={busyKey === `post:${entry.slug}`}
                    onClick={() => {
                      const next = { ...entry, metadata: { ...entry.metadata, draft: !entry.metadata.draft } };
                      updatePost(entry.slug, () => next);
                      void savePost(next);
                    }}
                    type="button"
                  >
                    {entry.metadata.draft ? "Publish" : "Unpublish"}
                  </button>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader title="Projects" note={`${data?.projects.length ?? 0} project files. Edit metadata and long-form content, or archive a project without deleting the MDX file.`} />
        <form className={styles.form} onSubmit={createProject}>
          <div className={styles.inlineFields}>
            <input placeholder="New project title" required type="text" value={newProjectForm.title} onChange={(event) => setNewProjectForm((current) => ({ ...current, title: event.target.value }))} />
            <input placeholder="new-project-slug" pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$" required type="text" value={newProjectForm.slug} onChange={(event) => setNewProjectForm((current) => ({ ...current, slug: event.target.value }))} />
          </div>
          <input placeholder="Short description" required type="text" value={newProjectForm.description} onChange={(event) => setNewProjectForm((current) => ({ ...current, description: event.target.value }))} />
          <div className={styles.inlineFields}>
            <input max="2100" min="2000" required type="number" value={newProjectForm.year} onChange={(event) => setNewProjectForm((current) => ({ ...current, year: event.target.value }))} />
            <select value={newProjectForm.status} onChange={(event) => setNewProjectForm((current) => ({ ...current, status: event.target.value as ProjectMetadata["status"] }))}>
              <option value="planning">planning</option>
              <option value="building">building</option>
              <option value="shipped">shipped</option>
              <option value="paused">paused</option>
              <option value="archived">archived</option>
            </select>
          </div>
          <div className={styles.inlineFields}>
            <input placeholder="Role" type="text" value={newProjectForm.role} onChange={(event) => setNewProjectForm((current) => ({ ...current, role: event.target.value }))} />
            <input placeholder="/project-icons/example.svg" required type="text" value={newProjectForm.icon} onChange={(event) => setNewProjectForm((current) => ({ ...current, icon: event.target.value }))} />
          </div>
          <div className={styles.inlineFields}>
            <input placeholder="Tech one, tech two" type="text" value={newProjectForm.technologies} onChange={(event) => setNewProjectForm((current) => ({ ...current, technologies: event.target.value }))} />
            <input placeholder="Repository URL (optional)" type="url" value={newProjectForm.repository} onChange={(event) => setNewProjectForm((current) => ({ ...current, repository: event.target.value }))} />
          </div>
          <input placeholder="Website URL (optional)" type="url" value={newProjectForm.website} onChange={(event) => setNewProjectForm((current) => ({ ...current, website: event.target.value }))} />
          <textarea placeholder="Project body" rows={5} value={newProjectForm.body} onChange={(event) => setNewProjectForm((current) => ({ ...current, body: event.target.value }))} />
          <div className={styles.actions}>
            <button disabled={busyKey === "project:create"} type="submit">{busyKey === "project:create" ? "Creating…" : "Create project file"}</button>
          </div>
        </form>
        <div className={styles.editorGrid}>
          {data?.projects.map((entry) => (
            <details className={styles.card} key={entry.slug}>
              <summary className={styles.cardSummary}>
                <div>
                  <strong>{entry.metadata.title}</strong>
                  <span>{entry.slug}</span>
                </div>
                <div className={styles.badges}>
                  <span className={styles.badge}>{entry.metadata.status}</span>
                  <span className={styles.badge}>Updated {formatDate(entry.updatedAt)}</span>
                </div>
              </summary>

              <div className={styles.cardBody}>
                <label>
                  Title
                  <input
                    type="text"
                    value={entry.metadata.title}
                    onChange={(event) => updateProject(entry.slug, (current) => ({
                      ...current,
                      metadata: { ...current.metadata, title: event.target.value },
                    }))}
                  />
                </label>
                <label>
                  Description
                  <textarea
                    rows={3}
                    value={entry.metadata.description}
                    onChange={(event) => updateProject(entry.slug, (current) => ({
                      ...current,
                      metadata: { ...current.metadata, description: event.target.value },
                    }))}
                  />
                </label>
                <div className={styles.inlineFields}>
                  <label>
                    Year
                    <input
                      type="number"
                      value={entry.metadata.year}
                      onChange={(event) => updateProject(entry.slug, (current) => ({
                        ...current,
                        metadata: { ...current.metadata, year: Number.parseInt(event.target.value || "0", 10) },
                      }))}
                    />
                  </label>
                  <label>
                    Status
                    <select
                      value={entry.metadata.status}
                      onChange={(event) => updateProject(entry.slug, (current) => ({
                        ...current,
                        metadata: { ...current.metadata, status: event.target.value as ProjectMetadata["status"] },
                      }))}
                    >
                      <option value="planning">planning</option>
                      <option value="building">building</option>
                      <option value="shipped">shipped</option>
                      <option value="paused">paused</option>
                      <option value="archived">archived</option>
                    </select>
                  </label>
                </div>
                <div className={styles.inlineFields}>
                  <label>
                    Role
                    <input
                      type="text"
                      value={entry.metadata.role ?? ""}
                      onChange={(event) => updateProject(entry.slug, (current) => ({
                        ...current,
                        metadata: { ...current.metadata, role: event.target.value || undefined },
                      }))}
                    />
                  </label>
                  <label>
                    Icon
                    <input
                      type="text"
                      value={entry.metadata.icon}
                      onChange={(event) => updateProject(entry.slug, (current) => ({
                        ...current,
                        metadata: { ...current.metadata, icon: event.target.value },
                      }))}
                    />
                  </label>
                </div>
                <div className={styles.inlineFields}>
                  <label>
                    Technologies
                    <input
                      type="text"
                      value={entry.metadata.technologies.join(", ")}
                      onChange={(event) => updateProject(entry.slug, (current) => ({
                        ...current,
                        metadata: { ...current.metadata, technologies: splitList(event.target.value) },
                      }))}
                    />
                  </label>
                  <label className={styles.checkbox}>
                    <input
                      checked={Boolean(entry.metadata.featured)}
                      type="checkbox"
                      onChange={(event) => updateProject(entry.slug, (current) => ({
                        ...current,
                        metadata: { ...current.metadata, featured: event.target.checked },
                      }))}
                    />
                    Featured
                  </label>
                </div>
                <div className={styles.inlineFields}>
                  <label>
                    Repository
                    <input
                      type="url"
                      value={entry.metadata.repository ?? ""}
                      onChange={(event) => updateProject(entry.slug, (current) => ({
                        ...current,
                        metadata: { ...current.metadata, repository: event.target.value || undefined },
                      }))}
                    />
                  </label>
                  <label>
                    Website
                    <input
                      type="url"
                      value={entry.metadata.website ?? ""}
                      onChange={(event) => updateProject(entry.slug, (current) => ({
                        ...current,
                        metadata: { ...current.metadata, website: event.target.value || undefined },
                      }))}
                    />
                  </label>
                </div>
                <label>
                  Body
                  <textarea
                    className={styles.codeArea}
                    rows={10}
                    value={entry.body}
                    onChange={(event) => updateProject(entry.slug, (current) => ({ ...current, body: event.target.value }))}
                  />
                </label>
                <div className={styles.actions}>
                  <button disabled={busyKey === `project:${entry.slug}`} onClick={() => void saveProject(entry)} type="button">
                    {busyKey === `project:${entry.slug}` ? "Saving…" : "Save project"}
                  </button>
                  <button
                    className={styles.secondaryButton}
                    disabled={busyKey === `project:${entry.slug}`}
                    onClick={() => {
                      const next = { ...entry, metadata: { ...entry.metadata, status: "archived" as const } };
                      updateProject(entry.slug, () => next);
                      void saveProject(next);
                    }}
                    type="button"
                  >
                    Archive
                  </button>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader title="Tools" note={`${data?.tools.length ?? 0} tool entries. Status changes update the public list and any matching MDX frontmatter.`} />
        <div className={styles.list}>
          {data?.tools.map((tool) => (
            <div className={styles.rowCard} key={tool.slug}>
              <div>
                <strong>{tool.name}</strong>
                <p>{tool.slug} · {tool.category} · {tool.hasContentFile ? `content ${tool.contentStatus}` : "list-only"}</p>
              </div>
              <div className={styles.rowActions}>
                <select
                  disabled={busyKey === `tool:${tool.slug}`}
                  value={tool.status}
                  onChange={(event) => void saveToolStatus(tool.slug, event.target.value as ToolEntry["status"])}
                >
                  <option value="Live">Live</option>
                  <option value="Experimental">Experimental</option>
                  <option value="Paused">Paused</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader title="Comments" note={`${data?.comments.length ?? 0} stored comments. Moderation is hard delete because the current schema has no soft-delete flag.`} />
        <div className={styles.list}>
          {data?.comments.map((comment) => (
            <div className={styles.rowCard} key={comment.id}>
              <div>
                <strong>@{comment.author}</strong>
                <p>{comment.slug} · {formatDate(comment.created_at)}</p>
                <p className={styles.bodyText}>{comment.body}</p>
              </div>
              <div className={styles.rowActions}>
                <button
                  className={styles.dangerButton}
                  disabled={busyKey === `comment:${comment.id}`}
                  onClick={() => void deleteComment(comment.id)}
                  type="button"
                >
                  {busyKey === `comment:${comment.id}` ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader title="Music" note={`${data?.tracks.length ?? 0} tracks. The existing music library now supports editing as well as create/delete.`} />
        <form className={styles.form} onSubmit={submitTrack}>
          <input placeholder="Title" required type="text" value={trackForm.title} onChange={(event) => setTrackForm((current) => ({ ...current, title: event.target.value }))} />
          <input placeholder="Artist" required type="text" value={trackForm.artist} onChange={(event) => setTrackForm((current) => ({ ...current, artist: event.target.value }))} />
          <input placeholder="Album" required type="text" value={trackForm.album} onChange={(event) => setTrackForm((current) => ({ ...current, album: event.target.value }))} />
          <input placeholder="File path" required type="text" value={trackForm.file_path} onChange={(event) => setTrackForm((current) => ({ ...current, file_path: event.target.value }))} />
          <input placeholder="Artwork path" type="text" value={trackForm.artwork_path} onChange={(event) => setTrackForm((current) => ({ ...current, artwork_path: event.target.value }))} />
          <input placeholder="Duration (ms)" type="number" value={trackForm.duration_ms} onChange={(event) => setTrackForm((current) => ({ ...current, duration_ms: event.target.value }))} />
          <textarea placeholder="Lyrics (markdown; chord tags like [Am] inline)" rows={6} value={trackForm.lyrics_md} onChange={(event) => setTrackForm((current) => ({ ...current, lyrics_md: event.target.value }))} />
          <textarea placeholder="Notes (your own thoughts on the track, markdown)" rows={4} value={trackForm.notes_md} onChange={(event) => setTrackForm((current) => ({ ...current, notes_md: event.target.value }))} />
          <div className={styles.actions}>
            <button disabled={busyKey === (editingTrackId ? `track:${editingTrackId}` : "track:new")} type="submit">
              {busyKey === (editingTrackId ? `track:${editingTrackId}` : "track:new")
                ? "Saving…"
                : editingTrackId
                  ? "Update track"
                  : "Add track"}
            </button>
            {editingTrackId ? (
              <button
                className={styles.secondaryButton}
                onClick={() => {
                  setEditingTrackId(null);
                  setTrackForm(emptyTrackForm);
                }}
                type="button"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>

        <div className={styles.list}>
          {data?.tracks.map((track) => (
            <div className={styles.rowCard} key={track.id}>
              <div>
                <strong>{track.title}</strong>
                <p>{track.artist} · {track.album}</p>
                <p>{track.file_path} · /music/{track.slug}</p>
              </div>
              <div className={styles.rowActions}>
                <button className={styles.secondaryButton} onClick={() => loadTrack(track)} type="button">Edit</button>
                <button
                  className={styles.dangerButton}
                  disabled={busyKey === `track-delete:${track.id}`}
                  onClick={() => void deleteTrack(track.id)}
                  type="button"
                >
                  {busyKey === `track-delete:${track.id}` ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader title="Games" note={`${data?.games.length ?? 0} browser games. Drop a self-contained HTML file under public/games/, then register it here.`} />
        <form className={styles.form} onSubmit={submitGame}>
          <input placeholder="Title" required type="text" value={gameForm.title} onChange={(event) => setGameForm((current) => ({ ...current, title: event.target.value }))} />
          <input placeholder="Description" type="text" value={gameForm.description} onChange={(event) => setGameForm((current) => ({ ...current, description: event.target.value }))} />
          <input placeholder="File path (e.g. /games/pong.html)" required type="text" value={gameForm.file_path} onChange={(event) => setGameForm((current) => ({ ...current, file_path: event.target.value }))} />
          <input placeholder="Thumbnail path (optional)" type="text" value={gameForm.thumbnail_path} onChange={(event) => setGameForm((current) => ({ ...current, thumbnail_path: event.target.value }))} />
          <div className={styles.actions}>
            <button disabled={busyKey === (editingGameId ? `game:${editingGameId}` : "game:new")} type="submit">
              {busyKey === (editingGameId ? `game:${editingGameId}` : "game:new")
                ? "Saving…"
                : editingGameId
                  ? "Update game"
                  : "Add game"}
            </button>
            {editingGameId ? (
              <button
                className={styles.secondaryButton}
                onClick={() => {
                  setEditingGameId(null);
                  setGameForm(emptyGameForm);
                }}
                type="button"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>

        <div className={styles.list}>
          {data?.games.map((game) => (
            <div className={styles.rowCard} key={game.id}>
              <div>
                <strong>{game.title}</strong>
                <p>{game.file_path} · /games/{game.slug}</p>
              </div>
              <div className={styles.rowActions}>
                <button className={styles.secondaryButton} onClick={() => loadGame(game)} type="button">Edit</button>
                <button
                  className={styles.dangerButton}
                  disabled={busyKey === `game-delete:${game.id}`}
                  onClick={() => void deleteGame(game.id)}
                  type="button"
                >
                  {busyKey === `game-delete:${game.id}` ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
