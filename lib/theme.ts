export const THEME_STORAGE_KEY = "archive-theme";
export const WPM_STORAGE_KEY = "archive-reader-wpm";

export type ThemeMode = "light" | "dark";

export function getThemeBootstrapScript() {
  return `
    (function() {
      try {
        var theme = localStorage.getItem("${THEME_STORAGE_KEY}");
        if (theme !== "light" && theme !== "dark") {
          theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        }
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
      } catch (error) {}
    })();
  `;
}
