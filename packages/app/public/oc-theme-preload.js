;(function () {
  var key = "opencode-theme-id"
  var themeId = localStorage.getItem(key) || "rocksoul-industrial"

  var scheme = localStorage.getItem("opencode-color-scheme") || "system"
  var isDark = scheme === "dark" || (scheme === "system" && matchMedia("(prefers-color-scheme: dark)").matches)
  var mode = isDark ? "dark" : "light"
  var backgrounds = {
    "rocksoul-industrial": { light: "#f1eee7", dark: "#17191b" },
    "rocksoul-punk": { light: "#f3f0e9", dark: "#111114" },
    "rocksoul-workbench": { light: "#f2f5f8", dark: "#151d25" },
  }
  var background = backgrounds[themeId] ? backgrounds[themeId][mode] : (isDark ? "#080808" : "#fafafa")

  document.documentElement.dataset.theme = themeId
  if (themeId.indexOf("rocksoul-") === 0) document.documentElement.dataset.rocksoulSkin = themeId
  else delete document.documentElement.dataset.rocksoulSkin
  document.documentElement.dataset.colorScheme = mode
  document.documentElement.style.backgroundColor = background

  var metas = document.querySelectorAll("meta[name='theme-color']")
  if (metas.length > 0) metas[0].setAttribute("content", background)

  if (themeId === "oc-2") return

  var css = localStorage.getItem("opencode-theme-css-" + mode)
  if (css) {
    var style = document.createElement("style")
    style.id = "oc-theme-preload"
    style.textContent =
      ":root{color-scheme:" +
      mode +
      ";--text-mix-blend-mode:" +
      (isDark ? "plus-lighter" : "multiply") +
      ";" +
      css +
      "}"
    document.head.appendChild(style)
  }
})()
