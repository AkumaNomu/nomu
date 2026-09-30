// Master switches for user-interaction features. These MUST live in a
// server-safe module (no "use client" anywhere in the import chain): values
// imported by Server Components from client modules arrive as client
// reference proxies, which are objects and therefore always truthy — a
// `false` flag defined in a "use client" file would never disable anything.
export const COMMENTS_ENABLED = false;
export const REACTIONS_ENABLED = false;
