// Static demo data with realistic blockchain addresses, hashes, and amounts

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
    description: 'Creates and manages lease NFTs with embedded terms',
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

export type AssetClassId = 'orbital' | 'renewable-energy' | 'spectrum' | 'compute';

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
  orbital: {
    id: 'orbital',
    label: 'Orbital Compute',
    description: 'LEO satellite compute station with per-second streaming',
    icon: 'satellite',
    assetType: {
      name: 'Orbital Compute Station',
      category: 'Compute',
      subcategory: 'LEO',
      schema: {
        computeUnits: { type: 'uint256', description: 'vCPU cores available' },
        memoryGB: { type: 'uint256', description: 'RAM in gigabytes' },
        storageGB: { type: 'uint256', description: 'NVMe storage capacity' },
        bandwidthMbps: { type: 'uint256', description: 'Downlink bandwidth' },
        altitude: { type: 'string', description: 'Orbital altitude (km)' },
      },
    },
    assetMetadata: {
      assetId: 1,
      name: 'OCS-Alpha-7',
      typeId: 1,
      tokenSymbol: 'OCS7',
      tokenSupply: '1,000,000',
      fields: {
        computeUnits: 128,
        memoryGB: 512,
        storageGB: 4096,
        bandwidthMbps: 10000,
        altitude: '550km',
      },
    },
    leaseTerms: {
      leaseId: 1,
      assetId: 1,
      durationDays: 30,
      duration: '30 days',
      ratePerSecond: '0.000386',
      ratePerHour: '1.39',
      ratePerDay: '33.33',
      totalCost: '1,000.00',
      currency: 'USDC',
      escrowAmount: '200.00',
      startBlock: 18_500_000,
      endBlock: 18_716_800,
      lessorName: 'Orbital Corp',
      lesseeName: 'DataStream Labs',
    },
    x402Config: {
      version: 2,
      network: 'eip155:84532',
      facilitator: '0x2a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
      maxAmountRequired: '1000000',
      resourceUrl: 'https://api.spacemarkets.io/v1/leases/1/access',
      description: 'Orbital Compute Station OCS-Alpha-7 streaming access',
    },
    metadata: {
      orbit: 'LEO',
      altitude: '550km',
      inclination: '53.2 deg',
      downlinkFrequency: 'Ka-band',
      launchProvider: 'SpaceX Rideshare',
    },
  },

  'renewable-energy': {
    id: 'renewable-energy',
    label: 'Renewable Energy',
    description: 'Solar farm capacity with per-kWh streaming payments',
    icon: 'energy',
    assetType: {
      name: 'Solar Generation Facility',
      category: 'Energy',
      subcategory: 'Solar PV',
      schema: {
        capacityMW: { type: 'uint256', description: 'Peak generation capacity (MW)' },
        panelCount: { type: 'uint256', description: 'Total solar panel count' },
        efficiencyPct: { type: 'uint256', description: 'Conversion efficiency (%)' },
        storageCapMWh: { type: 'uint256', description: 'Battery storage capacity (MWh)' },
        location: { type: 'string', description: 'Facility location' },
      },
    },
    assetMetadata: {
      assetId: 1,
      name: 'Helios-Farm-12',
      typeId: 1,
      tokenSymbol: 'HF12',
      tokenSupply: '10,000,000',
      fields: {
        capacityMW: 50,
        panelCount: 125000,
        efficiencyPct: 22,
        storageCapMWh: 200,
        location: 'Phoenix, AZ',
      },
    },
    leaseTerms: {
      leaseId: 1,
      assetId: 1,
      durationDays: 90,
      duration: '90 days',
      ratePerSecond: '0.000400',
      ratePerHour: '1.44',
      ratePerDay: '34.56',
      totalCost: '3,110.40',
      currency: 'USDC',
      escrowAmount: '622.08',
      startBlock: 18_500_000,
      endBlock: 19_148_800,
      lessorName: 'Helios Energy Corp',
      lesseeName: 'GridSync Industries',
    },
    x402Config: {
      version: 2,
      network: 'eip155:84532',
      facilitator: '0x2a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
      maxAmountRequired: '3110400',
      resourceUrl: 'https://api.spacemarkets.io/v1/leases/1/access',
      description: 'Solar Generation Facility Helios-Farm-12 streaming access',
    },
    metadata: {
      gridConnection: 'APS Interconnection',
      irradiance: '6.5 kWh/m2/day',
      commissionYear: 2023,
      degradationRate: '0.4% / year',
      certifications: 'LEED Platinum',
    },
  },

  spectrum: {
    id: 'spectrum',
    label: 'Spectrum Rights',
    description: '5G mmWave band with per-minute usage streaming',
    icon: 'spectrum',
    assetType: {
      name: '5G mmWave Spectrum License',
      category: 'Spectrum',
      subcategory: '5G NR',
      schema: {
        frequencyGHz: { type: 'uint256', description: 'Center frequency (GHz)' },
        bandwidthMHz: { type: 'uint256', description: 'Channel bandwidth (MHz)' },
        txPowerDbm: { type: 'uint256', description: 'Maximum transmit power (dBm)' },
        coverageSqKm: { type: 'uint256', description: 'Licensed coverage area (sq km)' },
        market: { type: 'string', description: 'Licensed market area' },
      },
    },
    assetMetadata: {
      assetId: 1,
      name: 'LA-mmWave-28G-B1',
      typeId: 1,
      tokenSymbol: 'LAW1',
      tokenSupply: '5,000,000',
      fields: {
        frequencyGHz: 28,
        bandwidthMHz: 400,
        txPowerDbm: 75,
        coverageSqKm: 1302,
        market: 'Los Angeles, CA',
      },
    },
    leaseTerms: {
      leaseId: 1,
      assetId: 1,
      durationDays: 30,
      duration: '30 days',
      ratePerSecond: '0.002000',
      ratePerHour: '7.20',
      ratePerDay: '172.80',
      totalCost: '5,184.00',
      currency: 'USDC',
      escrowAmount: '1,036.80',
      startBlock: 18_500_000,
      endBlock: 18_716_800,
      lessorName: 'SpectrumCo Holdings',
      lesseeName: 'Metro Wireless Inc',
    },
    x402Config: {
      version: 2,
      network: 'eip155:84532',
      facilitator: '0x2a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
      maxAmountRequired: '5184000',
      resourceUrl: 'https://api.spacemarkets.io/v1/leases/1/access',
      description: '5G mmWave Spectrum License LA-mmWave-28G-B1 streaming access',
    },
    metadata: {
      fccLicense: 'LMDS-028-LA-01',
      band: 'n257 (26.5-29.5 GHz)',
      duplexMode: 'TDD',
      regulatoryBody: 'FCC',
      expirationYear: 2038,
    },
  },

  compute: {
    id: 'compute',
    label: 'Compute Capacity',
    description: 'GPU cluster with per-second compute streaming',
    icon: 'compute',
    assetType: {
      name: 'GPU Compute Cluster',
      category: 'Compute',
      subcategory: 'GPU',
      schema: {
        gpuCount: { type: 'uint256', description: 'Number of GPUs' },
        gpuModel: { type: 'string', description: 'GPU model identifier' },
        vramGB: { type: 'uint256', description: 'Total VRAM capacity (GB)' },
        interconnect: { type: 'string', description: 'GPU interconnect type' },
        region: { type: 'string', description: 'Data center region' },
      },
    },
    assetMetadata: {
      assetId: 1,
      name: 'H100-Cluster-East-04',
      typeId: 1,
      tokenSymbol: 'HCE4',
      tokenSupply: '1,000,000',
      fields: {
        gpuCount: 8,
        gpuModel: 'NVIDIA H100 SXM5',
        vramGB: 640,
        interconnect: 'NVLink 4.0',
        region: 'us-east-1',
      },
    },
    leaseTerms: {
      leaseId: 1,
      assetId: 1,
      durationDays: 7,
      duration: '7 days',
      ratePerSecond: '0.008000',
      ratePerHour: '28.80',
      ratePerDay: '691.20',
      totalCost: '4,838.40',
      currency: 'USDC',
      escrowAmount: '967.68',
      startBlock: 18_500_000,
      endBlock: 18_550_400,
      lessorName: 'CloudForge AI',
      lesseeName: 'NeuralWorks Research',
    },
    x402Config: {
      version: 2,
      network: 'eip155:84532',
      facilitator: '0x2a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
      maxAmountRequired: '4838400',
      resourceUrl: 'https://api.spacemarkets.io/v1/leases/1/access',
      description: 'GPU Compute Cluster H100-Cluster-East-04 streaming access',
    },
    metadata: {
      datacenter: 'Equinix DC-5',
      cooling: 'Direct Liquid Cooling',
      networkBandwidth: '400 Gbps InfiniBand',
      powerDraw: '10.2 kW',
      availability: '99.95% SLA',
    },
  },
};

export const PRESET_IDS: AssetClassId[] = ['orbital', 'renewable-energy', 'spectrum', 'compute'];

// ---- Pricing mode multipliers ----

export const PRICING_MULTIPLIERS: Record<PricingMode, { rate: number; duration: number; label: string; description: string }> = {
  conservative: { rate: 0.5, duration: 2, label: 'Conservative', description: 'Lower rates, longer leases' },
  standard: { rate: 1, duration: 1, label: 'Standard', description: 'Default pricing' },
  aggressive: { rate: 2, duration: 0.5, label: 'Aggressive', description: 'Higher rates, shorter leases' },
};

// ---- Derived data accessors (used by step components) ----
// These provide backward-compatible access to preset data via a resolver function.

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

// ---- Legacy exports (backward-compatible, resolve to orbital/standard) ----

export const ASSET_TYPE = DEMO_PRESETS.orbital.assetType;

export const ASSET_METADATA = {
  assetId: DEMO_PRESETS.orbital.assetMetadata.assetId,
  name: DEMO_PRESETS.orbital.assetMetadata.name,
  typeId: DEMO_PRESETS.orbital.assetMetadata.typeId,
  computeUnits: DEMO_PRESETS.orbital.assetMetadata.fields.computeUnits as number,
  memoryGB: DEMO_PRESETS.orbital.assetMetadata.fields.memoryGB as number,
  storageGB: DEMO_PRESETS.orbital.assetMetadata.fields.storageGB as number,
  bandwidthMbps: DEMO_PRESETS.orbital.assetMetadata.fields.bandwidthMbps as number,
  altitude: DEMO_PRESETS.orbital.assetMetadata.fields.altitude as string,
  tokenSymbol: DEMO_PRESETS.orbital.assetMetadata.tokenSymbol,
  tokenSupply: DEMO_PRESETS.orbital.assetMetadata.tokenSupply,
} as const;

export const LEASE_TERMS = {
  leaseId: 1,
  assetId: 1,
  duration: '30 days',
  ratePerSecond: '0.000386',
  ratePerHour: '1.39',
  ratePerDay: '33.33',
  totalCost: '1,000.00',
  currency: 'USDC',
  escrowAmount: '200.00',
  startBlock: 18_500_000,
  endBlock: 18_716_800,
} as const;

export const LEASE_NFT_ID = '1';

export const X402_CONFIG = {
  version: 2,
  network: 'eip155:84532',
  facilitator: '0x2a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
  maxAmountRequired: '1000000',
  resourceUrl: 'https://api.spacemarkets.io/v1/leases/1/access',
  description: 'Orbital Compute Station OCS-Alpha-7 streaming access',
} as const;

// ---- Utility functions ----

export function truncateAddress(address: string, chars = 6): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function truncateHash(hash: string, chars = 8): string {
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}
