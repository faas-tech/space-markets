/**
 * Test Data Factory
 *
 * Generates realistic asset metadata and lease agreements for testing.
 * Ensures data is properly structured and consistent with schema requirements.
 */

import type {
  AssetMetadata,
  LeaseAgreement,
  LeaseTerms,
  DocumentReference,
  SatelliteSpecifications,
  OrbitalComputeSpecifications,
  OrbitalRelaySpecifications,
  SatelliteLeaseTerms,
  OrbitalComputeLeaseTerms,
  OrbitalRelayLeaseTerms
} from '../types/index.js';
import { generateDocumentId, generateLeaseId, generateDocumentHash } from './crypto.js';

/**
 * Generate a sample satellite asset
 */
export function createSatelliteAsset(params?: {
  assetId?: string;
  name?: string;
  altitude?: number;
}): AssetMetadata {
  const timestamp = new Date().toISOString();
  const assetId = params?.assetId || `SAT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const specifications: SatelliteSpecifications = {
    type: 'satellite',
    orbital: {
      type: 'leo',
      altitude_km: params?.altitude || 550,
      inclination_deg: 97.4,
      period_hours: 1.58,
    },
    physical: {
      mass_kg: 500,
      power_watts: 300,
      design_life_years: 5,
      dimensions: {
        length_m: 2.5,
        width_m: 1.2,
        height_m: 1.8
      }
    },
    mission: {
      primary_mission: 'earth_observation',
      launch_date: '2024-01-15T00:00:00Z',
      operator: 'OrbitalAssets Inc',
      manufacturer: 'SpaceTech Systems'
    },
    imaging: {
      resolution_m: 0.5,
      swath_width_km: 50,
      spectral_bands: ['RGB', 'NIR', 'SWIR'],
      revisit_time_hours: 12
    }
  };

  // Generate sample documents
  const documents: DocumentReference[] = [
    {
      documentId: generateDocumentId('doc'),
      filename: 'technical_specifications.pdf',
      documentType: 'specification',
      hash: generateDocumentHash(Buffer.from('technical specifications content')).hash,
      size: 2457600, // ~2.4 MB
      uploadedAt: timestamp,
      description: 'Complete technical specifications and performance parameters'
    },
    {
      documentId: generateDocumentId('doc'),
      filename: 'safety_certification.pdf',
      documentType: 'certification',
      hash: generateDocumentHash(Buffer.from('safety certification content')).hash,
      size: 1048576, // 1 MB
      uploadedAt: timestamp,
      description: 'FCC and ITU safety and compliance certification'
    },
    {
      documentId: generateDocumentId('doc'),
      filename: 'operators_manual.pdf',
      documentType: 'manual',
      hash: generateDocumentHash(Buffer.from('operators manual content')).hash,
      size: 5242880, // 5 MB
      uploadedAt: timestamp,
      description: 'Complete operators manual and maintenance procedures'
    }
  ];

  return {
    assetId,
    name: params?.name || 'Alpha-1 Earth Observation Satellite',
    description: 'High-resolution Earth observation satellite with multi-spectral imaging capabilities. Designed for environmental monitoring, agricultural analysis, and disaster response applications.',
    assetType: 'satellite',
    specifications,
    documents,
    metadata: {
      createdAt: timestamp,
      updatedAt: timestamp,
      version: '1.0.0'
    }
  };
}

/**
 * Generate a sample orbital compute asset
 */
export function createOrbitalComputeAsset(params?: {
  assetId?: string;
  name?: string;
  cpuCores?: number;
}): AssetMetadata {
  const timestamp = new Date().toISOString();
  const assetId = params?.assetId || `COMPUTE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const specifications: OrbitalComputeSpecifications = {
    type: 'orbital_compute',
    orbital: {
      type: 'leo',
      altitude_km: 500,
      inclination_deg: 51.6,
      period_hours: 1.55
    },
    compute: {
      cpu_cores: params?.cpuCores || 64,
      ram_gb: 256,
      storage_tb: 10,
      gpu_units: 4,
      specialized_processors: ['Tensor Processing Unit', 'Neural Processing Unit']
    },
    networking: {
      bandwidth_gbps: 100,
      latency_ms: 25,
      connectivity: ['laser_link', 'rf_link', 'ground_station']
    },
    physical: {
      power_consumption_kw: 5.5,
      thermal_design_power_kw: 6.0,
      mass_kg: 800,
      design_life_years: 7
    }
  };

  const documents: DocumentReference[] = [
    {
      documentId: generateDocumentId('doc'),
      filename: 'compute_specifications.pdf',
      documentType: 'specification',
      hash: generateDocumentHash(Buffer.from('compute specs content')).hash,
      size: 3145728, // 3 MB
      uploadedAt: timestamp,
      description: 'Detailed compute and processing specifications'
    },
    {
      documentId: generateDocumentId('doc'),
      filename: 'security_certification.pdf',
      documentType: 'certification',
      hash: generateDocumentHash(Buffer.from('security cert content')).hash,
      size: 1572864, // 1.5 MB
      uploadedAt: timestamp,
      description: 'ISO 27001 and SOC 2 Type II security certifications'
    }
  ];

  return {
    assetId,
    name: params?.name || 'OrbitalEdge-1 Compute Platform',
    description: 'High-performance orbital edge computing platform with AI/ML acceleration capabilities. Provides ultra-low latency processing for space-based applications and global edge computing workloads.',
    assetType: 'orbital_compute',
    specifications,
    documents,
    metadata: {
      createdAt: timestamp,
      updatedAt: timestamp,
      version: '1.0.0'
    }
  };
}

/**
 * Generate a sample orbital relay asset
 */
export function createOrbitalRelayAsset(params?: {
  assetId?: string;
  name?: string;
  channels?: number;
}): AssetMetadata {
  const timestamp = new Date().toISOString();
  const assetId = params?.assetId || `RELAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const specifications: OrbitalRelaySpecifications = {
    type: 'orbital_relay',
    orbital: {
      type: 'meo',
      altitude_km: 8000,
      inclination_deg: 55.0,
      period_hours: 6.0
    },
    relay: {
      channels: params?.channels || 500,
      max_throughput_gbps: 250,
      coverage_area_km2: 50000000, // 50M km²
      signal_power_dbm: 45,
      frequency_bands: ['Ka-band', 'Ku-band', 'V-band']
    },
    physical: {
      mass_kg: 1200,
      power_watts: 3500,
      design_life_years: 10
    },
    networking: {
      protocols: ['TCP/IP', 'QUIC', 'DTN'],
      routing_capability: true,
      mesh_network_support: true
    }
  };

  const documents: DocumentReference[] = [
    {
      documentId: generateDocumentId('doc'),
      filename: 'relay_specifications.pdf',
      documentType: 'specification',
      hash: generateDocumentHash(Buffer.from('relay specs content')).hash,
      size: 2621440, // 2.5 MB
      uploadedAt: timestamp,
      description: 'Complete relay and communication specifications'
    },
    {
      documentId: generateDocumentId('doc'),
      filename: 'frequency_allocation.pdf',
      documentType: 'regulatory_filing',
      hash: generateDocumentHash(Buffer.from('frequency allocation content')).hash,
      size: 1048576, // 1 MB
      uploadedAt: timestamp,
      description: 'ITU frequency allocation and licensing documentation'
    }
  ];

  return {
    assetId,
    name: params?.name || 'SpaceLink-1 Communications Relay',
    description: 'High-capacity orbital communications relay supporting global connectivity and inter-satellite links. Provides seamless data routing for LEO constellations and ground networks.',
    assetType: 'orbital_relay',
    specifications,
    documents,
    metadata: {
      createdAt: timestamp,
      updatedAt: timestamp,
      version: '1.0.0'
    }
  };
}

/**
 * Generate a lease agreement for a satellite
 */
export function createSatelliteLease(params: {
  assetId: string;
  lessorAddress: string;
  lesseeAddress: string;
  startDate?: Date;
  durationDays?: number;
  paymentAmount?: string;
}): LeaseAgreement {
  const timestamp = new Date().toISOString();
  const startDate = params.startDate || new Date(Date.now() + 86400000); // Tomorrow
  const endDate = new Date(startDate.getTime() + (params.durationDays || 30) * 86400000);

  const specificTerms: SatelliteLeaseTerms = {
    assetType: 'satellite',
    orbital_period_hours: 1.58,
    communication_frequency_ghz: 8.4,
    coverage_area_km2: 2500000,
    imaging_resolution_m: 0.5,
    data_download_rights: true,
    orbit_maintenance_responsibility: 'lessor'
  };

  const terms: LeaseTerms = {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    paymentAmount: params.paymentAmount || '1000000000000000000000', // 1000 tokens (wei)
    paymentSchedule: 'monthly',
    currency: 'USDC',
    restrictions: [
      'No military applications',
      'Environmental monitoring only',
      'Data sharing restrictions apply'
    ],
    specificTerms
  };

  const legalDocument: DocumentReference = {
    documentId: generateDocumentId('lease'),
    filename: 'lease_agreement.pdf',
    documentType: 'lease_agreement',
    hash: generateDocumentHash(Buffer.from('lease agreement content')).hash,
    size: 524288, // 512 KB
    uploadedAt: timestamp,
    description: 'Legally binding lease agreement with all terms and conditions'
  };

  const leaseId = generateLeaseId(params.assetId, params.lesseeAddress, timestamp);

  return {
    leaseId,
    assetId: params.assetId,
    lessorAddress: params.lessorAddress,
    lesseeAddress: params.lesseeAddress,
    terms,
    legalDocument,
    metadataHash: '0x0000000000000000000000000000000000000000000000000000000000000000', // Will be calculated
    status: 'pending_signatures',
    signatures: {
      lessor: undefined,
      lessee: undefined
    },
    metadata: {
      createdAt: timestamp,
      updatedAt: timestamp,
      version: '1.0.0'
    }
  };
}

/**
 * Generate a lease agreement for orbital compute
 */
export function createOrbitalComputeLease(params: {
  assetId: string;
  lessorAddress: string;
  lesseeAddress: string;
  startDate?: Date;
  durationDays?: number;
  paymentAmount?: string;
  computeCores?: number;
}): LeaseAgreement {
  const timestamp = new Date().toISOString();
  const startDate = params.startDate || new Date(Date.now() + 86400000);
  const endDate = new Date(startDate.getTime() + (params.durationDays || 30) * 86400000);

  const specificTerms: OrbitalComputeLeaseTerms = {
    assetType: 'orbital_compute',
    compute_cores: params.computeCores || 32,
    storage_tb: 5,
    bandwidth_gbps: 50,
    power_consumption_kw: 2.75,
    software_stack: ['TensorFlow', 'PyTorch', 'CUDA', 'Kubernetes'],
    data_sovereignty: 'US'
  };

  const terms: LeaseTerms = {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    paymentAmount: params.paymentAmount || '5000000000000000000000', // 5000 tokens
    paymentSchedule: 'monthly',
    currency: 'USDC',
    restrictions: [
      'ITAR compliance required',
      'Data encryption at rest',
      'No cryptocurrency mining'
    ],
    specificTerms
  };

  const legalDocument: DocumentReference = {
    documentId: generateDocumentId('lease'),
    filename: 'compute_lease_agreement.pdf',
    documentType: 'lease_agreement',
    hash: generateDocumentHash(Buffer.from('compute lease content')).hash,
    size: 614400, // 600 KB
    uploadedAt: timestamp,
    description: 'Compute resource lease agreement with SLA commitments'
  };

  const leaseId = generateLeaseId(params.assetId, params.lesseeAddress, timestamp);

  return {
    leaseId,
    assetId: params.assetId,
    lessorAddress: params.lessorAddress,
    lesseeAddress: params.lesseeAddress,
    terms,
    legalDocument,
    metadataHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    status: 'pending_signatures',
    metadata: {
      createdAt: timestamp,
      updatedAt: timestamp,
      version: '1.0.0'
    }
  };
}

/**
 * Generate a lease agreement for orbital relay
 */
export function createOrbitalRelayLease(params: {
  assetId: string;
  lessorAddress: string;
  lesseeAddress: string;
  startDate?: Date;
  durationDays?: number;
  paymentAmount?: string;
  channels?: number;
}): LeaseAgreement {
  const timestamp = new Date().toISOString();
  const startDate = params.startDate || new Date(Date.now() + 86400000);
  const endDate = new Date(startDate.getTime() + (params.durationDays || 30) * 86400000);

  const specificTerms: OrbitalRelayLeaseTerms = {
    assetType: 'orbital_relay',
    relay_channels: params.channels || 100,
    max_throughput_gbps: 50,
    coverage_area_km2: 10000000,
    signal_power_dbm: 40,
    quality_of_service: 'premium',
    redundancy_level: 2
  };

  const terms: LeaseTerms = {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    paymentAmount: params.paymentAmount || '3000000000000000000000', // 3000 tokens
    paymentSchedule: 'monthly',
    currency: 'USDC',
    restrictions: [
      'Commercial use only',
      'Priority routing for emergency services',
      'FCC compliance required'
    ],
    specificTerms
  };

  const legalDocument: DocumentReference = {
    documentId: generateDocumentId('lease'),
    filename: 'relay_lease_agreement.pdf',
    documentType: 'lease_agreement',
    hash: generateDocumentHash(Buffer.from('relay lease content')).hash,
    size: 565248, // 552 KB
    uploadedAt: timestamp,
    description: 'Relay bandwidth lease with guaranteed uptime SLA'
  };

  const leaseId = generateLeaseId(params.assetId, params.lesseeAddress, timestamp);

  return {
    leaseId,
    assetId: params.assetId,
    lessorAddress: params.lessorAddress,
    lesseeAddress: params.lesseeAddress,
    terms,
    legalDocument,
    metadataHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    status: 'pending_signatures',
    metadata: {
      createdAt: timestamp,
      updatedAt: timestamp,
      version: '1.0.0'
    }
  };
}

/**
 * Create a batch of diverse assets for testing
 */
export function createAssetBatch(count: number = 10): AssetMetadata[] {
  const assets: AssetMetadata[] = [];

  for (let i = 0; i < count; i++) {
    const assetType = i % 3;

    if (assetType === 0) {
      assets.push(createSatelliteAsset({
        name: `Test Satellite ${i + 1}`,
        altitude: 500 + (i * 50)
      }));
    } else if (assetType === 1) {
      assets.push(createOrbitalComputeAsset({
        name: `Test Compute ${i + 1}`,
        cpuCores: 32 + (i * 8)
      }));
    } else {
      assets.push(createOrbitalRelayAsset({
        name: `Test Relay ${i + 1}`,
        channels: 100 + (i * 50)
      }));
    }
  }

  return assets;
}
