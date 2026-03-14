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
    description: 'Deploy five upgradeable protocol contracts to Base Sepolia: AssetRegistry, AssetERC20, LeaseFactory, Marketplace, and MetadataStorage.',
    duration: 6000,
    icon: 'deploy',
    category: 'setup',
  },
  {
    id: 2,
    title: 'Create Asset Type',
    subtitle: 'Schema Definition',
    description: 'Define the asset type with a structured metadata schema, producing a unique cryptographic fingerprint.',
    duration: 4000,
    icon: 'schema',
    category: 'asset',
  },
  {
    id: 3,
    title: 'Register Asset',
    subtitle: 'Tokenization',
    description: 'Register the asset with verified metadata, deploy a fractional ownership token, and link ownership on-chain.',
    duration: 5000,
    icon: 'register',
    category: 'asset',
  },
  {
    id: 4,
    title: 'Verify Metadata',
    subtitle: 'Integrity Check',
    description: 'Verify all asset fields match the original submission by querying the permanent record. Green checkmarks confirm integrity.',
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
    subtitle: 'Signed Bid',
    description: 'A lessee constructs a digitally signed bid, authorizes it with their wallet, and submits with USDC escrow.',
    duration: 5000,
    icon: 'bid',
    category: 'market',
  },
  {
    id: 7,
    title: 'Lessor Accepts',
    subtitle: 'Bid Acceptance',
    description: 'The lessor reviews bids, selects the winner, and provides a confirmation signature to finalize the agreement.',
    duration: 4500,
    icon: 'accept',
    category: 'market',
  },
  {
    id: 8,
    title: 'Mint Lease NFT',
    subtitle: 'Digital Certificate',
    description: 'The protocol creates a unique digital lease certificate with all terms permanently embedded.',
    duration: 4000,
    icon: 'nft',
    category: 'market',
  },
  {
    id: 9,
    title: 'X402 Requirements',
    subtitle: 'Payment Gateway',
    description: 'The resource server responds with a payment request containing the terms, rate, and destination for streaming payments.',
    duration: 4500,
    icon: 'gateway',
    category: 'x402',
  },
  {
    id: 10,
    title: 'X402 Streaming',
    subtitle: 'Micropayments',
    description: 'Per-second USDC payments stream from lessee to lessor with real-time verification — pay only for what you use.',
    duration: 7000,
    icon: 'stream',
    category: 'x402',
  },
  {
    id: 11,
    title: 'Revenue Distribution',
    subtitle: 'Token Holders',
    description: 'Accumulated revenue is distributed proportionally to all fractional owners based on their ownership share.',
    duration: 4000,
    icon: 'revenue',
    category: 'x402',
  },
  {
    id: 12,
    title: 'Protocol Summary',
    subtitle: 'Complete Overview',
    description: 'Complete overview of the protocol lifecycle: asset registration, lease execution, streaming payments, and revenue distribution.',
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

export const CATEGORY_COLORS: Record<StepConfig['category'], string> = {
  setup: 'text-purple-400',
  asset: 'text-blue-400',
  market: 'text-amber-400',
  x402: 'text-emerald-400',
  summary: 'text-cyan-400',
};
