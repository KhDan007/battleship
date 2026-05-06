"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuth } from "../contexts/AuthContext";

interface OnlineLobbyProps {
  onBack: () => void;
  initialCode?: string;
}

const OnlineLobby: React.FC<OnlineLobbyProps> = ({ onBack, initialCode }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"host" | "join">(
    initialCode ? "join" : "host"
  );
  const [joinCode, setJoinCode] = useState(initialCode || "");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const createInvite = useMutation(api.invites.createInvite);
  const acceptInvite = useMutation(api.invites.acceptInvite);
  const getInvite = useQuery(
    api.invites.getInviteByCode,
    joinCode.length === 6 ? { code: joinCode.toUpperCase() } : "skip"
  );

  const handleHostGame = async () => {
    setIsCreating(true);
    setError("");
    try {
      const result = await createInvite({
        userId: user?.id as any,
      });
      setGeneratedCode(result.code);
      setInviteLink(`${window.location.origin}/join?code=${result.code}`);
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
      const result = await acceptInvite({
        code: joinCode.toUpperCase(),
        userId: user?.id as any,
      });
      // The parent component will handle navigation based on the result
      window.location.href = `/play/online?gameId=${result.gameId}`;
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
        <h2 className="text-xl font-bold text-white">Online Multiplayer</h2>
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-white transition-colors"
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
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              Host Game
            </button>
            <button
              onClick={() => setActiveTab("join")}
              className={`flex-1 py-2 rounded-lg transition-colors ${
                activeTab === "join"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              Join Game
            </button>
          </div>
        </div>
      )}

      {activeTab === "host" && !generatedCode && (
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">
            Create a game and invite a friend to play!
          </p>
          <button
            onClick={handleHostGame}
            disabled={isCreating}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-bold transition-colors"
          >
            {isCreating ? "Creating..." : "Create Game"}
          </button>
        </div>
      )}

      {generatedCode && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-800 rounded-lg text-center">
            <p className="text-xs text-slate-500 mb-1">INVITE CODE</p>
            <p className="text-3xl font-mono font-bold text-white tracking-widest">
              {generatedCode}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => copyToClipboard(generatedCode, "code")}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-sm transition-colors"
            >
              {copied === "code" ? "Copied!" : "Copy Code"}
            </button>
            <button
              onClick={() => copyToClipboard(inviteLink, "link")}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-sm transition-colors"
            >
              {copied === "link" ? "Copied!" : "Copy Link"}
            </button>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-sm text-amber-400 text-center">
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
            <label className="block text-sm font-medium text-slate-300 mb-2">
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
              className="w-full px-4 py-3 bg-slate-800 rounded-lg border border-slate-700 text-white text-center text-2xl font-mono tracking-widest focus:border-blue-500 focus:outline-none"
            />
            {joinCode.length === 6 && getInvite && (
              <p className="mt-2 text-sm text-center">
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
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-bold transition-colors"
          >
            {isJoining ? "Joining..." : "Join Game"}
          </button>
        </div>
      )}
    </div>
  );
};

export default OnlineLobby;
