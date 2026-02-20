// utils.js - Utility Functions
// NO MODULE EXPORTS - Using global scope for compatibility

// Get query parameter from URL
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Format date nicely (e.g., "February 14, 2025")
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Calculate reading time in minutes based on word count
function calculateReadingTime(text) {
  const wordsPerMinute = 150; // Average reading speed
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return minutes;
}

// Parse frontmatter from markdown content
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  
  const frontmatterText = match[1];
  const body = match[2];
  
  const frontmatter = {};
  const lines = frontmatterText.split('\n');
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > -1) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      frontmatter[key] = value;
    }
  }
  
  return { frontmatter, body };
}

// Parse tags string into array
function parseTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(tag => String(tag).trim()).filter(Boolean);
  }
  return String(value)
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

// Format category for display
function formatCategory(category) {
  const categoryMap = {
    'Development': 'Development',
    'Video Editing': 'Video editing',
    'Life': 'Life',
    'Projects': 'Projects',
    'Politics': 'Politics',
  };
  return categoryMap[category] || category;
}

// Debounce function for search
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Copy text to clipboard (with fallback)
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopyText(text));
  }
  return Promise.resolve(fallbackCopyText(text));
}

function fallbackCopyText(text) {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    console.error('Fallback copy failed:', err);
    return false;
  }
}

function copyToClipboard(text) {
  copyText(text).then((ok) => {
    if (ok) {
      console.log('Copied to clipboard');
    } else {
      console.warn('Copy failed');
    }
  });
}

// Update active nav link based on current page
function updateActiveNavLink() {
  const hash = String(window.location.hash || '').replace(/^#/, '').trim().toLowerCase();
  const route = (hash.split('/')[0] || 'home');
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach((link) => {
    const linkRoute = String(link.dataset.route || link.dataset.view || '').trim().toLowerCase();
    const isHomeLink = link.id === 'logo-link' || linkRoute === 'home';
    const isActive = route === 'home' ? isHomeLink : linkRoute === route;
    link.classList.toggle('active', isActive);
  });
}

const modalFocusMap = new Map();
const modalTrapMap = new Map();

function getFirstFocusable(modal) {
  if (!modal) return null;
  const focusableSelectors = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ];
  return modal.querySelector(focusableSelectors.join(', '));
}

function openModal(modal, focusSelector) {
  if (!modal) return;
  modalFocusMap.set(modal, document.activeElement);
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  trapFocus(modal);
  const focusTarget = focusSelector ? modal.querySelector(focusSelector) : getFirstFocusable(modal);
  if (focusTarget && typeof focusTarget.focus === 'function') {
    focusTarget.focus();
  }
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  releaseFocus(modal);
  const previousFocus = modalFocusMap.get(modal);
  if (previousFocus && typeof previousFocus.focus === 'function') {
    previousFocus.focus();
  }
  modalFocusMap.delete(modal);
}

function trapFocus(modal) {
  if (!modal || modalTrapMap.has(modal)) return;
  const handler = (event) => {
    if (event.key !== 'Tab') return;
    const focusableSelectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ];
    const focusable = Array.from(modal.querySelectorAll(focusableSelectors.join(', ')));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };
  modal.addEventListener('keydown', handler);
  modalTrapMap.set(modal, handler);
}

function releaseFocus(modal) {
  const handler = modalTrapMap.get(modal);
  if (!handler) return;
  modal.removeEventListener('keydown', handler);
  modalTrapMap.delete(modal);
}

function updateSimpleUiToggle(isEnabled) {
  const toggles = document.querySelectorAll('.simple-ui-toggle');
  if (!toggles.length) return;
  toggles.forEach((toggle) => {
    toggle.classList.toggle('active', isEnabled);
    toggle.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');
    toggle.textContent = isEnabled ? 'Simple UI: On' : 'Simple UI: Off';
  });
}

function setSimpleUi(enabled) {
  document.body.classList.toggle('simple-ui', enabled);
  localStorage.setItem('simple-ui', enabled ? 'yes' : 'no');
  updateSimpleUiToggle(enabled);
}

function initSimpleUiPreference() {
  const enabled = localStorage.getItem('simple-ui') === 'yes';
  document.body.classList.toggle('simple-ui', enabled);
  updateSimpleUiToggle(enabled);
}

function setupLogoLink() {
  const logo = document.getElementById('logo-link');
  if (!logo) return;
  logo.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof window.navigateToView === 'function') {
      window.navigateToView('home', { keepScroll: false, scrollBehavior: 'smooth' });
      return;
    }
    window.location.hash = '#home';
  });
}

function setupSimpleUiInfoTooltip() {
  const infoButton = document.getElementById('simple-ui-info');
  const description = document.getElementById('simple-ui-description');
  if (!infoButton || !description || infoButton.dataset.bound === 'true') return;

  const closeTooltip = () => {
    description.classList.remove('is-open');
    infoButton.setAttribute('aria-expanded', 'false');
  };

  infoButton.addEventListener('click', (event) => {
    event.preventDefault();
    const isOpen = description.classList.toggle('is-open');
    infoButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  document.addEventListener('click', (event) => {
    if (description.contains(event.target) || infoButton.contains(event.target)) return;
    closeTooltip();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeTooltip();
    }
  });

  infoButton.dataset.bound = 'true';
}

function showToast(message, duration = 2200) {
  if (!message) return;
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.textContent = message;
  container.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add('fade-out');
    window.setTimeout(() => {
      toast.remove();
    }, 220);
  }, Math.max(900, duration));
}

function applyPerformancePreferences() {
  const prefersReduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  document.body.classList.toggle('reduced-effects', prefersReduceMotion || saveData);
  if (saveData) {
    document.body.classList.add('save-data');
  }
}

function updateHeaderOffsetVar() {
  const header = document.querySelector('.site-header');
  const offset = header ? Math.ceil(header.getBoundingClientRect().height) : 72;
  document.documentElement.style.setProperty('--header-offset', `${offset}px`);
}

// Initialize DOMContentLoaded event handlers
document.addEventListener('DOMContentLoaded', () => {
  applyPerformancePreferences();
  updateActiveNavLink();
  initSimpleUiPreference();
  setupLogoLink();
  setupSimpleUiInfoTooltip();
  updateHeaderOffsetVar();
  setupMusicPlayer();
  setupReadingProgress();
  window.addEventListener('hashchange', updateActiveNavLink);
  window.addEventListener('resize', debounce(updateHeaderOffsetVar, 120));
});

function loadYouTubeIframeApi() {
  if (window.YT && typeof window.YT.Player === 'function') {
    return Promise.resolve(window.YT);
  }
  if (window.__ytApiPromise) {
    return window.__ytApiPromise;
  }

  window.__ytApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    let pollTimer = null;
    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === 'function') {
        previousReady();
      }
      stopPolling();
      resolve(window.YT);
    };

    const injectScript = (src, label) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onerror = () => {
        console.error(`${label} failed to load (blocked or offline).`);
      };
      script.onload = () => {
        console.log(`${label} loaded, waiting for API ready...`);
        pollTimer = setInterval(() => {
          if (window.YT && typeof window.YT.Player === 'function') {
            console.log('YouTube iframe_api ready via polling.');
            stopPolling();
            resolve(window.YT);
          }
        }, 250);
      };
      document.head.appendChild(script);
    };

    injectScript('https://www.youtube.com/iframe_api', 'YouTube iframe_api');

    setTimeout(() => {
      if (!window.YT || typeof window.YT.Player !== 'function') {
        console.error('YouTube iframe_api did not initialize (timeout). Trying nocookie host...');
        injectScript('https://www.youtube-nocookie.com/iframe_api', 'YouTube nocookie iframe_api');
      }
    }, 8000);

    setTimeout(() => {
      if (!window.YT || typeof window.YT.Player !== 'function') {
        console.error('YouTube iframe_api still not ready after fallback (timeout).');
        stopPolling();
        reject(new Error('YouTube Iframe API load timeout'));
      }
    }, 14000);
  });

  return window.__ytApiPromise;
}

// Music player setup
function setupMusicPlayer() {
  const audio = document.getElementById('bg-music');
  const navbarTrackNameDisplay = document.getElementById('navbar-track-name');
  const quickToggleButton = document.getElementById('music-quick-toggle');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);

  if (!audio) return;

  const musicConfig = (window.SITE_CONFIG && window.SITE_CONFIG.music) || {};
  const useYouTube = musicConfig.provider === 'youtube' && typeof musicConfig.youtubePlaylistId === 'string' && musicConfig.youtubePlaylistId.trim().length > 0;
  const youtubePlaylistId = useYouTube ? musicConfig.youtubePlaylistId.trim() : '';
  const youtubeApiKey = typeof musicConfig.youtubeApiKey === 'string' ? musicConfig.youtubeApiKey.trim() : '';
  const savedChoice = localStorage.getItem('music-enabled');
  const savedTime = parseFloat(localStorage.getItem('music-time') || '0');
  const savedVolume = parseFloat(localStorage.getItem('music-volume') || '0.1');
  const defaultCover = 'assets/Peak.png';

  const localPlaylist = [
    { file: './assets/audios/World\'s Number One Oden Store.mp3', title: 'World\'s Number One Oden Store', cover: defaultCover },
    { file: './assets/audios/Wet.mp3', title: 'Wet', cover: defaultCover },
    { file: './assets/audios/No One Ever Said.mp3', title: 'No One Ever Said', cover: defaultCover },
    { file: './assets/audios/Rises The Moon.mp3', title: 'Rises The Moon', cover: defaultCover },
    { file: './assets/audios/Sorry, I Like You.mp3', title: 'Sorry, I Like You', cover: defaultCover }
  ];

  const storedTrackIndex = parseInt(localStorage.getItem('current-track-index') || '0', 10);
  let currentTrackIndex = Number.isInteger(storedTrackIndex) ? storedTrackIndex : 0;
  if (currentTrackIndex < 0) currentTrackIndex = 0;

  let backend = useYouTube ? 'youtube-pending' : 'local';
  let ytPlayer = null;
  let ytReady = false;
  let ytTickTimer = null;
  let youtubePlaylistMeta = [];
  let youtubeMetaPromise = null;
  let localSourceLoaded = false;
  let fadeTimer = null;
  let currentTrackMeta = { title: 'Loading...', cover: defaultCover };

  audio.loop = false;
  audio.volume = Number.isFinite(savedVolume) ? savedVolume : 0.1;
  if (useYouTube) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    localSourceLoaded = false;
  }

  const musicCover = document.getElementById('music-cover');
  const ytContainer = document.getElementById('yt-music-player');
  if (ytContainer) {
    ytContainer.style.width = '0';
    ytContainer.style.height = '0';
    ytContainer.style.overflow = 'hidden';
    ytContainer.style.position = 'absolute';
    ytContainer.style.left = '-9999px';
  }

  const getTargetVolume = () => {
    const stored = parseFloat(localStorage.getItem('music-volume') || '0.1');
    return Number.isFinite(stored) ? Math.max(0, Math.min(stored, 1)) : 0.1;
  };

  const setMusicEnabled = (enabled) => {
    localStorage.setItem('music-enabled', enabled ? 'yes' : 'no');
  };

  const isMusicEnabled = () => localStorage.getItem('music-enabled') === 'yes';

  const updateCoverArt = (coverUrl) => {
    if (!musicCover) return;
    musicCover.src = coverUrl || defaultCover;
  };

  const emitMusicState = () => {
    window.dispatchEvent(new CustomEvent('music-state-change'));
    updateQuickToggleState();
  };

  const updateNavbarTrackInfo = () => {
    if (!navbarTrackNameDisplay) return;
    if (!isMusicEnabled()) {
      navbarTrackNameDisplay.textContent = 'Music: Off';
      return;
    }
    navbarTrackNameDisplay.textContent = currentTrackMeta.title || 'Now playing';
  };

  const updateButtonStates = (isPlaying) => {
    const optionsButton = document.getElementById('options-music-toggle');
    if (!optionsButton) return;
    optionsButton.classList.toggle('playing', isPlaying);
    updateQuickToggleState();
  };

  const updateQuickToggleState = () => {
    if (!quickToggleButton) return;
    const state = getMusicPlaybackState();
    const isEnabled = isMusicEnabled();
    const isPlaying = isEnabled && !state.paused;
    quickToggleButton.classList.toggle('playing', isPlaying);
    quickToggleButton.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
    quickToggleButton.setAttribute('title', isPlaying ? 'Pause background music' : 'Play background music');
    quickToggleButton.innerHTML = isPlaying
      ? '<i class=\"fas fa-pause\" aria-hidden=\"true\"></i><span class=\"sr-only\">Pause music</span>'
      : '<i class=\"fas fa-music\" aria-hidden=\"true\"></i><span class=\"sr-only\">Play music</span>';
  };

  const runFade = (getter, setter, target, duration, onDone) => {
    clearInterval(fadeTimer);
    const steps = Math.max(1, Math.round(duration / 30));
    const start = getter();
    let currentStep = 0;
    fadeTimer = setInterval(() => {
      currentStep += 1;
      const next = start + ((target - start) * (currentStep / steps));
      setter(Math.max(0, Math.min(next, 1)));
      if (currentStep >= steps) {
        clearInterval(fadeTimer);
        setter(target);
        if (onDone) onDone();
      }
    }, 30);
  };

  const setPlaybackVolume = (volume) => {
    const safeVolume = Math.max(0, Math.min(volume, 1));
    localStorage.setItem('music-volume', safeVolume.toString());
    if (backend === 'youtube' && ytReady && ytPlayer && typeof ytPlayer.setVolume === 'function') {
      ytPlayer.setVolume(Math.round(safeVolume * 100));
    } else {
      audio.volume = safeVolume;
    }
    emitMusicState();
  };

  const getPlaybackVolume = () => {
    if (backend === 'youtube' && ytReady && ytPlayer && typeof ytPlayer.getVolume === 'function') {
      return Math.max(0, Math.min((ytPlayer.getVolume() || 0) / 100, 1));
    }
    return Math.max(0, Math.min(audio.volume || 0, 1));
  };

  const updateTrackMeta = (title, cover) => {
    currentTrackMeta = {
      title: title || 'Now playing',
      cover: cover || defaultCover
    };
    updateCoverArt(currentTrackMeta.cover);
    updateNavbarTrackInfo();
    emitMusicState();
  };

  const updateLocalTrackMeta = () => {
    const track = localPlaylist[currentTrackIndex] || localPlaylist[0];
    if (!track) return;
    updateTrackMeta(track.title, track.cover);
  };

  const updateYouTubeTrackMeta = () => {
    if (!ytReady || !ytPlayer || typeof ytPlayer.getVideoData !== 'function') return;
    const data = ytPlayer.getVideoData() || {};
    const videoId = data.video_id || data.videoId || '';
    let title = data.title || 'YouTube playlist';
    let cover = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : defaultCover;
    if (typeof ytPlayer.getPlaylistIndex === 'function') {
      const idx = ytPlayer.getPlaylistIndex();
      if (Number.isInteger(idx) && idx >= 0) {
        currentTrackIndex = idx;
        localStorage.setItem('current-track-index', String(currentTrackIndex));
      }
    }
    const metaMatch = (youtubePlaylistMeta[currentTrackIndex] || null)
      || (videoId ? youtubePlaylistMeta.find((item) => item.id === videoId) : null);
    if (metaMatch) {
      title = metaMatch.title || title;
      cover = metaMatch.cover || cover;
    }
    updateTrackMeta(title, cover);
  };

  const fetchYouTubePlaylistMeta = () => {
    if (!useYouTube || !youtubeApiKey || !youtubePlaylistId) {
      return Promise.resolve([]);
    }
    if (youtubeMetaPromise) return youtubeMetaPromise;

    const results = [];
    const maxPages = 5;

    const fetchPage = (pageToken = '', remaining = maxPages) => {
      const params = new URLSearchParams({
        part: 'snippet,contentDetails',
        maxResults: '50',
        playlistId: youtubePlaylistId,
        key: youtubeApiKey
      });
      if (pageToken) params.append('pageToken', pageToken);

      const url = `https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`;
      return fetch(url)
        .then((res) => res.ok ? res.json() : Promise.reject(res))
        .then((data) => {
          const items = Array.isArray(data.items) ? data.items : [];
          items.forEach((item) => {
            const snippet = item.snippet || {};
            const content = item.contentDetails || {};
            const resource = snippet.resourceId || {};
            const id = content.videoId || resource.videoId || '';
            if (!id) return;
            const thumbs = snippet.thumbnails || {};
            const cover = (thumbs.maxres && thumbs.maxres.url)
              || (thumbs.high && thumbs.high.url)
              || (thumbs.medium && thumbs.medium.url)
              || (thumbs.default && thumbs.default.url)
              || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
            results.push({
              id,
              title: snippet.title || 'YouTube track',
              cover
            });
          });
          if (data.nextPageToken && remaining > 0) {
            return fetchPage(data.nextPageToken, remaining - 1);
          }
          return results;
        })
        .catch(() => results);
    };

    youtubeMetaPromise = fetchPage().then((list) => {
      youtubePlaylistMeta = Array.isArray(list) ? list : [];
      if (backend === 'youtube') {
        updateYouTubeTrackMeta();
      }
      return youtubePlaylistMeta;
    });

    return youtubeMetaPromise;
  };

  const ensureLocalTrackLoaded = () => {
    if (backend !== 'local') return;
    const track = localPlaylist[currentTrackIndex];
    if (!track) return;
    if (!localSourceLoaded || !audio.src || !audio.src.includes(track.file)) {
      audio.src = track.file;
      audio.load();
      localSourceLoaded = true;
    }
  };

  const getMusicPlaybackState = () => {
    if (backend === 'youtube' && ytReady && ytPlayer) {
      const duration = typeof ytPlayer.getDuration === 'function' ? ytPlayer.getDuration() || 0 : 0;
      const currentTime = typeof ytPlayer.getCurrentTime === 'function' ? ytPlayer.getCurrentTime() || 0 : 0;
      const state = typeof ytPlayer.getPlayerState === 'function' ? ytPlayer.getPlayerState() : -1;
      return {
        paused: state !== 1 && state !== 3,
        currentTime,
        duration,
        volume: getPlaybackVolume()
      };
    }
    return {
      paused: audio.paused,
      currentTime: audio.currentTime || 0,
      duration: audio.duration || 0,
      volume: getPlaybackVolume()
    };
  };

  const seekMusicToPercent = (percent) => {
    const clamped = Math.max(0, Math.min(percent, 1));
    if (backend === 'youtube' && ytReady && ytPlayer && typeof ytPlayer.getDuration === 'function' && typeof ytPlayer.seekTo === 'function') {
      const duration = ytPlayer.getDuration() || 0;
      ytPlayer.seekTo(duration * clamped, true);
      emitMusicState();
      return;
    }
    if (audio.duration) {
      audio.currentTime = audio.duration * clamped;
      emitMusicState();
    }
  };

  const pauseWithFade = (callback) => {
    if (backend === 'youtube' && ytReady && ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
      runFade(
        () => getPlaybackVolume(),
        (value) => ytPlayer.setVolume(Math.round(value * 100)),
        0,
        220,
        () => {
          ytPlayer.pauseVideo();
          setMusicEnabled(false);
          updateButtonStates(false);
          updateNavbarTrackInfo();
          emitMusicState();
          if (callback) callback();
        }
      );
      return;
    }

    runFade(
      () => Math.max(0, Math.min(audio.volume || 0, 1)),
      (value) => { audio.volume = value; },
      0,
      220,
      () => {
        audio.pause();
        setMusicEnabled(false);
        updateButtonStates(false);
        updateNavbarTrackInfo();
        emitMusicState();
        if (callback) callback();
      }
    );
  };

  const playWithFade = () => {
    setMusicEnabled(true);

    if (useYouTube && backend !== 'local' && !ytReady) {
      updateTrackMeta('Loading YouTube...', defaultCover);
      return;
    }

    if (backend === 'youtube' && ytReady && ytPlayer && typeof ytPlayer.playVideo === 'function') {
      ytPlayer.setVolume(0);
      ytPlayer.playVideo();
      runFade(
        () => getPlaybackVolume(),
        (value) => ytPlayer.setVolume(Math.round(value * 100)),
        getTargetVolume(),
        320,
        () => {
          updateButtonStates(true);
          updateNavbarTrackInfo();
          emitMusicState();
        }
      );
      return;
    }

    if (backend !== 'local') return;
    ensureLocalTrackLoaded();
    audio.volume = 0;
    audio.play().then(() => {
      runFade(
        () => Math.max(0, Math.min(audio.volume || 0, 1)),
        (value) => { audio.volume = value; },
        getTargetVolume(),
        320,
        () => {
          updateButtonStates(true);
          updateNavbarTrackInfo();
          emitMusicState();
        }
      );
    }).catch((e) => console.log('Autoplay blocked:', e));
  };

  const setLocalTrack = (index, withTransition = true) => {
    if (backend !== 'local') return;
    const safeIndex = Math.max(0, Math.min(index, localPlaylist.length - 1));
    const applyTrack = () => {
      currentTrackIndex = safeIndex;
      localStorage.setItem('current-track-index', String(currentTrackIndex));
      localSourceLoaded = false;
      ensureLocalTrackLoaded();
      updateLocalTrackMeta();
    };

    if (withTransition && !audio.paused && isMusicEnabled()) {
      runFade(
        () => Math.max(0, Math.min(audio.volume || 0, 1)),
        (value) => { audio.volume = value; },
        0,
        200,
        () => {
          audio.pause();
          applyTrack();
          audio.currentTime = 0;
          playWithFade();
        }
      );
      return;
    }

    applyTrack();
    emitMusicState();
  };

  const setYouTubeTrack = (index, withTransition = true) => {
    if (!ytReady || !ytPlayer || typeof ytPlayer.playVideoAt !== 'function') return;
    const playlistIds = typeof ytPlayer.getPlaylist === 'function' ? (ytPlayer.getPlaylist() || []) : [];
    const safeIndex = Math.max(0, Math.min(index, Math.max(0, playlistIds.length - 1)));
    const applyTrack = () => {
      currentTrackIndex = safeIndex;
      localStorage.setItem('current-track-index', String(currentTrackIndex));
      ytPlayer.playVideoAt(safeIndex);
      if (!isMusicEnabled()) {
        ytPlayer.pauseVideo();
      }
      setTimeout(updateYouTubeTrackMeta, 250);
      emitMusicState();
    };

    const ytState = typeof ytPlayer.getPlayerState === 'function' ? ytPlayer.getPlayerState() : -1;
    const isPlaying = ytState === 1 || ytState === 3;
    if (withTransition && isPlaying && isMusicEnabled()) {
      runFade(
        () => getPlaybackVolume(),
        (value) => ytPlayer.setVolume(Math.round(value * 100)),
        0,
        200,
        () => {
          applyTrack();
          ytPlayer.playVideo();
          runFade(
            () => getPlaybackVolume(),
            (value) => ytPlayer.setVolume(Math.round(value * 100)),
            getTargetVolume(),
            320,
            () => emitMusicState()
          );
        }
      );
      return;
    }
    applyTrack();
  };

  const setTrack = (index, withTransition = true) => {
    if (backend === 'youtube') {
      setYouTubeTrack(index, withTransition);
      return;
    }
    if (backend !== 'local') return;
    setLocalTrack(index, withTransition);
  };

  const nextTrack = () => {
    if (backend === 'youtube' && ytReady && ytPlayer && typeof ytPlayer.nextVideo === 'function') {
      const nextIdx = currentTrackIndex + 1;
      setYouTubeTrack(nextIdx, true);
      return;
    }
    if (backend !== 'local') return;
    const nextIdx = (currentTrackIndex + 1) % localPlaylist.length;
    setLocalTrack(nextIdx, true);
  };

  const prevTrack = () => {
    if (backend === 'youtube' && ytReady && ytPlayer && typeof ytPlayer.previousVideo === 'function') {
      const prevIdx = Math.max(0, currentTrackIndex - 1);
      setYouTubeTrack(prevIdx, true);
      return;
    }
    if (backend !== 'local') return;
    const prevIdx = (currentTrackIndex - 1 + localPlaylist.length) % localPlaylist.length;
    setLocalTrack(prevIdx, true);
  };

  const initializeYouTube = () => {
    if (!useYouTube) return Promise.resolve(false);
    fetchYouTubePlaylistMeta();
    return loadYouTubeIframeApi().then(() => {
      if (!ytContainer || !window.YT || typeof window.YT.Player !== 'function') {
        return false;
      }

      return new Promise((resolve) => {
        ytPlayer = new window.YT.Player('yt-music-player', {
          width: '0',
          height: '0',
          videoId: '',
          playerVars: {
            listType: 'playlist',
            list: youtubePlaylistId,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            disablekb: 1,
            origin: window.location.origin
          },
          events: {
            onReady: () => {
              ytReady = true;
              backend = 'youtube';
              audio.pause();
              audio.removeAttribute('src');
              audio.load();
              localSourceLoaded = false;
              ytPlayer.setVolume(Math.round(getTargetVolume() * 100));
              if (currentTrackIndex > 0 && typeof ytPlayer.playVideoAt === 'function') {
                ytPlayer.playVideoAt(currentTrackIndex);
              }
              setTimeout(() => {
                updateYouTubeTrackMeta();
                if (!isMusicEnabled()) {
                  ytPlayer.pauseVideo();
                }
                emitMusicState();
                resolve(true);
              }, 300);
            },
            onStateChange: () => {
              updateYouTubeTrackMeta();
              const state = ytPlayer.getPlayerState();
              updateButtonStates(state === 1 || state === 3);
              emitMusicState();
            },
            onError: (event) => {
              backend = 'youtube-error';
              ytReady = false;
              setMusicEnabled(false);
              const code = event && typeof event.data !== 'undefined' ? ` (error ${event.data})` : '';
              updateTrackMeta(`YouTube unavailable${code}`, defaultCover);
              resolve(false);
            }
          }
        });

        setTimeout(() => {
          if (!ytReady) {
            backend = 'youtube-error';
            setMusicEnabled(false);
            updateTrackMeta('YouTube load timeout (check adblock/CSP)', defaultCover);
            resolve(false);
          }
        }, 8000);
      }).then((ok) => {
        if (ok) {
          if (ytTickTimer) clearInterval(ytTickTimer);
          ytTickTimer = setInterval(() => {
            updateYouTubeTrackMeta();
            emitMusicState();
          }, 500);
        }
        return ok;
      });
    }).catch(() => false);
  };

  window.setPlaylistTrack = (index, withTransition = true) => setTrack(index, withTransition);
  window.getPlaylist = () => {
    if (backend === 'youtube' && ytReady && ytPlayer && typeof ytPlayer.getPlaylist === 'function') {
      if (youtubePlaylistMeta.length) {
        return youtubePlaylistMeta.map((item) => ({
          id: item.id,
          title: item.title || 'YouTube track',
          cover: item.cover || defaultCover
        }));
      }
      return (ytPlayer.getPlaylist() || []).map((id) => ({ id, title: 'YouTube track' }));
    }
    return localPlaylist;
  };
  window.getCurrentTrackIndex = () => currentTrackIndex;
  window.getCurrentTrackInfo = () => currentTrackMeta;
  window.getMusicPlaybackState = getMusicPlaybackState;
  window.setMusicVolume = setPlaybackVolume;
  window.getMusicVolume = getPlaybackVolume;
  window.seekMusicToPercent = seekMusicToPercent;
  window.nextMusicTrack = nextTrack;
  window.prevMusicTrack = prevTrack;
  window.toggleMusicPlayback = () => {
    const state = getMusicPlaybackState();
    if (!state.paused && isMusicEnabled()) {
      pauseWithFade();
    } else {
      playWithFade();
    }
  };
  window.fadeIn = function() {
    playWithFade();
  };
  window.fadeOut = function(callback) {
    pauseWithFade(callback);
  };

  if (quickToggleButton) {
    quickToggleButton.addEventListener('click', () => {
      window.toggleMusicPlayback();
    });
    updateQuickToggleState();
  }

  if (!useYouTube) {
    updateLocalTrackMeta();
    setLocalTrack(Math.min(currentTrackIndex, localPlaylist.length - 1), false);
    if (Number.isFinite(savedTime) && savedTime > 0) {
      audio.currentTime = savedTime;
    }
  }

  audio.addEventListener('timeupdate', () => {
    localStorage.setItem('music-time', audio.currentTime.toString());
    emitMusicState();
  });
  audio.addEventListener('play', () => {
    updateButtonStates(true);
    updateNavbarTrackInfo();
    emitMusicState();
  });
  audio.addEventListener('pause', () => {
    updateButtonStates(false);
    updateNavbarTrackInfo();
    emitMusicState();
  });
  audio.addEventListener('ended', () => {
    if (backend !== 'local') return;
    const nextIdx = (currentTrackIndex + 1) % localPlaylist.length;
    setLocalTrack(nextIdx, true);
  });

  initializeYouTube().then((ytOnline) => {
    if (!ytOnline) {
      if (useYouTube) {
        backend = 'youtube-error';
        updateTrackMeta('YouTube unavailable', defaultCover);
      } else {
        backend = 'local';
        updateLocalTrackMeta();
      }
    } else {
      updateYouTubeTrackMeta();
    }

    // Do not autoplay on initial load. Respect user/data/motion preferences.
    if (!savedChoice) {
      setMusicEnabled(false);
    } else if ((reduceMotion || saveData) && isMusicEnabled()) {
      setMusicEnabled(false);
    }
    updateButtonStates(false);
    updateNavbarTrackInfo();
    emitMusicState();
  });
}

// Options Modal Setup
function setupOptionsModal() {
  const optionsToggle = document.getElementById('options-toggle');
  const optionsModal = document.getElementById('options-modal');
  const optionsClose = document.getElementById('options-close');
  const themeButtons = document.querySelectorAll('.theme-btn');
  const simpleUiToggles = document.querySelectorAll('.simple-ui-toggle');
  const audio = document.getElementById('bg-music');
  const musicTitle = document.getElementById('music-title');
  const musicCover = document.getElementById('music-cover');
  const musicDuration = document.getElementById('music-duration');
  const musicProgress = document.getElementById('music-progress');
  const optionsMusicToggle = document.getElementById('options-music-toggle');
  const optionsVolumeSlider = document.getElementById('options-volume-slider');
  const skipPrevBtn = document.getElementById('music-skip-prev');
  const skipNextBtn = document.getElementById('music-skip-next');

  const hasModal = !!optionsModal;
  const isWide = window.matchMedia('(min-width: 1024px)').matches;
  const sideMode = hasModal && optionsModal.classList.contains('side-controls') && isWide;
  if (sideMode) {
    optionsModal.classList.add('open');
    optionsModal.setAttribute('aria-hidden', 'false');
    if (optionsToggle) {
      optionsToggle.style.display = 'none';
    }
    if (optionsClose) {
      optionsClose.style.display = 'none';
    }
  }

  // Skip buttons
  if (skipPrevBtn) {
    skipPrevBtn.addEventListener('click', () => {
      if (typeof window.prevMusicTrack === 'function') {
        window.prevMusicTrack();
      } else if (window.setPlaylistTrack && window.getCurrentTrackIndex && window.getPlaylist) {
        const playlist = window.getPlaylist();
        const currentIdx = window.getCurrentTrackIndex();
        const playlistLen = playlist.length || 1;
        window.setPlaylistTrack((currentIdx - 1 + playlistLen) % playlistLen);
      }
      updateMusicDisplay();
    });
  }

  if (skipNextBtn) {
    skipNextBtn.addEventListener('click', () => {
      if (typeof window.nextMusicTrack === 'function') {
        window.nextMusicTrack();
      } else if (window.setPlaylistTrack && window.getCurrentTrackIndex && window.getPlaylist) {
        const playlist = window.getPlaylist();
        const currentIdx = window.getCurrentTrackIndex();
        const playlistLen = playlist.length || 1;
        window.setPlaylistTrack((currentIdx + 1) % playlistLen);
      }
      updateMusicDisplay();
    });
  }

  if (hasModal && !sideMode && optionsToggle && optionsClose) {
    const setOptionsExpanded = (isOpen) => {
      optionsToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };
    setOptionsExpanded(false);

    // Open options modal
    optionsToggle.addEventListener('click', () => {
      openModal(optionsModal, '#options-close');
      setOptionsExpanded(true);
      updateMusicDisplay();
      // Sync volume sliders
      if (audio && optionsVolumeSlider) {
        optionsVolumeSlider.value = audio.volume;
      }
    });

    // Close options modal
    optionsClose.addEventListener('click', () => {
      closeModal(optionsModal);
      setOptionsExpanded(false);
    });

    // Close modal when clicking outside
    if (optionsModal) {
      optionsModal.addEventListener('click', (e) => {
        if (e.target === optionsModal) {
          closeModal(optionsModal);
          setOptionsExpanded(false);
        }
      });
    }

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && optionsModal && optionsModal.classList.contains('open')) {
        closeModal(optionsModal);
        setOptionsExpanded(false);
      }
    });
  } else if (sideMode) {
    updateMusicDisplay();
    if (audio && optionsVolumeSlider) {
      optionsVolumeSlider.value = audio.volume;
    }
  }

  if (simpleUiToggles.length) {
    updateSimpleUiToggle(document.body.classList.contains('simple-ui'));
    simpleUiToggles.forEach((toggle) => {
      toggle.addEventListener('click', () => {
        setSimpleUi(!document.body.classList.contains('simple-ui'));
      });
    });
  }

  // Options music toggle
  if (optionsMusicToggle) {
    optionsMusicToggle.addEventListener('click', () => {
      if (typeof window.toggleMusicPlayback === 'function') {
        window.toggleMusicPlayback();
      } else if (audio) {
        if (audio.paused) {
          fadeIn();
        } else {
          fadeOut();
        }
      }
      updateMusicButtonState();
    });
  }

  // Options volume slider
  if (optionsVolumeSlider) {
    optionsVolumeSlider.addEventListener('input', (e) => {
      const volume = parseFloat(e.target.value);
      if (typeof window.setMusicVolume === 'function') {
        window.setMusicVolume(volume);
      } else if (audio) {
        audio.volume = volume;
        localStorage.setItem('music-volume', volume.toString());
      }
    });
  }

  // Theme switching
  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      
      // Remove active class from all buttons
      themeButtons.forEach(b => b.classList.remove('active'));
      
      // Add active class to clicked button
      btn.classList.add('active');
      
      // Apply theme
      applyTheme(theme);
      
      // Save theme preference
      localStorage.setItem('theme', theme);
    });
  });

  // Load saved theme
  const savedTheme = localStorage.getItem('theme') || 'default';
  const savedThemeBtn = document.querySelector(`.theme-btn[data-theme="${savedTheme}"]`);
  if (savedThemeBtn) {
    themeButtons.forEach(b => b.classList.remove('active'));
    savedThemeBtn.classList.add('active');
    if (savedTheme !== 'default') {
      applyTheme(savedTheme);
    }
  }

  // Update music display
  function updateMusicDisplay() {
    if (!musicTitle) return;

    const trackInfo = typeof window.getCurrentTrackInfo === 'function'
      ? window.getCurrentTrackInfo()
      : null;
    musicTitle.textContent = (trackInfo && trackInfo.title) ? trackInfo.title : 'Loading...';
    if (musicCover && trackInfo && trackInfo.cover) {
      musicCover.src = trackInfo.cover;
    }

    const playback = typeof window.getMusicPlaybackState === 'function'
      ? window.getMusicPlaybackState()
      : {
          paused: audio ? audio.paused : true,
          currentTime: audio ? audio.currentTime || 0 : 0,
          duration: audio ? audio.duration || 0 : 0,
          volume: audio ? audio.volume || 0 : 0
        };

    if (musicProgress && playback.duration > 0) {
      musicProgress.value = (playback.currentTime / playback.duration) * 100;
      const minutes = Math.floor(playback.currentTime / 60);
      const seconds = Math.floor(playback.currentTime % 60);
      const totalMinutes = Math.floor(playback.duration / 60);
      const totalSeconds = Math.floor(playback.duration % 60);
      if (musicDuration) {
        musicDuration.textContent = `${minutes}:${seconds.toString().padStart(2, '0')} / ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
      }
    } else if (musicDuration) {
      musicDuration.textContent = '--:-- / --:--';
    }
  }

  // Update music button state
  function updateMusicButtonState() {
    if (!optionsMusicToggle) return;
    const playback = typeof window.getMusicPlaybackState === 'function'
      ? window.getMusicPlaybackState()
      : { paused: audio ? audio.paused : true };
    if (playback.paused || localStorage.getItem('music-enabled') !== 'yes') {
      optionsMusicToggle.innerHTML = '<i class="fas fa-play"></i> Play';
    } else {
      optionsMusicToggle.innerHTML = '<i class="fas fa-pause"></i> Pause';
    }
  }

  // Update music display on time change
  if (audio) {
    audio.addEventListener('timeupdate', updateMusicDisplay);
    audio.addEventListener('play', updateMusicButtonState);
    audio.addEventListener('pause', updateMusicButtonState);
  }
  window.addEventListener('music-state-change', updateMusicDisplay);
  window.addEventListener('music-state-change', updateMusicButtonState);
  setInterval(updateMusicDisplay, 500);

  // Handle progress bar click
  if (musicProgress) {
    musicProgress.addEventListener('input', (e) => {
      const percent = e.target.value / 100;
      if (typeof window.seekMusicToPercent === 'function') {
        window.seekMusicToPercent(percent);
      } else if (audio && audio.duration) {
        audio.currentTime = percent * audio.duration;
      }
    });
  }

  updateMusicDisplay();
  updateMusicButtonState();
  if (optionsVolumeSlider) {
    if (typeof window.getMusicVolume === 'function') {
      optionsVolumeSlider.value = window.getMusicVolume();
    } else if (audio) {
      optionsVolumeSlider.value = audio.volume;
    }
  }
}

// Apply theme
function applyTheme(theme) {
  if (theme === 'default') {
    document.body.classList.remove('theme-blue', 'theme-purple', 'theme-green', 'theme-red', 'theme-rgb');
  } else {
    document.body.classList.remove('theme-blue', 'theme-purple', 'theme-green', 'theme-red', 'theme-rgb');
    document.body.classList.add(`theme-${theme}`);
  }
}

// Initialize options modal on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setupOptionsModal();
  initializeEasterEggs();
  setupReadingProgress();
});

// Easter Eggs and Hidden Features
function initializeEasterEggs() {
  // Konami code easter egg (up, up, down, down, left, right, left, right, b, a)
  const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiIndex = 0;

  document.addEventListener('keydown', (e) => {
    const key = e.key === 'b' || e.key === 'a' ? e.key : e.code;
    
    if (key === konamiCode[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiCode.length) {
        activateKonamiEasterEgg();
        konamiIndex = 0;
      }
    } else {
      konamiIndex = 0;
    }
  });

  // Triple-click hero avatar for surprise
  const heroAvatar = document.querySelector('.hero-avatar');
  if (heroAvatar) {
    let clickCount = 0;
    let clickTimer;
    
    heroAvatar.addEventListener('click', () => {
      clickCount++;
      clearTimeout(clickTimer);
      
      if (clickCount === 3) {
        activateAvatarEasterEgg();
        clickCount = 0;
      }
      
      clickTimer = setTimeout(() => {
        clickCount = 0;
      }, 500);
    });
  }

  // Secret keyboard command: press 'v' + 'd' within 1 second for dev console messages
  let vPressed = false;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'v' || e.key === 'V') {
      vPressed = true;
      setTimeout(() => { vPressed = false; }, 1000);
    }
    
    if ((e.key === 'd' || e.key === 'D') && vPressed) {
      console.log('%cDEVELOPER MODE ACTIVATED', 'color: #ff0080; font-size: 16px; font-weight: bold;');
      console.log('%cThanks for checking the source code! You have great taste.', 'color: #00ffff; font-size: 12px;');
      console.log('%cHere are some tips:', 'color: #ff00ff; font-size: 12px;');
      console.log('* Try the Konami code: Up Up Down Down Left Right Left Right B A');
      console.log('* Triple-click the avatar');
      console.log('* RGB theme option is available in settings');
      vPressed = false;
    }
  });

  // Click on page title multiple times for achievement
  const pageTitle = document.querySelector('h1');
  if (pageTitle) {
    let titleClicks = 0;
    pageTitle.style.cursor = 'pointer';
    pageTitle.addEventListener('click', () => {
      titleClicks++;
      pageTitle.style.transition = 'transform 0.1s';
      pageTitle.style.transform = `rotate(${titleClicks * 5}deg) scale(${1 + titleClicks * 0.02})`;
      
      if (titleClicks === 10) {
        console.log('%cAchievement Unlocked: Spinner', 'color: #ffff00; font-size: 14px; font-weight: bold;');
        pageTitle.style.animation = 'spin 2s linear';
        titleClicks = 0;
      }
    });
  }
}



// Reading Progress Indicator
let readingProgressBound = false;
function setupReadingProgress() {
  const progressBar = document.getElementById('reading-progress');
  
  if (!progressBar || readingProgressBound) return;
  readingProgressBound = true;

  window.addEventListener('scroll', () => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;
    
    // Calculate progress (0 to 100)
    const scrollPercent = (scrollTop / (documentHeight - windowHeight)) * 100;
    
    progressBar.style.width = Math.min(scrollPercent, 100) + '%';
  });
}



