---
name: psu-gang-design
description: Visual design rules for the PSU Gang Watt Calculator. Use whenever building or editing UI in this repo so styling stays consistent with the PSU Gang design system.
---

# PSU Gang — Design Skill

Technical, dark, and minimal interface for the PSU Gang Watt Calculator. 
Apply these rules to every component to maintain the precision feel of an engineering and laboratory tool.

## Design tokens (single source of truth)

Defined in `src/app/globals.css` under `@theme`. Use these CSS variables exclusively; never hard-code hex values in components.

| Token              | Value     | Use                                   |
| ------------------ | --------- | ------------------------------------- |
| `--color-bg`       | `#141414` | Base background[cite: 1]                       |
| `--color-surface`  | `#303030` | Inputs, selects, and container frames[cite: 1]  |
| `--color-accent`   | `#03D6B3` | Active states, main CTAs, highlights[cite: 1]  |
| `--color-text`     | `#FFFFFF` | Primary labels and main text          |
| `--color-muted`    | `#888888` | Secondary hints and placeholder text  |

*Note: For specific hardware categorization (e.g., SSD stress metrics), secondary tokens `#8F05E8` (Purple) and `#FFA617` (Orange) may be used sparingly[cite: 1].*

## Typography

- **Headings & Body Text**: **Inter** or **Roboto**[cite: 1]. Clean, highly legible sans-serif for structured forms and standard UI text[cite: 1].
- **Metrics & Technical Values**: **VT323** or equivalent monospaced font[cite: 1]. Employs a pixel/terminal aesthetic for calculations, watt outputs, and instrument readouts[cite: 1].
- **Section Labels**: Small, uppercase layout with wide letter-spacing (`tracking-wider`) and muted coloration (`text-[var(--color-muted)]`).

## Layout & Brand Integration

- **Structure**: Centered single-column layout tailored for direct interaction, avoiding marketing fluff.
- **Header**: The official **PSU Gang** logo sits strictly centered at the top, featuring its characteristic integrated icon and wordmark text as displayed in `image_68b4ab.png`.
- **Footer**: Minimalist footprint housing centered social links and temporal environment indicators.

## Anti-AI-Slop Rules (Strict Constraints)

- ❌ **No gradients**: Avoid `bg-gradient-*` entirely; stick to flat, solid surfaces.
- ❌ **No soft shadows or glow**: Avoid glassmorphism, heavy blurs, or neon drop-shadows.
- ❌ **No pill buttons**: Keep corner radiuses sharp or moderately rounded (`rounded-md` / `rounded-lg`). No `rounded-full` for structural controls.
- ❌ **No emojis**: Do not use emojis as functional UI icons or labels.

## Accepted Component Patterns

- **Main Interactive Form**: Centralized inputs utilizing `bg-[var(--color-surface)]` with clean text alignment. Focus states must trigger a solid border illumination matching `--color-accent`.
- **Auxiliary Panels (Desglose & Potencia)**: Side containers (e.g., *Desglose de Consumo*, *Potencia Recomendada*) feature a distinct dashed border layout (`border-dashed border-[var(--color-surface)]`) with transparent or subtly muted backgrounds as seen in `image_68b4ab.png`.
- **Segmented Toggles (ATX Standard)**: Flat, inline selection blocks. The active segment shifts to a solid accent background (`bg-[var(--color-accent)]`) with dark text, while the inactive options remain muted.
- **Primary CTA (Button)**: The "CALCULAR" trigger is a prominent, high-contrast block utilizing solid `--color-accent` background with pure black uppercase text (`text-black font-bold`), spanning the full width of the input cluster.
- **Action Links**: Secondary links (e.g., support links at the bottom) must use the accent color, high visibility, and underline decoration on hover state.