// Static demo data with realistic blockchain addresses, hashes, and amounts
// Pricing based on real-world space economy rates (2025-2026 market data)

// ---- Protocol-level constants (shared across all presets) ----

export const DEPLOYER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
export const LESSOR = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
export const LESSEE = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';

export const CONTRACTS = {
  assetRegistry: {
    name: 'AssetRegistry',
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    pattern: 'UUPS Proxy',
    description: 'Manages asset types, metadata schemas, and ownership',
  },
  assetERC20: {
    name: 'AssetERC20',
    address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    pattern: 'UUPS Proxy',
    description: 'Fractional ownership tokens with ERC20Votes checkpoints',
  },
  leaseFactory: {
    name: 'LeaseFactory',
    address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    pattern: 'UUPS Proxy',
    description: 'Creates and manages cryptographic leases with embedded terms',
  },
  marketplace: {
    name: 'Marketplace',
    address: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    pattern: 'UUPS Proxy',
    description: 'Offer/bid matching with EIP-712 signed orders',
  },
  metadataStorage: {
    name: 'MetadataStorage',
    address: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    pattern: 'UUPS Proxy',
    description: 'On-chain metadata validation and hash verification',
  },
} as const;

export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913';

export const HASHES = {
  assetTypeHash: '0x4a1b8c3d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2',
  metadataHash: '0x7f3a9b2c4d5e6f8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4',
  leaseTermsHash: '0x2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
  bidSignatureHash: '0x8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9',
  acceptSignatureHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2',
} as const;

export const TX_HASHES = {
  deploy: '0xabc123def456789012345678901234567890abcdef1234567890abcdef123456',
  createType: '0xdef456789012345678901234567890abcdef1234567890abcdef123456789012',
  registerAsset: '0x789012345678901234567890abcdef1234567890abcdef12345678901234abcd',
  verifyMetadata: '0x345678901234567890abcdef1234567890abcdef12345678901234abcdef5678',
  leaseOffer: '0x901234567890abcdef1234567890abcdef12345678901234abcdef1234567890',
  lesseeBid: '0xabcdef1234567890abcdef12345678901234567890abcdef123456789012abcd',
  lessorAccept: '0xcdef12345678901234567890abcdef1234567890abcdef12345678901234cdef',
  mintNft: '0xef1234567890abcdef12345678901234567890abcdef1234567890abcdef9012',
  x402Payment: '0x5678901234567890abcdef1234567890abcdef12345678901234abcdef567890',
  revenue: '0x1234567890abcdef1234567890abcdef12345678901234abcdef1234567890ab',
} as const;

export const BLOCK_NUMBERS = {
  deployBlock: 18_499_990,
  createTypeBlock: 18_499_995,
  registerBlock: 18_500_000,
  verifyBlock: 18_500_001,
  offerBlock: 18_500_010,
  bidBlock: 18_500_015,
  acceptBlock: 18_500_020,
  mintBlock: 18_500_021,
  x402StartBlock: 18_500_025,
  revenueBlock: 18_500_100,
} as const;

// ---- Asset Class Presets ----
// All presets are space economy assets with realistic specifications and pricing

export type AssetClassId = 'comms-imaging' | 'orbital-compute' | 'orbital-station' | 'data-relay' | 'transportation';

export type PricingMode = 'conservative' | 'standard' | 'aggressive';

export interface DemoPreset {
  id: AssetClassId;
  label: string;
  description: string;
  icon: string;
  assetType: {
    name: string;
    category: string;
    subcategory: string;
    schema: Record<string, { type: string; description: string }>;
  };
  assetMetadata: {
    assetId: number;
    name: string;
    typeId: number;
    tokenSymbol: string;
    tokenSupply: string;
    fields: Record<string, string | number>;
  };
  leaseTerms: {
    leaseId: number;
    assetId: number;
    durationDays: number;
    duration: string;
    ratePerSecond: string;
    ratePerHour: string;
    ratePerDay: string;
    totalCost: string;
    currency: string;
    escrowAmount: string;
    startBlock: number;
    endBlock: number;
    lessorName: string;
    lesseeName: string;
  };
  x402Config: {
    version: number;
    network: string;
    facilitator: string;
    maxAmountRequired: string;
    resourceUrl: string;
    description: string;
  };
  metadata: Record<string, string | number>;
}

export const DEMO_PRESETS: Record<AssetClassId, DemoPreset> = {
  // ---- 1. Communications & Imaging Satellite ----
  // Based on: Starlink-class LEO comms sat ($500K build cost, $250K launch)
  // Imaging pricing: ~$1-3/km2 for 30cm resolution, $15-25/min for video
  // Comms transponder lease: ~$1.5M/yr for 36MHz Ku-band transponder
  'comms-imaging': {
    id: 'comms-imaging',
    label: 'Comms & Imaging',
    description: 'LEO satellite with Ku-band comms and 30cm imaging payload',
    icon: 'satellite',
    assetType: {
      name: 'Communications & Imaging Satellite',
      category: 'Satellite',
      subcategory: 'LEO Multi-Payload',
      schema: {
        transponders: { type: 'uint256', description: 'Ku-band transponder count' },
        bandwidthGbps: { type: 'uint256', description: 'Total downlink capacity (Gbps)' },
        imagingResCm: { type: 'uint256', description: 'Imaging resolution (cm)' },
        swathWidthKm: { type: 'uint256', description: 'Imaging swath width (km)' },
        designLifeYrs: { type: 'uint256', description: 'Design lifetime (years)' },
      },
    },
    assetMetadata: {
      assetId: 1,
      name: 'HAWK-7 Multisat',
      typeId: 1,
      tokenSymbol: 'HWK7',
      tokenSupply: '10,000,000',
      fields: {
        transponders: 4,
        bandwidthGbps: 20,
        imagingResCm: 30,
        swathWidthKm: 12,
        designLifeYrs: 7,
      },
    },
    leaseTerms: {
      leaseId: 1,
      assetId: 1,
      durationDays: 90,
      duration: '90 days',
      // ~$375K for 90-day exclusive transponder + imaging lease
      // Real: 1 transponder ~$1.5M/yr = $370K/quarter
      ratePerSecond: '0.048225',
      ratePerHour: '173.61',
      ratePerDay: '4,166.67',
      totalCost: '375,000.00',
      currency: 'USDC',
      escrowAmount: '75,000.00',
      startBlock: 18_500_000,
      endBlock: 19_148_800,
      lessorName: 'Hawkeye Space Systems',
      lesseeName: 'GeoWatch Analytics',
    },
    x402Config: {
      version: 2,
      network: 'eip155:84532',
      facilitator: '0x2a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
      maxAmountRequired: '375000000000',
      resourceUrl: 'https://api.spacemarkets.io/v1/leases/1/access',
      description: 'HAWK-7 Multisat transponder and imaging access',
    },
    metadata: {
      orbit: 'LEO Sun-Synchronous',
      altitude: '525 km',
      inclination: '97.4 deg',
      launchDate: '2025-03-15',
      launchVehicle: 'Falcon 9 Rideshare',
    },
  },

  // ---- 2. Orbital AI/Compute Cluster ----
  // Based on: Lumen Orbit / Aethero planned orbital GPU nodes
  // Pricing: ~$2.50/GPU-hr for H100-equivalent in orbit (premium over terrestrial $2-3/hr)
  // Unique value: low-latency inference for satellite constellations, edge AI in space
  'orbital-compute': {
    id: 'orbital-compute',
    label: 'Orbital Compute',
    description: 'Edge AI inference node with 8x space-grade GPUs in LEO',
    icon: 'compute',
    assetType: {
      name: 'Orbital AI Compute Node',
      category: 'Compute',
      subcategory: 'LEO Edge AI',
      schema: {
        gpuCount: { type: 'uint256', description: 'Space-rated GPU units' },
        tflopsF16: { type: 'uint256', description: 'FP16 compute (TFLOPS)' },
        vramGB: { type: 'uint256', description: 'Total HBM3 memory (GB)' },
        interSatLinkGbps: { type: 'uint256', description: 'Optical ISL bandwidth (Gbps)' },
        powerBudgetW: { type: 'uint256', description: 'Available compute power (W)' },
      },
    },
    assetMetadata: {
      assetId: 1,
      name: 'NOVA-Edge-04',
      typeId: 1,
      tokenSymbol: 'NOV4',
      tokenSupply: '1,000,000',
      fields: {
        gpuCount: 8,
        tflopsF16: 3958,
        vramGB: 640,
        interSatLinkGbps: 100,
        powerBudgetW: 4800,
      },
    },
    leaseTerms: {
      leaseId: 1,
      assetId: 1,
      durationDays: 30,
      duration: '30 days',
      // 8 GPUs x $3.50/hr (orbital premium) x 24hr x 30d = $20,160
      ratePerSecond: '0.007778',
      ratePerHour: '28.00',
      ratePerDay: '672.00',
      totalCost: '20,160.00',
      currency: 'USDC',
      escrowAmount: '4,032.00',
      startBlock: 18_500_000,
      endBlock: 18_716_800,
      lessorName: 'Lumen Orbital Systems',
      lesseeName: 'Constellation AI Labs',
    },
    x402Config: {
      version: 2,
      network: 'eip155:84532',
      facilitator: '0x2a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
      maxAmountRequired: '20160000000',
      resourceUrl: 'https://api.spacemarkets.io/v1/leases/1/access',
      description: 'NOVA-Edge-04 orbital AI inference access',
    },
    metadata: {
      orbit: 'LEO',
      altitude: '550 km',
      inclination: '53.2 deg',
      radiationShielding: 'Mil-spec 883K',
      thermalSystem: 'Active Liquid Loop',
    },
  },

  // ---- 3. Orbital Station Module ----
  // Based on: Axiom Space / Vast Haven-1 commercial station modules
  // Pricing: Axiom charges ~$55M for a 10-day crew mission; module lease ~$1.5M/month
  // Research rack lease: ~$50K-100K/month per rack position
  'orbital-station': {
    id: 'orbital-station',
    label: 'Orbital Station',
    description: 'Pressurized research module on commercial station',
    icon: 'station',
    assetType: {
      name: 'Orbital Station Module',
      category: 'Station',
      subcategory: 'LEO Commercial',
      schema: {
        volumeM3: { type: 'uint256', description: 'Pressurized volume (m3)' },
        rackPositions: { type: 'uint256', description: 'Experiment rack slots' },
        crewCapacity: { type: 'uint256', description: 'Crew berths supported' },
        powerKW: { type: 'uint256', description: 'Available power budget (kW)' },
        dockingPorts: { type: 'uint256', description: 'Standard docking ports' },
      },
    },
    assetMetadata: {
      assetId: 1,
      name: 'HAVEN-Module-B2',
      typeId: 1,
      tokenSymbol: 'HVB2',
      tokenSupply: '5,000,000',
      fields: {
        volumeM3: 160,
        rackPositions: 8,
        crewCapacity: 4,
        powerKW: 30,
        dockingPorts: 2,
      },
    },
    leaseTerms: {
      leaseId: 1,
      assetId: 1,
      durationDays: 180,
      duration: '180 days',
      // ~$1.2M/month for full module = $7.2M for 6 months
      // Comparable to Axiom's module pricing post-ISS
      ratePerSecond: '0.462963',
      ratePerHour: '1,666.67',
      ratePerDay: '40,000.00',
      totalCost: '7,200,000.00',
      currency: 'USDC',
      escrowAmount: '1,440,000.00',
      startBlock: 18_500_000,
      endBlock: 19_796_800,
      lessorName: 'Axiom Orbital Holdings',
      lesseeName: 'BioGenesis Research Corp',
    },
    x402Config: {
      version: 2,
      network: 'eip155:84532',
      facilitator: '0x2a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
      maxAmountRequired: '7200000000000',
      resourceUrl: 'https://api.spacemarkets.io/v1/leases/1/access',
      description: 'HAVEN-Module-B2 pressurized research access',
    },
    metadata: {
      station: 'Haven-1 Commercial',
      orbit: 'LEO 51.6 deg',
      altitude: '410 km',
      atmosphere: '21% O2, 79% N2, 101.3 kPa',
      microG: '< 1 micro-g',
    },
  },

  // ---- 4. Data Relay Satellite ----
  // Based on: NASA TDRS / SpaceX Starshield relay pricing
  // Pricing: TDRS access ~$80K/hr for S-band, $150K/hr for Ka-band
  // Commercial relay: ~$500-2000/min for high-bandwidth relay passes
  'data-relay': {
    id: 'data-relay',
    label: 'Data Relay',
    description: 'GEO optical data relay with 1.8 Tbps crosslink capacity',
    icon: 'relay',
    assetType: {
      name: 'Optical Data Relay Satellite',
      category: 'Relay',
      subcategory: 'GEO Optical',
      schema: {
        crosslinkTbps: { type: 'uint256', description: 'Optical crosslink capacity (Tbps)' },
        groundTerminals: { type: 'uint256', description: 'Linked ground station count' },
        coverageZone: { type: 'string', description: 'Coverage longitude range' },
        laserTerminals: { type: 'uint256', description: 'Optical terminal count' },
        latencyMs: { type: 'uint256', description: 'Relay latency (ms)' },
      },
    },
    assetMetadata: {
      assetId: 1,
      name: 'PRISM-Relay-GEO-3',
      typeId: 1,
      tokenSymbol: 'PRM3',
      tokenSupply: '2,000,000',
      fields: {
        crosslinkTbps: 1.8,
        groundTerminals: 6,
        coverageZone: '30W - 90W',
        laserTerminals: 4,
        latencyMs: 240,
      },
    },
    leaseTerms: {
      leaseId: 1,
      assetId: 1,
      durationDays: 365,
      duration: '365 days',
      // ~$12M/yr for dedicated relay channel (~$1M/month)
      // Based on TDRS-era pricing adjusted for commercial market
      ratePerSecond: '0.380517',
      ratePerHour: '1,369.86',
      ratePerDay: '32,876.71',
      totalCost: '12,000,000.00',
      currency: 'USDC',
      escrowAmount: '2,400,000.00',
      startBlock: 18_500_000,
      endBlock: 21_128_800,
      lessorName: 'Astra Relay Networks',
      lesseeName: 'Federal Space Agency',
    },
    x402Config: {
      version: 2,
      network: 'eip155:84532',
      facilitator: '0x2a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
      maxAmountRequired: '12000000000000',
      resourceUrl: 'https://api.spacemarkets.io/v1/leases/1/access',
      description: 'PRISM-Relay-GEO-3 optical data relay access',
    },
    metadata: {
      orbit: 'GEO',
      altitude: '35,786 km',
      longitude: '60 W',
      designLifeYrs: 15,
      encryption: 'QKD-ready',
    },
  },

  // ---- 5. Orbital Transportation ----
  // Based on: SpaceX Dragon cargo ($2,720/kg to ISS), RocketLab Electron ($25K/kg)
  // Lunar: ~$1M/kg to lunar surface (Astrobotic Peregrine pricing)
  // Rideshare to LEO: ~$5,500/kg (Falcon 9 Transporter missions)
  'transportation': {
    id: 'transportation',
    label: 'Transportation',
    description: 'Dedicated LEO cargo delivery — 800 kg manifest slot',
    icon: 'transport',
    assetType: {
      name: 'Orbital Cargo Delivery Slot',
      category: 'Transport',
      subcategory: 'LEO Cargo',
      schema: {
        massCapacityKg: { type: 'uint256', description: 'Payload mass allocation (kg)' },
        volumeM3: { type: 'uint256', description: 'Payload volume (m3)' },
        targetOrbit: { type: 'string', description: 'Delivery orbit' },
        launchWindow: { type: 'string', description: 'Launch window' },
        returnCapable: { type: 'uint256', description: 'Return mass capacity (kg)' },
      },
    },
    assetMetadata: {
      assetId: 1,
      name: 'DRG-Cargo-2026-Q3',
      typeId: 1,
      tokenSymbol: 'DRG3',
      tokenSupply: '800,000',
      fields: {
        massCapacityKg: 800,
        volumeM3: 2.1,
        targetOrbit: 'LEO 400km 51.6 deg',
        launchWindow: '2026 Q3',
        returnCapable: 400,
      },
    },
    leaseTerms: {
      leaseId: 1,
      assetId: 1,
      durationDays: 60,
      duration: '60 days',
      // 800 kg x $6,000/kg (rideshare + integration) = $4.8M total
      // Paid over 60-day pre-launch manifest period
      ratePerSecond: '0.925926',
      ratePerHour: '3,333.33',
      ratePerDay: '80,000.00',
      totalCost: '4,800,000.00',
      currency: 'USDC',
      escrowAmount: '960,000.00',
      startBlock: 18_500_000,
      endBlock: 18_932_800,
      lessorName: 'Orbital Logistics Corp',
      lesseeName: 'Haven-1 Station Ops',
    },
    x402Config: {
      version: 2,
      network: 'eip155:84532',
      facilitator: '0x2a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
      maxAmountRequired: '4800000000000',
      resourceUrl: 'https://api.spacemarkets.io/v1/leases/1/access',
      description: 'DRG-Cargo-2026-Q3 manifest slot access',
    },
    metadata: {
      vehicle: 'Cargo Dragon 2',
      launchSite: 'KSC LC-39A',
      missionDuration: '30 days docked',
      integrationFacility: 'SpaceX Hawthorne',
      insurance: 'Included',
    },
  },
};

export const PRESET_IDS: AssetClassId[] = ['comms-imaging', 'orbital-compute', 'orbital-station', 'data-relay', 'transportation'];

// ---- Pricing mode multipliers ----

export const PRICING_MULTIPLIERS: Record<PricingMode, { rate: number; duration: number; label: string; description: string }> = {
  conservative: { rate: 0.5, duration: 2, label: 'Conservative', description: 'Lower rates, longer leases' },
  standard: { rate: 1, duration: 1, label: 'Standard', description: 'Default pricing' },
  aggressive: { rate: 2, duration: 0.5, label: 'Aggressive', description: 'Higher rates, shorter leases' },
};

// ---- Derived data accessors (used by step components) ----

export function getPresetData(presetId: AssetClassId, pricingMode: PricingMode = 'standard') {
  const preset = DEMO_PRESETS[presetId];
  const multiplier = PRICING_MULTIPLIERS[pricingMode];

  const baseRate = parseFloat(preset.leaseTerms.ratePerSecond);
  const adjustedRate = baseRate * multiplier.rate;
  const adjustedDays = Math.round(preset.leaseTerms.durationDays * multiplier.duration);
  const adjustedTotalSeconds = adjustedDays * 86400;
  const adjustedTotal = adjustedRate * adjustedTotalSeconds;
  const adjustedEscrow = adjustedTotal * 0.2;

  return {
    preset,
    assetType: preset.assetType,
    assetMetadata: preset.assetMetadata,
    leaseTerms: {
      ...preset.leaseTerms,
      durationDays: adjustedDays,
      duration: `${adjustedDays} days`,
      ratePerSecond: adjustedRate.toFixed(6),
      ratePerHour: (adjustedRate * 3600).toFixed(2),
      ratePerDay: (adjustedRate * 86400).toFixed(2),
      totalCost: adjustedTotal.toFixed(2),
      escrowAmount: adjustedEscrow.toFixed(2),
    },
    x402Config: preset.x402Config,
    metadata: preset.metadata,
  };
}

// ---- Legacy exports (backward-compatible, resolve to comms-imaging/standard) ----

export const ASSET_TYPE = DEMO_PRESETS['comms-imaging'].assetType;

export const ASSET_METADATA = {
  assetId: DEMO_PRESETS['comms-imaging'].assetMetadata.assetId,
  name: DEMO_PRESETS['comms-imaging'].assetMetadata.name,
  typeId: DEMO_PRESETS['comms-imaging'].assetMetadata.typeId,
  tokenSymbol: DEMO_PRESETS['comms-imaging'].assetMetadata.tokenSymbol,
  tokenSupply: DEMO_PRESETS['comms-imaging'].assetMetadata.tokenSupply,
} as const;

export const LEASE_TERMS = {
  leaseId: 1,
  assetId: 1,
  duration: '90 days',
  ratePerSecond: '0.048225',
  ratePerHour: '173.61',
  ratePerDay: '4,166.67',
  totalCost: '375,000.00',
  currency: 'USDC',
  escrowAmount: '75,000.00',
  startBlock: 18_500_000,
  endBlock: 19_148_800,
} as const;

export const LEASE_NFT_ID = '1';

export const X402_CONFIG = {
  version: 2,
  network: 'eip155:84532',
  facilitator: '0x2a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
  maxAmountRequired: '375000000000',
  resourceUrl: 'https://api.spacemarkets.io/v1/leases/1/access',
  description: 'HAWK-7 Multisat transponder and imaging access',
} as const;

// ---- Utility functions ----

export function truncateAddress(address: string, chars = 6): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function truncateHash(hash: string, chars = 8): string {
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}
