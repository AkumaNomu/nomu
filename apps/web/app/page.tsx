import { redirect } from "next/navigation";
import { getAllBlog } from "@/lib/content";

export default function LatestBlogRedirect() {
  const latest = getAllBlog()[0];
  redirect(`/blog/${latest.metadata.slug}`);
}
