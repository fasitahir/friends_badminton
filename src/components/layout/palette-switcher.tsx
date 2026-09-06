"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { usePalette } from "./palette-context";
import { PALETTES, PaletteId } from "@/lib/palette";

/* ─── Palette Switcher ────────────────────────────────────────────────────── */

/**
 * PaletteSwitcher — compact 3-swatch strip + light/dark toggle.
 *
 * Renders as two rows:
 *   Row 1: three labelled palette swatches (Telemetry · Court Glass · Field Journal)
 *   Row 2: light / dark toggle (system aware via next-themes)
 *
 * Used in the desktop sidebar footer and the mobile "Theme" nav slot.
 * `compact` prop collapses labels for the mobile slot.
 */
export function PaletteSwitcher({ compact = false }: { compact?: boolean }) {
  const { palette, setPalette } = usePalette();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? theme === "dark" : false;

  return (
    <div className={cn("flex flex-col gap-1.5", compact ? "items-center" : "")}>
      {/* Row 1 — palette swatches */}
      <div
        className={cn(
          "flex gap-1",
          compact ? "justify-center" : "justify-between"
        )}
        role="radiogroup"
        aria-label="Choose palette"
      >
        {PALETTES.map((p) => (
          <PaletteSwatch
            key={p.id}
            palette={p.id}
            label={p.label}
            accent={p.swatchAccent}
            paper={p.swatchPaper}
            active={palette === p.id}
            onSelect={setPalette}
            compact={compact}
          />
        ))}
      </div>

      {/* Row 2 — light / dark toggle */}
      {mounted && (
        <button
          id="palette-mode-toggle"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className={cn(
            "flex items-center justify-center gap-1.5 w-full px-2 py-1 text-[10px] font-mono uppercase tracking-widest",
            "text-muted-foreground hover:text-foreground transition-colors duration-150",
            "border border-border hover:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          )}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          style={{ borderRadius: "var(--radius)" }}
        >
          {isDark ? (
            <>
              <Moon className="size-3 shrink-0" />
              {!compact && <span>Dark</span>}
            </>
          ) : (
            <>
              <Sun className="size-3 shrink-0" />
              {!compact && <span>Light</span>}
            </>
          )}
        </button>
      )}
    </div>
  );
}

/* ─── Individual swatch ───────────────────────────────────────────────────── */

function PaletteSwatch({
  palette,
  label,
  accent,
  paper,
  active,
  onSelect,
  compact,
}: {
  palette: PaletteId;
  label: string;
  accent: string;
  paper: string;
  active: boolean;
  onSelect: (id: PaletteId) => void;
  compact: boolean;
}) {
  return (
    <button
      id={`palette-swatch-${palette}`}
      role="radio"
      aria-checked={active}
      aria-label={`Switch to ${label} palette`}
      title={label}
      onClick={() => onSelect(palette)}
      className={cn(
        "relative flex flex-col items-center gap-1 transition-colors duration-150 group",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        compact ? "p-1" : "flex-1 px-1.5 py-1.5"
      )}
      style={{
        borderRadius: "var(--radius)",
        outline: active
          ? "2px solid var(--ring)"
          : "1px solid var(--border)",
        outlineOffset: "1px",
        background: active ? "var(--muted)" : "transparent",
      }}
    >
      {/* Mini palette preview — paper background + accent stripe */}
      <span
        aria-hidden="true"
        className="flex shrink-0 overflow-hidden"
        style={{
          width: compact ? 20 : 28,
          height: compact ? 14 : 18,
          background: paper,
          borderRadius: "2px",
          position: "relative",
        }}
      >
        {/* Accent stripe — simulates the active nav hairline */}
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: accent,
          }}
        />
        {/* Two content lines — suggest data rows */}
        <span
          style={{
            position: "absolute",
            left: 7,
            top: "25%",
            right: 3,
            height: 2,
            borderRadius: 1,
            background: accent,
            opacity: 0.5,
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 7,
            top: "58%",
            right: 6,
            height: 2,
            borderRadius: 1,
            background: accent,
            opacity: 0.25,
          }}
        />
      </span>

      {/* Label */}
      {!compact && (
        <span
          className={cn(
            "text-[9px] leading-none tracking-wide font-mono truncate w-full text-center",
            active ? "text-foreground font-semibold" : "text-muted-foreground"
          )}
        >
          {label}
        </span>
      )}

      {/* Active dot indicator for compact mode */}
      {compact && active && (
        <span
          className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
          style={{ background: "var(--accent)" }}
        />
      )}
    </button>
  );
}
