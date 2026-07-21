declare module "*.mdx" {
  import type { ComponentType } from "react";

  const MdxContent: ComponentType<Record<string, never>>;
  export default MdxContent;
}
