export interface StepConfig {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  duration: number; // base duration in ms
  icon: string; // emoji-free icon identifier
  category: 'setup' | 'asset' | 'market' | 'x402' | 'summary';
}

export const STEP_CONFIGS: StepConfig[] = [
  {
    id: 1,
    title: 'Deploy Contracts',
    subtitle: 'Infrastructure',
    description: '1. Deploy five upgradable contracts to the blockchain.\n2. Connect the asset to the marketplace.',
    duration: 6000,
    icon: 'deploy',
    category: 'setup',
  },
  {
    id: 2,
    title: 'Create Asset Type',
    subtitle: 'Schema Definition',
    description: 'Define the "Orbital Compute Station" asset type with a structured metadata schema, producing a keccak256 type hash.',
    duration: 4000,
    icon: 'schema',
    category: 'asset',
  },
  {
    id: 3,
    title: 'Register Asset',
    subtitle: 'Tokenization',
    description: 'Register OCS-Alpha-7 with metadata hashing, deploy a fractional ERC-20 token, and link ownership on-chain.',
    duration: 5000,
    icon: 'register',
    category: 'asset',
  },
  {
    id: 4,
    title: 'Verify Metadata',
    subtitle: 'On-Chain Query',
    description: 'Query the MetadataStorage contract to verify all fields match the original submission. Green checkmarks confirm integrity.',
    duration: 3500,
    icon: 'verify',
    category: 'asset',
  },
  {
    id: 5,
    title: 'Create Lease Offer',
    subtitle: 'Marketplace Listing',
    description: 'The lessor creates a lease offer on the Marketplace with defined terms: rate, duration, escrow requirements.',
    duration: 4000,
    icon: 'offer',
    category: 'market',
  },
  {
    id: 6,
    title: 'Lessee Bids',
    subtitle: 'EIP-712 Signature',
    description: 'A lessee constructs an EIP-712 typed data bid, signs it with their wallet, and submits with USDC escrow.',
    duration: 5000,
    icon: 'bid',
    category: 'market',
  },
  {
    id: 7,
    title: 'Lessor Accepts',
    subtitle: 'Counter-Signature',
    description: 'The lessor reviews bids, selects the winner, and provides a counter-signature to finalize the agreement.',
    duration: 4500,
    icon: 'accept',
    category: 'market',
  },
  {
    id: 8,
    title: 'Mint Cryptographic Lease',
    subtitle: 'On-Chain Lease',
    description: 'The LeaseFactory mints an NFT representing the active lease with all terms embedded in token metadata.',
    duration: 4000,
    icon: 'nft',
    category: 'market',
  },
  {
    id: 9,
    title: 'X402 Requirements',
    subtitle: 'Payment Gateway',
    description: 'The resource server responds with HTTP 402 and a Payment-Required header containing X402 V2 payment requirements.',
    duration: 4500,
    icon: 'gateway',
    category: 'x402',
  },
  {
    id: 10,
    title: 'X402 Streaming',
    subtitle: 'Micropayments',
    description: 'Per-second USDC payment pulses stream from lessee to lessor via the facilitator, with real-time verification.',
    duration: 7000,
    icon: 'stream',
    category: 'x402',
  },
  {
    id: 11,
    title: 'Revenue Distribution',
    subtitle: 'Token Holders',
    description: 'Accumulated revenue is distributed proportionally to all fractional token holders based on their ERC20Votes balance.',
    duration: 4000,
    icon: 'revenue',
    category: 'x402',
  },
  {
    id: 12,
    title: 'Protocol Summary',
    subtitle: 'Complete Overview',
    description: 'Dashboard view of the entire protocol execution: all transactions, minted NFT, token balances, and payment totals.',
    duration: 5000,
    icon: 'summary',
    category: 'summary',
  },
];

export const CATEGORY_LABELS: Record<StepConfig['category'], string> = {
  setup: 'Infrastructure Setup',
  asset: 'Asset Management',
  market: 'Marketplace',
  x402: 'X402 Payments',
  summary: 'Summary',
};

// ---- Animation timing scale ----
// Multiplier applied to all step animation timeouts.
// 1.25 = 25% slower than original speed (presentation-friendly).
export const ANIMATION_SCALE = 1.25;

/** Scale a timeout value by ANIMATION_SCALE. */
export function t(ms: number): number {
  return Math.round(ms * ANIMATION_SCALE);
}

export const CATEGORY_COLORS: Record<StepConfig['category'], string> = {
  setup: 'text-indigo-400',
  asset: 'text-blue-400',
  market: 'text-amber-400',
  x402: 'text-emerald-400',
  summary: 'text-cyan-400',
};
