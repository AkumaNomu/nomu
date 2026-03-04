export const meta = {
  id: 'prompt-builder',
  name: 'Prompt Template Builder',
  description: 'Build structured prompts offline.',
  keywords: 'prompt ai template',
  category: 'AI Tools',
  icon: 'code',
  inputType: 'text',
  supportsCopy: true,
  supportsDownload: false,
};

export const schema = {
  fields: [
    {
      id: 'intent',
      type: 'select',
      label: 'Intent',
      default: 'summarize',
      options: [
        { value: 'summarize', label: 'Summarize' },
        { value: 'rewrite', label: 'Rewrite' },
        { value: 'brainstorm', label: 'Brainstorm' },
        { value: 'code-review', label: 'Code Review' },
      ],
    },
    {
      id: 'tone',
      type: 'select',
      label: 'Tone',
      default: 'clear',
      options: [
        { value: 'clear', label: 'Clear and direct' },
        { value: 'friendly', label: 'Friendly' },
        { value: 'formal', label: 'Formal' },
        { value: 'creative', label: 'Creative' },
      ],
    },
    {
      id: 'constraints',
      type: 'textarea',
      label: 'Constraints',
      placeholder: 'e.g., bullet points, max 200 words',
      default: '',
    },
  ],
  input: {
    id: 'context',
    type: 'textarea',
    label: 'Context / Source',
    placeholder: 'Paste the text or context here...',
    default: '',
  },
  output: {
    id: 'result',
    label: 'Final Prompt',
    type: 'textarea',
    placeholder: 'Prompt will appear here',
  },
};

function intentLine(intent) {
  switch (intent) {
    case 'summarize':
      return 'Summarize the content below.';
    case 'rewrite':
      return 'Rewrite the content below.';
    case 'brainstorm':
      return 'Brainstorm ideas based on the context below.';
    case 'code-review':
      return 'Review the following code and provide actionable feedback.';
    default:
      return 'Process the content below.';
  }
}

function toneLine(tone) {
  switch (tone) {
    case 'friendly':
      return 'Use a friendly, approachable tone.';
    case 'formal':
      return 'Use a formal, professional tone.';
    case 'creative':
      return 'Use a creative, engaging tone.';
    default:
      return 'Be clear and concise.';
  }
}

export function compute(state) {
  const context = (state.context || '').trim();
  if (!context) return { output: { result: '' } };
  const parts = [
    intentLine(state.intent),
    toneLine(state.tone),
  ];
  if (state.constraints) parts.push(`Constraints: ${state.constraints.trim()}`);
  parts.push('\nContent:\n' + context);
  return { output: { result: parts.join('\n') } };
}
