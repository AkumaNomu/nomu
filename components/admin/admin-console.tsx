"use client";

import { useState } from "react";
import type { EntryType } from "@/types/archive";

const emptyForm = {
  title: "",
  slug: "",
  ref: "",
  excerpt: "",
  category: "Aesthetics",
  type: "essay" as EntryType,
  tags: "",
  coverImage: "",
  coverAlt: "",
  body: ""
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function AdminConsole() {
  const [adminKey, setAdminKey] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "covers");

    const response = await fetch("/api/storage/upload", {
      method: "POST",
      headers: { "x-admin-key": adminKey },
      body: formData
    });

    const payload = await response.json();
    setUploading(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Upload failed.");
      return;
    }

    setForm((current) => ({ ...current, coverImage: payload.publicUrl }));
    setMessage("Image uploaded and cover URL inserted.");
  }

  async function savePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const response = await fetch("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey
      },
      body: JSON.stringify({
        ...form,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        body: form.body,
        publishedAt: new Date().toISOString(),
        isPublished: true
      })
    });

    const payload = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Save failed.");
      return;
    }

    setMessage(`Saved: ${payload.post.title}`);
    setForm(emptyForm);
  }

  return (
    <section className="mx-auto w-full max-w-content-width px-6 py-section-gap md:px-margin-page">
      <div className="mb-16 max-w-text-width">
        <p className="font-label-caps text-label-caps mb-6 text-ink-muted">Admin Console</p>
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary">
          Publish to the archive.
        </h1>
        <p className="font-body-md text-body-md mt-6 text-ink-muted">
          This is intentionally minimal. It writes markdown files through route handlers, with storage upload support for article covers.
        </p>
      </div>

      <form onSubmit={savePost} className="grid gap-10 md:grid-cols-12">
        <div className="space-y-8 md:col-span-4">
          <label className="block">
            <span className="font-label-caps text-label-caps text-ink-muted">Admin Write Key</span>
            <input
              className="admin-input"
              type="password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              placeholder="ADMIN_WRITE_KEY"
              required
            />
          </label>

          <label className="block">
            <span className="font-label-caps text-label-caps text-ink-muted">Cover Upload</span>
            <input
              className="admin-input"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadFile(file);
              }}
              disabled={!adminKey || uploading}
            />
          </label>

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

          {message ? (
            <div className="border-[0.5px] border-border-subtle bg-surface-container-low p-4 font-ui-label text-ui-label text-primary">
              {message}
            </div>
          ) : null}
        </div>

        <div className="space-y-8 md:col-span-8">
          <div className="grid gap-8 md:grid-cols-2">
            <label className="block">
              <span className="font-label-caps text-label-caps text-ink-muted">Title</span>
              <input
                className="admin-input"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                    slug: current.slug || slugify(event.target.value)
                  }))
                }
                required
              />
            </label>
            <label className="block">
              <span className="font-label-caps text-label-caps text-ink-muted">Slug</span>
              <input
                className="admin-input"
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))}
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
              <span className="font-label-caps text-label-caps text-ink-muted">Category</span>
              <input
                className="admin-input"
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                required
              />
            </label>
          </div>

          <label className="block">
            <span className="font-label-caps text-label-caps text-ink-muted">Excerpt</span>
            <input
              className="admin-input"
              value={form.excerpt}
              onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))}
              required
            />
          </label>

          <label className="block">
            <span className="font-label-caps text-label-caps text-ink-muted">Tags</span>
            <input
              className="admin-input"
              value={form.tags}
              onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              placeholder="architecture, minimalism, interface"
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

          <button
            type="submit"
            disabled={saving}
            className="font-label-caps text-label-caps border-[0.5px] border-primary bg-primary px-6 py-4 text-on-primary transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {saving ? "Saving..." : "Publish Entry"}
          </button>
        </div>
      </form>
    </section>
  );
}
