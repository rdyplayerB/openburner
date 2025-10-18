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
      className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 shadow-card hover:shadow-card-hover transition-all duration-150 active:scale-95"
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

