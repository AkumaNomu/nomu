import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { commentsDb } from "@/lib/db";
import styles from "../games.module.css";

export const dynamic = "force-dynamic";

type GameDetail = { id: string; title: string; slug: string; description?: string; file_path: string };

async function getGame(slug: string): Promise<GameDetail | null> {
  if (!commentsDb) return null;
  const rows = await commentsDb`
    SELECT id, title, slug, description, file_path
    FROM public.games
    WHERE slug = ${slug}
    LIMIT 1
  ` as GameDetail[];
  return rows[0] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGame(slug);
  if (!game) return {};
  return { title: game.title, description: game.description || `Play ${game.title} in the browser.`, alternates: { canonical: `/games/${game.slug}` } };
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = await getGame(slug);
  if (!game) notFound();

  return (
    <div className="site-shell">
      <div className={styles.page}>
        <header className={styles.detailHeader}>
          <h1>{game.title}</h1>
          {game.description ? <p>{game.description}</p> : null}
        </header>
        <div className={styles.frameShell}>
          {/* No allow-same-origin: the game can run scripts but can't read/write this origin's cookies, storage, or DOM. */}
          <iframe className={styles.frame} src={game.file_path} title={game.title} sandbox="allow-scripts allow-pointer-lock" />
        </div>
      </div>
    </div>
  );
}
