// Custom remark plugin adding Obsidian-flavored Markdown support:
//   - Callouts:  > [!NOTE] Title / body  -> renders through the <Callout> component
//   - Wikilinks: [[Page Name]] / [[Page Name|Display]] -> internal links
//   - Embeds:    ![[image.png]] -> standard image (renders via the img handler)
//   - Mermaid:   ```mermaid fenced blocks -> <Mermaid> component (bypasses shiki)
//
// Runs as a plain function plugin so it can produce mdxJsxFlowElement nodes that
// resolve against the components map provided by useMDXComponents.

import { visit, SKIP } from "unist-util-visit";

// Assumption (documented per task): wikilinks cannot resolve a page-name -> slug
// map at the plugin level, so [[Name]] links to /blog/<kebab-slug-of-name>.
const WIKI_BASE = "/blog/";

const CALLOUT_TITLES = {
  note: "Note",
  info: "Info",
  tip: "Tip",
  hint: "Tip",
  important: "Important",
  success: "Success",
  check: "Success",
  question: "Question",
  faq: "Question",
  warning: "Warning",
  caution: "Warning",
  attention: "Warning",
  danger: "Danger",
  error: "Danger",
  bug: "Bug",
  example: "Example",
  quote: "Quote",
  abstract: "Summary",
  summary: "Summary",
  todo: "To-do",
};

const CALLOUT_ICONS = {
  Note: "\u{1F4DD}",
  Info: "ℹ️",
  Tip: "\u{1F4A1}",
  Important: "❗",
  Success: "✅",
  Question: "❓",
  Warning: "⚠️",
  Danger: "\u{1F6D1}",
  Bug: "\u{1F41B}",
  Example: "\u{1F9EA}",
  Quote: "\u{1F4AC}",
  Summary: "\u{1F5D2}️",
  "To-do": "☑️",
};

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function jsxAttribute(name, value) {
  return { type: "mdxJsxAttribute", name, value };
}

// Split a text value on [[wikilink]] and ![[embed]] tokens into mdast nodes.
function splitWikilinks(value) {
  const pattern = /(!?)\[\[([^\]]+?)\]\]/g;
  const nodes = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: "text", value: value.slice(lastIndex, match.index) });
    }

    const isEmbed = match[1] === "!";
    const inner = match[2];

    if (isEmbed) {
      // ![[image.png]] -> treat exactly like ![](image.png)
      nodes.push({ type: "image", url: inner.trim(), alt: inner.trim(), title: null });
    } else {
      const [namePart, displayPart] = inner.split("|");
      const name = namePart.trim();
      const display = (displayPart ?? namePart).trim();
      nodes.push({
        type: "link",
        url: `${WIKI_BASE}${slugify(name)}`,
        title: null,
        children: [{ type: "text", value: display }],
      });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < value.length) {
    nodes.push({ type: "text", value: value.slice(lastIndex) });
  }

  return nodes;
}

export default function remarkObsidian() {
  return (tree) => {
    // 1. Mermaid fenced code blocks -> <Mermaid chart="...">
    visit(tree, "code", (node, index, parent) => {
      if (!parent || index == null) return;
      if ((node.lang || "").toLowerCase() !== "mermaid") return;

      parent.children[index] = {
        type: "mdxJsxFlowElement",
        name: "Mermaid",
        attributes: [jsxAttribute("chart", node.value)],
        children: [],
      };
      return [SKIP, index];
    });

    // 2. Obsidian callouts: blockquote whose first line is [!TYPE] ...
    visit(tree, "blockquote", (node, index, parent) => {
      if (!parent || index == null) return;
      const firstChild = node.children[0];
      if (!firstChild || firstChild.type !== "paragraph") return;
      const firstText = firstChild.children[0];
      if (!firstText || firstText.type !== "text") return;

      const value = firstText.value;
      const newlineIndex = value.indexOf("\n");
      const firstLine = newlineIndex === -1 ? value : value.slice(0, newlineIndex);
      const rest = newlineIndex === -1 ? "" : value.slice(newlineIndex + 1);

      const calloutMatch = /^\[!(\w+)\][-+]?\s*(.*)$/.exec(firstLine.trim());
      if (!calloutMatch) return;

      const type = calloutMatch[1].toLowerCase();
      const customTitle = calloutMatch[2].trim();
      const baseTitle = CALLOUT_TITLES[type] || (type.charAt(0).toUpperCase() + type.slice(1));
      const icon = CALLOUT_ICONS[baseTitle] ? `${CALLOUT_ICONS[baseTitle]} ` : "";
      const title = `${icon}${customTitle || baseTitle}`;

      // Strip the marker line from the first paragraph.
      if (rest) {
        firstText.value = rest;
      } else {
        firstChild.children.shift();
        if (firstChild.children.length === 0) {
          node.children.shift();
        }
      }

      parent.children[index] = {
        type: "mdxJsxFlowElement",
        name: "Callout",
        attributes: [jsxAttribute("title", title)],
        children: node.children,
      };
      return [SKIP, index];
    });

    // 3. Wikilinks + embeds inside text nodes.
    visit(tree, "text", (node, index, parent) => {
      if (!parent || index == null) return;
      if (!/!?\[\[/.test(node.value)) return;

      const replacement = splitWikilinks(node.value);
      if (replacement.length === 1 && replacement[0].type === "text") return;

      parent.children.splice(index, 1, ...replacement);
      return [SKIP, index + replacement.length];
    });
  };
}
