/* ================================================================
   MUSIC PLAYER
================================================================ */
function isMusicMobileViewport() {
  return window.matchMedia('(max-width: 860px)').matches;
}

function setPlayerOpen(open, opts = {}) {
  const options = opts || {};
  PLAYER_OPEN = !!open;

  const player = document.getElementById('player');
  const rail = document.getElementById('right-rail');
  const backdrop = document.getElementById('player-sheet-backdrop');

  player?.classList.toggle('player-open', PLAYER_OPEN);
  rail?.classList.toggle('sheet-open', PLAYER_OPEN && isMusicMobileViewport());

  if (backdrop) {
    const showBackdrop = PLAYER_OPEN && isMusicMobileViewport();
    backdrop.classList.toggle('open', showBackdrop);
  }

  localStorage.setItem('player_open', JSON.stringify(PLAYER_OPEN));
  if (!options.silent) playSfx(PLAYER_OPEN ? 'open' : 'close');
}

function syncPlayerSheetState() {
  const rail = document.getElementById('right-rail');
  const backdrop = document.getElementById('player-sheet-backdrop');
  if (!isMusicMobileViewport()) {
    rail?.classList.remove('sheet-open');
    backdrop?.classList.remove('open');
    return;
  }
  rail?.classList.toggle('sheet-open', PLAYER_OPEN);
  backdrop?.classList.toggle('open', PLAYER_OPEN);
}

function closePlayerSheet() {
  if (!isMusicMobileViewport()) return;
  if (!PLAYER_OPEN) return;
  setPlayerOpen(false);
}

function togglePlayer() {
  setPlayerOpen(!PLAYER_OPEN);
}

function coverToggleMarkup() {
  return `
    <button class="cover-toggle" type="button" data-cover-toggle aria-label="Play or pause">
      <svg class="cover-icon cover-icon-play" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
      <svg class="cover-icon cover-icon-pause" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
      </svg>
    </button>
  `;
}

function bindCoverToggle(el, stopPropagation) {
  if (!el || el.dataset.coverToggleBound === '1') return;
  el.dataset.coverToggleBound = '1';
  el.addEventListener('click', e => {
    if (stopPropagation) e.stopPropagation();
    e.preventDefault();
    togglePlay();
  });
}

function initPlayer(autoPlay = false) {
  if (typeof initSounds === 'function') initSounds();

  if (!initPlayer._stateLoaded) {
    const savedPlayerOpen = localStorage.getItem('player_open');
    if (savedPlayerOpen !== null) {
      try { PLAYER_OPEN = !!JSON.parse(savedPlayerOpen); } catch (_) { /* keep current */ }
    }
    if (isMusicMobileViewport()) PLAYER_OPEN = false;
    initPlayer._stateLoaded = true;
  }

  setPlayerOpen(PLAYER_OPEN, { silent: true });

  if (!DB.music.length) return;
  const t = DB.music[TRACK_IDX];
  document.getElementById('mini-track').textContent = t.title;
  document.getElementById('mini-artist').textContent = t.artist;
  document.getElementById('big-track').textContent = t.title;
  document.getElementById('big-artist').textContent = t.artist;
  document.getElementById('p-dur').textContent = fmtDur(t.duration);
  document.getElementById('p-cur').textContent = '0:00';
  document.getElementById('p-fill').style.width = '0%';

  const bigCover = document.getElementById('big-cover');
  const miniCover = document.getElementById('mini-cover');
  if (t.cover) {
    if (bigCover) bigCover.innerHTML = `<img src="${t.cover}" alt="${t.title}"/>${coverToggleMarkup()}`;
    if (miniCover) miniCover.innerHTML = `<img class="mini-cover-img" src="${t.cover}" alt="${t.title}">${coverToggleMarkup()}`;
  } else {
    if (bigCover) bigCover.innerHTML = `<div class="big-cover-placeholder" id="bc-placeholder"></div>${coverToggleMarkup()}`;
    if (miniCover) miniCover.innerHTML = `<div class="cover-vinyl" id="cover-vinyl"></div>${coverToggleMarkup()}`;
  }
  bindCoverToggle(bigCover, false);
  bindCoverToggle(miniCover, true);

  if (t.src) {
    if (AUDIO) { AUDIO.pause(); AUDIO = null; }
    AUDIO = new Audio(t.src);
    AUDIO.volume = parseFloat(document.getElementById('vol-slider').value);
    AUDIO.addEventListener('timeupdate', () => {
      const pct = (AUDIO.currentTime / AUDIO.duration) * 100;
      document.getElementById('p-fill').style.width = pct + '%';
      document.getElementById('p-cur').textContent = fmtDur(Math.floor(AUDIO.currentTime));
    });
    AUDIO.addEventListener('ended', nextTrack);
  }
  if (autoPlay) startPlayback();
}

function togglePlay() {
  playSfx('toggle');
  if (AUDIO && AUDIO.src) {
    if (IS_PLAYING) AUDIO.pause();
    else AUDIO.play().catch(() => toast('No audio src set in DB.music'));
    IS_PLAYING = !IS_PLAYING;
  } else {
    IS_PLAYING = !IS_PLAYING;
    if (IS_PLAYING) {
      fakeTick();
      toast('Demo mode - add src to DB.music');
    } else {
      clearTimeout(FAKE_TIMER);
    }
  }

  const player = document.getElementById('player');
  if (player) player.classList.toggle('is-playing', IS_PLAYING);
}

function startPlayback() {
  const player = document.getElementById('player');
  if (AUDIO && AUDIO.src) {
    AUDIO.play().then(() => {
      IS_PLAYING = true;
      if (player) player.classList.add('is-playing');
    }).catch(() => {
      IS_PLAYING = false;
      if (player) player.classList.remove('is-playing');
      toast('No audio src set in DB.music');
    });
    return;
  }
  IS_PLAYING = true;
  if (player) player.classList.add('is-playing');
  fakeTick();
}

function fakeTick() {
  const t = DB.music[TRACK_IDX];
  FAKE_ELAPSED++;
  if (FAKE_ELAPSED >= t.duration) {
    FAKE_ELAPSED = 0;
    nextTrack();
    return;
  }
  document.getElementById('p-fill').style.width = (FAKE_ELAPSED / t.duration * 100) + '%';
  document.getElementById('p-cur').textContent = fmtDur(FAKE_ELAPSED);
  FAKE_TIMER = setTimeout(fakeTick, 1000);
}

function prevTrack() {
  if (!DB.music.length) return;
  playSfx('click');
  TRACK_IDX = (TRACK_IDX - 1 + DB.music.length) % DB.music.length;
  IS_PLAYING = false;
  FAKE_ELAPSED = 0;
  clearTimeout(FAKE_TIMER);
  document.getElementById('player').classList.remove('is-playing');
  initPlayer(true);
}

function nextTrack() {
  if (!DB.music.length) return;
  playSfx('click');
  TRACK_IDX = (TRACK_IDX + 1) % DB.music.length;
  IS_PLAYING = false;
  FAKE_ELAPSED = 0;
  clearTimeout(FAKE_TIMER);
  document.getElementById('player').classList.remove('is-playing');
  initPlayer(true);
}

function seekPlayer(e) {
  if (!DB.music.length) return;
  playSfx('click');
  const bar = document.getElementById('p-track');
  const pct = e.offsetX / bar.offsetWidth;
  const t = DB.music[TRACK_IDX];
  FAKE_ELAPSED = Math.floor(pct * t.duration);
  if (AUDIO) AUDIO.currentTime = pct * AUDIO.duration;
  document.getElementById('p-fill').style.width = (pct * 100) + '%';
  document.getElementById('p-cur').textContent = fmtDur(FAKE_ELAPSED);
}

function setVol(v) {
  if (AUDIO) AUDIO.volume = parseFloat(v);
}

window.addEventListener('resize', syncPlayerSheetState);
