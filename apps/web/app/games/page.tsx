import type { Metadata, Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { commentsDb } from "@/lib/db";
import styles from "./games.module.css";

export const metadata: Metadata = {
  title: "Games",
  description: "Small browser games, playable right here.",
  alternates: { canonical: "/games" },
};

export const dynamic = "force-dynamic";

type GameEntry = { id: string; title: string; slug: string; description?: string; thumbnail_path?: string };

async function getGames(): Promise<GameEntry[]> {
  if (!commentsDb) return [];
  return await commentsDb`
    SELECT id, title, slug, description, thumbnail_path
    FROM public.games
    ORDER BY created_at DESC
  ` as GameEntry[];
}

export default async function GamesPage() {
  const games = await getGames();

  return (
    <div className="site-shell">
      <div className={styles.page}>
        <h1 className={styles.heading}>Games</h1>
        <p className={styles.intro}>Small offline browser games. No install, just click and play.</p>
        {games.length ? (
          <div className={styles.grid}>
            {games.map((game) => (
              <Link className={styles.card} href={`/games/${game.slug}` as Route} key={game.id}>
                <span className={styles.thumb}>
                  {game.thumbnail_path ? <Image src={game.thumbnail_path} width={240} height={160} alt="" /> : <span className={styles.thumbFallback} aria-hidden="true">▶</span>}
                </span>
                <span className={styles.meta}>
                  <strong>{game.title}</strong>
                  {game.description ? <span>{game.description}</span> : null}
                </span>
              </Link>
            ))}
          </div>
        ) : <p className={styles.empty}>No games yet.</p>}
      </div>
    </div>
  );
}
