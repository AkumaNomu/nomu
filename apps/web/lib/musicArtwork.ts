// Neutral gray note glyph — used whenever a DB track has no artwork_path, so
// <Image> never points at a missing file. Shared by server pages and the
// client-side AudioProvider.
export const FALLBACK_ARTWORK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%23222'/%3E%3Cpath d='M24 40a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm0 0V16l18-4v20' stroke='%23888' stroke-width='2.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";
