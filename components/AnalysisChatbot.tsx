"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ParsedNotation } from "../lib/notation";
import {
  generateProbabilityMap,
  formatProbabilityMap,
  getTopProbabilityCells,
} from "../lib/probabilityMap";

interface AnalysisChatbotProps {
  parsed: ParsedNotation;
  currentMove: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function coordStr(row: number, col: number): string {
  return `${"ABCDEFGHIJ"[col]}${row + 1}`;
}

export default function AnalysisChatbot({ parsed, currentMove }: AnalysisChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your Battleship analyst. Ask me anything about this game — why a move was good or bad, what the probability map says, or how to improve your strategy.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Reset chat when notation changes significantly
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          "Hi! I'm your Battleship analyst. Ask me anything about this game — why a move was good or bad, what the probability map says, or how to improve your strategy.",
      },
    ]);
  }, [parsed.moves.length]);

  const buildSystemPrompt = useCallback((): string => {
    const movesSoFar = parsed.moves.slice(0, currentMove + 1);
    const lastMove = movesSoFar[movesSoFar.length - 1];

    let context = `You are a Battleship strategy analyst. You help players understand their game and improve.

Game Info:
- Player 1: ${parsed.player1Name}
- Player 2: ${parsed.player2Name}
- Mode: ${parsed.mode}
- Result: ${parsed.result}
- Current move being viewed: ${currentMove + 1} / ${parsed.moves.length}
`;

    if (lastMove) {
      context += `\nLast move viewed: Move ${lastMove.number}, Player ${lastMove.player} shot ${coordStr(
        lastMove.row,
        lastMove.col
      )} — ${lastMove.hit ? "HIT" : "MISS"}${lastMove.shipName ? ` on ${lastMove.shipName}` : ""}${
        lastMove.sunk ? " (SUNK)" : ""
      }\n`;
    }

    // Probability map for the player who just moved (or P1 if at start)
    const activePlayer = lastMove ? lastMove.player : 1;
    const { map } = generateProbabilityMap(parsed, activePlayer, currentMove);
    const topCells = getTopProbabilityCells(map, 5);

    context += `\nProbability map for Player ${activePlayer}'s next turn (higher = more likely to hit a ship):\n`;
    context += formatProbabilityMap(map);
    context += `\nTop 5 highest-probability cells: ${topCells
      .map((c) => `${c.label} (${c.probability}%)`)
      .join(", ")}\n`;

    context += `\nRules to remember:
- Ships cannot touch each other, even diagonally.
- When a ship is sunk, all 8 surrounding cells are guaranteed empty.
- After a hit, the best strategy is to shoot orthogonally adjacent cells to finish the ship.
- The probability map counts how many valid ship placements include each cell.

Be concise, friendly, and explain in simple language. Use specific coordinates when referencing moves.`;

    return context;
  }, [parsed, currentMove]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const systemPrompt = buildSystemPrompt();
      const apiMessages = [
        { role: "system", content: systemPrompt },
        ...messages
          .filter((m) => m.role !== "assistant" || m.content !== messages[0].content || messages.length > 1)
          .map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userMsg },
      ];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, temperature: 0.7 }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "API error");
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't analyze that.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Oops, something went wrong: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[95%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "dark:bg-slate-700 dark:text-slate-200 bg-slate-100 text-slate-700"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="dark:bg-slate-700 bg-slate-100 rounded-xl px-3 py-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="mt-2 pt-2 border-t dark:border-slate-700 border-slate-200 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this game..."
            className="flex-1 min-w-0 px-3 py-2 rounded-lg text-xs dark:bg-slate-800 dark:text-white dark:border-slate-600 bg-white text-slate-900 border-slate-300 border focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            Send
          </button>
        </div>
        <p className="mt-1 text-[10px] dark:text-slate-500 text-slate-400">
          Press Enter to send. AI has full game context.
        </p>
      </div>
    </div>
  );
}
