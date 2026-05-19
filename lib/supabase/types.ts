import type { SupabasePostRow } from "@/types/archive";

// Minimal Supabase Database type compatible with `@supabase/supabase-js` generics.
// Keeping this local avoids requiring generated types during early prototyping.
export type Database = {
  public: {
    Tables: {
      posts: {
        Row: SupabasePostRow;
        Insert: Omit<SupabasePostRow, "id"> & { id?: string };
        Update: Partial<Omit<SupabasePostRow, "id">>;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          post_slug: string;
          author: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_slug: string;
          author: string;
          body: string;
          created_at?: string;
        };
        Update: Partial<{
          post_slug: string;
          author: string;
          body: string;
          created_at: string;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
