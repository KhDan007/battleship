"use client";

import React from "react";

interface WaitingRoomProps {
  inviteCode: string;
  playerNum: 1 | 2;
  onCancel: () => void;
}

const WaitingRoom: React.FC<WaitingRoomProps> = ({ inviteCode, playerNum, onCancel }) => {
  return (
    <div className="card p-8 max-w-md w-full mx-auto text-center animate-slide-in">
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mb-4">
          <span className="text-3xl">⏳</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Waiting for Opponent
        </h2>
        <p className="text-slate-400">
          {playerNum === 1
            ? "Share the invite code with your friend"
            : "Joining game..."}
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="p-4 bg-slate-800 rounded-lg">
          <p className="text-xs text-slate-500 mb-1">INVITE CODE</p>
          <p className="text-3xl font-mono font-bold text-white tracking-widest">
            {inviteCode}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(inviteCode)}
            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-sm transition-colors"
          >
            Copy Code
          </button>
          <button
            onClick={() =>
              navigator.clipboard.writeText(
                `${window.location.origin}/join?code=${inviteCode}`
              )
            }
            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-sm transition-colors"
          >
            Copy Link
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mb-6">
        <div className="flex gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" />
          <span
            className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>

      <button
        onClick={onCancel}
        className="text-slate-400 hover:text-white text-sm transition-colors"
      >
        Cancel
      </button>
    </div>
  );
};

export default WaitingRoom;
