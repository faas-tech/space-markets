# Step 01 — Deploy Contracts: Animation Architecture

## Purpose

Step 1 is the opening animation of the protocol demo. It visualizes the deployment of five upgradable smart contracts onto the blockchain, then shows them connecting into two logical clusters (Asset Infrastructure and Market Infrastructure), and finally bridging those clusters together. The goal is to communicate: "the protocol's foundation is being built in real-time."

The step description shown to the user is:
> 1. Deploy five upgradable contracts to the blockchain. 2. Connect the asset to the marketplace.

---

## Technology Stack

| Technology | Role |
|---|---|
| **React 18** | Component model, hooks (`useState`, `useEffect`, `useMemo`) |
| **Framer Motion 11** | All animation — `motion.line`, `motion.circle`, `motion.div`, `motion.text`, `AnimatePresence` |
| **SVG** | The main canvas is a `<svg viewBox="0 0 400 310">`. All nodes, connections, labels, and filters are SVG elements |
| **Tailwind CSS** | Styling for the side panel (cards, text colors, spacing). Not used inside the SVG |
| **TypeScript** | Strict typing throughout — custom types for `ContractNode`, `DeployPhase`, cluster membership |

---

## File Structure

```
frontend/src/
├── components/demo/
│   ├── steps/
│   │   └── step-01-deploy.tsx          ← THIS FILE (main animation)
│   ├── step-container.tsx              ← Shared wrapper: header, description, category badge
│   ├── demo-provider.tsx               ← React context: state machine, preset management
│   ├── animations/
│   │   ├── glow-card.tsx               ← Glowing bordered card component
│   │   ├── particle-burst.tsx          ← Radial particle explosion effect
│   │   └── typed-text.tsx              ← Typewriter text animation
│   └── preset-selector.tsx             ← Asset class selector (5 presets)
├── lib/demo/
│   ├── step-config.ts                  ← Step titles, descriptions, categories, durations
│   ├── demo-data.ts                    ← Contract addresses, hashes, block numbers, preset data
│   └── motion-variants.ts             ← Shared Framer Motion variants (fadeInRight, scaleIn, etc.)
```

---

## Component: `Step01Deploy`

**File:** `frontend/src/components/demo/steps/step-01-deploy.tsx`
**Export:** `Step01Deploy` (named export, function component)
**Rendered when:** `state.currentStep === 1` (controlled by `DemoProvider`)

### State Variables

| Variable | Type | Purpose |
|---|---|---|
| `phase` | `DeployPhase` | Current animation phase (7 phases — see below) |
| `clusterADeployed` | `number` | How many Cluster A nodes have appeared (0–3) |
| `clusterBDeployed` | `number` | How many Cluster B nodes have appeared (0–2) |
| `clusterAConnections` | `number` | How many Cluster A internal lines have drawn (0–3) |
| `clusterBConnections` | `number` | How many Cluster B internal lines have drawn (0–1) |
| `bridgeConnections` | `number` | How many bridge lines have drawn (0–2) |
| `showBurst` | `boolean` | Triggers the `ParticleBurst` on completion |

### Phase Sequence

The animation progresses through these phases via chained `setTimeout` calls in a single `useEffect`:

```
idle → materializing → deploying-a → connecting-a → connecting-b → bridging → complete
```

| Phase | Timing Offset | What Happens |
|---|---|---|
| `idle` | 0ms | Nothing visible. SVG canvas is blank |
| `materializing` | 200ms | Background hex grid pattern fades in (opacity 0 → 0.08) |
| `deploying-a` | 600ms | Cluster A nodes appear sequentially (500ms apart): MetadataStorage → AssetRegistry → AssetERC20 |
| `connecting-a` | ~2300ms | Cluster A internal triangle connections draw. Simultaneously, Cluster B nodes deploy |
| `connecting-b` | ~3200ms | Cluster B internal connection (Marketplace → LeaseFactory) draws |
| `bridging` | ~3900ms | Two bridge connections draw between clusters (400ms apart) |
| `complete` | ~5100ms | All nodes turn emerald, radial glow pulse, particle burst. `completeStep(1, {...})` called 300ms later |

Exact timings are computed at the top of the useEffect:
- `afterClusterA = 800 + 3 * 500 + 200 = 2500ms`
- `afterClusterAConnect = afterClusterA + 100 + 3 * 200 + 200 = 3400ms`
- `afterClusterBConnect = 3400 + 100 + 1 * 200 + 300 = 4000ms`
- `afterBridge = 4000 + 100 + 2 * 400 + 400 = 5300ms`

### Layout: Two-Cluster Architecture

The SVG viewBox is `0 0 400 310`. Five contract nodes are positioned in two spatial clusters:

**Cluster A — Asset Infrastructure (left side):**
- MetadataStorage: `(60, 200)` — bottom left
- AssetRegistry: `(120, 60)` — top center-left
- AssetERC20: `(180, 200)` — bottom right of triangle

These form a triangle. Internal connections: MetadataStorage↔AssetRegistry, AssetRegistry↔AssetERC20, AssetERC20↔MetadataStorage.

**Cluster B — Market Infrastructure (right side):**
- Marketplace: `(280, 80)` — top right
- LeaseFactory: `(320, 200)` — bottom right

These form a vertical pair. Internal connection: Marketplace↔LeaseFactory.

**Bridge connections (cross-cluster):**
- AssetRegistry `(120, 60)` ↔ Marketplace `(280, 80)`
- AssetERC20 `(180, 200)` ↔ LeaseFactory `(320, 200)`

Constants controlling layout:
```typescript
const NODE_POSITIONS: { x: number; y: number }[] = [
  { x: 120, y: 60 },   // 0 — AssetRegistry
  { x: 180, y: 200 },  // 1 — AssetERC20
  { x: 320, y: 200 },  // 2 — LeaseFactory
  { x: 280, y: 80 },   // 3 — Marketplace
  { x: 60, y: 200 },   // 4 — MetadataStorage
];

const CLUSTER_A_INDICES = [4, 0, 1]; // deploy order within Cluster A
const CLUSTER_B_INDICES = [3, 2];     // deploy order within Cluster B
```

### Visual Elements

#### Nodes (Contract Representations)

Currently rendered as **concentric circles**:
- Outer ring: `<motion.circle r={22}>` with 2px stroke, no fill
- Inner dot: `<motion.circle r={8}>` with solid fill
- Pulse ring: `<motion.circle r={22}>` that scales from 1→2 and fades (repeating infinity animation)
- Text label: Contract name at `y + 36`, truncated address at `y + 48`

**Color scheme:**
- Cluster A (deploying): indigo — `rgba(99, 102, 241, 0.8)`
- Cluster B (deploying): amber — `rgba(245, 158, 11, 0.8)`
- Complete phase: emerald — `rgba(16, 185, 129, 0.8)`
- Undeployed: slate — `rgba(100, 116, 139, 0.3)`

Node appearance uses spring animation: `type: 'spring', stiffness: 300–400, damping: 15–20`.

#### Connections (Internal Cluster Lines)

Rendered as `<motion.line>` elements with:
- `pathLength` animation: 0 → 1 (line draws from start to end)
- Duration: 0.6s with cubic-bezier ease `[0.22, 1, 0.36, 1]`
- Cluster A lines: `stroke="url(#lineGradA)"` (indigo gradient), `strokeWidth={1.5}`
- Cluster B lines: `stroke="url(#lineGradB)"` (amber gradient), `strokeWidth={1.5}`

#### Bridge Connections (Cross-Cluster Lines)

Rendered as `<motion.line>` elements with:
- `pathLength` animation: 0 → 1
- Duration: 0.8s (slower than internal connections)
- `stroke="url(#bridgeGrad)"` — three-stop gradient: indigo → amber → indigo
- `strokeWidth={2.5}` (thicker than internal lines)
- `strokeDasharray="6 4"` (dashed pattern)

#### SVG Filters (Glow Effects)

Three `<filter>` definitions in `<defs>`:
- `nodeGlowA`: 6px Gaussian blur, indigo flood color — applied to deployed Cluster A nodes
- `nodeGlowB`: 6px Gaussian blur, amber flood color — applied to deployed Cluster B nodes
- `completeGlow`: 10px Gaussian blur, emerald flood color — applied to all nodes on completion

Each filter uses `feGaussianBlur` → `feFlood` → `feComposite(in)` → `feMerge` pattern.

#### SVG Gradients

Four `<linearGradient>` definitions:
- `lineGradA`: indigo 0.6 → indigo 0.3 (for Cluster A internal lines)
- `lineGradB`: amber 0.6 → amber 0.3 (for Cluster B internal lines)
- `bridgeGrad`: indigo 0.7 → amber 0.7 → indigo 0.7 (for bridge lines)

#### Background

A hex grid pattern using `<pattern>` + `<rect fill="url(#hexgrid)">`, fading in at the `materializing` phase. Opacity stays at 0.08. The hex path is a 30x26 unit hexagon with indigo stroke at 0.3 alpha.

#### Completion Effects

When `phase === 'complete'`:
1. All nodes switch to emerald color
2. A radial gradient div (`w-32 h-32 rounded-full`) scales from 0.5→3 and fades
3. `ParticleBurst` fires 18 emerald particles radiating from center
4. Cluster labels ("Asset Infrastructure", "Market Infrastructure") remain visible

---

## Side Panel (Right Column)

The side panel is a standard HTML/Tailwind column (not SVG) that slides in using the `fadeInRight` variant when `phase !== 'idle'`. It contains:

### Deployment Info Card (`GlowCard color="indigo"`)
- Deployer address (truncated, monospace, indigo)
- Network: "Base Sepolia (84532)"
- Pattern: "UUPS Transparent Proxy"
- Block number (amber, formatted with locale separator)
- Deploy counter: "X / 5 deployed"

### Transaction Card (`GlowCard color="indigo" intensity="low"`)
- Tx hash displayed via `TypedText` component (typewriter animation at 20ms/char)
- Shows "pending..." until first node deploys

### Deployed Contract List
- Animated list that grows as contracts deploy
- Each item: colored checkmark (animated SVG path draw) + contract name + truncated address
- Border color matches cluster (indigo for Cluster A, amber for Cluster B, emerald on complete)
- Items slide in from right with spring animation, staggered by 50ms

---

## Integration Points

### StepContainer (`step-container.tsx`)
Wraps the step content. Provides:
- Category badge ("Infrastructure Setup" in indigo)
- Step number ("Step 1 of 12")
- Title ("Deploy Contracts")
- Description text (the text we just updated)
- AnimatePresence for step transitions
- Category-colored border and shadow glow

### DemoProvider (`demo-provider.tsx`)
The step component reads from context:
- `state.currentStep` — determines if step is active (`isActive = state.currentStep === 1`)
- `state.activePreset` — included in useEffect deps so animation restarts on preset switch
- `completeStep(1, data)` — called at animation end to record completion data and trigger auto-advance

### Demo Data (`demo-data.ts`)
Static data consumed by the step:
- `CONTRACTS` object — 5 entries with name, address, pattern, description
- `DEPLOYER` — deployer wallet address
- `BLOCK_NUMBERS.deployBlock` — displayed in the info card
- `TX_HASHES.deploy` — displayed via TypedText
- `truncateAddress()` / `truncateHash()` — utility functions for display

### Animation Components
- `GlowCard` — Used for info cards. Accepts `color` (indigo/amber/emerald/etc), `intensity`, `active` boolean, `delay`
- `ParticleBurst` — Triggered by `showBurst` boolean. Accepts `color`, `particleCount`. Radiates particles with physics (angle, distance, size)
- `TypedText` — Typewriter effect for the tx hash. Accepts `text`, `speed` (ms/char), `cursor` boolean

### Motion Variants (`motion-variants.ts`)
- `fadeInRight` — used by the side panel: `{ hidden: { opacity: 0, x: 30 }, visible: { opacity: 1, x: 0 } }`
- `stepContainer` — used by StepContainer wrapper for enter/exit transitions

---

## Key Architectural Patterns

1. **Timer-based sequencing**: All phase transitions and node appearances are orchestrated via an array of `setTimeout` calls created in a single `useEffect`. Cleanup returns `() => timers.forEach(clearTimeout)`.

2. **Derived state**: Node deployment status is computed in `useMemo` from `clusterADeployed` / `clusterBDeployed` counters, not stored per-node.

3. **Declarative animation**: Framer Motion's `animate` prop reacts to state changes. When `isVisible` or `isDeployed` changes, the corresponding `motion.*` element transitions automatically.

4. **Preset restart**: Including `state.activePreset` in the useEffect dependency array causes the entire animation to reset and replay when the user switches presets.

5. **SVG + HTML hybrid**: The main animation (nodes, connections, effects) lives in an SVG canvas. The side panel (cards, text) is standard HTML/Tailwind. They coexist in a CSS grid layout (`grid-cols-1 lg:grid-cols-3`).

---

## What Needs Improvement (User Feedback)

The user has flagged the following issues with the current animation:

1. **Node shape**: Contracts are rendered as circles. They should look more like "buckets" or "cards" — rectangular shapes that visually suggest smart contract containers.

2. **Timing**: Internal cluster connections should begin drawing while the step description text is still being typed/animated — creating a sense of concurrent activity.

3. **Bridge connections**: The current dashed lines with a gradient are not visually compelling. They need to be more direct "spark line" connections with visible bidirectional transaction indicators (e.g., small dots or pulses traveling both directions along the bridge lines).

4. **Overall polish**: The animation "really needs work" — more visual drama, better communication of what's happening at each phase.
