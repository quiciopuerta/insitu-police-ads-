# INsitu AI Design System: "Neon Nocturne"

This `DESIGN.md` file serves as the canonical source of truth for the INsitu AI project's design system, specifically the "Neon Nocturne" aesthetic. AI agents (like Stitch) should read this document to generate consistent, premium UI components.

## Core Aesthetic Overview

- **Theme:** "Neon Nocturne"
- **Style:** Dark mode by default, premium, modern, incorporating glassmorphism, vibrant neon glows (magenta and cyan), and subtle fluid animations.
- **Framework:** TailwindCSS 3.4 with custom extensions.

## 1. Typography

All text should utilize the project's primary font family for a modern, tech-forward look.

- **Font Family:** "Space Grotesk", sans-serif (used for both `sans` and `display`).
- **Primary Text Color:** `#f8fafc` (slate-50) for high contrast on dark backgrounds.
- **Muted Text Color:** `#cbd5e1` (slate-300) for secondary information.

## 2. Color Palette (Design Tokens)

### Backgrounds & Surfaces

- **Background Dark:** `#0a0507` (The absolute base background color)
- **Surface Dark:** `#1a0b10` (Used for solid cards or elevated surfaces)
- **Glass Background:** `rgba(26, 11, 16, 0.7)` (Used for `glass-panel`)
- **Glass Card Background:** `rgba(26, 11, 16, 0.4)` (Used for `glass-card`)

### Accents & Brand Colors

- **Brand Magenta (Primary):** `#ff477b`
  - *Glow Variant:* `rgba(255, 73, 124, 0.3)`
  - *Gradient:* `#ff477b` to `#FF8FA3`
- **Brand Cyan (Secondary):** `#00F2FE`
  - *Glow Variant:* `rgba(0, 242, 254, 0.2)`
  - *Gradient:* `#00F2FE` to `#4FACFE`

### Borders

- **Glass Border:** `rgba(255, 71, 123, 0.1)` (Subtle magenta tint for glassmorphism borders)

## 3. Gradients & Glows

### Text Gradients

Apply these utility classes to text for premium gradient effects:

- `.text-gradient-magenta`: Linear gradient from `#ff477b` to `#FF8FA3`.
- `.text-gradient-cyan`: Linear gradient from `#00F2FE` to `#4FACFE`.
- `.animated-gradient-text`: Uses an animated gradient spanning 200% width.

### Box Glows (Neon Effects)

- `.neon-magenta-glow`: Border color `rgba(255, 73, 124, 0.5)` with `box-shadow: 0 0 15px rgba(255, 73, 124, 0.3)`.
- `.neon-cyan-glow`: Border color `rgba(0, 242, 254, 0.4)` with `box-shadow: 0 0 15px rgba(0, 242, 254, 0.2)`.

### Background Glows

- **Global Page Background:** Uses a subtle radial gradient mix of magenta at `15% 50%` and cyan at `85% 30%`.
- `.glow-indigo`: Radial gradient centered with `rgba(79, 70, 229, 0.25)`.
- `.glow-emerald`: Radial gradient centered with `rgba(16, 185, 129, 0.15)`.

## 4. Components & Surfaces

### Glassmorphism

Always use these classes for cards and panels instead of solid backgrounds:

- **`.glass-panel`**: High blur (`backdrop-blur-xl`), `border-white/5`, `shadow-xl`, background `var(--glass-bg)`, border `var(--glass-border)`. Use for major layout containers.
- **`.glass-card`**: Medium blur (`backdrop-blur-md`), `border-white/5`, `shadow-lg`, background `rgba(26, 11, 16, 0.4)`, border `var(--glass-border)`. Use for individual items within panels.

### Interactive Cards

- **`.sweep-card`**: A card with a conic-gradient border sweep animation on hover. It scales up slightly (`scale-105`) with a smooth cubic-bezier transition.

## 5. Animation & Motion

Motion is a core part of the Neon Nocturne aesthetic. Use these Tailwind animation utilities:

- `animate-gradient-x`: Smoothly shifts background gradients left to right (3s).
- `animate-blob-pulse`: Slow, organic scaling and translation for abstract background shapes (10s).
- `animate-border-sweep`: Used internally by `.sweep-card` for conic gradient borders.
- `animate-neon-pulse`: Pulsating neon box-shadow effect (2s).
- `animate-reveal-up`: For entrance animations, fades in and translates Y from 20px (0.8s).
- `animate-float`: Vertical floating animation for floating elements (6s).
- `animate-float-slow`: Slower floating with slight rotation (10s).

## 6. Implementation Rules for AI Agents

1. **Never use generic colors** (e.g., `bg-blue-500`, `text-red-500`). Always map to the Brand Magenta (`#ff477b`) and Brand Cyan (`#00F2FE`) for accents.
2. **Prioritize Glassmorphism.** Avoid solid color blocks (`bg-gray-900`, `bg-black`) for cards. Use `.glass-card` or `.glass-panel` to let the subtle background radial glows shine through.
3. **Typography Hierarchy:** Ensure heavy use of tracking (letter-spacing) on uppercase subheadings, and keep body text light (`font-light` or normal) in `#f8fafc` or `#cbd5e1`.
4. **Interactive States:** Buttons and cards should almost always have hover states that trigger a glow (`.neon-magenta-glow`) or a scale transformation.
5. **Mobile Responsiveness:** Ensure grids fall back to `grid-cols-1` on mobile before applying `md:grid-cols-X` or `lg:grid-cols-X`. Ensure parallax and complex 3D transforms (`hero-perspective`) are disabled on mobile devices (via media queries).
