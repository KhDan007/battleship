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
  const { hostGame, joinGame, gameId } = useOnlineGame();
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
      setGameMode("online" as GameMode);
      router.push("/");
    }
  }, [gameId, router, setGameMode]);

  const handleJoin = async () => {
    if (!code) return;
    try {
      await joinGame(code, user?.id, undefined);
    } catch (err: any) {
      setError(err.message || "Failed to join game");
    }
  };

  useEffect(() => {
    if (code && user) {
      handleJoin();
    }
  }, [code, user]);

  const handleBack = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen dark:bg-slate-950 bg-slate-50 flex items-center justify-center p-4">
      <OnlineLobby onBack={handleBack} initialCode={code || undefined} hostGame={hostGame} joinGame={joinGame} />
    </div>
  );
}
