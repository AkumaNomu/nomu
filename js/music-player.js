// music-player.js
// Standalone (non-module) music player logic; attaches a small API to `window`.

(function () {
  'use strict';

  // Keep these on `window` so other scripts (utils/options UI) can reference them.
  const MUSIC_PLAYLIST = [
    {
      file: "./assets/music/World's Number One Oden Store.mp3",
      title: "World's Number One Oden Store",
      cover: "./assets/music/covers/World's Number One Oden Store.png"
    },
    { file: './assets/music/Wet.mp3', title: 'Wet', cover: './assets/music/covers/Wet.png' },
    { file: './assets/music/No One Ever Said.mp3', title: 'No One Ever Said', cover: './assets/music/covers/No One Ever Said.png' },
    { file: './assets/music/Rises The Moon.mp3', title: 'Rises The Moon', cover: './assets/music/covers/Rises The Moon.png' },
    { file: './assets/music/Sorry, I Like You.mp3', title: 'Sorry, I Like You', cover: './assets/music/covers/Sorry, I Like You.png' }
  ];
  const MUSIC_FALLBACK_COVER = './assets/Peak.png';

  function getSavedMusicVolume() {
    const raw = parseFloat(localStorage.getItem('music-volume') || '0.1');
    if (!Number.isFinite(raw)) return 0.1;
    if (raw > 1) return Math.min(raw / 100, 1);
    return Math.max(raw, 0);
  }

  function setupMusicPlayer() {
    const audio = document.getElementById('bg-music');
    const navbarTrackNameDisplay = document.getElementById('navbar-track-name');
    if (!audio) return;

    audio.loop = true;
    audio.preload = 'metadata';
    audio.volume = getSavedMusicVolume();

    const listeners = new Set();
    const storedTrackIndex = parseInt(localStorage.getItem('current-track-index') || '0', 10);
    let currentTrackIndex = Number.isInteger(storedTrackIndex) ? storedTrackIndex : 0;
    if (currentTrackIndex < 0 || currentTrackIndex >= MUSIC_PLAYLIST.length) {
      currentTrackIndex = 0;
    }

    let hasError = false;
    let restoreTimeOnce = true;

    const getTrack = () => MUSIC_PLAYLIST[currentTrackIndex] || MUSIC_PLAYLIST[0];

    const getState = () => ({
      audio,
      playlist: MUSIC_PLAYLIST,
      trackIndex: currentTrackIndex,
      track: getTrack(),
      isPlaying: !audio.paused,
      hasError,
      volume: audio.volume,
      volumePercent: Math.round(audio.volume * 100),
      currentTime: audio.currentTime || 0,
      duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      progressPercent: Number.isFinite(audio.duration) && audio.duration > 0
        ? Math.min(100, Math.max(0, (audio.currentTime / audio.duration) * 100))
        : 0,
      cover: hasError ? MUSIC_FALLBACK_COVER : (getTrack().cover || MUSIC_FALLBACK_COVER)
    });

    const emitState = () => {
      const state = getState();
      if (navbarTrackNameDisplay) {
        navbarTrackNameDisplay.textContent = state.track ? state.track.title : 'No track';
      }
      listeners.forEach((listener) => {
        try {
          listener(state);
        } catch (error) {
          console.error('Music state listener failed:', error);
        }
      });
    };

    const play = async () => {
      if (hasError) return false;
      try {
        await audio.play();
        localStorage.setItem('music-playing', 'yes');
        emitState();
        return true;
      } catch (error) {
        localStorage.setItem('music-playing', 'no');
        emitState();
        return false;
      }
    };

    const pause = () => {
      audio.pause();
      localStorage.setItem('music-playing', 'no');
      emitState();
    };

    const setTrack = (index, options = {}) => {
      const normalizedIndex = ((index % MUSIC_PLAYLIST.length) + MUSIC_PLAYLIST.length) % MUSIC_PLAYLIST.length;
      const shouldResume = Boolean(options.resume);
      const keepSavedTime = Boolean(options.keepSavedTime);

      currentTrackIndex = normalizedIndex;
      hasError = false;
      audio.src = getTrack().file;
      audio.load();
      localStorage.setItem('current-track-index', String(currentTrackIndex));
      if (!keepSavedTime) {
        localStorage.setItem('music-time', '0');
        restoreTimeOnce = false;
      }
      emitState();

      if (shouldResume) {
        play();
      }
    };

    const next = () => setTrack(currentTrackIndex + 1, { resume: !audio.paused });
    const prev = () => setTrack(currentTrackIndex - 1, { resume: !audio.paused });
    const toggle = () => (audio.paused ? play() : pause());
    const setVolumePercent = (percentValue) => {
      const safePercent = Math.max(0, Math.min(100, Number(percentValue) || 0));
      audio.volume = safePercent / 100;
      localStorage.setItem('music-volume', audio.volume.toString());
      emitState();
    };

    window.musicPlayer = {
      audio,
      play,
      pause,
      toggle,
      next,
      prev,
      setTrack,
      setVolumePercent,
      getState,
      getCurrentTrackIndex: () => currentTrackIndex,
      getPlaylist: () => MUSIC_PLAYLIST.slice(),
      subscribe: (listener) => {
        listeners.add(listener);
        listener(getState());
        return () => listeners.delete(listener);
      }
    };

    // Legacy helpers used by existing UI code in utils.js.
    window.getPlaylist = () => MUSIC_PLAYLIST.slice();
    window.getCurrentTrackIndex = () => currentTrackIndex;
    window.setPlaylistTrack = (index) => setTrack(index, { resume: !audio.paused });
    window.fadeIn = () => play();
    window.fadeOut = (callback) => {
      pause();
      if (typeof callback === 'function') callback();
    };

    audio.addEventListener('timeupdate', () => {
      localStorage.setItem('music-time', audio.currentTime.toString());
      emitState();
    });

    audio.addEventListener('loadedmetadata', () => {
      if (restoreTimeOnce) {
        const savedTime = parseFloat(localStorage.getItem('music-time') || '0');
        if (Number.isFinite(savedTime) && savedTime > 0 && savedTime < audio.duration) {
          audio.currentTime = savedTime;
        }
        restoreTimeOnce = false;
      }
      emitState();
    });

    audio.addEventListener('play', () => {
      localStorage.setItem('music-playing', 'yes');
      emitState();
    });

    audio.addEventListener('pause', () => {
      localStorage.setItem('music-playing', 'no');
      emitState();
    });

    audio.addEventListener('canplay', () => {
      hasError = false;
      emitState();
    });

    audio.addEventListener('error', () => {
      hasError = true;
      localStorage.setItem('music-playing', 'no');
      emitState();
    });

    setTrack(currentTrackIndex, { keepSavedTime: true });

    if (localStorage.getItem('music-playing') === 'yes') {
      const tryResumeOnGesture = () => {
        play().catch(() => {});
      };
      document.addEventListener('pointerdown', tryResumeOnGesture, { once: true, passive: true });
      document.addEventListener('keydown', tryResumeOnGesture, { once: true });
    }
  }

  window.MUSIC_PLAYLIST = MUSIC_PLAYLIST;
  window.MUSIC_FALLBACK_COVER = MUSIC_FALLBACK_COVER;
  window.getSavedMusicVolume = getSavedMusicVolume;
  window.setupMusicPlayer = setupMusicPlayer;
})();
