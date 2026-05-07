"use client";

import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const UserMenu: React.FC = () => {
  const { user, signOut, setShowAuthModal } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) {
    return (
      <button
        onClick={() => setShowAuthModal(true)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors duration-200"
      >
        Sign In
      </button>
    );
  }

  const displayName = user.username || user.email?.split("@")[0] || "Player";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 dark:bg-slate-800 bg-white hover:dark:bg-slate-700 hover:bg-slate-100 rounded-lg dark:border-slate-700 border-slate-200 border transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
          {displayName[0]?.toUpperCase() || "?"}
        </div>
        <span className="text-sm dark:text-slate-200 text-slate-700 max-w-[100px] truncate">{displayName}</span>
        <svg className="w-4 h-4 dark:text-slate-400 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 dark:bg-slate-800 bg-white dark:border-slate-700 border-slate-200 border rounded-xl shadow-xl z-50 py-1">
            <div className="px-4 py-2 dark:border-slate-700 border-slate-200 border-b">
              <p className="text-sm font-medium dark:text-white text-slate-900 truncate">{displayName}</p>
              <p className="text-xs dark:text-slate-400 text-slate-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:dark:bg-slate-700 hover:bg-slate-100 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default UserMenu;
