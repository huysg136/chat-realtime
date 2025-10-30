import { useEffect } from "react";

export default function useApplyTheme(theme) {
  useEffect(() => {
    if (!theme) return;

    document.body.classList.remove("theme-light", "theme-dark");

    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.body.classList.add(prefersDark ? "theme-dark" : "theme-light");
    } else {
      document.body.classList.add(`theme-${theme}`);
    }
  }, [theme]);
}
