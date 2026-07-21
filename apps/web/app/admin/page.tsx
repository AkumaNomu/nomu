"use client";

import { FormEvent, useEffect, useState } from "react";
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
  created_at: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    album: "",
    file_path: "",
    artwork_path: "",
    duration_ms: "",
  });

  useEffect(() => {
    fetchTracks();
  }, []);

  async function fetchTracks() {
    try {
      const res = await fetch("/api/admin/music");
      if (res.status === 403) {
        router.push("/");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch tracks");
      setTracks(await res.json());
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          duration_ms: formData.duration_ms ? parseInt(formData.duration_ms) : null,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      setFormData({ title: "", artist: "", album: "", file_path: "", artwork_path: "", duration_ms: "" });
      await fetchTracks();
    } catch (err) {
      setError(String(err));
    }
  }

  if (loading) return <div className={styles.container}>Loading...</div>;

  return (
    <div className={styles.container}>
      <h1>Admin Dashboard</h1>

      <section className={styles.section}>
        <h2>Add Music</h2>
        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            placeholder="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Artist"
            value={formData.artist}
            onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Album"
            value={formData.album}
            onChange={(e) => setFormData({ ...formData, album: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="File path (e.g., /audio/file.mp3)"
            value={formData.file_path}
            onChange={(e) => setFormData({ ...formData, file_path: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Artwork path (optional, e.g., /album-art/file.svg)"
            value={formData.artwork_path}
            onChange={(e) => setFormData({ ...formData, artwork_path: e.target.value })}
          />
          <input
            type="number"
            placeholder="Duration (ms, optional)"
            value={formData.duration_ms}
            onChange={(e) => setFormData({ ...formData, duration_ms: e.target.value })}
          />
          <button type="submit">Add Track</button>
        </form>
      </section>

      <section className={styles.section}>
        <h2>Music Library ({tracks.length})</h2>
        <div className={styles.tracklist}>
          {tracks.length === 0 ? (
            <p>No tracks yet</p>
          ) : (
            tracks.map((track) => (
              <div key={track.id} className={styles.trackItem}>
                <div>
                  <strong>{track.title}</strong> by {track.artist}
                  <br />
                  <small>{track.album}</small>
                </div>
                <small>{track.file_path}</small>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
