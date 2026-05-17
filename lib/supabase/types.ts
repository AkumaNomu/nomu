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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

