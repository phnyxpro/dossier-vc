import { useEffect, useState } from "react";

const KEY = "dossier-theme";

export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  return {
    theme,
    toggle: () => {
      setTheme((prev) => {
        const next = prev === "dark" ? "light" : "dark";
        window.localStorage.setItem(KEY, next);
        return next;
      });
    },
  };
}
