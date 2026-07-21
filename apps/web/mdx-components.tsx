import type { MDXComponents } from "mdx/types";
import { mdxComponents } from "@/components/mdx/MdxComponents";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...mdxComponents, ...components };
}
