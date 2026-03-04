import { renderField } from '../shared/fields.js';

export const meta = {
  id: 'pomodoro',
  name: 'Pomodoro Timer',
  description: 'Focused work sprints with breaks.',
  keywords: 'pomodoro timer focus',
  category: 'Productivity & Organizers',
  icon: 'code',
  inputType: 'none',
  supportsCopy: false,
  supportsDownload: false,
};

export const schema = {
  fields: [
    {
      id: 'preset',
      type: 'select',
      label: 'Preset',
      default: '25/5',
      options: [
        { value: '25/5', label: '25 min work / 5 min break' },
        { value: '50/10', label: '50 min work / 10 min break' },
        { value: 'custom', label: 'Custom' },
      ],
    },
    { id: 'work', type: 'number', label: 'Work minutes', min: 1, max: 120, step: 1, default: 25 },
    { id: 'break', type: 'number', label: 'Break minutes', min: 1, max: 60, step: 1, default: 5 },
    { id: 'notify', type: 'toggle', label: 'Desktop notifications', default: false },
  ],
  runMode: 'manual',
};

export function normalize(state) {
  if (state.preset === '25/5') return { ...state, work: 25, break: 5 };
  if (state.preset === '50/10') return { ...state, work: 50, break: 10 };
  return state;
}

export function render({ schema, state }) {
  const fieldsHtml = (schema.fields || []).map(field => renderField(field, state[field.id], '', state)).join('');
  return `
    <div class="tool-shell-body">
      <div class="tool-settings">${fieldsHtml}</div>
      <div class="tool-pomodoro">
        <div class="tool-pomodoro-mode" id="pomodoro-mode">Ready</div>
        <div class="tool-pomodoro-time" id="pomodoro-time">00:00</div>
        <div class="tool-pomodoro-actions">
          <button class="btn btn-primary" type="button" data-pom-action="start">Start</button>
          <button class="btn btn-ghost" type="button" data-pom-action="pause">Pause</button>
          <button class="btn btn-ghost" type="button" data-pom-action="reset">Reset</button>
        </div>
      </div>
    </div>`;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function notify(title, body) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
    return;
  }
  if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') new Notification(title, { body });
    });
  }
}

export function mount({ panel, runtime, state }) {
  const modeEl = panel.querySelector('#pomodoro-mode');
  const timeEl = panel.querySelector('#pomodoro-time');
  const getState = () => runtime.state || state;

  const setDisplay = () => {
    if (!timeEl || !modeEl) return;
    timeEl.textContent = formatTime(runtime.remaining || 0);
    modeEl.textContent = runtime.mode ? (runtime.mode === 'work' ? 'Focus' : 'Break') : 'Ready';
  };

  const startSession = (mode) => {
    runtime.mode = mode;
    const current = getState();
    const minutes = mode === 'work' ? Number(current.work) : Number(current.break);
    runtime.remaining = Math.max(1, Math.round(minutes * 60));
    setDisplay();
    if (runtime.timer) clearInterval(runtime.timer);
    runtime.timer = setInterval(() => {
      runtime.remaining -= 1;
      if (runtime.remaining <= 0) {
        clearInterval(runtime.timer);
        runtime.timer = null;
        if (getState().notify) notify('Pomodoro', mode === 'work' ? 'Time for a break!' : 'Back to focus!');
        startSession(mode === 'work' ? 'break' : 'work');
        return;
      }
      setDisplay();
    }, 1000);
  };

  const startBtn = panel.querySelector('[data-pom-action=\"start\"]');
  const pauseBtn = panel.querySelector('[data-pom-action=\"pause\"]');
  const resetBtn = panel.querySelector('[data-pom-action=\"reset\"]');

  startBtn?.addEventListener('click', () => startSession(runtime.mode || 'work'));
  pauseBtn?.addEventListener('click', () => {
    if (runtime.timer) clearInterval(runtime.timer);
    runtime.timer = null;
  });
  resetBtn?.addEventListener('click', () => {
    if (runtime.timer) clearInterval(runtime.timer);
    runtime.timer = null;
    runtime.mode = null;
    runtime.remaining = 0;
    setDisplay();
  });

  setDisplay();
}

export function onReset({ runtime }) {
  if (runtime.timer) clearInterval(runtime.timer);
  runtime.timer = null;
  runtime.mode = null;
  runtime.remaining = 0;
}
