"use client";

import * as React from "react";
import {
  PaletteId,
  PALETTE_STORAGE_KEY,
  DEFAULT_PALETTE,
} from "@/lib/palette";

/* ─── Context ─────────────────────────────────────────────────────────────── */

interface PaletteContextValue {
  palette: PaletteId;
  setPalette: (id: PaletteId) => void;
}

const PaletteContext = React.createContext<PaletteContextValue>({
  palette: DEFAULT_PALETTE,
  setPalette: () => {},
});

/* ─── Provider ────────────────────────────────────────────────────────────── */

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = React.useState<PaletteId>(DEFAULT_PALETTE);

  // Read from localStorage once on mount — avoids flash on first render.
  // suppressHydrationWarning on <html> already handles the brief mismatch.
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(PALETTE_STORAGE_KEY) as PaletteId | null;
      if (stored && ["telemetry", "glass", "journal"].includes(stored)) {
        setPaletteState(stored);
        applyPalette(stored);
      }
    } catch {
      // localStorage unavailable (private browsing / SSR) — use default
    }
  }, []);

  const setPalette = React.useCallback((id: PaletteId) => {
    setPaletteState(id);
    applyPalette(id);
    try {
      localStorage.setItem(PALETTE_STORAGE_KEY, id);
    } catch {
      // ignore write failures
    }
  }, []);

  return (
    <PaletteContext.Provider value={{ palette, setPalette }}>
      {children}
    </PaletteContext.Provider>
  );
}

/* ─── Hook ────────────────────────────────────────────────────────────────── */

export function usePalette() {
  return React.useContext(PaletteContext);
}

/* ─── DOM helper ──────────────────────────────────────────────────────────── */

/**
 * Applies the data-theme attribute to <html>.
 * "telemetry" removes the attribute entirely so the default :root tokens apply.
 */
function applyPalette(id: PaletteId) {
  if (typeof document === "undefined") return;
  if (id === "telemetry") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", id);
  }
}

/* ─── Inline script — block-render flash prevention ──────────────────────── */

/**
 * A tiny inline <script> that reads localStorage before React hydrates and
 * sets data-theme on <html> immediately.  Must be placed inside <head> via
 * layout.tsx so it runs synchronously before any paint.
 *
 * We export this as a string so layout.tsx can dangerouslySetInnerHTML it.
 */
export const PALETTE_SCRIPT = `(function(){try{var p=localStorage.getItem("${PALETTE_STORAGE_KEY}");if(p&&p!=="telemetry"){document.documentElement.setAttribute("data-theme",p)}}catch(e){}})();`;
