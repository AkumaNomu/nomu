(function () {
  try {
    var theme = localStorage.getItem("archive-theme");
    if (theme !== "light" && theme !== "dark") {
      theme =
        window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    }
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (e) {}
  try {
    var raw = localStorage.getItem("nomu-reading-mode");
    document.documentElement.dataset.readingMode =
      raw === "1" || raw === "true" ? "on" : "off";
  } catch (e) {}
})();
