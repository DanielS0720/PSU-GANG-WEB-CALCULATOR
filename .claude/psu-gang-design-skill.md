---
name: psu-gang-design
description: Visual design rules for the PSU Gang Watt Calculator. Use whenever building or editing UI in this repo so styling stays consistent with the PSU Gang design system.
---

# PSU Gang — Design Skill

Dark, industrial, terminal-inspired interface for the PSU Gang Watt Calculator.
Apply these rules to every component. The goal: looks like an engineering tool,
not a generic AI-generated SaaS page.

## Design tokens (single source of truth)

Defined in `src/app/globals.css` under `@theme`. Use the CSS variables, never
hard-coded hexes in components.

| Token              | Value     | Use                                   |
| ------------------ | --------- | ------------------------------------- |
| `--color-bg`       | `#000000` | Base background                       |
| `--color-surface`  | `#303030` | Cards, selects, inputs                |
| `--color-accent`   | `#03D6B3` | CTAs, highlights, active borders      |
| `--color-text`     | `#FFFFFF` | Primary text                          |
| `--color-muted`    | `#888888` | Secondary labels, hints               |

Access in JSX as `bg-[var(--color-surface)]`, `text-[var(--color-accent)]`, etc.

## Typography

- **Headings / display / numbers**: IBM Plex Mono (`font-mono`). Reinforces the
  terminal aesthetic. Use for `h1`–`h3`, the watt result, and stat-like values.
- **Body / labels**: IBM Plex Sans (`font-sans`).
- Loaded via `next/font/google` in `src/app/layout.tsx`; exposed as
  `--font-plex-mono` / `--font-plex-sans` and mapped to Tailwind `font-mono` /
  `font-sans` in `globals.css`.
- Section labels: small, uppercase, wide tracking, muted color.

## Layout

- Centered column, `max-w-3xl`, generous padding.
- Logo sits in the header (left or centered), served from
  `/public/logo/psu-gang-logo.svg`. No brand wordmark text alongside it.
- The tier image is the visual protagonist of the result panel.

## Anti-AI-slop rules (what NOT to do)

- ❌ No color gradients (no `bg-gradient-*`), especially no purple/violet.
- ❌ No purples, no pastel palettes, no dominant white backgrounds.
- ❌ No glassmorphism, no drop-shadow glow, no rounded-full "pill everything".
- ❌ No emoji as UI iconography.
- ❌ No generic hero copy / marketing fluff. This is a calculator, not a landing page.
- ✅ Flat surfaces (`#303030`), thin borders, accent (`#03D6B3`) only on active /
  interactive / highlighted elements.
- ✅ Monospaced numerals for any wattage or numeric output.

## Accepted component patterns

- **Surface card**: `bg-[var(--color-surface)]` + `border border-[var(--color-surface)]`,
  `rounded-md`/`rounded-lg`. Active state border → `--color-accent`.
- **Select / input**: surface background, muted placeholder, accent focus border,
  `focus:outline-none`.
- **Toggle (ATX mode)**: segmented control; active segment filled with accent on
  `--color-bg` text; inactive segment muted text.
- **Result**: large mono watt figure in accent color, tier image below, tier label muted.

## Reference

- Project spec: `psu-gang-watt-calculator.md` (root).
- PSU Gang `design.md` (external system) — defer to it if a conflict arises.
