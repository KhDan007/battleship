"use client";

import React from "react";
import { useTheme } from "../contexts/ThemeContext";

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
      style={{
        backgroundColor: theme === "dark" ? "#1e293b" : "#e2e8f0",
      }}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <span className="sr-only">Toggle theme</span>
      <div
        className="absolute top-1 w-6 h-6 rounded-full shadow-lg transform transition-transform duration-300 flex items-center justify-center"
        style={{
          backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff",
          transform: theme === "dark" ? "translateX(0)" : "translateX(24px)",
          left: "4px",
        }}
      >
        {theme === "dark" ? (
          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l.708-.707a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414zM2 11a1 1 0 100-2H1a1 1 0 100 2h1zm4 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-6.707-4.707a1 1 0 010 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 0z" />
          </svg>
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;
