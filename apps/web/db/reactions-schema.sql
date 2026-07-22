-- Post likes/dislikes. One reaction per (slug, user) — changing your vote
-- updates the row instead of adding another; removing it deletes the row.

CREATE TABLE IF NOT EXISTS public.post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reaction smallint NOT NULL CHECK (reaction IN (1, -1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, user_id)
);

CREATE INDEX IF NOT EXISTS post_reactions_slug_idx
  ON public.post_reactions (slug);
