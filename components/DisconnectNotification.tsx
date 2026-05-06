"use client";

import React, { useState, useEffect } from "react";

interface DisconnectNotificationProps {
  pausedAt: number | null;
  onReconnect: () => void;
}

const DisconnectNotification: React.FC<DisconnectNotificationProps> = ({
  pausedAt,
  onReconnect,
}) => {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (!pausedAt) return;

    const elapsed = (Date.now() - pausedAt) / 1000;
    const remaining = Math.max(0, 60 - elapsed);
    setTimeLeft(Math.ceil(remaining));

    const interval = setInterval(() => {
      const elapsed = (Date.now() - pausedAt) / 1000;
      const remaining = Math.max(0, 60 - elapsed);
      setTimeLeft(Math.ceil(remaining));

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pausedAt]);

  if (!pausedAt) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 animate-fade-in">
      <div className="card p-6 max-w-sm w-full mx-4 text-center">
        <div className="text-4xl mb-4">🔌</div>
        <h3 className="text-xl font-bold text-white mb-2">
          Opponent Disconnected
        </h3>
        <p className="text-slate-400 mb-4">
          Waiting for opponent to reconnect...
        </p>
        <div className="mb-4">
          <div className="text-3xl font-mono font-bold text-amber-400">
            {timeLeft}s
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reconnect window remaining
          </p>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 transition-all duration-1000"
            style={{ width: `${(timeLeft / 60) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default DisconnectNotification;
