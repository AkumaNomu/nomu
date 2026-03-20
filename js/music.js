/* ================================================================
   MUSIC PLAYER
================================================================ */
let YT_API_READY_PROMISE = null;
let YT_PLAYER_READY_PROMISE = null;
let YT_PLAYER = null;
let YT_ACTIVE_VIDEO_ID = null;
let YT_PROGRESS_TIMER = null;
let PLAYER_BOOT_TOKEN = 0;

function isMusicMobileViewport() {
  return window.matchMedia('(max-width: 860px)').matches;
}

function getCurrentTrack() {
  if (!DB.music.length) return null;
  return DB.music[TRACK_IDX] || null;
}

function getYouTubeVideoId(track) {
  if (!track) return null;
  const raw = String(track.youtubeId || track.youtubeUrl || track.youtube || '').trim();
  if (!raw) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  const match = raw.match(/(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function isYouTubeTrack(track) {
  return !!getYouTubeVideoId(track);
}

function stopYouTubeProgressTimer() {
  if (!YT_PROGRESS_TIMER) return;
  clearInterval(YT_PROGRESS_TIMER);
  YT_PROGRESS_TIMER = null;
}

function updatePlayerProgress(current, duration) {
  const cur = Math.max(0, Number(current) || 0);
  const dur = Math.max(0, Number(duration) || 0);
  const pct = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0;
  document.getElementById('p-fill').style.width = `${pct}%`;
  document.getElementById('p-cur').textContent = fmtDur(Math.floor(cur));
  if (dur > 0) document.getElementById('p-dur').textContent = fmtDur(Math.floor(dur));
}

function syncYouTubeDuration(track) {
  if (!YT_PLAYER || !YT_ACTIVE_VIDEO_ID) return;
  const duration = Math.floor(Number(YT_PLAYER.getDuration?.() || 0));
  if (!duration) return;
  if (track) track.duration = duration;
  document.getElementById('p-dur').textContent = fmtDur(duration);
}

function tickYouTubeProgress() {
  const track = getCurrentTrack();
  if (!track || !isYouTubeTrack(track) || !YT_PLAYER) return;
  const cur = Number(YT_PLAYER.getCurrentTime?.() || 0);
  const dur = Number(YT_PLAYER.getDuration?.() || 0) || Number(track.duration || 0);
  updatePlayerProgress(cur, dur);
  if (dur > 0) track.duration = Math.floor(dur);
}

function startYouTubeProgressTimer() {
  stopYouTubeProgressTimer();
  YT_PROGRESS_TIMER = setInterval(tickYouTubeProgress, 400);
}

function setPlayerPlayingState(isPlaying) {
  IS_PLAYING = !!isPlaying;
  const player = document.getElementById('player');
  player?.classList.toggle('is-playing', IS_PLAYING);
}

function setYouTubeVolumeFromSlider() {
  if (!YT_PLAYER) return;
  const slider = document.getElementById('vol-slider');
  const volume = Math.round((Number(slider?.value || 0.1) || 0.1) * 100);
  try { YT_PLAYER.setVolume(volume); } catch (_) { /* no-op */ }
}

function ensureYouTubeHost() {
  let host = document.getElementById('yt-player-host');
  if (host) return host;
  host = document.createElement('div');
  host.id = 'yt-player-host';
  host.style.position = 'fixed';
  host.style.left = '-9999px';
  host.style.top = '-9999px';
  host.style.width = '1px';
  host.style.height = '1px';
  host.style.opacity = '0';
  host.style.pointerEvents = 'none';
  document.body.appendChild(host);
  return host;
}

function ensureYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (YT_API_READY_PROMISE) return YT_API_READY_PROMISE;

  YT_API_READY_PROMISE = new Promise((resolve, reject) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === 'function') prevReady();
      resolve(window.YT);
    };

    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }

    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (existing) return;

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('Failed to load YouTube API'));
    document.head.appendChild(script);
  });

  return YT_API_READY_PROMISE;
}

function handleYouTubeStateChange(event) {
  const track = getCurrentTrack();
  if (!track || !isYouTubeTrack(track)) return;

  if (event.data === window.YT.PlayerState.PLAYING) {
    setPlayerPlayingState(true);
    syncYouTubeDuration(track);
    startYouTubeProgressTimer();
    return;
  }

  if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.CUED) {
    setPlayerPlayingState(false);
    syncYouTubeDuration(track);
    tickYouTubeProgress();
    stopYouTubeProgressTimer();
    return;
  }

  if (event.data === window.YT.PlayerState.ENDED) {
    stopYouTubeProgressTimer();
    nextTrack();
    return;
  }

  if (event.data === window.YT.PlayerState.BUFFERING) {
    syncYouTubeDuration(track);
  }
}

function handleYouTubeError() {
  setPlayerPlayingState(false);
  stopYouTubeProgressTimer();
  toast('YouTube playback failed for this track.');
}

async function ensureYouTubePlayer() {
  if (YT_PLAYER) return YT_PLAYER;
  if (YT_PLAYER_READY_PROMISE) return YT_PLAYER_READY_PROMISE;

  YT_PLAYER_READY_PROMISE = (async () => {
    await ensureYouTubeApi();
    const host = ensureYouTubeHost();
    return new Promise((resolve, reject) => {
      let settled = false;
      YT_PLAYER = new window.YT.Player(host, {
        height: '1',
        width: '1',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            settled = true;
            setYouTubeVolumeFromSlider();
            resolve(YT_PLAYER);
          },
          onStateChange: handleYouTubeStateChange,
          onError: handleYouTubeError,
        },
      });

      setTimeout(() => {
        if (settled) return;
        reject(new Error('Timed out waiting for YouTube player'));
      }, 12000);
    });
  })().catch(err => {
    YT_PLAYER_READY_PROMISE = null;
    throw err;
  });

  return YT_PLAYER_READY_PROMISE;
}

async function queueYouTubeTrack(track, autoPlay, token) {
  const videoId = getYouTubeVideoId(track);
  if (!videoId) return false;

  try {
    const player = await ensureYouTubePlayer();
    if (token !== PLAYER_BOOT_TOKEN) return true;

    YT_ACTIVE_VIDEO_ID = videoId;
    setYouTubeVolumeFromSlider();
    if (autoPlay) player.loadVideoById(videoId);
    else player.cueVideoById(videoId);
    return true;
  } catch (_) {
    toast('Unable to initialize YouTube playback.');
    return false;
  }
}

function stopNativeAudio() {
  if (!AUDIO) return;
  try {
    AUDIO.pause();
    AUDIO.src = '';
  } catch (_) { /* no-op */ }
  AUDIO = null;
}

function stopYouTubePlayback() {
  if (!YT_PLAYER) return;
  try {
    YT_PLAYER.pauseVideo();
  } catch (_) { /* no-op */ }
  stopYouTubeProgressTimer();
}

function setupNativeAudioTrack(track, autoPlay) {
  if (!track || !track.src) return;
  AUDIO = new Audio(track.src);
  AUDIO.volume = parseFloat(document.getElementById('vol-slider').value);
  AUDIO.addEventListener('timeupdate', () => {
    const duration = Number(AUDIO.duration || track.duration || 0);
    updatePlayerProgress(AUDIO.currentTime, duration);
  });
  AUDIO.addEventListener('loadedmetadata', () => {
    if (AUDIO.duration && Number.isFinite(AUDIO.duration)) {
      track.duration = Math.floor(AUDIO.duration);
      document.getElementById('p-dur').textContent = fmtDur(track.duration);
    }
  });
  AUDIO.addEventListener('ended', nextTrack);
  if (autoPlay) {
    AUDIO.play()
      .then(() => setPlayerPlayingState(true))
      .catch(() => toast('No audio src set in DB.music'));
  }
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
  const thisBootToken = ++PLAYER_BOOT_TOKEN;
  document.getElementById('mini-track').textContent = t.title;
  document.getElementById('mini-artist').textContent = t.artist;
  document.getElementById('big-track').textContent = t.title;
  document.getElementById('big-artist').textContent = t.artist;
  document.getElementById('p-dur').textContent = fmtDur(t.duration || 0);
  document.getElementById('p-cur').textContent = '0:00';
  document.getElementById('p-fill').style.width = '0%';

  clearTimeout(FAKE_TIMER);
  FAKE_ELAPSED = 0;
  stopYouTubeProgressTimer();
  stopNativeAudio();
  setPlayerPlayingState(false);

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

  if (isYouTubeTrack(t)) {
    queueYouTubeTrack(t, autoPlay, thisBootToken).then(ok => {
      if (ok) return;
      if (thisBootToken !== PLAYER_BOOT_TOKEN) return;
      if (!t.src) return;
      YT_ACTIVE_VIDEO_ID = null;
      setupNativeAudioTrack(t, autoPlay);
    });
    return;
  }

  YT_ACTIVE_VIDEO_ID = null;
  stopYouTubePlayback();

  if (t.src) {
    setupNativeAudioTrack(t, autoPlay);
    return;
  }

  if (autoPlay) startPlayback();
}

function togglePlay() {
  playSfx('toggle');
  const track = getCurrentTrack();

  if (track && isYouTubeTrack(track)) {
    const videoId = getYouTubeVideoId(track);
    if (YT_PLAYER && YT_ACTIVE_VIDEO_ID === videoId) {
      if (IS_PLAYING) YT_PLAYER.pauseVideo();
      else YT_PLAYER.playVideo();
    } else {
      startPlayback();
    }
    return;
  }

  if (AUDIO && AUDIO.src) {
    if (IS_PLAYING) {
      AUDIO.pause();
      setPlayerPlayingState(false);
      return;
    }
    AUDIO.play()
      .then(() => setPlayerPlayingState(true))
      .catch(() => toast('No audio src set in DB.music'));
    return;
  }

  if (IS_PLAYING) {
    clearTimeout(FAKE_TIMER);
    setPlayerPlayingState(false);
    return;
  }

  setPlayerPlayingState(true);
  fakeTick();
  toast('Demo mode - add src or youtubeId in DB.music');
}

function startPlayback() {
  const track = getCurrentTrack();
  if (!track) return;

  if (isYouTubeTrack(track)) {
    const videoId = getYouTubeVideoId(track);
    if (YT_PLAYER && YT_ACTIVE_VIDEO_ID === videoId) {
      try {
        YT_PLAYER.playVideo();
        return;
      } catch (_) { /* no-op */ }
    }
    queueYouTubeTrack(track, true, PLAYER_BOOT_TOKEN);
    return;
  }

  if (AUDIO && AUDIO.src) {
    AUDIO.play()
      .then(() => setPlayerPlayingState(true))
      .catch(() => {
        setPlayerPlayingState(false);
        toast('No audio src set in DB.music');
      });
    return;
  }

  setPlayerPlayingState(true);
  fakeTick();
}

function fakeTick() {
  const t = getCurrentTrack();
  if (!t) return;
  FAKE_ELAPSED++;
  if (FAKE_ELAPSED >= (t.duration || 0)) {
    FAKE_ELAPSED = 0;
    nextTrack();
    return;
  }
  updatePlayerProgress(FAKE_ELAPSED, t.duration || 0);
  FAKE_TIMER = setTimeout(fakeTick, 1000);
}

function prevTrack() {
  if (!DB.music.length) return;
  playSfx('click');
  stopNativeAudio();
  stopYouTubePlayback();
  TRACK_IDX = (TRACK_IDX - 1 + DB.music.length) % DB.music.length;
  setPlayerPlayingState(false);
  FAKE_ELAPSED = 0;
  clearTimeout(FAKE_TIMER);
  initPlayer(true);
}

function nextTrack() {
  if (!DB.music.length) return;
  playSfx('click');
  stopNativeAudio();
  stopYouTubePlayback();
  TRACK_IDX = (TRACK_IDX + 1) % DB.music.length;
  setPlayerPlayingState(false);
  FAKE_ELAPSED = 0;
  clearTimeout(FAKE_TIMER);
  initPlayer(true);
}

function seekPlayer(e) {
  if (!DB.music.length) return;
  playSfx('click');
  const bar = document.getElementById('p-track');
  const pct = bar.offsetWidth ? (e.offsetX / bar.offsetWidth) : 0;
  const t = getCurrentTrack();
  if (!t) return;

  if (isYouTubeTrack(t) && YT_PLAYER) {
    const duration = Number(YT_PLAYER.getDuration?.() || t.duration || 0);
    if (duration > 0) {
      YT_PLAYER.seekTo(pct * duration, true);
      updatePlayerProgress(pct * duration, duration);
    }
    return;
  }

  FAKE_ELAPSED = Math.floor(pct * (t.duration || 0));
  if (AUDIO && AUDIO.duration) AUDIO.currentTime = pct * AUDIO.duration;
  updatePlayerProgress(FAKE_ELAPSED, t.duration || 0);
}

function setVol(v) {
  const vol = parseFloat(v);
  if (AUDIO) AUDIO.volume = vol;
  if (YT_PLAYER) {
    try { YT_PLAYER.setVolume(Math.round(vol * 100)); } catch (_) { /* no-op */ }
  }
}

window.addEventListener('resize', syncPlayerSheetState);
