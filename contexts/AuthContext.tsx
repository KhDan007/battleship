"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

const withTimeout = (promise: Promise<any>, timeoutMs = 10000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), timeoutMs))
  ]);
};

interface AuthContextType {
  user: { id: string; email: string; username: string } | null;
  loading: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string; username: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const signUpMutation = useMutation(api.auth.signUp);
  const signInMutation = useMutation(api.auth.signIn);

  useEffect(() => {
    const saved = localStorage.getItem("battleship_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem("battleship_user");
      }
    }
    setLoading(false);
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const result = await withTimeout(signUpMutation({ email, password, username }));
      const userData = { id: result.userId, email: result.email, username: result.username };
      localStorage.setItem("battleship_user", JSON.stringify(userData));
      setUser(userData);
      return { error: null };
    } catch (err: any) {
      const message = err.message === "Connection timeout"
        ? "Unable to connect to server. Please make sure Convex is running."
        : err.message || "Authentication failed";
      return { error: { message } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await withTimeout(signInMutation({ email, password }));
      if (!result) return { error: { message: "Invalid email or password" } };
      const userData = { id: result.userId, email: result.email, username: result.username };
      localStorage.setItem("battleship_user", JSON.stringify(userData));
      setUser(userData);
      return { error: null };
    } catch (err: any) {
      const message = err.message === "Connection timeout"
        ? "Unable to connect to server. Please make sure Convex is running."
        : err.message || "Authentication failed";
      return { error: { message } };
    }
  };

  const signOut = () => {
    localStorage.removeItem("battleship_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        showAuthModal,
        setShowAuthModal,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
