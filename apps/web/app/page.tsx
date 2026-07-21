import { redirect } from "next/navigation";
import { getAllWriting } from "@/lib/content";

export default function LatestWritingRedirect() {
  const latest = getAllWriting()[0];
  redirect(`/writing/${latest.metadata.slug}`);
}
