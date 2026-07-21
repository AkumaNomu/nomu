import "server-only";

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

export const commentsDb = databaseUrl ? neon(databaseUrl) : null;

