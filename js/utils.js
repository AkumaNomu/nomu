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

// Copy text to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    console.log('Copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

// Update active nav link based on current page
function updateActiveNavLink() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href');

    if (currentPath.includes(linkPath) || 
       (linkPath === '/' && (currentPath === '/' || currentPath.endsWith('index.html'))) ||
       (linkPath === 'index.html' && currentPath === '/')) {
       link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
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

// Initialize DOMContentLoaded event handlers
document.addEventListener('DOMContentLoaded', () => {
  updateActiveNavLink();
  initSimpleUiPreference();
  setupMusicPlayer();
  setupReadingProgress();
});

// Music player setup
function setupMusicPlayer() {
  const audio = document.getElementById('bg-music');
  const navbarTrackNameDisplay = document.getElementById('navbar-track-name');
  const modal = document.getElementById('music-modal');
  const btnYes = document.getElementById('music-yes');
  const btnNo = document.getElementById('music-no');

  if (!audio || !modal || !btnYes || !btnNo) return;

  // Restore previous state
  const savedChoice = localStorage.getItem('music-enabled');
  const savedTime = parseFloat(localStorage.getItem('music-time') || '0');
  const savedVolume = parseFloat(localStorage.getItem('music-volume') || '0.1');

  // Set initial volume
  audio.volume = savedVolume;

  // Show modal for first-time users
  modal.classList.add('open');

  // User clicks "Yes"
  btnYes.addEventListener('click', async () => {
    try {
      await audio.play();
      localStorage.setItem('music-enabled', 'yes');
      modal.classList.remove('open');
      fadeIn();
    } catch (e) {
      console.error('Audio play blocked:', e);
    }
  });

  // User clicks "No"
  btnNo.addEventListener('click', () => {
    audio.pause();
    localStorage.setItem('music-enabled', 'no');
    modal.classList.remove('open');
  });

  // Save playback position
  audio.addEventListener('timeupdate', () => {
    localStorage.setItem('music-time', audio.currentTime.toString());
  });

  // Playlist configuration with 5 songs
  const playlist = [
    { file: './assets/audios/World\'s Number One Oden Store.mp3', title: 'World\'s Number One Oden Store' },
    { file: './assets/audios/Wet.mp3', title: 'Wet' },
    { file: './assets/audios/No One Ever Said.mp3', title: 'No One Ever Said' },
    { file: './assets/audios/Rises The Moon.mp3', title: 'Rises The Moon' },
    { file: './assets/audios/Sorry, I Like You.mp3', title: 'Sorry, I Like You' }
  ];

  const storedTrackIndex = localStorage.getItem('current-track-index');
  let currentTrackIndex = Number.isInteger(parseInt(storedTrackIndex, 10))
    ? parseInt(storedTrackIndex, 10)
    : 1;
  if (currentTrackIndex < 0 || currentTrackIndex >= playlist.length) {
    currentTrackIndex = 1;
  }

  const defaultTrackFlag = 'music-default-track-v2';
  if (localStorage.getItem(defaultTrackFlag) !== 'yes') {
    currentTrackIndex = 1;
    localStorage.setItem('current-track-index', '1');
    localStorage.setItem(defaultTrackFlag, 'yes');
  }
  
  const setTrack = (index) => {
    currentTrackIndex = Math.max(0, Math.min(index, playlist.length - 1));
    const track = playlist[currentTrackIndex];
    audio.src = track.file;
    if (navbarTrackNameDisplay) navbarTrackNameDisplay.textContent = track.title;
    localStorage.setItem('current-track-index', currentTrackIndex.toString());
  };

  // Set initial track
  setTrack(currentTrackIndex);

  // Expose setTrack globally for HTML buttons
  window.setPlaylistTrack = setTrack;
  window.getPlaylist = () => playlist;
  window.getCurrentTrackIndex = () => currentTrackIndex;

  // Audio fading logic
  let fadeInterval;
  const targetVolume = 0.1;

  const updateButtonStates = (isPlaying) => {
    const optionsButton = document.getElementById('options-music-toggle');
    if (optionsButton) {
      if (isPlaying) {
        optionsButton.classList.add('playing');
      } else {
        optionsButton.classList.remove('playing');
      }
    }
  };

  window.fadeIn = function() {
    audio.volume = 0;
    audio.play().then(() => {
      updateButtonStates(true);
      clearInterval(fadeInterval);
      fadeInterval = setInterval(() => {
        if (audio.volume < targetVolume) {
          audio.volume = Math.min(audio.volume + 0.05, targetVolume);
        } else {
          clearInterval(fadeInterval);
        }
      }, 100);
    }).catch(e => console.log("Autoplay blocked:", e));
  };

  window.fadeOut = function(callback) {
    clearInterval(fadeInterval);
    fadeInterval = setInterval(() => {
      if (audio.volume > 0.01) {
        audio.volume = Math.max(audio.volume - 0.05, 0);
      } else {
        audio.volume = 0;
        audio.pause();
        updateButtonStates(false);
        clearInterval(fadeInterval);
        if (callback) callback();
      }
    }, 50);
  };

  // Auto-play check
  if (localStorage.getItem('userPrefersMusic') === 'true' && savedChoice === 'yes') {
    setTimeout(fadeIn, 500);
  }
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
  const musicDuration = document.getElementById('music-duration');
  const musicProgress = document.getElementById('music-progress');
  const optionsMusicToggle = document.getElementById('options-music-toggle');
  const optionsVolumeSlider = document.getElementById('options-volume-slider');
  const skipPrevBtn = document.getElementById('music-skip-prev');
  const skipNextBtn = document.getElementById('music-skip-next');
  const playlistSelector = document.getElementById('playlist-selector');

  if (!optionsToggle || !optionsModal) return;

  // Initialize playlist buttons
  const playlist = window.getPlaylist ? window.getPlaylist() : [];
  if (playlistSelector && playlist.length > 0) {
    playlistSelector.innerHTML = '<label style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem; display: block; grid-column: 1 / -1;">Playlist</label>';
    const currentIdx = window.getCurrentTrackIndex ? window.getCurrentTrackIndex() : 0;
    playlist.forEach((track, index) => {
      const btn = document.createElement('button');
      btn.className = 'playlist-btn' + (index === currentIdx ? ' active' : '');
      btn.textContent = `${index + 1}`;
      btn.title = track.title;
      btn.addEventListener('click', () => {
        if (window.setPlaylistTrack) {
          window.setPlaylistTrack(index);
          updatePlaylistButtons();
          updateMusicDisplay();

          // If music is enabled or already playing, try to start playback of the selected track
          if (audio) {
            try {
              if (!audio.paused) {
                audio.play().catch(()=>{});
              } else if (localStorage.getItem('music-enabled') === 'yes') {
                // Fade in for nicer UX
                if (window.fadeIn) window.fadeIn();
              }
            } catch (e) {
              console.warn('Could not start audio playback:', e);
            }
          }
        }
      });
      playlistSelector.appendChild(btn);
    });
  }

  const updatePlaylistButtons = () => {
    const buttons = document.querySelectorAll('.playlist-btn');
    const currentIdx = window.getCurrentTrackIndex ? window.getCurrentTrackIndex() : 0;
    buttons.forEach((btn, idx) => {
      if (idx === currentIdx) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  };

  // Skip buttons
  if (skipPrevBtn) {
    skipPrevBtn.addEventListener('click', () => {
      const currentIdx = window.getCurrentTrackIndex ? window.getCurrentTrackIndex() : 0;
      const playlistLen = playlist.length || 1;
      const newIdx = (currentIdx - 1 + playlistLen) % playlistLen;
      if (window.setPlaylistTrack) {
        window.setPlaylistTrack(newIdx);
        updatePlaylistButtons();
        updateMusicDisplay();
      }
    });
  }

  if (skipNextBtn) {
    skipNextBtn.addEventListener('click', () => {
      const currentIdx = window.getCurrentTrackIndex ? window.getCurrentTrackIndex() : 0;
      const playlistLen = playlist.length;
      if (window.setPlaylistTrack) {
        window.setPlaylistTrack((currentIdx + 1) % playlistLen);
        updatePlaylistButtons();
        updateMusicDisplay();
      }
    });
  }

  // Open options modal
  optionsToggle.addEventListener('click', () => {
    optionsModal.classList.add('open');
    updateMusicDisplay();
    updatePlaylistButtons();
    // Sync volume sliders
    if (audio && optionsVolumeSlider) {
      optionsVolumeSlider.value = audio.volume;
    }
  });

  // Close options modal
  optionsClose.addEventListener('click', () => {
    optionsModal.classList.remove('open');
  });

  // Close modal when clicking outside
  optionsModal.addEventListener('click', (e) => {
    if (e.target === optionsModal) {
      optionsModal.classList.remove('open');
    }
  });

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && optionsModal.classList.contains('open')) {
      optionsModal.classList.remove('open');
    }
  });

  if (simpleUiToggles.length) {
    updateSimpleUiToggle(document.body.classList.contains('simple-ui'));
    simpleUiToggles.forEach((toggle) => {
      toggle.addEventListener('click', () => {
        setSimpleUi(!document.body.classList.contains('simple-ui'));
      });
    });
  }

  // Options music toggle
  if (optionsMusicToggle && audio) {
    optionsMusicToggle.addEventListener('click', () => {
      if (audio.paused) {
        fadeIn();
      } else {
        fadeOut();
      }
      updateMusicButtonState();
    });
  }

  // Options volume slider
  if (optionsVolumeSlider && audio) {
    optionsVolumeSlider.addEventListener('input', (e) => {
      const volume = parseFloat(e.target.value);
      audio.volume = volume;
      localStorage.setItem('music-volume', volume.toString());
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
    if (!audio || !musicTitle) return;
    
    // Get current track from playlist
    const playlist = window.getPlaylist ? window.getPlaylist() : [];
    const currentIdx = window.getCurrentTrackIndex ? window.getCurrentTrackIndex() : 0;
    const trackTitle = playlist[currentIdx] ? playlist[currentIdx].title : 'Loading...';
    
    musicTitle.textContent = trackTitle;

    // Update progress
    if (musicProgress && audio.duration) {
      musicProgress.value = (audio.currentTime / audio.duration) * 100;
      const minutes = Math.floor(audio.currentTime / 60);
      const seconds = Math.floor(audio.currentTime % 60);
      const totalMinutes = Math.floor(audio.duration / 60);
      const totalSeconds = Math.floor(audio.duration % 60);
      musicDuration.textContent = `${minutes}:${seconds.toString().padStart(2, '0')} / ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
    }
  }

  // Update music button state
  function updateMusicButtonState() {
    if (!audio || !optionsMusicToggle) return;
    if (audio.paused) {
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

  // Handle progress bar click
  if (musicProgress && audio) {
    musicProgress.addEventListener('input', (e) => {
      const percent = e.target.value / 100;
      audio.currentTime = percent * audio.duration;
    });
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
      console.log('%c🎮 DEVELOPER MODE ACTIVATED 🎮', 'color: #ff0080; font-size: 16px; font-weight: bold;');
      console.log('%cThanks for checking the source code! You have great taste.', 'color: #00ffff; font-size: 12px;');
      console.log('%cHere are some tips:', 'color: #ff00ff; font-size: 12px;');
      console.log('• Try the Konami code: ↑ ↑ ↓ ↓ ← → ← → B A');
      console.log('• Triple-click the avatar');
      console.log('• RGB theme option is available in settings');
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
        console.log('%c✨ Achievement Unlocked: Spinner ✨', 'color: #ffff00; font-size: 14px; font-weight: bold;');
        pageTitle.style.animation = 'spin 2s linear';
        titleClicks = 0;
      }
    });
  }
}



// Reading Progress Indicator
function setupReadingProgress() {
  const progressBar = document.getElementById('reading-progress');
  
  if (!progressBar) return;

  window.addEventListener('scroll', () => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;
    
    // Calculate progress (0 to 100)
    const scrollPercent = (scrollTop / (documentHeight - windowHeight)) * 100;
    
    progressBar.style.width = Math.min(scrollPercent, 100) + '%';
  });
}


