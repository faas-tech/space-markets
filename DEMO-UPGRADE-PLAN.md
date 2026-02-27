# Space Markets Demo Upgrade Plan

**Goal:** Transform the 12-step protocol demo from a developer prototype into a cinematic, NASA-tier presentation that communicates the vision of the blockchain-powered orbital economy.

**Stack additions:** Framer Motion for orchestrated animations
**Visual direction:** Cinematic space theme — dark cosmos, glowing orbital paths, particle effects, data-dense HUD elements overlaid on space imagery
**Design principle:** Each step tells a visual story with a unique hero animation. The viewer should feel like they're watching a mission control interface for the future space economy.

---

## Phase 0: Foundation (Infrastructure & Dependencies)

### 0.1 Install Framer Motion
- [ ] `cd frontend && npm install framer-motion`
- [ ] Verify build still passes

### 0.2 Create Starfield Background Component
- [ ] `frontend/src/components/demo/animations/starfield.tsx`
- [ ] Canvas-based animated starfield with parallax layers (3 depth layers, ~200 stars)
- [ ] Subtle slow drift (0.1-0.3px/frame) with twinkle effect (opacity oscillation)
- [ ] Wrap the entire demo page in this background
- [ ] Performance: requestAnimationFrame with cleanup, respect `prefers-reduced-motion`

### 0.3 Upgrade StepContainer with Framer Motion
- [ ] Replace CSS fade-in with `motion.div` using `AnimatePresence` for enter/exit
- [ ] Add step transition: slide-up + fade-in on enter, fade-out on exit
- [ ] Add stagger orchestration via `variants` for child elements
- [ ] Category-aware accent glow on container border (subtle colored shadow)

### 0.4 Create Shared Animation Primitives
- [ ] `frontend/src/components/demo/animations/glow-card.tsx` — Card with animated border glow (color-configurable)
- [ ] `frontend/src/components/demo/animations/count-up.tsx` — Animated number counter with spring easing
- [ ] `frontend/src/components/demo/animations/particle-burst.tsx` — Radial particle burst for completion events
- [ ] `frontend/src/components/demo/animations/typed-text.tsx` — Typewriter text reveal for key labels
- [ ] `frontend/src/lib/demo/motion-variants.ts` — Shared Framer Motion variant definitions (fadeInUp, staggerChildren, scaleIn, slideFromLeft, slideFromRight)

---

## Phase 1: Infrastructure Steps (Steps 1-4)

### 1.1 Step 1 — Deploy Contracts (Hero: Blockchain Grid Materializing)
- [ ] **Hero animation:** A hexagonal grid pattern (representing the blockchain) materializes in space. Each contract deployment lights up a node on the grid with a pulse ripple effect. Lines connect the nodes as contracts are linked.
- [ ] 5 hex nodes appear sequentially with `spring` animation + glow pulse
- [ ] Connection lines draw between nodes (SVG path animation with `pathLength`)
- [ ] Each node shows contract name + truncated address on hover/completion
- [ ] Grid floats with subtle parallax relative to mouse position
- [ ] Side panel slides in with deployment details using staggered `motion.div`
- [ ] Completion: entire grid pulses once with emerald glow + particle burst

### 1.2 Step 2 — Create Asset Type (Hero: Schema Blueprint Unfold)
- [ ] **Hero animation:** A technical blueprint/schematic unfolds from the center, revealing schema fields as annotated diagram elements. Think architectural blueprint meets satellite spec sheet.
- [ ] Central schematic drawing animates line-by-line (SVG stroke-dashoffset)
- [ ] Schema fields appear as labeled callout lines pointing to parts of the schematic
- [ ] Satellite silhouette or asset icon in center of blueprint
- [ ] Keccak256 hash computation shown as data flowing from fields into a hash funnel
- [ ] Final type hash appears with `hashReveal` animation + glow
- [ ] Blueprint style: thin cyan/blue lines on dark background, technical font

### 1.3 Step 3 — Register Asset (Hero: Satellite Launch Sequence)
- [ ] **Hero animation:** A satellite (or asset icon based on preset) rises from the bottom of the viewport with a launch trail, settling into an orbital position. As it reaches orbit, metadata fields materialize around it like a HUD overlay.
- [ ] Asset icon rises with spring physics (fast initial velocity, settling)
- [ ] Exhaust trail particles using particle-burst adapted vertically
- [ ] Once settled, metadata labels orbit the asset or appear as floating HUD tags
- [ ] ERC-20 token deployment shown as a ring forming around the asset
- [ ] Token supply counter animates up to final number
- [ ] Phase indicators (Hash → Deploy → Link) shown as mission stages

### 1.4 Step 4 — Verify Metadata (Hero: Scanning Beam)
- [ ] **Hero animation:** A scanning laser beam sweeps across a data panel, verifying each field. Each verified field gets a green lock icon with a satisfying click animation.
- [ ] Horizontal scan line moves top-to-bottom across metadata table
- [ ] As scan line passes each row, the row illuminates briefly then shows checkmark
- [ ] Scan line has glow effect (box-shadow blur in motion)
- [ ] Progress shown as "7/7 VERIFIED" with count-up animation
- [ ] Completion: full panel gets green border glow + "INTEGRITY CONFIRMED" stamp

---

## Phase 2: Marketplace Steps (Steps 5-8)

### 2.1 Step 5 — Lease Offer (Hero: Marketplace Board)
- [ ] **Hero animation:** A trading board/marketplace interface materializes showing the lease offer being posted. The offer card builds itself piece by piece (terms filling in sequentially) then slides onto the board.
- [ ] Offer card assembles: border draws in (SVG rect animation), then fields type in one by one
- [ ] Pricing data animates with count-up components (rate/sec, rate/hour, rate/day)
- [ ] Card transitions through states: DRAFT (gray) → SUBMITTING (amber pulse) → LISTED (blue glow)
- [ ] "Listed on Marketplace" confirmation with particle burst
- [ ] Background shows faded marketplace grid with this offer highlighted

### 2.2 Step 6 — Lessee Bid (Hero: EIP-712 Signature Forge)
- [ ] **Hero animation:** A cryptographic signature being forged — data fields flow into a central "forge" visualization where they're hashed and compressed into a signature. Wallet confirmation appears as a biometric-style authorization.
- [ ] Left side: EIP-712 domain and message fields materialize as floating data blocks
- [ ] Data blocks flow toward center forge (motion path animation)
- [ ] Center: rotating hash visualization (geometric shape morphing as data enters)
- [ ] Signature output emerges as a glowing hex string
- [ ] Wallet authorization: fingerprint/key icon with scanning animation
- [ ] Escrow deposit: USDC amount flows from lessee to marketplace (animated along a path)

### 2.3 Step 7 — Lessor Accept (Hero: Bid Comparison Arena)
- [ ] **Hero animation:** Multiple bids displayed as competing cards. The winning bid is selected with a spotlight effect while others recede. Counter-signature computation runs.
- [ ] 3 bid cards enter from different directions with spring animation
- [ ] Comparison phase: cards gently oscillate as if being evaluated
- [ ] Selection: winning card scales up slightly, spotlight cone appears, others desaturate and shrink
- [ ] "WINNER" badge stamps onto selected bid with spring bounce
- [ ] Counter-signature: similar forge animation as Step 6 but smaller
- [ ] Acceptance confirmation: both signatures combine (visual merge animation)

### 2.4 Step 8 — Mint Lease NFT (Hero: NFT Crystallization)
- [ ] **Hero animation:** The lease NFT materializes from the combined signatures — a 3D-perspective card that rotates to reveal embedded terms. Think holographic NFT card.
- [ ] NFT card builds from particles converging to center (reverse particle burst)
- [ ] Card rotates with CSS perspective/3D transform to show "front" (visual) and "back" (terms)
- [ ] Front: Asset name, token ID, duration, glowing border animation
- [ ] Back: Embedded lease terms table with small text
- [ ] Holographic shimmer effect (gradient animation across card surface)
- [ ] Minting confirmation: card settles into final position with golden glow pulse
- [ ] "TOKEN #1 MINTED" with block confirmation

---

## Phase 3: Payment Steps (Steps 9-11)

### 3.1 Step 9 — X402 Requirements (Hero: HTTP Protocol Flow)
- [ ] **Hero animation:** A request-response flow visualization showing the HTTP 402 handshake. Request arrow shoots across, 402 response bounces back with payment requirements materializing.
- [ ] Left terminal: HTTP request builds line by line (typed text effect)
- [ ] Arrow shoots from left to right (motion path with glow trail)
- [ ] Right terminal: 402 response appears with amber flash
- [ ] Payment requirements JSON unfolds from the 402 response (staggered field reveal)
- [ ] X402 V2 badge pulses with protocol explanation callouts
- [ ] Connection between terminals shows persistent dashed line (data channel)

### 3.2 Step 10 — X402 Streaming (Hero: Orbital Payment Arc)
- [ ] **Hero animation:** This is the centerpiece. A satellite in orbit with payment streams arcing between it and a ground station. Each payment pulse travels along the orbital arc with a glowing trail. A real-time counter tracks cumulative payments.
- [ ] Large orbital scene: Earth curvature at bottom (gradient arc), satellite in orbit, ground station below
- [ ] Payment arcs: glowing particles travel along Bézier curves from ground station to satellite
- [ ] Each pulse carries a micro-amount; the cumulative counter updates with spring animation
- [ ] Payment log: scrolling terminal showing each Payment-Signature header
- [ ] Stream status panel: elapsed time, rate/sec, total streamed, facilitator verification
- [ ] Particle density increases as streaming progresses (visual acceleration)
- [ ] Completion: final arc is brighter/larger, "STREAM COMPLETE" with celebration burst

### 3.3 Step 11 — Revenue Distribution (Hero: Revenue Waterfall)
- [ ] **Hero animation:** Revenue flows from the lease into a distribution tree, splitting proportionally to each token holder. Each branch carries its percentage with flowing particles.
- [ ] Top: single revenue source (lease revenue pool) with total amount
- [ ] Tree branches animate downward, splitting at each node
- [ ] Branch thickness proportional to ownership percentage (60/20/12/8)
- [ ] Revenue amounts flow along branches as glowing particles
- [ ] Bottom: token holder cards light up as revenue arrives
- [ ] Holder cards show: address, token balance, percentage, amount received
- [ ] Ownership bar chart animates from left with colored segments
- [ ] Total distributed counter tracks in real-time

---

## Phase 4: Summary & Polish (Step 12 + Global)

### 4.1 Step 12 — Protocol Summary (Hero: Mission Complete Dashboard)
- [ ] **Hero animation:** A mission control dashboard assembles itself with stat cards flying in from edges, transaction timeline drawing left-to-right, and system health indicators lighting up green one by one.
- [ ] 4 stat cards fly in from corners with spring physics
- [ ] Transaction timeline: horizontal line draws with nodes for each tx appearing sequentially
- [ ] System health: 6 indicators light up green with staggered timing
- [ ] Participants section: address cards with role labels slide in
- [ ] Final "MISSION COMPLETE" banner with particle celebration
- [ ] Optional: auto-cycle back to step 1 prompt after completion

### 4.2 Global Transitions & Polish
- [ ] Step-to-step transitions: current step fades/slides out, new step fades/slides in (AnimatePresence)
- [ ] Progress bar upgrade: orbital track style — a dot moves along an orbital path connecting 12 step nodes
- [ ] Demo controller upgrade: frosted glass panel with glow effects, speed indicator
- [ ] Sound design consideration: leave hooks for optional audio cues (not implemented, but architecture supports it)

### 4.3 Performance & Accessibility
- [ ] Respect `prefers-reduced-motion`: disable particle effects, use simple fades
- [ ] Canvas cleanup: proper requestAnimationFrame cancellation
- [ ] Lazy load heavy step components (dynamic imports per step)
- [ ] Test at 60fps on mid-range hardware
- [ ] Verify `npm run build` passes with no type errors

---

## Phase 5: Build Verification & Commit

### 5.1 Build & Test
- [ ] `cd frontend && npm run build` — passes
- [ ] `cd frontend && npm run dev` — all 12 steps render
- [ ] Manual verification: auto-play through all steps at 1x speed
- [ ] No console errors or warnings

### 5.2 Commit & Push
- [ ] Commit with descriptive message
- [ ] Push to both origin and space-markets

---

## Implementation Order

The phases are designed to be built incrementally:

1. **Phase 0** first — sets up infrastructure everything else depends on
2. **Phase 3.2** (Step 10) second — this is the centerpiece and most complex animation; building it early validates the approach
3. **Phase 1** (Steps 1-4) — infrastructure steps build up context
4. **Phase 2** (Steps 5-8) — marketplace steps are the narrative middle
5. **Phase 3.1, 3.3** (Steps 9, 11) — flanking the centerpiece
6. **Phase 4** (Step 12 + polish) — final assembly and global polish
7. **Phase 5** — verification and deployment

---

## File Impact Summary

**New files (~15):**
- `frontend/src/components/demo/animations/starfield.tsx`
- `frontend/src/components/demo/animations/glow-card.tsx`
- `frontend/src/components/demo/animations/count-up.tsx`
- `frontend/src/components/demo/animations/particle-burst.tsx`
- `frontend/src/components/demo/animations/typed-text.tsx`
- `frontend/src/lib/demo/motion-variants.ts`
- (Existing step files will be heavily modified, not replaced)

**Modified files (~20):**
- All 12 step components (complete visual rewrites)
- All 6 existing animation components (Framer Motion upgrades)
- `step-container.tsx` (AnimatePresence integration)
- `demo-controller.tsx` (visual upgrade)
- `progress-bar.tsx` (orbital track redesign)
- `globals.css` (new keyframes, space theme variables)
- `protocol-demo/page.tsx` (starfield wrapper)
- `protocol-demo/layout.tsx` (metadata updates)

**Dependencies:**
- `framer-motion` (new)
