/**
 * Core TypeScript types for Asset Leasing Protocol Offchain System
 *
 * These types align with the onchain contract structures and provide
 * type safety for offchain metadata management.
 */

export type AssetType = 'satellite' | 'orbital_compute' | 'orbital_relay';
export type DocumentType = 'manual' | 'certification' | 'specification' | 'lease_agreement' | 'regulatory_filing';
export type LeaseStatus = 'draft' | 'pending_signatures' | 'active' | 'completed' | 'terminated';
export type PaymentSchedule = 'monthly' | 'quarterly' | 'annual' | 'upfront';

/**
 * Core asset metadata structure
 * This must match the JSON Schema that gets hashed for onchain storage
 */
export interface AssetMetadata {
  assetId: string;
  name: string;
  description: string;
  assetType: AssetType;
  specifications: AssetSpecifications;
  documents: DocumentReference[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
  };
}

/**
 * Asset specifications by type
 */
export type AssetSpecifications =
  | SatelliteSpecifications
  | OrbitalComputeSpecifications
  | OrbitalRelaySpecifications;

export interface SatelliteSpecifications {
  type: 'satellite';
  orbital: {
    type: 'leo' | 'meo' | 'geo' | 'heo';
    altitude_km: number;
    inclination_deg: number;
    period_hours: number;
    longitude_deg?: number; // For GEO
  };
  physical: {
    mass_kg: number;
    power_watts: number;
    design_life_years: number;
    dimensions: {
      length_m: number;
      width_m: number;
      height_m: number;
    };
  };
  mission: {
    primary_mission: 'communications' | 'earth_observation' | 'navigation' | 'scientific';
    launch_date: string;
    operator: string;
    manufacturer: string;
  };
  communications?: {
    bands: string[];
    transponders?: number;
    coverage_area: string;
    bandwidth_mhz?: number;
  };
  imaging?: {
    resolution_m: number;
    swath_width_km: number;
    spectral_bands: string[];
    revisit_time_hours: number;
  };
}

export interface OrbitalComputeSpecifications {
  type: 'orbital_compute';
  orbital: {
    type: 'leo' | 'meo' | 'geo';
    altitude_km: number;
    inclination_deg: number;
    period_hours: number;
  };
  compute: {
    cpu_cores: number;
    ram_gb: number;
    storage_tb: number;
    gpu_units?: number;
    specialized_processors: string[];
  };
  networking: {
    bandwidth_gbps: number;
    latency_ms: number;
    connectivity: string[];
  };
  physical: {
    power_consumption_kw: number;
    thermal_design_power_kw: number;
    mass_kg: number;
    design_life_years: number;
  };
}

export interface OrbitalRelaySpecifications {
  type: 'orbital_relay';
  orbital: {
    type: 'leo' | 'meo' | 'geo';
    altitude_km: number;
    inclination_deg: number;
    period_hours: number;
  };
  relay: {
    channels: number;
    max_throughput_gbps: number;
    coverage_area_km2: number;
    signal_power_dbm: number;
    frequency_bands: string[];
  };
  physical: {
    mass_kg: number;
    power_watts: number;
    design_life_years: number;
  };
  networking: {
    protocols: string[];
    routing_capability: boolean;
    mesh_network_support: boolean;
  };
}

/**
 * Document reference structure
 */
export interface DocumentReference {
  documentId: string;
  filename: string;
  documentType: DocumentType;
  hash: string; // SHA-256 hash with 0x prefix
  size: number;
  uploadedAt: string;
  description?: string;
}

/**
 * Lease agreement structure
 */
export interface LeaseAgreement {
  leaseId: string;
  assetId: string;
  lessorAddress: string;
  lesseeAddress: string;
  terms: LeaseTerms;
  legalDocument: DocumentReference;
  metadataHash: string;
  status: LeaseStatus;
  signatures?: {
    lessor?: string;
    lessee?: string;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
  };
}

/**
 * Lease terms structure
 */
export interface LeaseTerms {
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  paymentAmount: string; // Wei amount as string
  paymentSchedule: PaymentSchedule;
  currency: string;
  restrictions?: string[];
  // Asset-specific lease terms (matches onchain requiredLeaseKeys)
  specificTerms: LeaseSpecificTerms;
}

/**
 * Asset-specific lease terms
 */
export type LeaseSpecificTerms =
  | SatelliteLeaseTerms
  | OrbitalComputeLeaseTerms
  | OrbitalRelayLeaseTerms;

export interface SatelliteLeaseTerms {
  assetType: 'satellite';
  orbital_period_hours: number;
  communication_frequency_ghz?: number;
  coverage_area_km2?: number;
  imaging_resolution_m?: number;
  data_download_rights: boolean;
  orbit_maintenance_responsibility: 'lessor' | 'lessee' | 'shared';
}

export interface OrbitalComputeLeaseTerms {
  assetType: 'orbital_compute';
  compute_cores: number;
  storage_tb: number;
  bandwidth_gbps: number;
  power_consumption_kw: number;
  software_stack: string[];
  data_sovereignty: string; // jurisdiction
}

export interface OrbitalRelayLeaseTerms {
  assetType: 'orbital_relay';
  relay_channels: number;
  max_throughput_gbps: number;
  coverage_area_km2: number;
  signal_power_dbm: number;
  quality_of_service: 'standard' | 'premium' | 'guaranteed';
  redundancy_level: number;
}

/**
 * Revenue distribution types
 */
export interface RevenueRound {
  roundId: number;
  assetId: string;
  snapshotId: string;
  totalAmount: string; // Wei amount
  snapshotBlock: number;
  distributionData: RevenueClaim[];
  status: 'calculating' | 'open' | 'closed';
  metadata: {
    createdAt: string;
    calculatedAt?: string;
    closedAt?: string;
  };
}

export interface RevenueClaim {
  claimId: string;
  roundId: number;
  holderAddress: string;
  tokenBalance: string; // Balance at snapshot
  claimAmount: string; // Claimable amount in wei
  claimed: boolean;
  claimedAt?: string;
  transactionHash?: string;
}

/**
 * Blockchain event types
 */
export interface BlockchainEvent {
  eventType: string;
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  logIndex: number;
  eventData: Record<string, unknown>;
  processed: boolean;
  timestamp: string;
}

/**
 * Configuration types
 */
export interface ContractAddresses {
  assetRegistry: string;
  marketplace: string;
  leaseFactory: string;
}

export interface TestConfiguration {
  network: 'anvil' | 'sepolia' | 'mainnet';
  rpcUrl: string;
  privateKey: string;
  contracts: ContractAddresses;
  dataDir: string;
}

/**
 * Utility types for hashing and validation
 */
export interface HashResult {
  hash: string;
  algorithm: 'sha256';
  input: string | Buffer;
  timestamp: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}