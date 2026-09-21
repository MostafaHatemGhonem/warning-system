"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkDark();

    // Listen for theme change events
    window.addEventListener("theme-change", checkDark);
    window.addEventListener("storage", checkDark);

    return () => {
      window.removeEventListener("theme-change", checkDark);
      window.removeEventListener("storage", checkDark);
    };
  }, []);

  const toggleTheme = () => {
    const currentlyDark = document.documentElement.classList.contains("dark");
    if (currentlyDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
    window.dispatchEvent(new Event("theme-change"));
  };

  if (!mounted) {
    return (
      <div
        className={`h-9 w-9 rounded-xl border border-zinc-200 p-2 dark:border-zinc-800 ${className || ""}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
      title={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white ${className || ""}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45 duration-300" />
      ) : (
        <Moon className="h-4 w-4 text-zinc-600 transition-transform hover:-rotate-12 duration-300" />
      )}
    </button>
  );
}
