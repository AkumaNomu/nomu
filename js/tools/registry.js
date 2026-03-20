export const TOOL_CATEGORIES = ['Image', 'Audio'];

export const TOOL_DEFS = [
  {
    id: 'image-converter',
    name: 'Image Compressor / Converter',
    description: 'Compress, convert, and resize images (client-side).',
    category: 'Image',
    keywords: 'image convert png jpeg webp resize compress optimize quality',
    icon: 'image',
    supportsDownload: true,
    loader: () => import('./modules/image-converter.js'),
  },
  {
    id: 'audio-converter',
    name: 'Audio Compressor / Converter',
    description: 'Compress and convert audio files in-browser.',
    category: 'Audio',
    keywords: 'audio convert compress bitrate opus wav webm ogg',
    icon: 'audio',
    supportsDownload: true,
    loader: () => import('./modules/audio-converter.js'),
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
