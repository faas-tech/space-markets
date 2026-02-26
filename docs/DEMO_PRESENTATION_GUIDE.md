# Demo Presentation Guide

## 1. Overview

### What This Is

The Asset Leasing Protocol interactive demo is a 12-step guided walkthrough that demonstrates the complete protocol lifecycle: from deploying smart contracts, through asset tokenization and marketplace matching, to X402 V2 streaming payments and proportional revenue distribution. The demo runs entirely in the browser using pre-configured static data that mirrors production contract interactions on Base Sepolia.

### Accessing the Demo

- **URL:** `/protocol-demo` on the frontend application
- **Requirements:** Modern browser (Chrome, Firefox, Safari, Edge). No wallet connection required -- the demo uses static data.
- **Recommended display:** 1280x720 or larger. The layout is responsive but optimized for desktop presentation.

### Controls

**Playback buttons (on-screen toolbar):**

| Control | Action |
|---|---|
| Play / Pause | Toggle auto-play through all steps sequentially |
| Previous | Move to the previous step |
| Next | Advance to the next step |
| Speed | Cycle through playback speeds: 0.5x, 1x, 2x |
| Reset | Return to Step 1 and clear all progress |

**Keyboard shortcuts:**

| Key | Action |
|---|---|
| `Space` | Toggle play / pause |
| `Right Arrow` | Next step |
| `Left Arrow` | Previous step |
| `R` | Reset demo to Step 1 |
| `Home` | Jump to Step 1 |
| `End` | Jump to Step 12 |

**Playback speeds:**
- **0.5x** -- Slow. Good for technical deep dives where you want time to narrate each animation.
- **1x** -- Default. Balanced pacing for most presentations (total runtime approximately 56 seconds).
- **2x** -- Fast. Use for quick overviews or when re-running for a familiar audience.

**Step indicator:** The toolbar displays `N / 12` showing the current step and total count.

### Step Categories

Steps are color-coded into five categories:

| Category | Steps | Color |
|---|---|---|
| Infrastructure Setup | 1 | Purple |
| Asset Management | 2, 3, 4 | Blue |
| Marketplace | 5, 6, 7, 8 | Amber |
| X402 Payments | 9, 10, 11 | Green |
| Summary | 12 | Cyan |

---

## 2. Per-Step Speaker Notes

---

### Step 1: Deploy Contracts

**What is on screen:**
Five contract deployment cards appear sequentially, each showing a progress bar animating from 0% to 100%. As each contract completes, a green checkmark appears alongside the truncated proxy address. A side panel displays the deployer address (`0xf39Fd6...Fb92266`), the network (Base Sepolia, chain ID 84532), and the proxy pattern (UUPS). A block confirmation animation shows block #18,499,990.

The five contracts deployed are:
1. **AssetRegistry** (`0x5FbDB2...0aa3`) -- Manages asset types, metadata schemas, and ownership
2. **AssetERC20** (`0xe7f172...0512`) -- Fractional ownership tokens with ERC20Votes checkpoints
3. **LeaseFactory** (`0x9fE467...fa6e0`) -- Creates and manages lease NFTs with embedded terms
4. **Marketplace** (`0xCf7Ed3...0Fc9`) -- Offer/bid matching with EIP-712 signed orders
5. **MetadataStorage** (`0xDc64a1...6C9`) -- On-chain metadata validation and hash verification

**Key talking point:**
The entire protocol infrastructure deploys as five upgradeable proxy contracts. UUPS proxies mean the protocol can evolve without migrating state or breaking existing lease NFTs.

**Technical detail:**
All contracts use the UUPS (Universal Upgradeable Proxy Standard) pattern from OpenZeppelin. The deployer (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`) retains upgrade authority. Contracts target Solidity 0.8.30 and deploy to Base Sepolia (chain ID 84532), a Coinbase L2 testnet. Each contract emits events for all state changes to support off-chain indexing.

**Business value:**
Five contracts covering registration, tokenization, leasing, marketplace matching, and metadata verification -- that is the complete infrastructure for an asset leasing platform deployed in a single transaction batch. Upgradeability means the protocol can ship improvements without disrupting active leases.

**Transition:**
"Now that the infrastructure is live, let us define what kind of asset we are going to lease."

---

### Step 2: Create Asset Type

**What is on screen:**
A schema definition card titled "Orbital Compute Station" with category badge "Compute" and orbit badge "LEO". Five schema fields appear sequentially: `computeUnits` (uint256), `memoryGB` (uint256), `storageGB` (uint256), `bandwidthMbps` (uint256), and `altitude` (string). On the right panel, a keccak256 hash computation animation produces the type hash (`0x4a1b8c...0f1a2`). A confirmation card shows "Asset Type Registered" with Type ID 1. Block confirmation at #18,499,995.

**Key talking point:**
The protocol does not hard-code what an "asset" is. Asset types are defined by structured schemas, making the protocol adaptable to any asset class -- not just satellites.

**Technical detail:**
The schema fields are hashed with keccak256 to produce a type hash stored in AssetRegistry. This creates an immutable fingerprint for the asset type definition. The schema defines the metadata structure that all assets of this type must conform to. The target contract is AssetRegistry at `0x5FbDB2315678afecb367f032d93F642f64180aa3`.

**Business value:**
Schema-based asset types mean a single protocol instance can manage satellites, solar farms, spectrum licenses, data centers, and real estate. Each new vertical requires only a new schema definition, not new smart contracts.

**Transition:**
"With the asset type defined, let us register an actual asset and tokenize it."

---

### Step 3: Register Asset

**What is on screen:**
An asset card displays "OCS-Alpha-7" with metadata: 128 vCPU, 512 GB memory, 4,096 GB NVMe storage, 10,000 Mbps bandwidth, 550km altitude, and owner `0x70997970...dc79C8` (Lessor). Three phase cards animate in sequence: "Hash Metadata" (computes keccak256 of all fields), "Deploy ERC-20" (deploys OCS7 token with 1,000,000 supply), and "Link On-Chain" (associates asset, token, and metadata hash). Side panel shows the AssetRegistry and MetadataStorage addresses. Block confirmation at #18,500,000.

**Key talking point:**
Registration does three things at once: it hashes the metadata for provenance, deploys a fractional ownership token, and links everything on-chain. The asset is now both verifiable and investable.

**Technical detail:**
The metadata hash (`0x7f3a9b...2e3f4`) is stored in MetadataStorage for integrity verification. The ERC-20 token (symbol: OCS7, supply: 1,000,000) uses ERC20Votes from OpenZeppelin, enabling checkpointed balances for proportional revenue distribution. The AssetERC20 contract at `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` governs the token. Ownership is recorded in AssetRegistry, and the token contract address is linked to asset ID 1.

**Business value:**
Fractional ownership tokens let multiple investors hold portions of a single asset. A satellite worth millions can be divided into 1,000,000 fungible tokens, each representing a proportional claim on lease revenue. This unlocks institutional and retail participation in infrastructure assets.

**Transition:**
"Before anyone leases this asset, let us prove the metadata has not been tampered with."

---

### Step 4: Verify Metadata

**What is on screen:**
A verification table with columns: Field, Expected, On-Chain, and OK. Seven fields verify sequentially with green checkmarks: Asset Name (OCS-Alpha-7), Compute Units (128), Memory (512), Storage (4096), Bandwidth (10000), Altitude (550km), and Metadata Hash. Each row highlights green as verification passes. A progress bar fills from 0/7 to 7/7. A banner announces "Metadata Integrity Verified" once complete. Side panel shows the query target: MetadataStorage at `0xDc64a1...6C9`, method `getMetadata(uint256)`, call type `staticcall (view)`, block #18,500,001.

**Key talking point:**
Every piece of metadata submitted during registration can be independently verified against on-chain records. This is provenance by default -- no auditor required.

**Technical detail:**
This step performs a `staticcall` (read-only) to `MetadataStorage.getMetadata(1)` at block #18,500,001. Each field returned by the contract is compared against the expected values. The metadata hash provides cryptographic proof that the complete metadata payload has not been altered since registration. This is a view call with zero gas cost.

**Business value:**
For regulated asset classes, on-chain provenance eliminates "he said, she said" disputes. Auditors, regulators, and counterparties can independently verify asset specifications without trusting any single party. This is the foundation of institutional-grade tokenization.

**Transition:**
"The asset is verified and tokenized. Now the lessor can post it on the marketplace."

---

### Step 5: Create Lease Offer

**What is on screen:**
A lease offer card with an "ACTIVE" badge animates from DRAFT to SUBMITTING to ACTIVE. The card header shows "Lease Offer" for OCS-Alpha-7 with a total cost of 1,000.00 USDC. A terms grid displays: Rate/Second (0.000386 USDC), Rate/Hour (1.39 USDC), Rate/Day (33.33 USDC), Duration (30 days), Escrow Required (200.00 USDC), and Currency (USDC on Base Sepolia). The footer shows the Lessor address (`0x70997970...dc79C8`), Marketplace address (`0xCf7Ed3...0Fc9`), and USDC token address (`0x833589...02913`). Side panel shows Lease ID #1, Asset ID #1, Start Block #18,500,000, End Block #18,716,800. Block confirmation at #18,500,010.

**Key talking point:**
The lessor posts a lease offer with transparent terms: per-second pricing, duration, and escrow requirements. Everything is on-chain, visible to all potential lessees.

**Technical detail:**
The lease offer is submitted to the Marketplace contract at `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9`. Terms include a per-second rate of 0.000386 USDC (approximately $33.33/day for 30 days totaling $1,000). The escrow requirement (200.00 USDC) is 20% of the total lease cost. Payment is denominated in USDC at `0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913`. The lease spans blocks 18,500,000 to 18,716,800.

**Business value:**
Per-second pricing is the key differentiator. Instead of monthly invoices and billing infrastructure, leasing becomes metered access -- like a utility. The escrow requirement protects the lessor without locking the entire lease cost upfront, lowering the barrier to entry.

**Transition:**
"An offer is live. Let us see how a potential lessee places a bid."

---

### Step 6: Lessee Bids

**What is on screen:**
Left panel shows an EIP-712 Typed Data card with two sections. The Domain Separator contains: name "SpaceMarkets", version "1", chainId "84532", and verifyingContract (Marketplace address `0xCf7Ed3...0Fc9`). The Message Fields list seven key-value pairs: leaseId (1), assetId (1), bidder (`0x3C44Cd...93BC`), ratePerSecond (0.000386 USDC), duration (30 days), escrowAmount (200.00 USDC), paymentToken (USDC address). Right panel shows an EIP-712 Digest computation animation producing the bid signature hash (`0x8d9e0f...c8d9`), a wallet signing indicator that transitions from "Signing with wallet..." to "Signature confirmed", and an escrow deposit card showing 200.00 USDC locked in the Marketplace contract. Block confirmation at #18,500,015.

**Key talking point:**
The lessee bids using EIP-712 typed data signatures. This means the bid is cryptographically signed off-chain -- no gas fees for the bidder. The escrow deposit is the only on-chain transaction.

**Technical detail:**
EIP-712 provides human-readable signature prompts in wallet UIs -- the lessee sees structured fields, not an opaque hex blob. The domain separator binds the signature to the SpaceMarkets domain on chain ID 84532, preventing cross-chain replay attacks. The bidder (`0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`) signs the typed data to produce the bid signature hash. The 200 USDC escrow is transferred to the Marketplace contract and held until lease acceptance or rejection.

**Business value:**
Gasless bidding via EIP-712 means potential lessees can submit bids without holding ETH for gas. This dramatically lowers friction for enterprise users who may not have native token balances. The escrow mechanism provides economic commitment without full upfront payment.

**Transition:**
"The bid is in. Now the lessor reviews all bids and selects a winner."

---

### Step 7: Lessor Accepts

**What is on screen:**
Left panel displays an "Active Bids" list with three bids. Bid #1 from `0x3C44Cd...93BC` at 33.33 USDC/day (200.00 escrow), Bid #2 from `0x90F79b...3906` at 30.00 USDC/day (180.00 escrow), Bid #3 from `0x15d34A...6A65` at 35.00 USDC/day (210.00 escrow). The animation progresses through reviewing, selecting (Bid #1 highlights with blue border, others fade), signing, and accepted phases. A "Winner Selected" badge appears on Bid #1. Right panel shows an "Accept Digest" computation with fields: leaseId (1), bidder (Lessee address), bidHash (from Step 6), and lessor (Lessor address), producing the accept signature hash (`0x1a2b3c...0f1a2`). An acceptance status card confirms "Bid Accepted" with text "Both signatures collected, proceeding to NFT mint." Block confirmation at #18,500,020.

**Key talking point:**
The lessor provides a counter-signature, creating a dual-signed agreement. Both parties have cryptographically committed to the lease terms before anything is minted on-chain.

**Technical detail:**
The counter-signature digest includes the original bid hash, creating an unbreakable chain of signatures: the lessee signed the bid, and the lessor signed over the bid hash plus their own address. This dual-signature pattern (bid + accept) is verified on-chain by the Marketplace contract before forwarding to LeaseFactory. The accept signature hash (`0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2`) references the bid signature hash from Step 6.

**Business value:**
Dual-signature acceptance eliminates disputes about whether terms were agreed upon. The cryptographic proof of mutual consent exists permanently on-chain. In regulated industries, this is equivalent to a digitally-signed contract with non-repudiation guarantees.

**Transition:**
"Both parties have agreed. The protocol now mints an NFT that represents the active lease."

---

### Step 8: Mint Lease NFT

**What is on screen:**
Left area displays a stylized NFT card (256x288px) with a gradient background, "Lease NFT" header, token ID "#1", an animated circular icon, asset name "OCS-Alpha-7", and duration "30 days". The card glows blue when minting completes. Beside the NFT card, an "Embedded Lease Terms" table shows eight attributes: Lease ID (#1), Asset (OCS-Alpha-7), Lessor (`0x70997970...dc79C8`), Lessee (`0x3C44Cd...93BC`), Rate/Day (33.33 USDC), Duration (30 days), Terms Hash (`0x2c3d4e...1b2c3`), and Start Block (#18,500,000). A success banner reads "NFT Minted Successfully -- Token ID #1." Side panel shows NFT Details: Token ID #1, Contract (`0x9fE467...fa6e0`), Owner (`0x3C44Cd...93BC`), Standard ERC-721. Block confirmation at #18,500,021.

**Key talking point:**
The lease is now an NFT. It is not just a receipt -- all terms are embedded in the token metadata. The lessee holds it, and it serves as the access credential for X402 payments.

**Technical detail:**
LeaseFactory (`0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`) mints an ERC-721 token (ID #1) to the lessee at `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`. The token metadata embeds the lease terms hash (`0x2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3`), linking the NFT to the exact terms both parties signed. The NFT is transferable, meaning lease rights can be sold on secondary markets.

**Business value:**
Lease-as-NFT creates a secondary market for access rights. A lessee who no longer needs satellite compute capacity can sell the lease NFT, transferring all remaining access time to a new party. This adds liquidity to infrastructure access -- a first for most physical asset classes.

**Transition:**
"The lease is active and the lessee holds the NFT. Now let us see how they actually pay for access -- using the X402 protocol."

---

### Step 9: X402 Requirements

**What is on screen:**
Left panel shows an HTTP request/response flow. A GET request to `/v1/leases/1/access` at `api.spacemarkets.io` with Authorization and Accept headers. An arrow points down to a 402 Payment Required response with the `Payment-Required` header highlighted in amber. The response carries an "X402 V2" badge. Right panel displays the parsed Payment Requirements JSON:
```json
{
  "x402Version": 2,
  "accepts": [{
    "scheme": "exact",
    "network": "eip155:84532",
    "maxAmountRequired": "1000000",
    "resource": "https://api.spacemarkets.io/v1/leases/1/access",
    "payTo": "0xCf7Ed3...0Fc9",
    "requiredDeadlineSeconds": 300,
    "description": "Orbital Compute Station OCS-Alpha-7 streaming access"
  }]
}
```
Below the JSON, an "X402 V2 Protocol" card lists four headers: Payment-Required (response, 402), Payment-Signature (request, signed), Payment-Response (success, 200), and paymentPayload (body field, V2).

**Key talking point:**
This is HTTP 402 -- the "Payment Required" status code that has existed since 1999 but was never standardized until now. The server tells the client exactly what payment is needed, in machine-readable JSON.

**Technical detail:**
The X402 V2 protocol uses CAIP-2 chain identifiers (`eip155:84532` for Base Sepolia). The payment requirements specify the `exact` payment scheme, meaning the client must pay the precise amount. The `maxAmountRequired` is 1,000,000 (in USDC's 6-decimal precision, equal to 1.00 USDC). The facilitator at `0x2a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b` verifies payment signatures before granting access. V2 uses the `Payment-Signature` header (replacing V1's `X-PAYMENT` header) and the `paymentPayload` body field. The deadline of 300 seconds prevents stale payment signatures.

**Business value:**
X402 eliminates the need for billing infrastructure. There is no Stripe integration, no invoicing system, no accounts receivable. The payment requirement is embedded in the HTTP response itself. Any HTTP client that supports X402 can pay for access automatically. This is native web monetization for machine-to-machine commerce.

**Transition:**
"The client knows what to pay. Now watch the payments stream in real time."

---

### Step 10: X402 Streaming

**What is on screen:**
Left area (desktop) shows an orbital animation with a central counter displaying the running USDC total (incrementing from 0.0000). On mobile, a large counter card shows the same total. Below, a Payment Pulse animation shows flowing payment indicators. A "Payment-Signature Headers" log displays the last five payment entries, each showing `t=Ns`, `Payment-Signature: 0x...`, and `+0.000386` USDC. The log updates every 0.8 seconds, simulating 8 seconds of streaming before completing. Right side panel shows Stream Status (STREAMING / COMPLETE), Rate (0.000386 USDC/sec), Total Streamed (incrementing value), and Elapsed (seconds counter). A Participants card lists: Payer/Lessee (`0x3C44Cd...93BC`), Receiver/Lessor (`0x70997970...dc79C8`), Facilitator (`0x2a2b3c...9a0b`), Network (`eip155:84532`). A Facilitator Verification card with a pulsing green indicator confirms real-time verification by the Coinbase facilitator.

**Key talking point:**
Every second, the lessee pays 0.000386 USDC to the lessor. These are real USDC micropayments, verified by the Coinbase facilitator, streaming at the speed of HTTP requests. If the lessee stops paying, access stops immediately.

**Technical detail:**
Each streaming interval generates a new `Payment-Signature` header containing a signed payment authorization. The rate is 0.000386 USDC per second (derived from the lease terms: 1,000 USDC / 30 days / 86,400 seconds). The Coinbase facilitator at `0x2a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b` verifies each signature, settles the payment on-chain, and returns a success response. The demo simulates 8 seconds of streaming at 800ms intervals. Payments are settled on Base Sepolia (`eip155:84532`), and each payment event is recorded in the off-chain database with lease ID, amount, mode, and facilitator transaction hash.

**Business value:**
Streaming payments transform asset leasing from a contract-based relationship to a utility-based one. Revenue is continuous -- token holders see yield accumulating in real time, not in monthly lump sums. For the lessee, pay-as-you-go means they only pay for what they use. If they cancel mid-lease, they stop paying instantly. This is the economics of cloud computing applied to physical infrastructure.

**Transition:**
"Payments are flowing. Let us see how that revenue reaches the token holders."

---

### Step 11: Revenue Distribution

**What is on screen:**
A "Revenue Distribution" table shows four OCS7 token holders with columns: Holder, Balance, Share, Revenue, and Status. Holders appear sequentially:
1. **Lessor (Primary)** -- `0x70997970...dc79C8` -- 600,000 tokens -- 60% -- 600.00 USDC -- PAID
2. **Investor A** -- `0x90F79b...3906` -- 200,000 tokens -- 20% -- 200.00 USDC -- PAID
3. **Investor B** -- `0x15d34A...6A65` -- 120,000 tokens -- 12% -- 120.00 USDC -- PAID
4. **Investor C** -- `0x9965507D...A4dc` -- 80,000 tokens -- 8% -- 80.00 USDC -- PAID

Below, a colored bar chart visualizes ownership distribution (60/20/12/8). A data stream animation runs during the distribution phase. Side panel shows: Total Revenue (1,000.00 USDC), Distributed (incrementing to 1,000.00), Token (OCS7, 1,000,000 total), Method (ERC20Votes Proportional), Contract (Marketplace at `0xCf7Ed3...0Fc9`). A progress bar shows distribution completion (0/4 to 4/4).

**Key talking point:**
Revenue is distributed proportionally to all token holders based on their ERC20Votes balance. Hold 20% of the tokens, receive 20% of the revenue. Fully automated, fully transparent.

**Technical detail:**
Distribution uses ERC20Votes checkpointed balances to determine each holder's share at a specific block height. This prevents manipulation via last-minute transfers. The Marketplace contract at `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` handles the distribution. Revenue (1,000.00 USDC) is split proportionally: 600.00 to the primary lessor (60%), 200.00 to Investor A (20%), 120.00 to Investor B (12%), and 80.00 to Investor C (8%). The `vm.roll(block.number + 1)` pattern is critical -- blocks must advance after transfers for checkpoints to register.

**Business value:**
Automated proportional revenue distribution is the yield mechanism that makes tokenized infrastructure an investable asset class. Investors buy OCS7 tokens and receive USDC yield proportional to their holdings. No fund managers, no distribution calculations, no payment processors. The smart contract handles everything. This is programmable yield for real-world assets.

**Transition:**
"Let us bring it all together and review the complete audit trail."

---

### Step 12: Protocol Summary

**What is on screen:**
A dashboard view that reveals in five animated sections:

**Top stats row:** Four metric cards -- Contracts Deployed (5), Transactions (10), Revenue Distributed (1,000 USDC), Lease NFT (#1).

**Deployed Contracts:** A list of all five contracts with green status indicators and truncated addresses.

**Transaction Log:** Nine transactions with labels, truncated hashes, and block numbers: Deploy Contracts (#18,499,990), Create Asset Type (#18,499,995), Register Asset (#18,500,000), Lease Offer (#18,500,010), Lessee Bid (#18,500,015), Lessor Accept (#18,500,020), Mint NFT (#18,500,021), X402 Payments (#18,500,025), Revenue Distribution (#18,500,100).

**Participants:** Four addresses -- Deployer, Lessor, Lessee, Facilitator.

**System Health:** Six green indicators -- Smart Contracts (Operational), Asset Registry (1 type, 1 asset), Active Leases (1 active), X402 Payments (Streaming), Revenue Pipeline (Distributed), Metadata Integrity (Verified).

A final message reads: "Protocol Demo Complete -- The Asset Leasing Protocol has been demonstrated end-to-end: from contract deployment, through asset tokenization and marketplace matching, to X402 V2 streaming payments and proportional revenue distribution."

**Key talking point:**
Every action in this demo produced an auditable on-chain record. Five contracts, ten transactions, one NFT, 1,000 USDC distributed -- all verifiable on Base Sepolia right now.

**Technical detail:**
The summary aggregates data from all prior steps: 5 UUPS proxy contracts, 10 on-chain transactions spanning blocks 18,499,990 to 18,500,100, one ERC-721 lease NFT, and 1,000 USDC in revenue distribution via ERC20Votes proportional claims. The system health checks confirm the entire protocol stack is operational. All transaction hashes are verifiable on the Base Sepolia block explorer.

**Business value:**
This is the complete audit trail that regulators, investors, and auditors need. Every contract deployment, every asset registration, every lease agreement, every payment, and every revenue distribution is permanently recorded on-chain. This is not a prototype -- it is production-ready architecture running on a Coinbase L2 testnet, one configuration change away from mainnet.

**Transition:**
(Final step -- no transition needed. This is your closing moment.)
"What you have just seen is tokenized infrastructure leasing, from registration to revenue, running natively on the web with zero billing integration. Thank you."

---

## 3. Audience-Specific Presentation Flows

---

### Investor Pitch (3-5 minutes)

**Mode:** Auto-play at 1x speed, pause on key steps.

**Recommended flow:**

| Step | Duration | Action |
|---|---|---|
| 1 -- Deploy Contracts | 5 seconds | Let auto-play run. Brief mention: "Five smart contracts, one deployment." |
| 2 -- Create Asset Type | Skip quickly | Advance manually. "Asset types are flexible -- not hard-coded." |
| 3 -- Register Asset | 10 seconds | **Pause.** Highlight: "This creates a fractional ownership token -- OCS7 -- with 1,000,000 units. That is how multiple investors participate." |
| 4 -- Verify Metadata | Skip quickly | Advance manually. "On-chain provenance, verifiable by anyone." |
| 5 -- Create Lease Offer | 10 seconds | **Pause.** Highlight the numbers: "$33.33/day, $1,000 total over 30 days, 200 USDC escrow." |
| 6 -- Lessee Bids | Skip quickly | Advance manually. "Gasless bidding -- the lessee signs with their wallet, no ETH needed." |
| 7 -- Lessor Accepts | Skip quickly | Advance manually. "Dual-signature agreement, cryptographic proof of consent." |
| 8 -- Mint Lease NFT | 5 seconds | Brief mention: "The lease is now a transferable NFT. Secondary market for access rights." |
| 9 -- X402 Requirements | 5 seconds | Brief mention: "HTTP 402 -- the payment protocol the web never had." |
| 10 -- X402 Streaming | 15 seconds | **Pause.** Let the streaming animation run. "Watch the payments flow: $0.000386 every second, verified by Coinbase." |
| 11 -- Revenue Distribution | 15 seconds | **Pause.** "Revenue hits token holders proportionally. 60% to the primary owner, the rest to investors. Automated yield." |
| 12 -- Summary | 10 seconds | **Pause.** Deliver closing. |

**Key metrics to highlight:**
- 1,000,000 fractional tokens per asset
- $0.000386/second streaming rate
- 200 USDC escrow (20% of lease value)
- 1,000 USDC total revenue distributed
- 4 token holders receiving proportional yield (60/20/12/8 split)

**Closing message:**
"This is tokenized infrastructure as an investable asset class. Fractional ownership with automated, on-chain yield distribution. The protocol is asset-agnostic -- satellites today, solar farms and data centers tomorrow. We are building the financial rails for real-world asset leasing."

---

### Technical Deep Dive (8-10 minutes)

**Mode:** Manual stepping (do not use auto-play). Use 0.5x speed if you briefly enable auto-play for streaming animations.

**Recommended flow:**

**Step 1 -- Deploy Contracts (30 seconds):**
- Discuss UUPS proxy pattern and upgradeability guarantees.
- Point out that each contract has a distinct proxy address.
- Mention Solidity 0.8.30, OpenZeppelin upgradeable libraries.

**Step 2 -- Create Asset Type (45 seconds):**
- Walk through the schema fields and their Solidity types.
- Explain the keccak256 type hash computation.
- Discuss how schema hashes create an immutable registry of asset type definitions.

**Step 3 -- Register Asset (60 seconds):**
- Explain the three-phase process: hash metadata, deploy ERC-20, link on-chain.
- Highlight ERC20Votes integration -- why checkpointed balances matter for revenue distribution.
- Discuss the 1,000,000 token supply and the OCS7 symbol.
- Note MetadataStorage as a separate contract for modular integrity verification.

**Step 4 -- Verify Metadata (45 seconds):**
- Emphasize this is a `staticcall` (view function) -- zero gas cost.
- Discuss the comparison pattern: expected vs. on-chain values.
- Explain why hash-based verification is more robust than storing full metadata on-chain (gas efficiency).

**Step 5 -- Create Lease Offer (30 seconds):**
- Point out per-second rate granularity (0.000386 USDC/sec).
- Discuss the escrow mechanism and its relationship to the Marketplace contract.
- Note the USDC contract address on Base Sepolia.

**Step 6 -- Lessee Bids (90 seconds):**
- **Deep dive on EIP-712:** Walk through the Domain Separator fields (name, version, chainId, verifyingContract).
- Explain why the Domain Separator prevents cross-chain replay attacks.
- Show the seven Message Fields and how they map to the LeaseBid struct.
- Discuss the digest computation and wallet signing UX.
- Explain gasless bidding: the only on-chain transaction is the USDC escrow deposit.

**Step 7 -- Lessor Accepts (60 seconds):**
- **Deep dive on counter-signatures:** The accept digest includes the original bidHash.
- Explain the signature chain: bidder signs terms, lessor signs over (terms + bidHash).
- Discuss the three-bid scenario and bid selection criteria.
- Note that the Marketplace contract verifies both signatures before calling LeaseFactory.

**Step 8 -- Mint Lease NFT (45 seconds):**
- Discuss ERC-721 with embedded lease terms in metadata.
- Explain the terms hash linkage between the NFT and the signed agreements.
- Mention transferability and secondary market implications.
- Note that LeaseFactory is the minting contract, not the Marketplace.

**Step 9 -- X402 Requirements (90 seconds):**
- **Deep dive on X402 V2 protocol:** Walk through the JSON structure.
- Explain CAIP-2 chain identifiers (`eip155:84532`).
- Discuss the four X402 headers: Payment-Required, Payment-Signature, Payment-Response, paymentPayload.
- Contrast V2 with V1: `Payment-Signature` header replaces `X-PAYMENT`, `paymentPayload` body field is new.
- Explain the facilitator role (Coinbase) and the `requiredDeadlineSeconds` of 300.
- Discuss backward compatibility: the server also accepts the legacy `X-PAYMENT` header.

**Step 10 -- X402 Streaming (90 seconds):**
- **Deep dive on streaming mechanics:** Each interval generates a new Payment-Signature.
- Discuss the payment rate derivation: 1,000 USDC / 30 days / 86,400 seconds = 0.000386 USDC/sec.
- Explain facilitator verification: signature validation, on-chain settlement, success response.
- Discuss the three participants: Payer (Lessee), Receiver (Lessor), Facilitator.
- Mention that each payment event is stored in the off-chain database for reconciliation.
- Note the `@coinbase/x402` package version ^2.1.0.

**Step 11 -- Revenue Distribution (60 seconds):**
- Explain ERC20Votes checkpointing: why blocks must advance after transfers.
- Walk through the four-holder distribution with exact amounts.
- Discuss the Marketplace contract's revenue claim mechanism.
- Note that the distribution is permissionless -- anyone can trigger it.

**Step 12 -- Summary (60 seconds):**
- Review the complete transaction log.
- Discuss event-driven architecture and off-chain indexing.
- Architecture Q&A: database strategy (MockDatabase to PostgreSQL), scaling approach, deployment targets.

**Architecture discussion points at each step:**
- Proxy upgradeability governance (Step 1)
- Schema extensibility and type registry design (Step 2)
- ERC20Votes vs. standard ERC-20 tradeoffs (Step 3)
- On-chain vs. off-chain metadata storage tradeoffs (Step 4)
- Escrow mechanics and dispute resolution (Step 5)
- EIP-712 structured data signing security model (Steps 6-7)
- NFT metadata standards and secondary markets (Step 8)
- HTTP 402 standardization and CAIP-2 interoperability (Step 9)
- Streaming payment finality and settlement guarantees (Step 10)
- Checkpoint-based distribution fairness (Step 11)
- Full system observability and audit trail (Step 12)

---

### Sales / BD Demo (5 minutes)

**Mode:** Auto-play at 1x speed. Let it run continuously, narrating over the animations.

**Narrative script:**

**Steps 1-2 (10 seconds):**
"Watch as the protocol deploys five smart contracts and registers an asset type -- an Orbital Compute Station. This is the infrastructure setup, and it takes seconds."

**Step 3 (8 seconds):**
"Now we are registering a specific satellite -- OCS-Alpha-7 -- with 128 vCPU cores, 512 GB of memory, and 4 TB of storage. The protocol creates a fractional ownership token automatically."

**Step 4 (6 seconds):**
"Every piece of metadata is verified against on-chain records. Green checkmarks across the board -- provenance by default."

**Steps 5-7 (20 seconds):**
"Here is the marketplace in action. The satellite operator posts a lease offer -- $33 a day for compute access. A data buyer places a bid, signs with their wallet, and deposits escrow. The operator selects the winning bid and counter-signs. All of this happens with cryptographic signatures -- no paperwork, no lawyers."

**Step 8 (8 seconds):**
"The agreement is now an NFT. The data buyer holds it as proof of their lease rights. They could even sell it on a secondary market if they no longer need the capacity."

**Steps 9-10 (25 seconds):**
"This is the breakthrough: X402 streaming payments. Watch the USDC flow in real time -- $0.000386 every second, from the data buyer to the satellite operator, verified by Coinbase. No Stripe, no invoicing, no billing integration. It is native to the web."

**Step 11 (15 seconds):**
"Revenue flows automatically to all token holders. The primary operator gets 60%, investors get their proportional share. Automated yield distribution."

**Step 12 (10 seconds):**
"Complete audit trail. Five contracts, ten transactions, one NFT, $1,000 distributed. Every action verifiable on-chain."

**Emphasis points:**
- Ease of setup: "Seconds to deploy, minutes to complete a lease cycle."
- Automated payments: "Zero billing integration -- the protocol handles everything."
- No billing complexity: "No invoices, no accounts receivable, no payment disputes."
- Asset class flexibility: "This demo shows a satellite, but the same protocol works for solar farms, data centers, spectrum licenses, and real estate."

**Closing:**
"What you just saw works for any asset class. Swap 'satellite' for 'solar farm' or 'data center' and the protocol mechanics are identical. We have built the financial rails for real-world asset leasing. Want to discuss how this applies to your vertical?"

---

## 4. Asset Class Adaptability

The Asset Leasing Protocol is asset-agnostic by design. The same five contracts, the same marketplace mechanics, and the same X402 streaming payments apply to any asset class. Below are four additional verticals with guidance on how the demo narrative adapts.

---

### Renewable Energy: Solar Farm

| Demo Element | Satellite Narrative | Solar Farm Narrative |
|---|---|---|
| Asset Type (Step 2) | Orbital Compute Station (vCPU, memory, bandwidth) | Solar Generation Array (peak kW, panel count, inverter capacity, grid connection) |
| Asset Instance (Step 3) | OCS-Alpha-7, 128 vCPU, 550km altitude | SGA-Delta-3, 500 kW peak, 1,200 panels, Sacramento CA |
| Token Symbol (Step 3) | OCS7 | SGA3 |
| Lease Terms (Step 5) | $33.33/day for compute access | $28.00/day for energy offtake rights |
| Streaming Unit (Step 10) | Per-second compute access | Per-kWh energy delivery |
| Revenue Story (Step 11) | Investors earn yield from compute leasing | Investors earn yield from power purchase agreements |

**What changes:** Schema fields, asset name, rate description, unit of measure.
**What stays the same:** All contract mechanics, EIP-712 signatures, X402 payment flow, NFT lease representation, ERC20Votes revenue distribution.

---

### Spectrum Rights: Wireless Spectrum License

| Demo Element | Satellite Narrative | Spectrum Narrative |
|---|---|---|
| Asset Type (Step 2) | Orbital Compute Station | Spectrum License Band (frequency range, bandwidth MHz, region, license expiry) |
| Asset Instance (Step 3) | OCS-Alpha-7 | BAND-C42, 3.5 GHz, 100 MHz bandwidth, Pacific Northwest |
| Token Symbol (Step 3) | OCS7 | BC42 |
| Lease Terms (Step 5) | $33.33/day for 30 days | $50.00/day for 90 days |
| Streaming Unit (Step 10) | Per-second compute access | Per-minute spectrum access |
| Revenue Story (Step 11) | Compute leasing yield | Spectrum sublicensing yield |

**What changes:** Asset metadata schema, lease duration and pricing, unit of access.
**What stays the same:** All protocol mechanics, signature flows, payment streaming, revenue distribution.

---

### Compute Capacity: Data Center

| Demo Element | Satellite Narrative | Data Center Narrative |
|---|---|---|
| Asset Type (Step 2) | Orbital Compute Station (space-based) | Bare Metal Rack (cores, RAM, NVMe, network Gbps, location, tier) |
| Asset Instance (Step 3) | OCS-Alpha-7, 550km altitude | RACK-US-E7, 256 cores, 2 TB RAM, Ashburn VA, Tier IV |
| Token Symbol (Step 3) | OCS7 | RUE7 |
| Lease Terms (Step 5) | $33.33/day | $120.00/day |
| Streaming Unit (Step 10) | Per-second compute access | Per-second compute access |
| Revenue Story (Step 11) | Orbital compute yield | Colocation compute yield |

**What changes:** Asset metadata, pricing tier, geographic specifics.
**What stays the same:** Everything. The compute leasing narrative is nearly identical to the satellite demo -- this is the closest vertical analogy.

---

### Real Estate: Commercial Property

| Demo Element | Satellite Narrative | Real Estate Narrative |
|---|---|---|
| Asset Type (Step 2) | Orbital Compute Station | Commercial Property (sq ft, floors, zoning, year built, location) |
| Asset Instance (Step 3) | OCS-Alpha-7 | PROP-NYC-42, 50,000 sq ft, 12 floors, Manhattan |
| Token Symbol (Step 3) | OCS7 | P42 |
| Lease Terms (Step 5) | $33.33/day, 30-day lease | $2,740/day, 365-day lease |
| Streaming Unit (Step 10) | Per-second micropayments | Monthly automated lease payments |
| Revenue Story (Step 11) | Compute leasing yield | Rental income yield |

**What changes:** Schema fields, pricing scale, payment frequency (monthly rather than per-second for real estate), lease duration.
**What stays the same:** Tokenization, marketplace bidding, EIP-712 signatures, NFT lease representation, proportional revenue distribution. For real estate, the X402 streaming interval would be adjusted from per-second to per-day or per-month.

---

## 5. FAQ / Objection Handling

---

### "Is this on mainnet?"

**Answer:** The demo runs against Base Sepolia, which is the testnet for Coinbase's Base L2. The architecture is production-ready -- the same contracts, the same X402 integration, the same payment flow. Moving to mainnet requires deploying the contracts to Base mainnet and configuring the Coinbase X402 facilitator with production credentials. No code changes are needed in the smart contracts.

---

### "How does the payment work?"

**Answer:** The protocol uses X402 V2, an HTTP-native payment protocol. When a client requests a paid resource, the server responds with HTTP 402 (Payment Required) and a JSON payload describing what payment is needed. The client signs a USDC payment authorization and includes it in the `Payment-Signature` header on the next request. The Coinbase facilitator verifies the signature, settles the USDC transfer on Base, and the server grants access. For streaming access, this happens every interval (per-second in our demo). Payments are in USDC stablecoin, so there is no cryptocurrency price volatility.

---

### "What about gas fees?"

**Answer:** Gas fees are minimized in three ways. First, lessee bidding uses EIP-712 off-chain signatures -- the bid itself costs zero gas. Only the escrow deposit requires a transaction. Second, the X402 facilitator (Coinbase) handles payment settlement, absorbing gas costs as part of their facilitator service. Third, the protocol runs on Base, a Coinbase L2 where gas fees are orders of magnitude lower than Ethereum mainnet (typically under $0.01 per transaction).

---

### "Can this scale?"

**Answer:** Yes, by design. The on-chain layer is deliberately thin -- contracts store hashes and references, not full documents. Heavy lifting happens off-chain: the API server handles request routing, the database stores metadata and payment records, and the event processor indexes blockchain events. The off-chain stack (currently using MockDatabase and in-memory cache) is designed for drop-in replacement with PostgreSQL and Redis. The event-driven architecture supports horizontal scaling of API servers behind a load balancer. Base L2 provides high throughput (hundreds of transactions per second) at low cost.

---

### "What makes this different from existing leasing platforms?"

**Answer:** Three things. First, **native web payments via HTTP 402** -- no Stripe, no billing integration, no invoicing system. Payment is embedded in the HTTP protocol itself, making it suitable for machine-to-machine commerce. Second, **fractional ownership with automated yield** -- any asset can be tokenized into fungible shares, and revenue is distributed proportionally via smart contracts with zero human intervention. Third, **asset-class agnosticism** -- the same protocol handles satellites, solar farms, spectrum licenses, data centers, and real estate. Define a new schema and you have a new vertical.

---

### "How are disputes handled?"

**Answer:** The protocol reduces dispute surface through cryptographic guarantees. Lease terms are embedded in the NFT metadata with a hash linking to the exact signed agreement. Both parties signed with EIP-712 -- there is no ambiguity about what was agreed. Escrow protects the lessor against non-payment. X402 streaming provides real-time enforcement: if the lessee stops paying, access stops immediately. For disputes outside the protocol scope (e.g., quality of service), the architecture supports integration with arbitration mechanisms, but the on-chain record of all terms and payments provides an unambiguous factual basis.

---

### "What blockchain is this on and why?"

**Answer:** Base, a Coinbase L2 built on the OP Stack. Base was chosen for three reasons: (1) native X402 facilitator support from Coinbase, (2) low gas costs (sub-cent transactions), and (3) institutional credibility -- Coinbase is a publicly-traded, regulated entity. The protocol is EVM-compatible and could deploy to any EVM chain, but Base provides the best combination of X402 support and transaction economics.

---

### "What happens if the facilitator goes down?"

**Answer:** The lease NFT and all on-chain state remain intact regardless of facilitator availability. The facilitator is only involved in the streaming payment verification layer. If the facilitator is temporarily unavailable, streaming payments pause but the lease agreement persists on-chain. The architecture supports facilitator failover -- any compliant X402 facilitator can be substituted. The escrow mechanism provides a financial buffer during any interruption.

---

### "How much does it cost to run this protocol?"

**Answer:** Contract deployment on Base costs approximately $5-10 in gas. Individual transactions (registrations, bids, mints) cost under $0.01 each. The X402 facilitator takes a small fee per payment verification (set by the facilitator). The off-chain infrastructure (API server, database, event processor) has standard cloud hosting costs. Total operational cost for a production deployment is comparable to running a standard web application, with the added benefit of zero billing/invoicing infrastructure.
