---
title: Markdown Test Post
date: 1970-01-01
category: Development
excerpt: A comprehensive test of all markdown features supported on this site, from headings to footnotes.
cover: assets/images/Markdowntest.png
---

This post demonstrates all the markdown features supported on nomu.dev. Use it as a reference for writing new posts.

## Headings

You can use ATX-style headings with `#` symbols:

# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

Or Setext-style for H1 and H2:

Heading 1
=========

Heading 2
---------

## Text Emphasis

You can make text *italic* or _italic_, **bold** or __bold__, and even ***bold italic*** or ___bold italic___.

You can also use ~~strikethrough~~ text.

## Lists

### Unordered Lists

- First item
- Second item
- Third item
  - Nested item 1
  - Nested item 2
    - Deeply nested item

### Ordered Lists

1. First item
2. Second item
3. Third item
   1. Nested ordered item
   2. Another nested item

## Links

You can create [inline links](https://example.com) or use [reference-style links][ref].

Plain URLs are also auto-linked: https://nomu.dev

[ref]: https://example.com "Reference link"

## Images

Inline image:
![Alt text](https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=400&fit=crop)

Reference-style image:
![Alt text][image-ref]

[image-ref]: https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&h=400&fit=crop "Code on screen"

## Code

Inline `code` looks like this.

Code blocks with syntax highlighting:

```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
  return true;
}

greet('world');
```

Code block without language:

```
This is a plain code block
No syntax highlighting here
```

## Blockquotes

> This is a blockquote.
> It can span multiple lines.

Nested blockquotes:

> This is the first level
> > This is nested
> > > This is deeply nested

## Tables

| Feature | Status | Notes |
|---------|--------|-------|
| Headings | ✓ | All levels supported |
| Lists | ✓ | Nested lists work |
| Code | ✓ | Inline and blocks |
| Tables | ✓ | You're reading one |

Tables with alignment:

| Left aligned | Center aligned | Right aligned |
|:-------------|:--------------:|--------------:|
| Left | Center | Right |
| A | B | C |

## Horizontal Rules

You can create horizontal rules with three or more hyphens, asterisks, or underscores:

---

***

___

## Footnotes

This is a sentence with a footnote[^1].

Here's another one with a longer footnote[^longnote].

[^1]: This is the footnote content.

[^longnote]: This is a longer footnote with multiple paragraphs.
    
    You can include multiple paragraphs in footnotes by indenting them.

## Inline HTML

You can also use inline HTML when needed:

<div style="padding: 1rem; border: 1px solid #2a2a2a; margin: 1rem 0;">
  This is a custom HTML block with <strong>bold text</strong> and <em>italic text</em>.
</div>

Here's an embedded YouTube video thumbnail that links to YouTube:

<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">
  <img src="https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" alt="YouTube Video" style="max-width: 100%; border: 1px solid #2a2a2a;">
</a>

## Conclusion

This covers all the major markdown features supported on this site. Use this post as a reference when creating new content!

