# Space Markets Protocol Demo — Design & Animation Agent Brief

You are being given creative ownership of the **Protocol Demo** section of the Space Markets frontend. Your job is to **significantly upgrade the animation quality, visual design, and narrative flow** of a 12-step interactive demo that walks viewers through a blockchain protocol for leasing real-world space assets (satellites, orbital compute nodes, space stations, data relays, cargo slots).

This demo is used for **live presentations**. The Space Markets team advances through each step manually, explaining the protocol to investors and partners. Every step must tell a clear visual story, feel cinematic, and reinforce the narrative: *"This is how tokenized space infrastructure gets leased, paid for, and revenue-distributed on-chain."*

---

## Table of Contents

1. [Tech Stack & Constraints](#1-tech-stack--constraints)
2. [Repository Structure](#2-repository-structure)
3. [Design System](#3-design-system)
4. [Demo Architecture](#4-demo-architecture)
5. [Animation Primitives (Your Toolkit)](#5-animation-primitives-your-toolkit)
6. [Data Layer](#6-data-layer)
7. [The 12 Steps (Current State & Narrative)](#7-the-12-steps-current-state--narrative)
8. [What Needs to Upgrade](#8-what-needs-to-upgrade)
9. [Rules & Guardrails](#9-rules--guardrails)

---

## 1. Tech Stack & Constraints

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 14.2 |
| UI | React | 18.3 |
| Styling | Tailwind CSS | 3.4 |
| Animation | Framer Motion | 12.34 |
| Icons | Lucide React | 0.468 |
| Fonts | Inter (sans), Roboto Mono (mono) | Google Fonts |
| Class merging | `cn()` = `clsx` + `tailwind-merge` | — |
| Tailwind plugin | `tailwindcss-animate` | 1.0.7 |

**Hard constraints:**
- TypeScript strict mode — zero `any` in production code
- All components are `'use client'` (client-side rendering)
- Dark mode only (`<html className="dark">`)
- Must pass `npm run build` with zero errors
- Do not add new npm dependencies without asking first
- Do not modify files outside the `frontend/` directory
- Maintain the existing component API contracts (props interfaces) for shared primitives

---

## 2. Repository Structure

All paths relative to `frontend/src/`:

```
app/
  layout.tsx                        # Root layout: Inter + Roboto Mono fonts, dark class
  globals.css                       # CSS custom props, keyframe animations, utilities
  protocol-demo/
    layout.tsx                      # Demo route layout (metadata)
    page.tsx                        # Demo page — assembles all 12 steps

components/
  demo/
    demo-provider.tsx               # React context + useReducer state machine
    demo-controller.tsx             # Play/pause/speed toolbar + keyboard shortcuts
    step-container.tsx              # Shared step wrapper (header, category badge, AnimatePresence)
    progress-bar.tsx                # 12-node horizontal step navigation
    preset-selector.tsx             # 5 asset class preset buttons
    share-button.tsx                # URL copy with query params
    blockchain-state.tsx            # Formatted blockchain field display

    animations/                     # Reusable animation primitives
      block-animation.tsx           # Block confirmation drop animation
      count-up.tsx                  # Animated number counter (useSpring)
      data-stream.tsx               # Horizontal data particle stream
      glow-card.tsx                 # Card with colored glow border/shadow
      orbital-path.tsx              # SVG orbital ring with rotating dot
      particle-burst.tsx            # Radial geometric particle explosion
      payment-pulse.tsx             # USDC payment visualization
      satellite.tsx                 # SVG satellite icon
      signature-flow.tsx            # EIP-712 hash visualization
      starfield.tsx                 # Canvas star background (requestAnimationFrame)
      typed-text.tsx                # Character-by-character text reveal

    steps/                          # One file per demo step
      step-01-deploy.tsx            # Deploy Contracts (card nodes, bridge sparks)
      step-02-create-type.tsx       # Create Asset Type (list → convergence hash)
      step-03-register-asset.tsx    # Register Asset (HUD tags, token ring)
      step-04-verify-metadata.tsx   # Verify Metadata (scan + checkmarks)
      step-05-lease-offer.tsx       # Create Lease Offer (form → listing)
      step-06-lessee-bid.tsx        # Lessee Bids (EIP-712 signature flow)
      step-07-lessor-accept.tsx     # Lessor Accepts (bid comparison → counter-sign)
      step-08-nft-mint.tsx          # Mint Lease NFT (convergence → NFT card)
      step-09-x402-requirements.tsx # X402 Requirements (HTTP 402 flow)
      step-10-x402-streaming.tsx    # X402 Streaming (micropayment pulses)
      step-11-revenue.tsx           # Revenue Distribution (branching flow)
      step-12-summary.tsx           # Protocol Summary (dashboard stats)

lib/
  utils.ts                          # cn() utility (clsx + tailwind-merge)
  demo/
    demo-data.ts                    # All static data: addresses, hashes, 5 presets
    step-config.ts                  # Step metadata, durations, categories, t() scale fn
    motion-variants.ts              # Shared Framer Motion variants & transitions
    animation-utils.ts              # Easing constants, formatters, delay helper
```

---

## 3. Design System

### 3.1 Color Palette (Semantic Roles)

The demo uses Tailwind color classes directly (not the CSS custom property tokens). Each protocol category has a signature color:

| Category | Steps | Color Token | Tailwind Classes | RGB |
|----------|-------|-------------|-----------------|-----|
| **Setup** (Infrastructure) | 1 | Indigo | `text-indigo-400`, `border-indigo-500/20`, `bg-indigo-500` | `99, 102, 241` |
| **Asset** (Management) | 2, 3, 4 | Blue | `text-blue-400`, `border-blue-500/20`, `bg-blue-500` | `59, 130, 246` |
| **Market** (Marketplace) | 5, 6, 7, 8 | Amber | `text-amber-400`, `border-amber-500/20`, `bg-amber-500` | `245, 158, 11` |
| **X402** (Payments) | 9, 10, 11 | Emerald | `text-emerald-400`, `border-emerald-500/20`, `bg-emerald-500` | `52, 211, 153` |
| **Summary** | 12 | Cyan | `text-cyan-400`, `border-cyan-500/20`, `bg-cyan-500` | `34, 211, 238` |

**Functional colors:**
- **Emerald** = success, completion, money flowing
- **Amber** = attention, active operations, block numbers
- **Cyan** = data, metadata fields, amounts
- **Rose** = destructive (unused in demo, reserved)
- **Slate** = backgrounds, muted text, borders (900/800/700/600/500/400 scale used heavily)

### 3.2 Background System

- **Page background:** `bg-black` with canvas `<Starfield>` (200 animated stars, 3 depth layers, twinkle effect)
- **Surface layers:** `bg-slate-950/60 backdrop-blur-md` (step containers), `bg-slate-900/60` (cards), `bg-black/70 backdrop-blur-xl` (header)
- **Glass effect:** `backdrop-blur-md` + `bg-{color}/60` for layered depth

### 3.3 Typography

- **Headings:** `text-white font-bold tracking-tight` (Inter)
- **Body:** `text-slate-400` (descriptions), `text-slate-500` (muted)
- **Data/Code:** `font-mono text-[11px]` (Roboto Mono) for addresses, hashes, amounts
- **Labels:** `text-[11px] uppercase tracking-[0.15em] font-semibold text-slate-600`

### 3.4 Borders & Shadows

- **Card borders:** `border border-{category-color}-500/20 rounded-2xl`
- **Glow shadows:** `shadow-2xl shadow-{color}-500/10` for active cards
- **Dividers:** `border-slate-800/60` (subtle), `border-slate-800/40` (very subtle)

### 3.5 CSS Keyframe Animations (globals.css)

Available custom keyframes you can use or extend:

| Keyframe | Description | Used By |
|----------|-------------|---------|
| `fadeInUp` | opacity + translateY(12→0) | General fade-in |
| `pulseGlow` | opacity/scale breathing | Satellite active state |
| `dataStream` | translateX sweep across viewport | DataStream, PaymentPulse |
| `orbitalRotation` | 360deg rotation loop | OrbitalPath |
| `hashReveal` | clip-path left-to-right reveal | Hash display |
| `blockDrop` | translateY(-20) + scale bounce | BlockAnimation |
| `scanLine` | vertical translateY sweep | Verification scan |
| `shimmer` | background-position sweep | Holographic effects |
| `breathe` | opacity 0.5→1→0.5 loop | Active element glow |
| `signalPulse` | scale(0)→scale(2.5) + fade | Communication pulses |

---

## 4. Demo Architecture

### 4.1 State Machine (demo-provider.tsx)

Central state via `useReducer`:

```typescript
interface DemoState {
  currentStep: number;        // 1-12
  isPlaying: boolean;         // auto-advance timer
  playbackSpeed: number;      // 0.5, 1, or 2
  completedSteps: Set<number>;
  stepData: Record<number, StepData>;  // data collected from each step
  activePreset: AssetClassId;          // which space asset class
  pricingMode: PricingMode;            // always 'standard' (toggle removed)
}
```

**Key actions:**
- `COMPLETE_STEP` — marks step done, stores data, **pauses playback** (presenter advances manually)
- `SET_PRESET` — switches asset class, resets all progress to step 1
- `GO_TO_STEP` — direct navigation (from progress bar clicks)
- `NEXT_STEP` / `PREV_STEP` — sequential navigation

**Context provides:**
- `state` — the full state object
- Action dispatchers: `goToStep()`, `nextStep()`, `prevStep()`, `play()`, `pause()`, `togglePlay()`, `setSpeed()`, `completeStep()`, `reset()`, `setPreset()`, `setPricingMode()`
- `totalSteps` — always 12
- `presetData` — derived data for the active preset (computed from `demo-data.ts`)

### 4.2 Step Container Pattern

Every step renders inside `<StepContainer stepNumber={N}>`:
- Uses `AnimatePresence mode="wait"` — only the active step is visible
- Renders the step header automatically (category badge, "Step N of 12", title, description)
- Applies category-colored border and glow

### 4.3 Step Component Pattern

Every step file follows this structure:

```typescript
type Phase = 'idle' | 'phase-a' | 'phase-b' | ... | 'complete';

export function StepNN() {
  const { state, completeStep, presetData } = useDemoContext();
  const isActive = state.currentStep === N;
  const [phase, setPhase] = useState<Phase>('idle');
  // ... more state for reveal counters, etc.

  useEffect(() => {
    if (!isActive) { /* reset all state */ return; }
    // Phase sequencing via setTimeout chain:
    const t1 = setTimeout(() => setPhase('phase-a'), t(500));
    const t2 = setTimeout(() => setPhase('phase-b'), t(1500));
    // ...
    const tN = setTimeout(() => {
      completeStep(N, { ...collected data });
    }, t(5000));
    return () => { clearTimeout(t1); clearTimeout(t2); ... };
  }, [isActive, state.activePreset]);

  return (
    <StepContainer stepNumber={N}>
      {/* SVG schematics, GlowCards, data panels, etc. */}
    </StepContainer>
  );
}
```

### 4.4 Timing System

All `setTimeout` delays use the `t()` function from `step-config.ts`:

```typescript
export const ANIMATION_SCALE = 1.25; // 25% slower for presentations
export function t(ms: number): number {
  return Math.round(ms * ANIMATION_SCALE);
}
```

This means `t(1000)` = 1250ms. All animation timings in all 12 steps are wrapped in `t()`. When tuning animation timing, always use `t()` to wrap your millisecond values.

---

## 5. Animation Primitives (Your Toolkit)

These are reusable components in `components/demo/animations/`. Use them freely. You may modify or extend them, or create new primitives.

### 5.1 GlowCard
Animated card with colored glow border/shadow. Main building block.
```typescript
<GlowCard color="blue" intensity="medium" active={true} delay={0.2}>
  {children}
</GlowCard>
```
**Colors:** `'blue' | 'emerald' | 'amber' | 'purple' | 'indigo' | 'cyan' | 'rose'`
**Intensity:** `'low' | 'medium' | 'high'`

### 5.2 ParticleBurst
Radial explosion of geometric shapes (squares + dashes) on trigger.
```typescript
<ParticleBurst trigger={phase === 'complete'} color="emerald" particleCount={16} />
```
**Colors:** `'blue' | 'emerald' | 'amber' | 'purple' | 'indigo' | 'cyan'`

### 5.3 TypedText
Character-by-character text reveal with blinking cursor.
```typescript
<TypedText text="Deploying AssetRegistry..." speed={30} delay={200} onComplete={handleDone} />
```

### 5.4 CountUp
Animated number counter using spring physics.
```typescript
<CountUp value={375000} prefix="$" suffix=" USDC" decimals={2} duration={1.5} />
```

### 5.5 DataStream
Horizontal particle stream with directional flow.
```typescript
<DataStream color="emerald" direction="right" speed="normal" label="USDC" active={true} />
```

### 5.6 BlockAnimation
Block confirmation visualization (drop + land).
```typescript
<BlockAnimation blockNumber={18500000} txHash="0x..." active={true} delay={500} onComplete={fn} />
```

### 5.7 SignatureFlow
EIP-712 typed data hashing visualization (fields → digest → reveal).
```typescript
<SignatureFlow fields={[{name: 'rate', value: '0.048'}]} digest="0x8d9e..." active={true} />
```

### 5.8 PaymentPulse
Animated USDC micropayment stream between lessee and lessor nodes.
```typescript
<PaymentPulse active={true} amountPerPulse={0.048} interval={1000} onPulse={fn} />
```

### 5.9 Satellite, OrbitalPath, Starfield
Space-themed visual elements. Satellite is an SVG icon, OrbitalPath draws a ring with orbiting dot, Starfield is a full-screen canvas star background.

### 5.10 Shared Motion Variants (motion-variants.ts)

Import and use these Framer Motion `Variants` objects:

| Variant | Effect |
|---------|--------|
| `stepContainer` | Step enter/exit (y:30→0, stagger children) |
| `staggerContainer` | Parent that staggers children by 0.1s |
| `staggerFast` | Parent that staggers children by 0.05s |
| `fadeInUp` / `fadeInDown` / `fadeInLeft` / `fadeInRight` | Directional fades |
| `scaleIn` / `scaleInBounce` | Scale from 0.8/0.5 with spring |
| `heroEntrance` | Big entrance: scale 0.9 + y:40, stagger 0.12s |
| `glowPulse` | Blue box-shadow breathing loop |
| `drawPath` | SVG pathLength 0→1 draw |
| `cardFlip` | 3D rotateY flip |
| `float` | Gentle y oscillation loop |
| `checkmark` | SVG checkmark draw |

**Shared transitions:** `springTransition` (snappy), `gentleSpring` (soft), `slowSpring` (dramatic).

**Consistent easing:** `[0.22, 1, 0.36, 1]` (ease-out-cubic) used throughout.

---

## 6. Data Layer

### 6.1 Preset System (demo-data.ts)

5 space asset presets, each with full realistic data:

| ID | Label | Asset | Example Lease Cost |
|----|-------|-------|--------------------|
| `comms-imaging` | Comms & Imaging | HAWK-7 Multisat | $375K / 90 days |
| `orbital-compute` | Orbital Compute | NOVA-Edge-04 | $20.1K / 30 days |
| `orbital-station` | Orbital Station | HAVEN-Module-B2 | $7.2M / 180 days |
| `data-relay` | Data Relay | PRISM-Relay-GEO-3 | $12M / 365 days |
| `transportation` | Transportation | DRG-Cargo-2026-Q3 | $4.8M / 60 days |

Each preset provides: `assetType` (name, schema fields), `assetMetadata` (name, symbol, values), `leaseTerms` (rates, duration, escrow), `x402Config` (payment gateway config), `metadata` (orbit, altitude, etc.).

Steps access preset data via `const { presetData } = useDemoContext()`.

### 6.2 Step Config (step-config.ts)

```typescript
interface StepConfig {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  duration: number;      // base auto-play duration (ms)
  icon: string;
  category: 'setup' | 'asset' | 'market' | 'x402' | 'summary';
}
```

12 configs. Category maps to color. Duration used by auto-play timer.

### 6.3 Protocol Constants

- 3 actors: `DEPLOYER`, `LESSOR`, `LESSEE` (Ethereum addresses)
- 5 contracts: `AssetRegistry`, `AssetERC20`, `LeaseFactory`, `Marketplace`, `MetadataStorage`
- 10 transaction hashes, 10 block numbers
- 5 cryptographic hashes (asset type, metadata, lease terms, bid signature, accept signature)

---

## 7. The 12 Steps (Current State & Narrative)

### Phase 1: Infrastructure Setup (Step 1)

**Step 1 — Deploy Contracts** (`step-01-deploy.tsx`, ~770 lines)
- **Narrative:** Deploy 5 upgradeable smart contracts, then connect them into an integrated protocol.
- **Current animation:** Two vertical columns of card-shaped nodes. Left column = Asset Infrastructure (MetadataStorage, AssetRegistry, AssetERC20) in indigo. Right column = Market Infrastructure (Marketplace, LeaseFactory) in amber. Ghost cards appear, then deploy sequentially with particle bursts. Internal connections draw within each cluster, then horizontal bridge lines connect the clusters with bidirectional spark animations.
- **Phases:** `idle → materializing → deploying-a → connecting-a → connecting-b → bridging → complete`
- **SVG viewBox:** `0 0 480 310`, card nodes are 100x50px

### Phase 2: Asset Management (Steps 2-4)

**Step 2 — Create Asset Type** (`step-02-create-type.tsx`, ~530 lines)
- **Narrative:** Define a metadata schema (fields + types), then hash it into a keccak256 type identifier.
- **Current animation:** Left panel: vertical list of schema fields appear as styled bars. Convergence lines draw from each field toward a fusion point. The fusion point glows emerald when complete, displaying the keccak256 hash. Right panel: static info cards.
- **Phases:** `idle → unfold → fields → hashing → complete`

**Step 3 — Register Asset** (`step-03-register-asset.tsx`, ~560 lines)
- **Narrative:** Register a specific asset instance (e.g., HAWK-7 satellite), hash its metadata, deploy a fractional ERC-20 token, link ownership on-chain.
- **Current animation:** Central satellite/asset circle with HUD-style metadata tags floating at ±270px offset. Token ring animation around the asset. Particle burst on completion.
- **Phases:** `idle → launch → metadata → token-ring → link → complete`

**Step 4 — Verify Metadata** (`step-04-verify-metadata.tsx`, ~560 lines)
- **Narrative:** Query MetadataStorage contract to verify all fields match. Green checkmarks confirm integrity.
- **Current animation:** Field-by-field scanning with progressive checkmarks. Side panel shows verified data.
- **Phases:** `idle → scanning → complete`

### Phase 3: Marketplace (Steps 5-8)

**Step 5 — Create Lease Offer** (`step-05-lease-offer.tsx`, ~520 lines)
- **Narrative:** The lessor creates a lease offer with terms: rate per second, duration, escrow requirements.
- **Current animation:** Form-style card builds up with typed text, then submits to the marketplace.
- **Phases:** `idle → drawing → typing → submitting → listed`

**Step 6 — Lessee Bids** (`step-06-lessee-bid.tsx`, ~600 lines)
- **Narrative:** A lessee constructs an EIP-712 typed data bid, signs with their wallet, submits with USDC escrow.
- **Current animation:** EIP-712 signature flow visualization, escrow amount counter, bid submission.
- **Phases:** `idle → materializing → hashing → signing → escrow → submitted`

**Step 7 — Lessor Accepts** (`step-07-lessor-accept.tsx`, ~580 lines)
- **Narrative:** The lessor reviews bids, selects the winner, counter-signs to finalize.
- **Current animation:** Bid comparison cards, selection highlight, counter-signature flow.
- **Phases:** `idle → entering → comparing → selecting → signing → accepted`

**Step 8 — Mint Lease NFT** (`step-08-nft-mint.tsx`, ~620 lines)
- **Narrative:** The LeaseFactory mints an NFT representing the active lease with embedded terms.
- **Current animation:** Terms converge into an NFT card with holographic effects.
- **Phases:** `idle → converging → forming → minting → minted`

### Phase 4: X402 Payments (Steps 9-11)

**Step 9 — X402 Requirements** (`step-09-x402-requirements.tsx`, ~640 lines)
- **Narrative:** Resource server responds with HTTP 402 Payment Required + X402 V2 payment requirements header.
- **Current animation:** HTTP request/response flow, payload parsing, requirement badges.
- **Phases:** `idle → request → arrow → response → parsing → parsed → badges`

**Step 10 — X402 Streaming** (`step-10-x402-streaming.tsx`, ~870 lines)
- **Narrative:** Per-second USDC micropayments stream from lessee to lessor via the facilitator.
- **Current animation:** Three-node flow (Lessee → Facilitator → Lessor), payment pulses, running total counter.
- **Phases:** `idle → connecting → streaming → finalArc → complete`

**Step 11 — Revenue Distribution** (`step-11-revenue.tsx`, ~770 lines)
- **Narrative:** Revenue distributes proportionally to fractional token holders based on ERC20Votes balance.
- **Current animation:** Central pool → branching flow to 3 investor nodes, with proportional amounts.
- **Phases:** `idle → source → branching → distributing → settled → done`

### Phase 5: Summary (Step 12)

**Step 12 — Protocol Summary** (`step-12-summary.tsx`, ~680 lines)
- **Narrative:** Dashboard view of the entire protocol execution.
- **Current animation:** Stats counters, timeline of all transactions, health indicators.
- **Phases:** `idle → stats → timeline → health → complete`

---

## 8. What Needs to Upgrade

### 8.1 Animation Quality

The current animations are functional but basic. Upgrade to **cinematic, presentation-grade** quality:

- **Richer SVG schematics** — current inline SVGs are simple rectangles and lines. Consider rounded paths, flowing curves, depth layering, subtle gradients, particle trails, glow halos.
- **More dynamic motion** — springs and physics-based animation instead of linear timeouts. Framer Motion's `useSpring`, `useTransform`, `useMotionValue` are available.
- **Ambient motion** — subtle background movement in idle states (floating elements, breathing glows, slow orbital rotations). The demo should never feel static while the presenter is talking.
- **Transition polish** — smoother phase-to-phase transitions within each step. Current transitions can feel abrupt between phases.
- **Visual hierarchy** — important elements should draw the eye. Use scale, glow, and motion to direct attention to what the presenter is currently explaining.

### 8.2 Narrative Flow

Each step should tell a visual story that a non-technical audience can follow:

- **Clear cause and effect** — when Action A triggers Result B, the animation should make that causality obvious through connected motion (e.g., a data packet travels from sender to receiver).
- **Spatial consistency** — if the lessor is on the left in step 5, they should stay on the left through steps 6-8. Build a spatial mental model the viewer can follow.
- **Progressive revelation** — don't show everything at once. Reveal complexity layer by layer, matching the presenter's explanation pace.
- **Satisfying completions** — when a step succeeds, the viewer should feel it. Particle bursts, color shifts, subtle camera-shake equivalents, sound-like visual beats.

### 8.3 Visual Cohesion

- **Consistent visual language** — all 12 steps should feel like they belong to the same design system while each having a unique centerpiece animation.
- **Category color discipline** — use the category colors consistently. When the demo transitions from blue (Asset) to amber (Market) steps, the color shift should reinforce the narrative transition.
- **Information density** — the current steps vary wildly in visual density. Some are too sparse (step 4), others too crowded (step 10). Normalize the visual weight across steps.

### 8.4 Specific Weak Spots

These steps need the most attention:

1. **Step 4 (Verify Metadata)** — Currently feels like a simple checklist. Needs a more dramatic "verification scan" moment.
2. **Step 5 (Lease Offer)** — Currently a basic form fill. Needs to feel like a marketplace listing being published.
3. **Step 9 (X402 Requirements)** — HTTP request/response is hard to make visually exciting. Needs creative treatment.
4. **Step 12 (Summary)** — Should feel like a triumphant dashboard that ties everything together. Currently just stats counters.

---

## 9. Rules & Guardrails

### Must Do
- All files must be TypeScript (`.tsx`)
- All components must be `'use client'`
- All setTimeout durations must be wrapped in `t()` from `step-config.ts`
- Each step must call `completeStep(N, data)` when its animation cycle finishes
- Each step must reset all local state when `isActive` becomes false
- Each step must include `state.activePreset` in its useEffect dependency array (so animation restarts on preset switch)
- Use `cn()` for all className composition
- Run `npm run build` and verify zero errors after changes

### Must Not
- Do not change the `DemoProvider` state machine or action types
- Do not change the `StepContainer` component
- Do not change the `ProgressBar`, `DemoController`, or `PresetSelector` APIs
- Do not change step-config.ts step metadata (titles, descriptions, categories)
- Do not change demo-data.ts preset data
- Do not introduce `any` types
- Do not add external animation libraries (GSAP, Lottie, Three.js, etc.) — stick with Framer Motion + CSS + Canvas
- Do not use purple — it was replaced with indigo everywhere. No `purple-*` Tailwind classes.

### May Do
- Create new animation primitives in `components/demo/animations/`
- Modify existing animation primitives (extend their API)
- Add new CSS keyframe animations to `globals.css`
- Add new motion variants to `motion-variants.ts`
- Completely rewrite individual step files (maintain the component name and StepContainer wrapper)
- Adjust `ANIMATION_SCALE` in step-config.ts if you think the global timing needs tuning
- Add new color variants to GlowCard, ParticleBurst, DataStream if needed
- Add new Framer Motion transition presets to motion-variants.ts

---

## Quick Start

1. Read the step you want to modify: `frontend/src/components/demo/steps/step-NN-*.tsx`
2. Understand its phase state machine and what data it pulls from `presetData`
3. Redesign the animation and layout
4. Wrap all setTimeout delays in `t()`
5. Ensure `completeStep(N, data)` fires at the end
6. Ensure state resets when `isActive` goes false
7. Include `state.activePreset` in useEffect deps
8. Run `npm run build` and verify zero errors
