"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuth } from "../contexts/AuthContext";

interface OnlineLobbyProps {
  onBack: () => void;
  initialCode?: string;
  hostGame: (userId?: string, guestId?: string) => Promise<{ code: string; link: string }>;
  joinGame: (code: string, userId?: string, guestId?: string) => Promise<any>;
}

const OnlineLobby: React.FC<OnlineLobbyProps> = ({ onBack, initialCode, hostGame, joinGame }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"host" | "join">(initialCode ? "join" : "host");
  const [joinCode, setJoinCode] = useState(initialCode || "");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const getInvite = useQuery(
    api.invites.getInviteByCode,
    joinCode.length === 6 ? { code: joinCode.toUpperCase() } : "skip"
  );

  const handleHostGame = async () => {
    setIsCreating(true);
    setError("");
    try {
      const result = await hostGame(user?.id, undefined);
      setGeneratedCode(result.code);
      setInviteLink(result.link);
    } catch (err: any) {
      setError(err.message || "Failed to create game");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinByCode = async () => {
    if (joinCode.length !== 6) return;
    setIsJoining(true);
    setError("");
    try {
      await joinGame(joinCode, user?.id, undefined);
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message || "Failed to join game");
    } finally {
      setIsJoining(false);
    }
  };

  const copyToClipboard = async (text: string, type: "code" | "link") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="card p-6 max-w-lg w-full mx-auto mb-6 animate-slide-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold dark:text-white text-slate-900">Online Multiplayer</h2>
        <button
          onClick={onBack}
          className="dark:text-slate-400 text-slate-500 hover:dark:text-white hover:text-slate-700 transition-colors"
        >
          ← Back
        </button>
      </div>

      {!generatedCode && (
        <div className="mb-4">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab("host")}
              className={`flex-1 py-2 rounded-lg transition-colors ${
                activeTab === "host"
                  ? "bg-blue-600 text-white"
                  : "dark:bg-slate-800 dark:text-slate-400 bg-slate-100 text-slate-600 hover:dark:bg-slate-700 hover:bg-slate-200"
              }`}
            >
              Host Game
            </button>
            <button
              onClick={() => setActiveTab("join")}
              className={`flex-1 py-2 rounded-lg transition-colors ${
                activeTab === "join"
                  ? "bg-blue-600 text-white"
                  : "dark:bg-slate-800 dark:text-slate-400 bg-slate-100 text-slate-600 hover:dark:bg-slate-700 hover:bg-slate-200"
              }`}
            >
              Join Game
            </button>
          </div>
        </div>
      )}

      {activeTab === "host" && !generatedCode && (
        <div className="space-y-4">
          <p className="dark:text-slate-400 text-slate-500 text-sm">
            Create a game and invite a friend to play!
          </p>
          <button
            onClick={handleHostGame}
            disabled={isCreating}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:dark:bg-slate-700 disabled:bg-slate-300 disabled:dark:text-slate-500 disabled:text-slate-400 text-white rounded-lg font-bold transition-colors"
          >
            {isCreating ? "Creating..." : "Create Game"}
          </button>
        </div>
      )}

      {generatedCode && (
        <div className="space-y-4">
          <div className="p-4 dark:bg-slate-800 bg-slate-100 rounded-lg text-center">
            <p className="text-xs dark:text-slate-500 text-slate-400 mb-1">INVITE CODE</p>
            <p className="text-3xl font-mono font-bold dark:text-white text-slate-900 tracking-widest">
              {generatedCode}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => copyToClipboard(generatedCode, "code")}
              className="flex-1 py-2 dark:bg-slate-800 dark:hover:bg-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg dark:text-white text-slate-900 text-sm transition-colors"
            >
              {copied === "code" ? "Copied!" : "Copy Code"}
            </button>
            <button
              onClick={() => copyToClipboard(inviteLink, "link")}
              className="flex-1 py-2 dark:bg-slate-800 dark:hover:bg-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg dark:text-white text-slate-900 text-sm transition-colors"
            >
              {copied === "link" ? "Copied!" : "Copy Link"}
            </button>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-sm text-amber-500 text-center">
              Waiting for opponent to join...
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
            <span
              className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      )}

      {activeTab === "join" && !generatedCode && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium dark:text-slate-300 text-slate-600 mb-2">
              Enter Invite Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) =>
                setJoinCode(e.target.value.toUpperCase().slice(0, 6))
              }
              placeholder="XXXXXX"
              maxLength={6}
              className="input-field text-center text-2xl font-mono tracking-widest"
            />
            {joinCode.length === 6 && getInvite && (
              <p className="mt-2 text-sm text-center dark:text-slate-400 text-slate-500">
                {getInvite.status === "expired"
                  ? "This invite has expired"
                  : getInvite.status === "accepted"
                  ? "This invite has already been used"
                  : "Invite found! Click Join below."}
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <button
            onClick={handleJoinByCode}
            disabled={joinCode.length !== 6 || isJoining}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:dark:bg-slate-700 disabled:bg-slate-300 disabled:dark:text-slate-500 disabled:text-slate-400 text-white rounded-lg font-bold transition-colors"
          >
            {isJoining ? "Joining..." : "Join Game"}
          </button>
        </div>
      )}
    </div>
  );
};

export default OnlineLobby;
