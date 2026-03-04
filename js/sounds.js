/* ================================================================
   SOUNDS.JS — Deep Neon Synthwave UI Audio Engine
   Multi-layer chord synthesis with sub-bass and reverb simulation
================================================================ */
(function () {

  let enabled = JSON.parse(localStorage.getItem('sfx_enabled') || 'true');
  let ctx = null;
  let unlocked = false;

  /* ---------- Web Audio Context ---------------------------------- */
  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  }

  function unlockAudio() {
    const c = ensureCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    unlocked = true;
  }

  /* ---------- Core synth engine ---------------------------------- */
  /*
    Each preset is an array of layers: [type, baseFreq, slideRatio, vol, dur]
    Layers are mixed together to create chord/texture sounds.
    A soft compressor and reverb tail are applied on the master chain.
  */

  let masterGain = null;
  let reverbNode  = null;

  function buildMasterChain(c) {
    if (masterGain) return;

    masterGain = c.createGain();
    masterGain.gain.value = 0.8;

    // Simple reverb via convolver with impulse response
    reverbNode = c.createConvolver();
    const revLen = c.sampleRate * 0.4;
    const revBuf = c.createBuffer(2, revLen, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = revBuf.getChannelData(ch);
      for (let i = 0; i < revLen; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLen, 2.2);
      }
    }
    reverbNode.buffer = revBuf;

    // Dry/wet mix
    const dryGain = c.createGain();
    const wetGain = c.createGain();
    dryGain.gain.value = 0.72;
    wetGain.gain.value = 0.28;

    masterGain.connect(dryGain);
    masterGain.connect(reverbNode);
    reverbNode.connect(wetGain);
    dryGain.connect(c.destination);
    wetGain.connect(c.destination);
  }

  function synthLayer(c, t, type, freq, slide, vol, dur) {
    const osc  = c.createOscillator();
    const gain = c.createGain();

    osc.type = type;

    // Freq sweep — gives that characteristic neon "whoosh"
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, freq * slide),
      t + dur
    );

    // Envelope: quick attack, exponential decay
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.04);
  }

  /* ---------- Sub-bass punch layer -------------------------------- */
  function synthSubBass(c, t, freq, dur) {
    // Extra deep sine for body on certain sounds
    const osc  = c.createOscillator();
    const gain = c.createGain();
    const lp   = c.createBiquadFilter();

    lp.type            = 'lowpass';
    lp.frequency.value = 120;
    lp.Q.value         = 1.4;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.5, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.3, t + dur);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.11, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.8);

    osc.connect(lp);
    lp.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.04);
  }

  /* ---------- Public play function -------------------------------- */
  function synth(name) {
    if (!enabled) return;
    const c = ensureCtx();
    if (!c) return;
    if (c.state !== 'running' && !unlocked) return;

    buildMasterChain(c);

    // Pull preset from SOUND_PRESETS in config.js, fallback to defaults
    const presets = (typeof SOUND_PRESETS !== 'undefined') ? SOUND_PRESETS : {};
    const fallbacks = {
      click:   [['sine', 72, 0.72, 0.06, 0.12], ['triangle', 144, 0.68, 0.04, 0.10]],
      toggle:  [['sine', 110, 1.08, 0.07, 0.18], ['triangle', 220, 1.04, 0.04, 0.16]],
      open:    [['sine', 82, 1.28, 0.07, 0.22], ['triangle', 164, 1.18, 0.04, 0.20]],
      close:   [['sine', 196, 0.62, 0.06, 0.18], ['triangle', 130, 0.68, 0.04, 0.16]],
      success: [['sine', 220, 1.35, 0.06, 0.20], ['sine', 330, 1.30, 0.04, 0.18]],
      error:   [['sawtooth', 110, 0.60, 0.05, 0.20], ['square', 82, 0.58, 0.03, 0.18]],
      scan:    [['sine', 55, 1.40, 0.07, 0.28], ['triangle', 110, 1.30, 0.04, 0.24]],
    };

    const layers = presets[name] || fallbacks[name] || fallbacks.click;
    const t = c.currentTime;

    layers.forEach(([type, freq, slide, vol, dur]) => {
      synthLayer(c, t, type, freq, slide, vol, dur);
    });

    // Add sub-bass punch for impactful sounds
    if (['open', 'success', 'scan'].includes(name)) {
      synthSubBass(c, t, layers[0][1], layers[0][4]);
    }
  }

  /* ---------- SFX toggle ----------------------------------------- */
  function updateSfxIcon() {
    const btn = document.getElementById('sfx-toggle-btn');
    if (btn) btn.classList.toggle('active', enabled);
  }

  function setEnabled(next) {
    enabled = !!next;
    localStorage.setItem('sfx_enabled', JSON.stringify(enabled));
    updateSfxIcon();
  }

  function initSounds() {
    ensureCtx();
    updateSfxIcon();
    ['pointerdown', 'keydown', 'touchstart'].forEach(evt => {
      window.addEventListener(evt, unlockAudio, { once: true, passive: true });
    });
  }

  /* ---------- Exports -------------------------------------------- */
  window.__playSynthSfx          = synth;
  window.__setSynthSfxEnabled    = setEnabled;
  window.initSounds              = initSounds;
  window.playSfx                 = synth;
  window.setSfxEnabled           = setEnabled;
  window.isSfxEnabled            = () => enabled;
  window.initSfxToggle           = initSounds;

})();
