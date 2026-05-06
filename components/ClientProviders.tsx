"use client";

import { ReactNode } from "react";
import { ConvexProvider } from "convex/react";
import { convex } from "../lib/convexClient";
import { ThemeProvider } from "../contexts/ThemeContext";
import { AuthProvider } from "../contexts/AuthContext";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </ConvexProvider>
  );
}
