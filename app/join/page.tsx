"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnlineGame } from "../../hooks/useOnlineGame";
import { useGameState } from "../../hooks/useGameState";
import OnlineLobby from "../../components/OnlineLobby";
import { useAuth } from "../../contexts/AuthContext";
import { GameMode } from "../../lib/types";

export default function JoinPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { joinGame, gameId } = useOnlineGame();
  const { setGameMode } = useGameState();
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("code");
    if (codeParam) {
      setCode(codeParam.toUpperCase());
    }
  }, []);

  useEffect(() => {
    if (gameId) {
      // Set game mode to online so the main page enters the online flow
      setGameMode("online" as GameMode);
      // Game joined successfully, redirect to main page
      router.push("/");
    }
  }, [gameId, router, setGameMode]);

  const handleJoin = async () => {
    if (!code) return;
    try {
      await joinGame(code, user?.id, undefined);
      // Redirect will happen via the useEffect above
    } catch (err: any) {
      setError(err.message || "Failed to join game");
    }
  };

  // Auto-join if code is present
  useEffect(() => {
    if (code && user) {
      handleJoin();
    }
  }, [code, user]);

  const handleBack = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <OnlineLobby onBack={handleBack} initialCode={code || undefined} />
    </div>
  );
}
