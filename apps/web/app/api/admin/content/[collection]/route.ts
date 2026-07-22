import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminErrorStatus, createContentEntry, requireAdmin, writeAuditLog, type AdminContentCollection } from "../../_lib";

export const dynamic = "force-dynamic";

const slugSchema = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const blogPayloadSchema = z.object({
  metadata: z.object({
    title: z.string().min(1),
    slug: slugSchema,
    description: z.string().min(1),
    publishedAt: z.string().date(),
    updatedAt: z.string().date().optional(),
    category: z.string().min(1),
    tags: z.array(z.string().min(1)),
    featured: z.boolean().optional(),
    draft: z.boolean().optional(),
    cover: z.string().startsWith("/covers/"),
  }).strict(),
  body: z.string(),
});

const projectPayloadSchema = z.object({
  metadata: z.object({
    title: z.string().min(1),
    slug: slugSchema,
    description: z.string().min(1),
    year: z.number().int().min(2000).max(2100),
    status: z.enum(["planning", "building", "shipped", "paused", "archived"]),
    role: z.string().min(1).optional(),
    technologies: z.array(z.string().min(1)),
    icon: z.string().startsWith("/project-icons/"),
    featured: z.boolean().optional(),
    repository: z.url().optional(),
    website: z.url().optional(),
  }).strict(),
  body: z.string(),
});

function parseCollection(value: string): AdminContentCollection {
  if (value === "blog" || value === "projects") return value;
  throw new Error("Invalid collection");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> },
) {
  try {
    const { collection: rawCollection } = await params;
    const collection = parseCollection(rawCollection);
    const user = await requireAdmin();
    const body = await request.json();
    const parsed = collection === "blog"
      ? blogPayloadSchema.parse(body)
      : projectPayloadSchema.parse(body);

    const created = await createContentEntry(collection, parsed);

    await writeAuditLog({
      userId: user.id,
      action: "create",
      resourceType: collection,
      resourceId: created.slug,
      details: { metadata: parsed.metadata },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: adminErrorStatus(error) === 500 ? 400 : adminErrorStatus(error) });
  }
}
