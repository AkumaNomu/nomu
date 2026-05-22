export const READING_MODE_STORAGE_KEY = "nomu-reading-mode";
export const MUSIC_COLLAPSED_STORAGE_KEY = "nomu-music-collapsed";
export const COMMENTS_COLLAPSED_STORAGE_KEY = "nomu-comments-collapsed";

export function getReadingModeBootstrapScript() {
  return `
    (function() {
      try {
        var raw = localStorage.getItem("${READING_MODE_STORAGE_KEY}");
        var on = raw === "1" || raw === "true";
        document.documentElement.dataset.readingMode = on ? "on" : "off";
      } catch (error) {}
    })();
  `;
}
