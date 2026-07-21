import type { NextConfig } from "next";
import path from "node:path";
import createMDX from "@next/mdx";

// @next/mdx resolves plugins passed as strings (module names) or absolute paths,
// which keeps the config serializable for Turbopack. Custom local plugins are
// referenced by absolute path so they resolve regardless of the MDX file's dir.
const remarkObsidian = path.resolve(process.cwd(), "lib/mdx/remark-obsidian.mjs");

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  typedRoutes: true,
  transpilePackages: [
    "@personal/design-system",
    "@personal/motion-system",
    "@personal/shared-scenes"
  ]
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [
      "remark-frontmatter",
      "remark-gfm",
      remarkObsidian,
      "remark-math"
    ],
    rehypePlugins: [
      [
        "rehype-pretty-code",
        {
          theme: "github-dark",
          keepBackground: true
        }
      ],
      "rehype-katex"
    ]
  }
});

export default withMDX(nextConfig);
