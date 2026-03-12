# Space Markets — Design System Upgrade

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Space Markets frontend from a functional prototype into a polished, premium Web3 marketplace with cohesive design language, professional typography, elevated color palette, and refined component library.

**Architecture:** Systematic bottom-up upgrade — design tokens first, then primitive UI components, then layout shells, then page compositions. Every change flows from CSS custom properties so the entire system stays coherent.

**Tech Stack:** Next.js 14, Tailwind CSS 3, Framer Motion, Lucide React, HSL CSS custom properties

---

## Current State Assessment

### What exists:
- 62 TSX files, ~12,110 lines total
- 8 primitive UI components (`ui/badge.tsx`, `button.tsx`, `data-text.tsx`, `heading.tsx`, `input.tsx`, `panel.tsx`, `tabs.tsx`, `usdc-icon.tsx`)
- 4 layout components (`app-layout.tsx`, `navbar.tsx`, `sidebar.tsx`, `sidebar-context.tsx`, `ticker-strip.tsx`)
- 12-step protocol demo with 11 custom animations
- Market pages: home, asset detail, asset registration, dashboard/leases
- HSL-based CSS custom properties in `globals.css` (shadcn/ui pattern)
- Tailwind config with semantic color tokens

### Design Problems to Fix:
1. **Color palette is flat** — everything is slate-800/900/950, no visual hierarchy
2. **No accent gradient system** — primary blue is used alone without supporting palette
3. **Typography lacks hierarchy** — heading sizes exist but no weight/tracking system
4. **Cards/panels look identical** — no elevation or emphasis levels
5. **Buttons are basic** — no hover microinteractions, no loading states, no size system
6. **No empty states** — missing data screens are blank
7. **Sidebar is utilitarian** — no active state polish, no grouping
8. **Ticker strip needs refinement** — visual noise at top
9. **Demo steps lack visual cohesion** — each step is styled independently
10. **No data visualization palette** — chart colors are arbitrary HSL values
11. **Form inputs are bare** — no focus rings, no validation styling, no labels
12. **No responsive polish** — mobile breakpoints are minimal

---

## Phase 1: Design Tokens & Color System (globals.css + tailwind.config.ts)

### Task 1.1: Upgrade Color Palette

**Files:**
- Modify: `src/app/globals.css`

Replace the current CSS custom properties with a richer, more sophisticated space-themed palette. The design direction is: **deep space noir with electric accents** — think Bloomberg Terminal meets NASA mission control.

**New palette concept:**
- **Background scale**: 5 levels from near-black to subtle card elevation
- **Foreground scale**: 4 levels for text hierarchy (bright → dim)
- **Accent system**: Primary (electric blue), Secondary (cyan), Tertiary (violet), Success (emerald), Warning (amber), Destructive (rose)
- **Glow/gradient tokens**: For buttons, active states, and emphasis
- **Surface tokens**: Glass morphism tints for overlays and panels

Apply these changes to `:root` in globals.css:

```css
:root {
  /* Backgrounds — deep space scale */
  --background: 225 30% 3%;           /* near-black with blue tint */
  --background-elevated: 225 25% 6%;   /* subtle card lift */
  --background-surface: 225 20% 9%;    /* interactive surfaces */
  --background-hover: 225 18% 12%;     /* hover states */
  --background-active: 225 15% 15%;    /* pressed/selected */
  
  /* Foreground — text hierarchy */
  --foreground: 210 40% 98%;           /* primary text — near white */
  --foreground-secondary: 215 20% 75%; /* secondary text */
  --foreground-muted: 215 15% 50%;     /* muted labels */
  --foreground-dim: 220 10% 35%;       /* disabled/placeholder */
  
  /* Card */
  --card: 225 25% 6%;
  --card-foreground: 210 40% 98%;
  --card-hover: 225 20% 9%;
  --card-border: 220 20% 14%;
  
  /* Primary — electric blue */
  --primary: 217 91% 60%;
  --primary-foreground: 0 0% 100%;
  --primary-glow: 217 91% 60% / 0.25;
  --primary-soft: 217 91% 60% / 0.08;
  
  /* Secondary — cool slate */
  --secondary: 215 25% 20%;
  --secondary-foreground: 210 40% 90%;
  
  /* Accent — electric cyan */
  --accent: 192 95% 55%;
  --accent-foreground: 225 30% 5%;
  --accent-glow: 192 95% 55% / 0.20;
  --accent-soft: 192 95% 55% / 0.08;
  
  /* Tertiary — violet */  
  --tertiary: 270 70% 65%;
  --tertiary-glow: 270 70% 65% / 0.20;
  --tertiary-soft: 270 70% 65% / 0.06;

  /* Semantic colors */
  --success: 160 84% 45%;
  --success-foreground: 0 0% 100%;
  --success-soft: 160 84% 45% / 0.08;
  
  --warning: 38 92% 55%;
  --warning-foreground: 0 0% 0%;
  --warning-soft: 38 92% 55% / 0.08;
  
  --destructive: 0 72% 55%;
  --destructive-foreground: 0 0% 100%;
  --destructive-soft: 0 72% 55% / 0.08;
  
  /* Borders */
  --border: 220 20% 14%;
  --border-hover: 220 20% 22%;
  --border-accent: 217 91% 60% / 0.3;
  
  /* Input */
  --input: 220 20% 14%;
  --input-focus: 217 91% 60% / 0.5;
  
  /* Ring */
  --ring: 217 91% 60%;
  
  --radius: 0.625rem;

  /* Chart — harmonious data viz palette */
  --chart-1: 217 91% 60%;    /* blue */
  --chart-2: 192 95% 55%;    /* cyan */
  --chart-3: 160 84% 45%;    /* emerald */
  --chart-4: 270 70% 65%;    /* violet */
  --chart-5: 38 92% 55%;     /* amber */
  --chart-6: 0 72% 55%;      /* rose */
}
```

### Task 1.2: Update Tailwind Config

**Files:**
- Modify: `tailwind.config.ts`

Add the new semantic tokens to the Tailwind config so they're available as utility classes:

- Add `foreground-secondary`, `foreground-muted`, `foreground-dim`
- Add `accent` with glow/soft variants
- Add `tertiary` tokens
- Add `success`, `warning` tokens with soft variants
- Add `card-hover`, `card-border`
- Add `border-hover`, `border-accent`
- Add `background-elevated`, `background-surface`, `background-hover`

### Task 1.3: Typography System

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/ui/heading.tsx`

Add a typography scale layer:

```css
@layer base {
  h1 { @apply text-3xl font-bold tracking-tight; }
  h2 { @apply text-2xl font-semibold tracking-tight; }
  h3 { @apply text-lg font-semibold; }
  h4 { @apply text-base font-medium; }
}
```

Update `heading.tsx` to support subtitle text and consistent spacing.

---

## Phase 2: Primitive Components (src/components/ui/)

### Task 2.1: Button Upgrade

**Files:**
- Modify: `src/components/ui/button.tsx`

Upgrade with:
- Refined hover microinteractions (subtle scale + glow)
- Loading state with spinner
- Icon-only variant
- Danger variant
- Glow effect on primary (using box-shadow with `--primary-glow`)
- Transition: `transition-all duration-200`

### Task 2.2: Panel/Card Upgrade

**Files:**
- Modify: `src/components/ui/panel.tsx`

Add elevation levels:
- `level="base"` — subtle border, no background
- `level="raised"` — card bg with border (default)
- `level="elevated"` — stronger bg, glow border, hover lift
- `level="glass"` — backdrop-blur with translucent bg

Add `accent` prop for colored top/left border.
Add `interactive` prop for cursor-pointer + hover effects.

### Task 2.3: Badge Upgrade  

**Files:**
- Modify: `src/components/ui/badge.tsx`

Add variants:
- `dot` — with pulsing status dot
- `outline` — border only
- `glow` — with soft glow background
- Colors: blue, cyan, emerald, amber, rose, violet, slate

### Task 2.4: Input Upgrade

**Files:**
- Modify: `src/components/ui/input.tsx`

Add:
- Focus ring using `--ring` color with glow
- Label component (stacked above input)
- Error state with destructive border + message
- Prefix/suffix slots for icons or units
- Disabled styling

### Task 2.5: Tabs Upgrade

**Files:**
- Modify: `src/components/ui/tabs.tsx`

Add:
- Active indicator bar (animated bottom border)
- Count badge support per tab
- Compact/full size variants

### Task 2.6: New Component — Stat Card

**Files:**
- Create: `src/components/ui/stat-card.tsx`

A purpose-built component for the market stats (replacing ad-hoc Panel usage):
- Label (muted, uppercase, tracked)
- Value (large, mono, bright)
- Optional trend indicator (up/down arrow + percentage)
- Optional sparkline slot

### Task 2.7: New Component — Empty State

**Files:**
- Create: `src/components/ui/empty-state.tsx`

For when there's no data:
- Icon (large, muted)
- Title
- Description
- Optional action button

---

## Phase 3: Layout Components

### Task 3.1: Navbar Refinement

**Files:**
- Modify: `src/components/layout/navbar.tsx`

- Sharper logo treatment
- Active page indicator
- Wallet connection button styling (glow when connected)
- Responsive hamburger menu
- Subtle bottom border gradient

### Task 3.2: Sidebar Polish

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- Section grouping with labels
- Active item: accent left border + soft glow bg
- Hover: smooth background transition
- Icons: consistent size and alignment
- Collapse animation refinement

### Task 3.3: Ticker Strip Upgrade

**Files:**
- Modify: `src/components/layout/ticker-strip.tsx`

- Reduce visual weight (smaller, less contrast)
- Add subtle gradient fade at edges
- Green/red color coding for up/down trends
- Smoother infinite scroll animation

---

## Phase 4: Page Compositions

### Task 4.1: Home Page (Market Overview)

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/market/asset-row.tsx`
- Modify: `src/components/market/spot-market.tsx`
- Modify: `src/components/market/futures-market.tsx`

- Use new StatCard for market stats
- Refine AssetRow hover states and status badges
- Add subtle row dividers
- Improve responsive layout
- Add market header with gradient text

### Task 4.2: Asset Detail Page

**Files:**
- Modify: `src/app/market/[assetId]/page.tsx`

- Better section organization with Panels
- Improved form layout for bidding
- Visual hierarchy for price/terms

### Task 4.3: Asset Registration

**Files:**
- Modify: `src/app/assets/register/page.tsx`
- Modify: `src/components/forms/asset-registration-form.tsx`

- Multi-step form with progress indicator
- Improved input styling with labels
- Preview panel

### Task 4.4: Dashboard/Leases

**Files:**
- Modify: `src/app/dashboard/leases/page.tsx`

- Table styling with hover rows
- Status badges (active, pending, expired)
- Empty state when no leases

---

## Phase 5: Demo Flow Polish

### Task 5.1: Step Container Cohesion

**Files:**
- Modify: `src/components/demo/step-container.tsx`

- Consistent header treatment
- Better transition between steps
- Step number badge

### Task 5.2: Progress Bar Upgrade

**Files:**
- Modify: `src/components/demo/progress-bar.tsx`

- Active step glow
- Completed step checkmark
- Step labels on hover

### Task 5.3: Demo Animation Refinement

**Files:**
- Modify: `src/components/demo/animations/glow-card.tsx`
- Modify: `src/components/demo/animations/block-animation.tsx`

- Use new accent/tertiary colors for glows
- Ensure consistent animation timing
- Polish particle effects

---

## Phase 6: Final Polish

### Task 6.1: Scrollbar & Selection Styling

**Files:**
- Modify: `src/app/globals.css`

Custom scrollbar styling, text selection color, focus-visible rings.

### Task 6.2: Loading States

Add skeleton/shimmer loading states to:
- Asset rows
- Stat cards
- Demo step content

### Task 6.3: Responsive Audit

Review all pages at 375px, 768px, 1024px, 1440px breakpoints.
Fix any overflow, stacking, or readability issues.

---

## Execution Notes

- **Branch**: Work on `202603-audit-fixes` (current branch)
- **Commit style**: `daneel: <description>` prefix
- **Build check**: Run `pnpm build` after each phase to verify no regressions
- **Order matters**: Phases must be sequential (tokens → components → layouts → pages)
- **Total estimated files**: ~25 modified, ~3 created
- **Total estimated LOC changed**: ~2,000-3,000 lines
