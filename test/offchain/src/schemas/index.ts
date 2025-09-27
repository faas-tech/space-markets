/**
 * Zod validation schemas for Asset Leasing Protocol
 *
 * These schemas provide runtime validation for all data structures
 * and ensure type safety throughout the off-chain system.
 */

import { z } from 'zod';

// Basic validation patterns
const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
const hashRegex = /^0x[a-fA-F0-9]{64}$/;
const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

// Core enum schemas
export const AssetTypeSchema = z.enum(['satellite', 'orbital_compute', 'orbital_relay']);
export const DocumentTypeSchema = z.enum(['manual', 'certification', 'specification', 'lease_agreement', 'regulatory_filing']);
export const LeaseStatusSchema = z.enum(['draft', 'pending_signatures', 'active', 'completed', 'terminated']);
export const PaymentScheduleSchema = z.enum(['monthly', 'quarterly', 'annual', 'upfront']);

// Document reference schema
export const DocumentReferenceSchema = z.object({
  documentId: z.string().min(1),
  filename: z.string().min(1).max(255),
  documentType: DocumentTypeSchema,
  hash: z.string().regex(hashRegex, 'Hash must be valid 0x-prefixed 64-character hex'),
  size: z.number().positive(),
  uploadedAt: z.string().regex(isoDateRegex, 'Must be valid ISO 8601 date'),
  description: z.string().optional()
});

// Orbital specifications
const OrbitalSpecSchema = z.object({
  type: z.enum(['leo', 'meo', 'geo', 'heo']),
  altitude_km: z.number().min(200).max(50000),
  inclination_deg: z.number().min(0).max(180),
  period_hours: z.number().min(1).max(48),
  longitude_deg: z.number().min(-180).max(180).optional()
});

// Physical specifications
const PhysicalSpecSchema = z.object({
  mass_kg: z.number().positive(),
  power_watts: z.number().positive(),
  design_life_years: z.number().min(1).max(50),
  dimensions: z.object({
    length_m: z.number().positive(),
    width_m: z.number().positive(),
    height_m: z.number().positive()
  }).optional()
});

// Satellite specifications schema
export const SatelliteSpecificationsSchema = z.object({
  type: z.literal('satellite'),
  orbital: OrbitalSpecSchema,
  physical: PhysicalSpecSchema,
  mission: z.object({
    primary_mission: z.enum(['communications', 'earth_observation', 'navigation', 'scientific']),
    launch_date: z.string().regex(isoDateRegex),
    operator: z.string().min(1),
    manufacturer: z.string().min(1)
  }),
  communications: z.object({
    bands: z.array(z.string()),
    transponders: z.number().positive().optional(),
    coverage_area: z.string().min(1),
    bandwidth_mhz: z.number().positive().optional()
  }).optional(),
  imaging: z.object({
    resolution_m: z.number().positive(),
    swath_width_km: z.number().positive(),
    spectral_bands: z.array(z.string()),
    revisit_time_hours: z.number().positive()
  }).optional()
});

// Orbital compute specifications schema
export const OrbitalComputeSpecificationsSchema = z.object({
  type: z.literal('orbital_compute'),
  orbital: OrbitalSpecSchema.omit({ longitude_deg: true }),
  compute: z.object({
    cpu_cores: z.number().positive(),
    ram_gb: z.number().positive(),
    storage_tb: z.number().positive(),
    gpu_units: z.number().nonnegative().optional(),
    specialized_processors: z.array(z.string())
  }),
  networking: z.object({
    bandwidth_gbps: z.number().positive(),
    latency_ms: z.number().positive(),
    connectivity: z.array(z.string())
  }),
  physical: z.object({
    power_consumption_kw: z.number().positive(),
    thermal_design_power_kw: z.number().positive(),
    mass_kg: z.number().positive(),
    design_life_years: z.number().min(1).max(50)
  })
});

// Orbital relay specifications schema
export const OrbitalRelaySpecificationsSchema = z.object({
  type: z.literal('orbital_relay'),
  orbital: OrbitalSpecSchema.omit({ longitude_deg: true }),
  relay: z.object({
    channels: z.number().positive(),
    max_throughput_gbps: z.number().positive(),
    coverage_area_km2: z.number().positive(),
    signal_power_dbm: z.number(),
    frequency_bands: z.array(z.string())
  }),
  physical: z.object({
    mass_kg: z.number().positive(),
    power_watts: z.number().positive(),
    design_life_years: z.number().min(1).max(50)
  }),
  networking: z.object({
    protocols: z.array(z.string()),
    routing_capability: z.boolean(),
    mesh_network_support: z.boolean()
  })
});

// Combined asset specifications schema
export const AssetSpecificationsSchema = z.discriminatedUnion('type', [
  SatelliteSpecificationsSchema,
  OrbitalComputeSpecificationsSchema,
  OrbitalRelaySpecificationsSchema
]);

// Lease specific terms schemas
export const SatelliteLeaseTermsSchema = z.object({
  assetType: z.literal('satellite'),
  orbital_period_hours: z.number().positive(),
  communication_frequency_ghz: z.number().positive().optional(),
  coverage_area_km2: z.number().positive().optional(),
  imaging_resolution_m: z.number().positive().optional(),
  data_download_rights: z.boolean(),
  orbit_maintenance_responsibility: z.enum(['lessor', 'lessee', 'shared'])
});

export const OrbitalComputeLeaseTermsSchema = z.object({
  assetType: z.literal('orbital_compute'),
  compute_cores: z.number().positive(),
  storage_tb: z.number().positive(),
  bandwidth_gbps: z.number().positive(),
  power_consumption_kw: z.number().positive(),
  software_stack: z.array(z.string()),
  data_sovereignty: z.string().min(1)
});

export const OrbitalRelayLeaseTermsSchema = z.object({
  assetType: z.literal('orbital_relay'),
  relay_channels: z.number().positive(),
  max_throughput_gbps: z.number().positive(),
  coverage_area_km2: z.number().positive(),
  signal_power_dbm: z.number(),
  quality_of_service: z.enum(['standard', 'premium', 'guaranteed']),
  redundancy_level: z.number().min(1).max(5)
});

export const LeaseSpecificTermsSchema = z.discriminatedUnion('assetType', [
  SatelliteLeaseTermsSchema,
  OrbitalComputeLeaseTermsSchema,
  OrbitalRelayLeaseTermsSchema
]);

// Lease terms schema
export const LeaseTermsSchema = z.object({
  startDate: z.string().regex(isoDateRegex),
  endDate: z.string().regex(isoDateRegex),
  paymentAmount: z.string().regex(/^\d+$/, 'Payment amount must be a valid wei amount (numeric string)'),
  paymentSchedule: PaymentScheduleSchema,
  currency: z.string().min(1),
  restrictions: z.array(z.string()).optional(),
  specificTerms: LeaseSpecificTermsSchema
}).refine(data => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end > start;
}, { message: 'End date must be after start date' });

// Asset metadata schema
export const AssetMetadataSchema = z.object({
  assetId: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().min(1).max(2000),
  assetType: AssetTypeSchema,
  specifications: AssetSpecificationsSchema,
  documents: z.array(DocumentReferenceSchema),
  metadata: z.object({
    createdAt: z.string().regex(isoDateRegex),
    updatedAt: z.string().regex(isoDateRegex),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (x.y.z)')
  })
});

// Lease agreement schema
export const LeaseAgreementSchema = z.object({
  leaseId: z.string().min(1).max(50),
  assetId: z.string().min(1).max(50),
  lessorAddress: z.string().regex(ethereumAddressRegex, 'Must be valid Ethereum address'),
  lesseeAddress: z.string().regex(ethereumAddressRegex, 'Must be valid Ethereum address'),
  terms: LeaseTermsSchema,
  legalDocument: DocumentReferenceSchema,
  metadataHash: z.string().regex(hashRegex),
  status: LeaseStatusSchema,
  signatures: z.object({
    lessor: z.string().optional(),
    lessee: z.string().optional()
  }).optional(),
  metadata: z.object({
    createdAt: z.string().regex(isoDateRegex),
    updatedAt: z.string().regex(isoDateRegex),
    version: z.string().regex(/^\d+\.\d+\.\d+$/)
  })
});

// Revenue schemas
export const RevenueClaimSchema = z.object({
  claimId: z.string().min(1),
  roundId: z.number().positive(),
  holderAddress: z.string().regex(ethereumAddressRegex),
  tokenBalance: z.string().regex(/^\d+$/),
  claimAmount: z.string().regex(/^\d+$/),
  claimed: z.boolean(),
  claimedAt: z.string().regex(isoDateRegex).optional(),
  transactionHash: z.string().regex(hashRegex).optional()
});

export const RevenueRoundSchema = z.object({
  roundId: z.number().positive(),
  assetId: z.string().min(1),
  snapshotId: z.string().min(1),
  totalAmount: z.string().regex(/^\d+$/),
  snapshotBlock: z.number().positive(),
  distributionData: z.array(RevenueClaimSchema),
  status: z.enum(['calculating', 'open', 'closed']),
  metadata: z.object({
    createdAt: z.string().regex(isoDateRegex),
    calculatedAt: z.string().regex(isoDateRegex).optional(),
    closedAt: z.string().regex(isoDateRegex).optional()
  })
});

// Configuration schemas
export const ContractAddressesSchema = z.object({
  assetRegistry: z.string().regex(ethereumAddressRegex),
  marketplace: z.string().regex(ethereumAddressRegex),
  leaseFactory: z.string().regex(ethereumAddressRegex)
});

export const TestConfigurationSchema = z.object({
  network: z.enum(['anvil', 'sepolia', 'mainnet']),
  rpcUrl: z.string().url(),
  privateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Must be valid private key'),
  contracts: ContractAddressesSchema,
  dataDir: z.string().min(1)
});

// Utility schemas
export const HashResultSchema = z.object({
  hash: z.string().regex(hashRegex),
  algorithm: z.literal('sha256'),
  input: z.union([z.string(), z.instanceof(Buffer)]),
  timestamp: z.string().regex(isoDateRegex)
});

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional()
});

// Schema export for runtime validation
export const schemas = {
  AssetType: AssetTypeSchema,
  DocumentType: DocumentTypeSchema,
  LeaseStatus: LeaseStatusSchema,
  PaymentSchedule: PaymentScheduleSchema,
  DocumentReference: DocumentReferenceSchema,
  AssetSpecifications: AssetSpecificationsSchema,
  LeaseSpecificTerms: LeaseSpecificTermsSchema,
  LeaseTerms: LeaseTermsSchema,
  AssetMetadata: AssetMetadataSchema,
  LeaseAgreement: LeaseAgreementSchema,
  RevenueClaim: RevenueClaimSchema,
  RevenueRound: RevenueRoundSchema,
  ContractAddresses: ContractAddressesSchema,
  TestConfiguration: TestConfigurationSchema,
  HashResult: HashResultSchema,
  ValidationResult: ValidationResultSchema
} as const;