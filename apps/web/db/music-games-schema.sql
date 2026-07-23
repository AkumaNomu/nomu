-- Music library extras (lyrics/chords markdown, personal notes) + browser games

ALTER TABLE public.music
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS lyrics_md text,
  ADD COLUMN IF NOT EXISTS notes_md text;

UPDATE public.music
SET slug = trim(both '-' from lower(regexp_replace(title || '-' || artist, '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || substr(id::text, 1, 8)
WHERE slug IS NULL;

ALTER TABLE public.music ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS music_slug_idx ON public.music (slug);

-- Browser games: simple self-contained HTML5 games served sandboxed
CREATE TABLE IF NOT EXISTS public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  thumbnail_path text,
  file_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS games_created_at_idx ON public.games (created_at DESC);
