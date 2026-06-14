"use client";

import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/store/theme-store";

export function ThemeToggle() {
  const { isDarkMode, toggleTheme, setTheme } = useThemeStore();

  // Initialize theme on mount
  useEffect(() => {
    // Apply theme from store on mount
    setTheme(isDarkMode);
  }, []);

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg sw-surface border border-[var(--sw-line)] text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-all duration-150 active:scale-95"
      title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
    >
      {isDarkMode ? (
        <Sun className="w-4 h-4" strokeWidth={2.5} />
      ) : (
        <Moon className="w-4 h-4" strokeWidth={2.5} />
      )}
    </button>
  );
}

