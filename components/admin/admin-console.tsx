"use client";

import { useEffect, useMemo, useState } from "react";
import type { ArchiveEntry, EntryType } from "@/types/archive";

type EditorForm = {
  title: string;
  slug: string;
  ref: string;
  subtitle: string;
  excerpt: string;
  category: string;
  type: EntryType;
  tags: string;
  coverImage: string;
  coverAlt: string;
  soundtrackTitle: string;
  soundtrackArtist: string;
  soundtrackService: "youtube" | "soundcloud";
  soundtrackUrl: string;
  soundtrackFallbackSrc: string;
  quote: string;
  publishedAt: string;
  featured: boolean;
  isPublished: boolean;
  body: string;
};

type StorageAsset = {
  name: string;
  path: string;
  publicUrl: string;
  size: number | null;
  mimeType: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

const ADMIN_KEY_STORAGE = "archive-admin-key";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function postToForm(post?: ArchiveEntry | null): EditorForm {
  if (!post) {
    return {
      title: "",
      slug: "",
      ref: "",
      subtitle: "",
      excerpt: "",
      category: "Aesthetics",
      type: "essay",
      tags: "",
      coverImage: "",
      coverAlt: "",
      soundtrackTitle: "",
      soundtrackArtist: "",
      soundtrackService: "youtube",
      soundtrackUrl: "",
      soundtrackFallbackSrc: "",
      quote: "",
      publishedAt: toDateTimeLocal(new Date().toISOString()),
      featured: false,
      isPublished: true,
      body: ""
    };
  }

  return {
    title: post.title,
    slug: post.slug,
    ref: post.ref ?? "",
    subtitle: post.subtitle ?? "",
    excerpt: post.excerpt,
    category: post.category,
    type: post.type,
    tags: post.tags.join(", "),
    coverImage: post.coverImage ?? "",
    coverAlt: post.coverAlt ?? "",
    soundtrackTitle: post.soundtrackTitle ?? "",
    soundtrackArtist: post.soundtrackArtist ?? "",
    soundtrackService: post.soundtrackService ?? "youtube",
    soundtrackUrl: post.soundtrackUrl ?? "",
    soundtrackFallbackSrc: post.soundtrackFallbackSrc ?? "",
    quote: post.quote ?? "",
    publishedAt: toDateTimeLocal(post.publishedAt),
    featured: Boolean(post.featured),
    isPublished: post.isPublished ?? true,
    body: post.markdown
  };
}

function formToPayload(form: EditorForm) {
  return {
    title: form.title.trim(),
    slug: form.slug.trim(),
    ref: form.ref.trim(),
    subtitle: form.subtitle.trim(),
    excerpt: form.excerpt.trim(),
    category: form.category.trim(),
    type: form.type,
    tags: form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    coverImage: form.coverImage.trim(),
    coverAlt: form.coverAlt.trim(),
    soundtrackTitle: form.soundtrackTitle.trim(),
    soundtrackArtist: form.soundtrackArtist.trim(),
    soundtrackService: form.soundtrackService,
    soundtrackUrl: form.soundtrackUrl.trim(),
    soundtrackFallbackSrc: form.soundtrackFallbackSrc.trim(),
    quote: form.quote.trim(),
    publishedAt: new Date(form.publishedAt).toISOString(),
    featured: form.featured,
    isPublished: form.isPublished,
    body: form.body
  };
}

function formatBytes(value: number | null) {
  if (!value && value !== 0) return "n/a";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminConsole() {
  const [adminKey, setAdminKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(ADMIN_KEY_STORAGE) ?? "";
  });
  const [sessionKey, setSessionKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(ADMIN_KEY_STORAGE) ?? "";
  });
  const [posts, setPosts] = useState<ArchiveEntry[]>([]);
  const [assets, setAssets] = useState<StorageAsset[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [form, setForm] = useState<EditorForm>(() => postToForm(null));
  const [search, setSearch] = useState("");
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [slugLocked, setSlugLocked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activePost = useMemo(
    () => posts.find((post) => post.slug === selectedSlug) ?? null,
    [posts, selectedSlug]
  );

  useEffect(() => {
    if (!sessionKey) return;

    const controller = new AbortController();

    async function loadDashboard() {
      setLoadingPosts(true);
      setLoadingAssets(true);

      try {
        const [postsResponse, assetsResponse] = await Promise.all([
          fetch("/api/posts?scope=admin", {
            headers: { "x-admin-key": sessionKey },
            signal: controller.signal
          }),
          fetch("/api/storage/objects?folder=covers", {
            headers: { "x-admin-key": sessionKey },
            signal: controller.signal
          })
        ]);

        const postsPayload = await postsResponse.json();
        const assetsPayload = await assetsResponse.json();

        if (!postsResponse.ok) throw new Error(postsPayload.error ?? "Failed to load posts.");
        if (!assetsResponse.ok) throw new Error(assetsPayload.error ?? "Failed to load assets.");

        const loadedPosts = postsPayload.posts as ArchiveEntry[];
        setPosts(loadedPosts);
        setAssets(assetsPayload.objects as StorageAsset[]);

        if (loadedPosts[0]) {
          setSelectedSlug(loadedPosts[0].slug);
          setForm(postToForm(loadedPosts[0]));
          setSlugLocked(true);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setMessage(error instanceof Error ? error.message : "Unable to load dashboard.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingPosts(false);
          setLoadingAssets(false);
        }
      }
    }

    void loadDashboard();

    return () => controller.abort();
  }, [sessionKey]);

  function unlockDashboard() {
    const nextKey = adminKey.trim();
    if (!nextKey) {
      setMessage("Enter the admin write key first.");
      return;
    }

    window.localStorage.setItem(ADMIN_KEY_STORAGE, nextKey);
    setSessionKey(nextKey);
    setMessage("Dashboard unlocked. Loading content...");
  }

  function startNewPost() {
    setSelectedSlug(null);
    setForm(postToForm(null));
    setSlugLocked(false);
    setMessage("New draft started.");
  }

  async function refreshAssets() {
    if (!sessionKey) return;

    setLoadingAssets(true);
    try {
      const response = await fetch("/api/storage/objects?folder=covers", {
        headers: { "x-admin-key": sessionKey }
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Failed to load assets.");
      setAssets(payload.objects as StorageAsset[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to refresh assets.");
    } finally {
      setLoadingAssets(false);
    }
  }

  async function refreshPosts() {
    if (!sessionKey) return;

    setLoadingPosts(true);
    try {
      const response = await fetch("/api/posts?scope=admin", {
        headers: { "x-admin-key": sessionKey }
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Failed to load posts.");
      const loadedPosts = payload.posts as ArchiveEntry[];
      setPosts(loadedPosts);

      if (selectedSlug) {
        const refreshed = loadedPosts.find((post) => post.slug === selectedSlug);
        if (refreshed) {
          setForm(postToForm(refreshed));
          return;
        }
      }

      if (loadedPosts[0]) {
        setSelectedSlug(loadedPosts[0].slug);
        setForm(postToForm(loadedPosts[0]));
        setSlugLocked(true);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to refresh posts.");
    } finally {
      setLoadingPosts(false);
    }
  }

  async function uploadFile(file: File) {
    if (!sessionKey) {
      setMessage("Unlock the dashboard before uploading assets.");
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "covers");

      const response = await fetch("/api/storage/upload", {
        method: "POST",
        headers: { "x-admin-key": sessionKey },
        body: formData
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Upload failed.");

      setForm((current) => ({ ...current, coverImage: payload.publicUrl }));
      setMessage("Asset uploaded and cover URL inserted.");
      await refreshAssets();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function savePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sessionKey) {
      setMessage("Unlock the dashboard before saving content.");
      return;
    }

    setSaving(true);
    setMessage(null);

    const payload = formToPayload(form);

    try {
      const endpoint = selectedSlug ? `/api/posts/${selectedSlug}` : "/api/posts";
      const response = await fetch(endpoint, {
        method: selectedSlug ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": sessionKey
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Save failed.");

      const savedPost = result.post as ArchiveEntry;
      setMessage(`Saved: ${savedPost.title}`);
      setSelectedSlug(savedPost.slug);
      setSlugLocked(true);
      setForm(postToForm(savedPost));
      await Promise.all([refreshPosts(), refreshAssets()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCurrentPost() {
    if (!sessionKey || !selectedSlug) return;

    const confirmed = window.confirm(`Delete "${form.title || selectedSlug}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeleting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/posts/${selectedSlug}`, {
        method: "DELETE",
        headers: { "x-admin-key": sessionKey }
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Delete failed.");

      setMessage(`Deleted ${payload.slug}.`);
      await refreshPosts();
      startNewPost();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  async function deleteAsset(path: string) {
    if (!sessionKey) return;

    const confirmed = window.confirm(`Delete storage asset "${path}"?`);
    if (!confirmed) return;

    try {
      const response = await fetch("/api/storage/objects", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": sessionKey
        },
        body: JSON.stringify({ path })
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Asset delete failed.");

      setMessage(`Deleted asset: ${payload.path}`);
      await refreshAssets();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Asset delete failed.");
    }
  }

  const filteredPosts = posts.filter((post) => {
    if (!search.trim()) return true;
    const haystack = [post.title, post.slug, post.category, post.tags.join(" "), post.subtitle ?? ""].join(" ").toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <section className="mx-auto w-full max-w-content-width px-6 py-section-gap md:px-margin-page">
      <div className="mb-12 max-w-text-width">
        <p className="font-label-caps text-label-caps mb-6 text-ink-muted">Admin Dashboard</p>
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary">
          Control the archive content.
        </h1>
        <p className="font-body-md text-body-md mt-6 text-ink-muted">
          Publish and edit posts, upload cover assets to Supabase Storage, and manage what the site renders from the
          database.
        </p>
      </div>

      <div className="mb-10 grid gap-6 md:grid-cols-12">
        <div className="md:col-span-4">
          <label className="block">
            <span className="font-label-caps text-label-caps text-ink-muted">Admin Write Key</span>
            <input
              className="admin-input"
              type="password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              placeholder="ADMIN_WRITE_KEY"
            />
          </label>
        </div>
        <div className="md:col-span-8 flex flex-wrap items-end gap-3">
          <button
            type="button"
            onClick={unlockDashboard}
            className="font-label-caps text-label-caps border-[0.5px] border-primary bg-primary px-6 py-4 text-on-primary transition-opacity hover:opacity-80"
          >
            Unlock Dashboard
          </button>
          <button
            type="button"
            onClick={() => {
              void refreshPosts();
              void refreshAssets();
            }}
            disabled={!sessionKey || loadingPosts || loadingAssets}
            className="font-label-caps text-label-caps border-[0.5px] border-border-subtle bg-transparent px-6 py-4 text-primary transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {loadingPosts || loadingAssets ? "Syncing..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={startNewPost}
            className="font-label-caps text-label-caps border-[0.5px] border-border-subtle bg-transparent px-6 py-4 text-primary transition-opacity hover:opacity-80"
          >
            New Post
          </button>
          <div className="font-ui-label text-ui-label text-ink-muted">
            {sessionKey ? "Dashboard unlocked." : "Enter the key to load content."}
          </div>
        </div>
      </div>

      <div className="mb-10 border-[0.5px] border-border-subtle bg-surface-container-low p-4 font-ui-label text-ui-label text-primary">
        {message ?? "Use the panel below to edit the live content model."}
      </div>

      <div className="grid gap-8 md:grid-cols-12">
        <aside className="space-y-8 md:col-span-4">
          <section className="border-[0.5px] border-border-subtle bg-surface-container-low p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-label-caps text-label-caps text-ink-muted">Posts</h2>
              <input
                className="admin-input max-w-[11rem]"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
              />
            </div>

            <div className="space-y-3">
              {filteredPosts.map((post) => {
                const isActive = post.slug === selectedSlug;

                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => {
                      setSelectedSlug(post.slug);
                      setForm(postToForm(post));
                      setSlugLocked(true);
                    }}
                    className={`w-full border-[0.5px] px-4 py-4 text-left transition-colors ${
                      isActive
                        ? "border-primary bg-primary text-on-primary"
                        : "border-border-subtle bg-transparent text-primary hover:bg-surface-container"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-label-caps text-label-caps">{post.type}</p>
                        <h3 className="mt-2 text-lg leading-tight">{post.title}</h3>
                        <p className="mt-2 font-ui-label text-ui-label opacity-80">{post.category}</p>
                      </div>
                      <span className="font-label-caps text-[0.65rem] uppercase tracking-[0.18em] opacity-70">
                        {post.isPublished === false ? "draft" : post.featured ? "featured" : "live"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="border-[0.5px] border-border-subtle bg-surface-container-low p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-label-caps text-label-caps text-ink-muted">Storage</h2>
              <button
                type="button"
                onClick={() => {
                  void refreshAssets();
                }}
                disabled={!sessionKey || loadingAssets}
                className="font-label-caps text-[0.7rem] uppercase tracking-[0.18em] text-ink-muted disabled:opacity-40"
              >
                {loadingAssets ? "Loading" : "Reload"}
              </button>
            </div>

            <label className="block">
              <span className="font-label-caps text-label-caps text-ink-muted">Upload Cover</span>
              <input
                className="admin-input"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadFile(file);
                }}
                disabled={!sessionKey || uploading}
              />
            </label>

            <div className="mt-4 space-y-3">
              {assets.map((asset) => (
                <div key={asset.path} className="border-[0.5px] border-border-subtle bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-ui-label text-ui-label text-primary">{asset.name}</p>
                      <p className="mt-1 font-label-caps text-[0.65rem] uppercase tracking-[0.18em] text-ink-muted">
                        {formatBytes(asset.size)} {asset.mimeType ? ` | ${asset.mimeType}` : ""}
                      </p>
                      <a
                        href={asset.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block truncate font-ui-label text-ui-label text-ink-muted underline"
                      >
                        {asset.publicUrl}
                      </a>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, coverImage: asset.publicUrl }))}
                      className="font-label-caps text-[0.7rem] uppercase tracking-[0.18em] text-primary underline"
                    >
                      Use URL
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteAsset(asset.path)}
                      className="font-label-caps text-[0.7rem] uppercase tracking-[0.18em] text-error underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <form onSubmit={savePost} className="space-y-8 md:col-span-8">
          <div className="grid gap-8 md:grid-cols-2">
            <label className="block">
              <span className="font-label-caps text-label-caps text-ink-muted">Title</span>
              <input
                className="admin-input"
                value={form.title}
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  setForm((current) => ({
                    ...current,
                    title: nextTitle,
                    slug: slugLocked ? current.slug : slugify(nextTitle)
                  }));
                }}
                required
              />
            </label>
            <label className="block">
              <span className="font-label-caps text-label-caps text-ink-muted">Slug</span>
              <input
                className="admin-input"
                value={form.slug}
                onChange={(event) => {
                  setSlugLocked(true);
                  setForm((current) => ({ ...current, slug: slugify(event.target.value) }));
                }}
                required
              />
            </label>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <label className="block">
              <span className="font-label-caps text-label-caps text-ink-muted">Reference</span>
              <input
                className="admin-input"
                value={form.ref}
                onChange={(event) => setForm((current) => ({ ...current, ref: event.target.value }))}
                placeholder="104-A"
              />
            </label>
            <label className="block">
              <span className="font-label-caps text-label-caps text-ink-muted">Published At</span>
              <input
                className="admin-input"
                type="datetime-local"
                value={form.publishedAt}
                onChange={(event) => setForm((current) => ({ ...current, publishedAt: event.target.value }))}
              />
            </label>
          </div>

          <label className="block">
            <span className="font-label-caps text-label-caps text-ink-muted">Subtitle</span>
            <input
              className="admin-input"
              value={form.subtitle}
              onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))}
            />
          </label>

          <label className="block">
            <span className="font-label-caps text-label-caps text-ink-muted">Excerpt</span>
            <input
              className="admin-input"
              value={form.excerpt}
              onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))}
              required
            />
          </label>

          <div className="grid gap-8 md:grid-cols-3">
            <label className="block">
              <span className="font-label-caps text-label-caps text-ink-muted">Category</span>
              <input
                className="admin-input"
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                required
              />
            </label>
            <label className="block">
              <span className="font-label-caps text-label-caps text-ink-muted">Type</span>
              <select
                className="admin-select"
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as EntryType }))}
              >
                <option value="essay">Essay</option>
                <option value="fragment">Fragment</option>
                <option value="chronicle">Chronicle</option>
              </select>
            </label>
            <label className="block">
              <span className="font-label-caps text-label-caps text-ink-muted">Quote</span>
              <input
                className="admin-input"
                value={form.quote}
                onChange={(event) => setForm((current) => ({ ...current, quote: event.target.value }))}
                placeholder="Optional pull quote"
              />
            </label>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <label className="block">
              <span className="font-label-caps text-label-caps text-ink-muted">Cover URL</span>
              <input
                className="admin-input"
                value={form.coverImage}
                onChange={(event) => setForm((current) => ({ ...current, coverImage: event.target.value }))}
                placeholder="https://..."
              />
            </label>
            <label className="block">
              <span className="font-label-caps text-label-caps text-ink-muted">Cover Alt</span>
              <input
                className="admin-input"
                value={form.coverAlt}
                onChange={(event) => setForm((current) => ({ ...current, coverAlt: event.target.value }))}
              />
            </label>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <label className="block">
              <span className="font-label-caps text-label-caps text-ink-muted">Soundtrack Title</span>
              <input
                className="admin-input"
                value={form.soundtrackTitle}
                onChange={(event) => setForm((current) => ({ ...current, soundtrackTitle: event.target.value }))}
              />
            </label>
            <label className="block">
              <span className="font-label-caps text-label-caps text-ink-muted">Soundtrack Artist</span>
              <input
                className="admin-input"
                value={form.soundtrackArtist}
                onChange={(event) => setForm((current) => ({ ...current, soundtrackArtist: event.target.value }))}
              />
            </label>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <label className="block">
              <span className="font-label-caps text-label-caps text-ink-muted">Soundtrack Service</span>
              <select
                className="admin-select"
                value={form.soundtrackService}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    soundtrackService: event.target.value as "youtube" | "soundcloud"
                  }))
                }
              >
                <option value="youtube">YouTube</option>
                <option value="soundcloud">SoundCloud</option>
              </select>
            </label>
            <label className="block">
              <span className="font-label-caps text-label-caps text-ink-muted">Soundtrack URL</span>
              <input
                className="admin-input"
                value={form.soundtrackUrl}
                onChange={(event) => setForm((current) => ({ ...current, soundtrackUrl: event.target.value }))}
              />
            </label>
            <label className="block">
              <span className="font-label-caps text-label-caps text-ink-muted">Fallback Source</span>
              <input
                className="admin-input"
                value={form.soundtrackFallbackSrc}
                onChange={(event) => setForm((current) => ({ ...current, soundtrackFallbackSrc: event.target.value }))}
              />
            </label>
          </div>

          <label className="block">
            <span className="font-label-caps text-label-caps text-ink-muted">Tags</span>
            <input
              className="admin-input"
              value={form.tags}
              onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              placeholder="architecture, minimalism, interface"
            />
          </label>

          <div className="grid gap-8 md:grid-cols-[1fr_auto_auto]">
            <label className="flex items-center gap-3 border-[0.5px] border-border-subtle bg-surface-container-low px-4 py-3">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))}
              />
              <span className="font-ui-label text-ui-label text-primary">Featured</span>
            </label>
            <label className="flex items-center gap-3 border-[0.5px] border-border-subtle bg-surface-container-low px-4 py-3">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))}
              />
              <span className="font-ui-label text-ui-label text-primary">Published</span>
            </label>
            <div className="font-ui-label text-ui-label text-ink-muted md:text-right">
              {activePost ? `Editing ${activePost.slug}` : "Creating a new entry"}
            </div>
          </div>

          <label className="block">
            <span className="font-label-caps text-label-caps text-ink-muted">Body</span>
            <textarea
              className="admin-textarea mt-3"
              value={form.body}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
              placeholder="Write markdown. Obsidian-style links, embeds, callouts, and math are supported."
              required
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="font-label-caps text-label-caps border-[0.5px] border-primary bg-primary px-6 py-4 text-on-primary transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {saving ? "Saving..." : selectedSlug ? "Update Entry" : "Publish Entry"}
            </button>
            <button
              type="button"
              onClick={deleteCurrentPost}
              disabled={!selectedSlug || deleting}
              className="font-label-caps text-label-caps border-[0.5px] border-error bg-transparent px-6 py-4 text-error transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {deleting ? "Deleting..." : "Delete Entry"}
            </button>
            <button
              type="button"
              onClick={startNewPost}
              className="font-label-caps text-label-caps border-[0.5px] border-border-subtle bg-transparent px-6 py-4 text-primary transition-opacity hover:opacity-80"
            >
              Reset Form
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
