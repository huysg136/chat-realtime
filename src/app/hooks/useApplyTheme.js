import { useEffect } from "react";

export default function useApplyTheme(theme) {
  useEffect(() => {
    if (!theme) return;

    const root = document.body;
    root.classList.remove("theme-light", "theme-dark");

    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(prefersDark ? "theme-dark" : "theme-light");
    } else {
      root.classList.add(`theme-${theme}`);
    }

    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const updateSystemTheme = () => {
        root.classList.remove("theme-light", "theme-dark");
        root.classList.add(media.matches ? "theme-dark" : "theme-light");
      };
      media.addEventListener("change", updateSystemTheme);
      return () => media.removeEventListener("change", updateSystemTheme);
    }
  }, [theme]);
}
