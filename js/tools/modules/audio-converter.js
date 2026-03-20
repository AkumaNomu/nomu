import { clampNumber } from '../shared/dom.js';
import { fmtBytes } from '../shared/format.js';

function extFromMime(format) {
  const fmt = String(format || '');
  if (fmt.startsWith('audio/webm')) return 'webm';
  if (fmt.startsWith('audio/ogg')) return 'ogg';
  if (fmt.startsWith('audio/wav')) return 'wav';
  return 'audio';
}

function pcm16FromAudioBuffer(buffer) {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length * numChannels * 2;
  const output = new DataView(new ArrayBuffer(44 + length));

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) output.setUint8(offset + i, str.charCodeAt(i));
  }

  writeString(0, 'RIFF');
  output.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  output.setUint32(16, 16, true);
  output.setUint16(20, 1, true);
  output.setUint16(22, numChannels, true);
  output.setUint32(24, buffer.sampleRate, true);
  output.setUint32(28, buffer.sampleRate * numChannels * 2, true);
  output.setUint16(32, numChannels * 2, true);
  output.setUint16(34, 16, true);
  writeString(36, 'data');
  output.setUint32(40, length, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      output.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([output.buffer], { type: 'audio/wav' });
}

async function renderBuffer(buffer, targetSampleRate, targetChannels) {
  const length = Math.ceil(buffer.duration * targetSampleRate);
  const offline = new OfflineAudioContext(targetChannels, length, targetSampleRate);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start(0);
  return offline.startRendering();
}

async function encodeWithMediaRecorder(buffer, format, bitrateKbps) {
  const preferredMime = String(format || '').split(';')[0];
  let mimeType = '';
  if (window.MediaRecorder && window.MediaRecorder.isTypeSupported(format)) mimeType = format;
  else if (window.MediaRecorder && window.MediaRecorder.isTypeSupported(preferredMime)) mimeType = preferredMime;
  else if (window.MediaRecorder && window.MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
  else if (window.MediaRecorder && window.MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
  if (!mimeType) throw new Error('Browser cannot encode to the selected compressed format.');

  const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: buffer.sampleRate });
  const source = ctx.createBufferSource();
  const destination = ctx.createMediaStreamDestination();
  source.buffer = buffer;
  source.connect(destination);

  const chunks = [];
  const recorder = new MediaRecorder(destination.stream, {
    mimeType,
    audioBitsPerSecond: Math.round(bitrateKbps * 1000),
  });

  const done = new Promise((resolve, reject) => {
    recorder.ondataavailable = event => {
      if (event.data && event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error('MediaRecorder failed while encoding audio.'));
    recorder.onstop = () => resolve();
  });

  recorder.start();
  source.start(0);
  source.onended = () => recorder.stop();
  await done;
  await ctx.close();
  return new Blob(chunks, { type: mimeType.split(';')[0] || 'audio/webm' });
}

function resetRuntime(runtime) {
  if (runtime.previewUrl) URL.revokeObjectURL(runtime.previewUrl);
  runtime.previewUrl = '';
  runtime.outputBlob = null;
  runtime.outputName = '';
}

function updatePreview(panel, runtime) {
  const preview = panel?.querySelector('[data-audio-preview]');
  const info = panel?.querySelector('[data-audio-info]');
  if (preview) {
    preview.src = runtime.previewUrl || '';
    preview.load();
  }
  if (info) info.textContent = runtime.infoText || 'No output yet.';
}

export const schema = {
  fields: [
    { id: 'file', type: 'file', default: '', persist: false, label: 'Audio file', accept: 'audio/*' },
    {
      id: 'format',
      type: 'select',
      default: 'audio/webm;codecs=opus',
      label: 'Output format',
      options: [
        { label: 'WebM (Opus)', value: 'audio/webm;codecs=opus' },
        { label: 'OGG (Opus)', value: 'audio/ogg;codecs=opus' },
        { label: 'WAV (PCM)', value: 'audio/wav' },
      ],
    },
    { id: 'bitrate', type: 'number', default: 96, min: 24, max: 320, step: 8, label: 'Target bitrate (kbps)' },
    {
      id: 'sampleRate',
      type: 'select',
      default: 44100,
      label: 'Sample rate',
      options: [
        { label: '22.05 kHz', value: 22050 },
        { label: '32 kHz', value: 32000 },
        { label: '44.1 kHz', value: 44100 },
        { label: '48 kHz', value: 48000 },
      ],
    },
    {
      id: 'channels',
      type: 'select',
      default: 2,
      label: 'Channels',
      options: [
        { label: 'Mono', value: 1 },
        { label: 'Stereo', value: 2 },
      ],
    },
  ],
  outputs: [{ id: 'summary', label: 'Summary', type: 'pre' }],
  runMode: 'manual',
};

export function render({ state }) {
  return `
    <div class="tool-shell-body">
      <div class="tool-settings">
        <label class="tool-field">
          <span class="tool-field-label">Audio file</span>
          <input type="file" accept="audio/*" data-field-id="file" />
        </label>
        <div class="tool-field">
          <label class="tool-field-label" for="audio-format">Output format</label>
          <select id="audio-format" data-field-id="format">
            <option value="audio/webm;codecs=opus" ${state.format === 'audio/webm;codecs=opus' ? 'selected' : ''}>WebM (Opus)</option>
            <option value="audio/ogg;codecs=opus" ${state.format === 'audio/ogg;codecs=opus' ? 'selected' : ''}>OGG (Opus)</option>
            <option value="audio/wav" ${state.format === 'audio/wav' ? 'selected' : ''}>WAV (PCM)</option>
          </select>
        </div>
        <div class="tool-field">
          <label class="tool-field-label" for="audio-bitrate">Target bitrate (kbps)</label>
          <input id="audio-bitrate" type="number" min="24" max="320" step="8" value="${Number(state.bitrate) || 96}" data-field-id="bitrate" />
        </div>
        <div class="tool-field">
          <label class="tool-field-label" for="audio-rate">Sample rate</label>
          <select id="audio-rate" data-field-id="sampleRate">
            <option value="22050" ${Number(state.sampleRate) === 22050 ? 'selected' : ''}>22.05 kHz</option>
            <option value="32000" ${Number(state.sampleRate) === 32000 ? 'selected' : ''}>32 kHz</option>
            <option value="44100" ${Number(state.sampleRate) === 44100 ? 'selected' : ''}>44.1 kHz</option>
            <option value="48000" ${Number(state.sampleRate) === 48000 ? 'selected' : ''}>48 kHz</option>
          </select>
        </div>
        <div class="tool-field">
          <label class="tool-field-label" for="audio-channels">Channels</label>
          <select id="audio-channels" data-field-id="channels">
            <option value="1" ${Number(state.channels) === 1 ? 'selected' : ''}>Mono</option>
            <option value="2" ${Number(state.channels) === 2 ? 'selected' : ''}>Stereo</option>
          </select>
        </div>
      </div>
      <div class="tool-outputs">
        <div class="tool-image-preview">
          <audio controls preload="metadata" data-audio-preview></audio>
          <div class="tool-image-info" data-audio-info>No output yet.</div>
        </div>
        <div class="tool-output-block">
          <label class="tool-field-label" for="audio-summary">Summary</label>
          <pre id="audio-summary" class="tool-output-pre" data-output-id="summary"></pre>
        </div>
      </div>
    </div>
  `;
}

export async function compute(state, runtime) {
  if (!runtime.file) {
    resetRuntime(runtime);
    runtime.infoText = 'Choose an audio file first.';
    return { outputs: { summary: 'Choose an audio file and click Run.' } };
  }

  const sourceBuffer = await runtime.file.arrayBuffer();
  const decodeCtx = new (window.AudioContext || window.webkitAudioContext)();
  let decoded;
  try {
    decoded = await decodeCtx.decodeAudioData(sourceBuffer.slice(0));
  } finally {
    await decodeCtx.close();
  }

  const targetSampleRate = Number(state.sampleRate) || decoded.sampleRate;
  const targetChannels = Number(state.channels) || decoded.numberOfChannels;
  const rendered = await renderBuffer(decoded, targetSampleRate, targetChannels);

  const format = state.format || 'audio/webm;codecs=opus';
  const bitrateKbps = clampNumber(state.bitrate, 24, 320);
  let blob;

  if (String(format).startsWith('audio/wav')) {
    blob = pcm16FromAudioBuffer(rendered);
  } else {
    try {
      blob = await encodeWithMediaRecorder(rendered, format, bitrateKbps);
    } catch (_) {
      blob = pcm16FromAudioBuffer(rendered);
    }
  }

  resetRuntime(runtime);
  const outputMime = blob.type || String(format).split(';')[0] || 'audio/wav';
  runtime.outputBlob = blob;
  runtime.outputName = `${(runtime.file.name || 'audio').replace(/\.[^/.]+$/, '')}.${extFromMime(outputMime)}`;
  runtime.previewUrl = URL.createObjectURL(blob);
  const reduction = runtime.file.size > 0
    ? `${Math.max(0, Math.round((1 - blob.size / runtime.file.size) * 100))}% smaller`
    : 'n/a';
  runtime.infoText = `${fmtBytes(runtime.file.size)} -> ${fmtBytes(blob.size)} (${reduction})`;

  const summary = [
    `Input: ${runtime.file.name} (${fmtBytes(runtime.file.size)})`,
    `Output: ${runtime.outputName} (${fmtBytes(blob.size)})`,
    `Duration: ${rendered.duration.toFixed(2)} s`,
    `Sample rate: ${decoded.sampleRate} Hz -> ${rendered.sampleRate} Hz`,
    `Channels: ${decoded.numberOfChannels} -> ${rendered.numberOfChannels}`,
    `Requested format: ${format}`,
    `Actual output: ${outputMime}`,
    `Target bitrate: ${bitrateKbps} kbps`,
    `Compression: ${reduction}`,
  ].join('\n');

  return { outputs: { summary } };
}

export function onComputed({ runtime, panel }) {
  updatePreview(panel, runtime);
}

export function onReset({ runtime, panel }) {
  resetRuntime(runtime);
  runtime.infoText = 'No output yet.';
  updatePreview(panel, runtime);
}

export async function getDownload({ runtime }) {
  if (!runtime.outputBlob) return null;
  return {
    filename: runtime.outputName || 'audio-converted.webm',
    blob: runtime.outputBlob,
  };
}
