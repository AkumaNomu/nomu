# The Archive -- Next.js + Supabase

This is a full App Router conversion of the provided archive/library HTML mockups into a deployable Next.js application.

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Framer Motion for slow, subtle entrance/ambient motion
- Supabase database + Supabase Storage
- Vercel-ready environment variables

## Routes

- `/` -- reader-style home article
- `/archive` -- library view with side navigation, featured essays, and fragment spines
- `/index` -- searchable/filterable archive directory
- `/writing/[slug]` -- essay/article reader page
- `/fragments/[slug]` -- poetic fragment page
- `/about` -- manifesto/about page
- `/colophon` -- design system/specimen page
- `/admin` -- content dashboard with Supabase Storage upload and post editing
- `/api/posts` -- GET list, POST create
- `/api/posts/[slug]` -- GET one post
- `/api/storage/upload` -- POST file upload to Supabase Storage
- `/api/storage/objects` -- GET/DELETE storage objects for the admin dashboard
- `/api/health` -- environment readiness check
- `/api/revalidate` -- optional on-demand path revalidation

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app works with seeded local content even before Supabase is configured. Once Supabase env vars are present, reads come from the `posts` table.

To sanity-check production readiness locally:

```bash
npm run check
```

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/schema.sql`.
3. Optionally run `supabase/seed.sql`.
4. Copy your project URL and anon key into `.env.local`.
5. Copy your service role key into `SUPABASE_SERVICE_ROLE_KEY` for server-side writes/uploads only.
6. Keep the bucket name as `archive-assets`, or change `SUPABASE_STORAGE_BUCKET`.

## Vercel setup

Add these environment variables in Vercel Project Settings:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=archive-assets
ADMIN_WRITE_KEY=
REVALIDATE_SECRET=
```

Then deploy normally:

```bash
vercel
```

## Admin publishing

Visit `/admin`, paste the `ADMIN_WRITE_KEY`, unlock the dashboard, edit an existing post or publish a new one, and upload a cover image if needed. The write routes use the service role key server-side and never expose it to the browser.

For production, replace the simple admin key with Supabase Auth and protected middleware if multiple editors will use the system.
