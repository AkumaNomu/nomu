insert into public.posts
(ref, slug, title, subtitle, excerpt, body, quote, type, category, tags, published_at, cover_image, cover_alt, featured, is_published)
values
(
  '104-A',
  'architecture-of-silence',
  'The Architecture of Silence',
  'Negative space as a structural material.',
  'An exploration of negative space in digital interfaces, where the absence of elements speaks louder than their presence.',
  array[
    'Silence is not the absence of design. It is the discipline of refusing to fill every surface with proof of effort.',
    'A quiet interface is built through proportion, restraint, and the careful placement of interruption.',
    'When a reader enters such a space, the work of attention becomes slower.'
  ],
  null,
  'essay',
  'Aesthetics',
  array['architecture', 'minimalism', 'interface'],
  '2024-10-14',
  'https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1600&auto=format&fit=crop',
  'A grayscale architectural surface with deep shadows.',
  true,
  true
),
(
  'FR-04',
  'memory-is-a-poet',
  'Memory is a poet',
  null,
  'Memory is a poet, not an historian.',
  array['Memory is a poet, not an historian.'],
  'Memory is a poet, not an historian.',
  'fragment',
  'Memory',
  array['fragment', 'memory'],
  '2024-01-05',
  null,
  null,
  false,
  true
)
on conflict (slug) do nothing;
