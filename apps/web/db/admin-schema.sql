-- Admin roles and music management tables

-- Add admin role to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Music library metadata
CREATE TABLE IF NOT EXISTS public.music (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  artist text NOT NULL CHECK (char_length(artist) BETWEEN 1 AND 200),
  album text NOT NULL CHECK (char_length(album) BETWEEN 1 AND 200),
  file_path text NOT NULL UNIQUE,
  artwork_path text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS music_artist_idx ON public.music (artist);
CREATE INDEX IF NOT EXISTS music_created_at_idx ON public.music (created_at DESC);

-- Audit log for admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_user_id_idx ON public.admin_audit (user_id);
CREATE INDEX IF NOT EXISTS admin_audit_created_at_idx ON public.admin_audit (created_at DESC);
