# Design — Shuttle Stats (friends_badminton)

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

<!-- Hallmark · genre: atmospheric · macrostructure-family: Workbench (app) · design-system: design.md · designed-as-app -->

---

## Genre
atmospheric (dark sports telemetry; muted surfaces; glow-accent data voice)

---

## Multi-palette system

Three structural palettes selectable by the user at runtime via `[data-theme]` on `<html>`.
All three share the same macrostructure, spacing, and motion rules.

| Palette       | data-theme  | Paper band                      | Accent hue   | Display face       | Radius |
|---------------|-------------|---------------------------------|--------------|--------------------|--------|
| Telemetry     | (default)   | dark oklch(11% 0.008 27)        | red 27°      | Space Grotesk      | 0px    |
| Court Glass   | glass       | light teal oklch(97% 0.008 185) | teal 185°    | Plus Jakarta Sans  | 10px   |
| Field Journal | journal     | parchment oklch(96% 0.018 72)   | amber 72°    | Lora (serif)       | 3px    |

---

## Macrostructure family
- **App pages:** Workbench — data-dense split layout, sidebar navigation, card grids.
- All pages share sidebar + MobileNav shell.

---

## Theme

### Avatar hue tokens (8 perceptual OKLCH steps, theme-aware)
`--color-avatar-a` through `--color-avatar-h`
Defined in globals.css for every palette block. Player profile avatars use
these instead of raw Tailwind gradient classes. Avatars are solid colour
squares (not gradient).

---

## Typography

- **Display / Headings:** varies per palette (Space Grotesk / Plus Jakarta Sans / Lora)
  - always font-style: normal (roman only — no italic headers)
- **Body:** Geist (GeistSans)
- **Mono / data:** Geist Mono — all numeric readouts, tabular data, timestamps
- **Tabular numerics:** font-variant-numeric: tabular-nums on every column of numbers

---

## Spacing
4-point named scale. Use var(--space-md) etc., never raw values.

---

## Motion

- **Easings:** --ease-out: cubic-bezier(0.16, 1, 0.3, 1) (primary)
- **Animate:** transform and opacity only. Never layout properties.
- **Reduced-motion:** collapse all animation to <=150ms opacity crossfade.
- **No:** transition-all, hover:scale-*, scroll-triggered stagger on lists, bounce easings.
- **Explicit transition spec:**
  ```css
  transition: background-color var(--dur-short) var(--ease-out),
              border-color var(--dur-short) var(--ease-out),
              color var(--dur-short) var(--ease-out);
  ```

---

## Microinteractions stance

- **Silent success** — no celebratory toasts for visible state changes.
- **Focus rings:** appear instantly (never animated). focus-visible on every interactive element.
- **Hover signal:** single signal — border-colour shift to var(--accent) OR background tint.
  Never scale + shadow + border combined.
- **No:** hover:scale-*, hover:shadow-* coloured glows, transition-all.

---

## CTA voice

- **Primary:** bg-accent text-accent-foreground, shape via var(--radius).
- **Secondary:** border border-border hover:border-accent text-foreground.
- **Destructive:** always aviation red oklch(50% 0.22 27) regardless of palette.

---

## Avatar system

Player monogram avatars use 8 perceptually-spaced OKLCH hue tokens (--color-avatar-a
through --color-avatar-h), not Tailwind gradient classes. Active palette sets chroma
level. All avatars are solid colour squares (not gradient, not over-rounded).

---

## Per-page allowances

- **App pages:** no hero enrichment — function carries the page.
- **Auth pages:** minimal, centered single-column.

---

## What pages MUST share

- Sidebar + MobileNav shell.
- Accent on nav hairline and primary CTAs only (<=5% per viewport).
- Display + body + mono font trio.
- var(--radius) for all interactive elements.
- Spacing scale.
- font-style: normal on all headings.

---

## Exports

See `src/app/hallmark-tokens.css` for the portable token export.
The shadcn-compatible CSS variables live in `src/app/globals.css`.
