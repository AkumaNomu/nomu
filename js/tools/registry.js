export const TOOL_CATEGORIES = ['Image'];

export const TOOL_DEFS = [
  {
    id: 'image-converter',
    name: 'Image Converter',
    description: 'Convert and resize images (client-side).',
    category: 'Image',
    keywords: 'image convert png jpeg webp resize compress',
    icon: 'image',
    loader: () => import('./modules/image-converter.js'),
  },
];

export function buildToolIndex(toolDefs = TOOL_DEFS) {
  return toolDefs.map(tool => {
    const hay = [tool.name, tool.description, tool.keywords, tool.category]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return { id: tool.id, hay };
  });
}
