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

document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    // 1. Get the path from the link's href (e.g., "blog.html")
    const linkPath = link.getAttribute('href');

    // 2. Check if the current URL contains this link's path
    // We use 'includes' because your path might be "/my-site/blog.html"
    // Handle root "/" or "index.html" specifically if needed
    
    if (currentPath.includes(linkPath) || 
       (linkPath === '/' && (currentPath === '/' || currentPath.endsWith('index.html'))) ||
       (linkPath === 'index.html' && currentPath === '/')) {
       
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  const audio = document.getElementById('bg-music');
    const toggleBtnMobile = document.getElementById('music-toggle');
    const toggleBtnDesktop = document.getElementById('music-toggle-desktop');
    const volumeSlider = document.getElementById('volume-slider');
    const trackNameDisplay = document.getElementById('track-name');
  const modal = document.getElementById('music-modal');
  const btnYes = document.getElementById('music-yes');
  const btnNo = document.getElementById('music-no');

  if (!audio || !modal || !btnYes || !btnNo) return;

  // Restore previous state
  const savedChoice = localStorage.getItem('music-enabled');
  const savedTime = parseFloat(localStorage.getItem('music-time') || '0');

  // Always show modal for now to test
  modal.classList.add('open');

  // User clicks "Yes"
  btnYes.addEventListener('click', async () => {
    try {
      await audio.play(); // user gesture unlocks audio[web:57][web:59]
      localStorage.setItem('music-enabled', 'yes');
      modal.classList.remove('open');
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

  // Save playback position periodically so it can continue across pages
  audio.addEventListener('timeupdate', () => {
    localStorage.setItem('music-time', audio.currentTime.toString());
  });


    if (!audio || (!toggleBtnMobile && !toggleBtnDesktop)) return;

    // 1. Configuration: Define songs per page
    // Using relative paths works best for GitHub Pages
    const playlist = {
        'index.html': { file: './assets/audios/Index.mp3', title: 'World\'s Number One Oden Store' },
        '/': { file: './assets/audios/Index.mp3', title: 'World\'s Number One Oden Store' } // Fallback for root
    };

    // 2. Determine current page and set song
    const path = window.location.pathname;
    // Get filename from path (e.g., "/site/blog.html" -> "blog.html")
    let page = path.substring(path.lastIndexOf('/') + 1) || '/';
    
    // Default to index if unknown
    if (!playlist[page]) page = 'index.html';

    const currentTrack = playlist[page];
    audio.src = currentTrack.file;
    if(trackNameDisplay) trackNameDisplay.textContent = currentTrack.title;

    // 3. Audio Fading Logic
    let fadeInterval;
    const targetVolume = 0.1; // Default max volume
    
    // Set slider to match target
    if(volumeSlider) volumeSlider.value = targetVolume;

    const updateButtonStates = (isPlaying) => {
        const buttons = [toggleBtnMobile, toggleBtnDesktop].filter(btn => btn);
        buttons.forEach(btn => {
            if (isPlaying) {
                btn.classList.add('playing');
            } else {
                btn.classList.remove('playing');
            }
        });
    };

    const fadeIn = () => {
        audio.volume = 0;
        audio.play().then(() => {
            updateButtonStates(true);
            clearInterval(fadeInterval);
            fadeInterval = setInterval(() => {
                if (audio.volume < targetVolume) {
                    // Increase volume gradually
                    audio.volume = Math.min(audio.volume + 0.05, targetVolume);
                } else {
                    clearInterval(fadeInterval);
                }
            }, 100); // Updates every 100ms
        }).catch(e => console.log("Autoplay blocked:", e));
    };

    const fadeOut = (callback) => {
        clearInterval(fadeInterval);
        fadeInterval = setInterval(() => {
            if (audio.volume > 0.01) {
                // Decrease volume gradually
                audio.volume = Math.max(audio.volume - 0.05, 0);
            } else {
                audio.volume = 0;
                audio.pause();
                updateButtonStates(false);
                clearInterval(fadeInterval);
                if (callback) callback();
            }
        }, 50); // Faster fade out (50ms)
    };

    // 4. Toggle Button Interaction - Handle both mobile and desktop buttons
    [toggleBtnMobile, toggleBtnDesktop].filter(btn => btn).forEach(btn => {
        btn.addEventListener('click', () => {
            if (audio.paused) {
                fadeIn();
                localStorage.setItem('userPrefersMusic', 'true');
            } else {
                fadeOut();
                localStorage.setItem('userPrefersMusic', 'false');
            }
        });
    });

    // 5. Volume Slider Interaction
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            audio.volume = e.target.value;
            // Update "targetVolume" logic if you want dynamic fading limits
        });
    }

    // 6. Handle Page Navigation (The "Fade Out" effect)
    // Select all internal links to apply fade-out effect before leaving
    const links = document.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            
            // Only fade out for internal navigation (not #anchors or external links)
            if (href && !href.startsWith('#') && !href.startsWith('http') && !href.includes('mailto:')) {
                if (!audio.paused) {
                    e.preventDefault(); // Stop immediate jump
                    fadeOut(() => {
                        window.location.href = href; // Navigate after fade
                    });
                }
            }
        });
    });

    // 7. Auto-play check (Optional: Remember user preference)
    if (localStorage.getItem('userPrefersMusic') === 'true') {
        // Short delay to ensure page is ready
        setTimeout(fadeIn, 500);
    }
});

