#!/usr/bin/env tsx

/**
 * Generate Sample Data Script
 *
 * Creates additional sample data for testing the Asset Leasing Protocol
 * offchain system. Generates assets, leases, and revenue distributions
 * with realistic parameters.
 */

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import type { AssetMetadata, LeaseAgreement, RevenueRound } from '../src/types/index.js';
import { generateMetadataHash, generateDocumentId, generateLeaseId } from '../src/utils/crypto.js';
import { FileStorageManager } from '../src/utils/file-storage.js';

/**
 * Configuration for sample data generation
 */
interface SampleDataConfig {
  outputDir: string;
  generateAssets: number;
  generateLeases: number;
  generateRevenueRounds: number;
}

const defaultConfig: SampleDataConfig = {
  outputDir: './data',
  generateAssets: 10,
  generateLeases: 5,
  generateRevenueRounds: 3
};

/**
 * Template data for generating variations
 */
const assetTemplates = {
  satellite: {
    missions: ['communications', 'earth_observation', 'navigation', 'scientific'] as const,
    operators: ['Global Satellite Corp', 'Earth Observation Ltd', 'Navigation Systems Inc', 'Space Research Foundation'],
    manufacturers: ['Space Systems International', 'Advanced Satellite Tech', 'Orbital Dynamics Corp', 'Aerospace Solutions Ltd'],
    orbits: ['leo', 'meo', 'geo'] as const
  },
  orbital_compute: {
    operators: ['Cloud Computing Corp', 'Space Data Systems', 'Orbital Processing Ltd', 'Edge Computing Inc'],
    manufacturers: ['Space Computing Systems', 'Orbital Hardware Corp', 'Advanced Processing Ltd', 'Space Tech Solutions']
  },
  orbital_relay: {
    operators: ['Communication Networks Corp', 'Global Relay Systems', 'Space Communications Ltd', 'Orbital Networks Inc'],
    manufacturers: ['Relay Systems International', 'Communication Tech Corp', 'Space Network Solutions', 'Advanced Relay Ltd']
  }
};

/**
 * Generate sample satellite asset
 */
function generateSatelliteAsset(index: number): AssetMetadata {
  const templates = assetTemplates.satellite;
  const mission = templates.missions[index % templates.missions.length]!;
  const operator = templates.operators[index % templates.operators.length]!;
  const manufacturer = templates.manufacturers[index % templates.manufacturers.length]!;
  const orbitType = templates.orbits[index % templates.orbits.length]!;

  const assetId = `SAT-GEN-${String(index + 1).padStart(3, '0')}`;
  const name = `Generated Satellite ${index + 1}`;

  // Generate orbit parameters based on type
  let orbital;
  switch (orbitType) {
    case 'leo':
      orbital = {
        type: orbitType,
        altitude_km: 400 + Math.random() * 800, // 400-1200 km
        inclination_deg: Math.random() * 90,
        period_hours: 1.5 + Math.random() * 0.5 // 1.5-2 hours
      };
      break;
    case 'meo':
      orbital = {
        type: orbitType,
        altitude_km: 8000 + Math.random() * 12000, // 8000-20000 km
        inclination_deg: 30 + Math.random() * 60,
        period_hours: 4 + Math.random() * 8 // 4-12 hours
      };
      break;
    case 'geo':
      orbital = {
        type: orbitType,
        altitude_km: 35786,
        inclination_deg: Math.random() * 5,
        period_hours: 23.93,
        longitude_deg: -180 + Math.random() * 360
      };
      break;
  }

  const launchDate = new Date();
  launchDate.setDate(launchDate.getDate() - Math.random() * 3650); // Random date in last 10 years

  const asset: AssetMetadata = {
    assetId,
    name,
    description: `Generated ${mission} satellite for protocol testing. Features ${orbitType.toUpperCase()} orbit configuration with realistic specifications.`,
    assetType: 'satellite',
    specifications: {
      type: 'satellite',
      orbital,
      physical: {
        mass_kg: 1000 + Math.random() * 4000,
        power_watts: 2000 + Math.random() * 6000,
        design_life_years: 5 + Math.random() * 15,
        dimensions: {
          length_m: 3 + Math.random() * 5,
          width_m: 2 + Math.random() * 4,
          height_m: 2 + Math.random() * 3
        }
      },
      mission: {
        primary_mission: mission,
        launch_date: launchDate.toISOString(),
        operator,
        manufacturer
      }
    },
    documents: [
      {
        documentId: generateDocumentId(),
        filename: `${assetId.toLowerCase()}-manual.pdf`,
        documentType: 'manual',
        hash: generateMetadataHash({ assetId, type: 'manual', random: Math.random() }).hash,
        size: 1000000 + Math.random() * 3000000,
        uploadedAt: new Date().toISOString(),
        description: `Operations manual for ${name}`
      },
      {
        documentId: generateDocumentId(),
        filename: `${assetId.toLowerCase()}-specifications.pdf`,
        documentType: 'specification',
        hash: generateMetadataHash({ assetId, type: 'specification', random: Math.random() }).hash,
        size: 500000 + Math.random() * 2000000,
        uploadedAt: new Date().toISOString(),
        description: `Technical specifications for ${name}`
      }
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0'
    }
  };

  // Add mission-specific specifications
  if (mission === 'communications') {
    (asset.specifications as any).communications = {
      bands: ['C-band', 'Ku-band', 'Ka-band'].slice(0, 1 + Math.floor(Math.random() * 3)),
      transponders: 12 + Math.floor(Math.random() * 24),
      coverage_area: ['North America', 'Europe', 'Asia-Pacific', 'Global'][Math.floor(Math.random() * 4)],
      bandwidth_mhz: 100 + Math.random() * 900
    };
  } else if (mission === 'earth_observation') {
    (asset.specifications as any).imaging = {
      resolution_m: 0.3 + Math.random() * 2,
      swath_width_km: 10 + Math.random() * 40,
      spectral_bands: ['visible', 'near-infrared', 'shortwave-infrared', 'thermal'],
      revisit_time_hours: 6 + Math.random() * 42
    };
  }

  return asset;
}

/**
 * Generate sample orbital compute asset
 */
function generateOrbitalComputeAsset(index: number): AssetMetadata {
  const templates = assetTemplates.orbital_compute;
  const operator = templates.operators[index % templates.operators.length]!;
  const manufacturer = templates.manufacturers[index % templates.manufacturers.length]!;

  const assetId = `OCS-GEN-${String(index + 1).padStart(3, '0')}`;
  const name = `Generated Orbital Compute Station ${index + 1}`;

  return {
    assetId,
    name,
    description: `Generated orbital compute station providing cloud computing services from space. Features high-performance processors and substantial storage capacity.`,
    assetType: 'orbital_compute',
    specifications: {
      type: 'orbital_compute',
      orbital: {
        type: 'leo',
        altitude_km: 400 + Math.random() * 600,
        inclination_deg: 45 + Math.random() * 20,
        period_hours: 1.5 + Math.random() * 0.5
      },
      compute: {
        cpu_cores: 16 + Math.floor(Math.random() * 112), // 16-128 cores
        ram_gb: 64 + Math.floor(Math.random() * 960), // 64-1024 GB
        storage_tb: 10 + Math.floor(Math.random() * 190), // 10-200 TB
        gpu_units: Math.floor(Math.random() * 16), // 0-16 GPUs
        specialized_processors: ['AI accelerator', 'DSP array', 'cryptographic processor'].filter(() => Math.random() > 0.5)
      },
      networking: {
        bandwidth_gbps: 1 + Math.random() * 24, // 1-25 Gbps
        latency_ms: 20 + Math.random() * 80, // 20-100 ms
        connectivity: ['optical inter-satellite links', 'X-band downlink', 'Ka-band uplink']
      },
      physical: {
        power_consumption_kw: 2 + Math.random() * 18, // 2-20 kW
        thermal_design_power_kw: 3 + Math.random() * 22, // 3-25 kW
        mass_kg: 2000 + Math.random() * 6000, // 2-8 tons
        design_life_years: 3 + Math.random() * 7 // 3-10 years
      }
    },
    documents: [
      {
        documentId: generateDocumentId(),
        filename: `${assetId.toLowerCase()}-manual.pdf`,
        documentType: 'manual',
        hash: generateMetadataHash({ assetId, type: 'manual', random: Math.random() }).hash,
        size: 2000000 + Math.random() * 4000000,
        uploadedAt: new Date().toISOString(),
        description: `Operations manual for ${name}`
      }
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0'
    }
  };
}

/**
 * Generate sample orbital relay asset
 */
function generateOrbitalRelayAsset(index: number): AssetMetadata {
  const templates = assetTemplates.orbital_relay;
  const operator = templates.operators[index % templates.operators.length]!;
  const manufacturer = templates.manufacturers[index % templates.manufacturers.length]!;

  const assetId = `ORS-GEN-${String(index + 1).padStart(3, '0')}`;
  const name = `Generated Orbital Relay Station ${index + 1}`;

  return {
    assetId,
    name,
    description: `Generated orbital relay station providing communication services and network routing capabilities between ground stations and orbital assets.`,
    assetType: 'orbital_relay',
    specifications: {
      type: 'orbital_relay',
      orbital: {
        type: ['leo', 'meo'][Math.floor(Math.random() * 2)] as 'leo' | 'meo',
        altitude_km: 800 + Math.random() * 19200, // 800-20000 km
        inclination_deg: 30 + Math.random() * 60,
        period_hours: 2 + Math.random() * 10
      },
      relay: {
        channels: 8 + Math.floor(Math.random() * 56), // 8-64 channels
        max_throughput_gbps: 5 + Math.random() * 45, // 5-50 Gbps
        coverage_area_km2: 5000000 + Math.random() * 20000000, // 5-25 million km²
        signal_power_dbm: 30 + Math.random() * 20, // 30-50 dBm
        frequency_bands: ['S-band', 'X-band', 'Ka-band', 'V-band'].filter(() => Math.random() > 0.3)
      },
      physical: {
        mass_kg: 1000 + Math.random() * 2000, // 1-3 tons
        power_watts: 1500 + Math.random() * 3500, // 1.5-5 kW
        design_life_years: 7 + Math.random() * 8 // 7-15 years
      },
      networking: {
        protocols: ['TCP/IP', 'UDP', 'CCSDS', 'DVB-S2X'],
        routing_capability: Math.random() > 0.3,
        mesh_network_support: Math.random() > 0.4
      }
    },
    documents: [
      {
        documentId: generateDocumentId(),
        filename: `${assetId.toLowerCase()}-manual.pdf`,
        documentType: 'manual',
        hash: generateMetadataHash({ assetId, type: 'manual', random: Math.random() }).hash,
        size: 1500000 + Math.random() * 2500000,
        uploadedAt: new Date().toISOString(),
        description: `Operations manual for ${name}`
      }
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0'
    }
  };
}

/**
 * Generate sample lease agreement
 */
function generateSampleLease(assetId: string, assetType: string, index: number): LeaseAgreement {
  const leaseId = generateLeaseId(assetId, `0x${Math.random().toString(16).substr(2, 40)}`, new Date().toISOString());

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + Math.random() * 30); // Start within next 30 days

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 3 + Math.random() * 21); // 3-24 month lease

  const paymentSchedules: Array<'monthly' | 'quarterly' | 'annual'> = ['monthly', 'quarterly', 'annual'];
  const paymentSchedule = paymentSchedules[Math.floor(Math.random() * paymentSchedules.length)]!;

  // Generate payment amount (in wei)
  const baseAmount = BigInt(Math.floor(50000 + Math.random() * 200000)); // 50k-250k
  const paymentAmount = (baseAmount * BigInt(10) ** BigInt(18)).toString();

  let specificTerms;
  switch (assetType) {
    case 'satellite':
      specificTerms = {
        assetType: 'satellite' as const,
        orbital_period_hours: 1.5 + Math.random() * 22,
        communication_frequency_ghz: 1 + Math.random() * 30,
        coverage_area_km2: 1000000 + Math.random() * 49000000,
        data_download_rights: Math.random() > 0.3,
        orbit_maintenance_responsibility: ['lessor', 'lessee', 'shared'][Math.floor(Math.random() * 3)] as 'lessor' | 'lessee' | 'shared'
      };
      break;
    case 'orbital_compute':
      specificTerms = {
        assetType: 'orbital_compute' as const,
        compute_cores: 8 + Math.floor(Math.random() * 56),
        storage_tb: 5 + Math.floor(Math.random() * 95),
        bandwidth_gbps: 1 + Math.random() * 14,
        power_consumption_kw: 1 + Math.random() * 9,
        software_stack: ['Ubuntu 22.04 LTS', 'Docker', 'Kubernetes'].filter(() => Math.random() > 0.3),
        data_sovereignty: ['United States', 'European Union', 'Japan', 'Canada'][Math.floor(Math.random() * 4)]!
      };
      break;
    case 'orbital_relay':
      specificTerms = {
        assetType: 'orbital_relay' as const,
        relay_channels: 4 + Math.floor(Math.random() * 28),
        max_throughput_gbps: 2 + Math.random() * 23,
        coverage_area_km2: 2000000 + Math.random() * 13000000,
        signal_power_dbm: 25 + Math.random() * 25,
        quality_of_service: ['standard', 'premium', 'guaranteed'][Math.floor(Math.random() * 3)] as 'standard' | 'premium' | 'guaranteed',
        redundancy_level: 1 + Math.floor(Math.random() * 4)
      };
      break;
    default:
      throw new Error(`Unknown asset type: ${assetType}`);
  }

  return {
    leaseId,
    assetId,
    lessorAddress: '0x742d35Cc6511C84a92A30A7D7B0D6E1234567890',
    lesseeAddress: `0x${Math.random().toString(16).substr(2, 40).padStart(40, '0')}`,
    terms: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      paymentAmount,
      paymentSchedule,
      currency: 'ETH',
      restrictions: [
        'Compliance with all applicable regulations required',
        'Regular status reports mandatory',
        'Emergency access reserved for operator'
      ].filter(() => Math.random() > 0.4),
      specificTerms
    },
    legalDocument: {
      documentId: generateDocumentId(),
      filename: `${leaseId.toLowerCase()}-agreement.pdf`,
      documentType: 'lease_agreement',
      hash: generateMetadataHash({ leaseId, type: 'lease_agreement', random: Math.random() }).hash,
      size: 1500000 + Math.random() * 1500000,
      uploadedAt: new Date().toISOString(),
      description: `Lease agreement for ${assetId}`
    },
    metadataHash: generateMetadataHash({ leaseId, assetId, timestamp: Date.now() }).hash,
    status: ['draft', 'pending_signatures', 'active'][Math.floor(Math.random() * 3)] as 'draft' | 'pending_signatures' | 'active',
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0'
    }
  };
}

/**
 * Main generation function
 */
async function generateSampleData(config: SampleDataConfig): Promise<void> {
  console.log('Starting sample data generation...');

  const storage = new FileStorageManager({ baseDir: config.outputDir });
  await storage.initialize();

  // Generate assets
  const assets: AssetMetadata[] = [];
  const assetTypes = ['satellite', 'orbital_compute', 'orbital_relay'] as const;

  for (let i = 0; i < config.generateAssets; i++) {
    const assetType = assetTypes[i % assetTypes.length]!;
    let asset: AssetMetadata;

    switch (assetType) {
      case 'satellite':
        asset = generateSatelliteAsset(Math.floor(i / 3));
        break;
      case 'orbital_compute':
        asset = generateOrbitalComputeAsset(Math.floor(i / 3));
        break;
      case 'orbital_relay':
        asset = generateOrbitalRelayAsset(Math.floor(i / 3));
        break;
    }

    assets.push(asset);
    const result = await storage.saveAsset(asset);

    if (result.success) {
      console.log(`Generated asset: ${asset.assetId} (${asset.assetType})`);
    } else {
      console.error(`Failed to save asset: ${asset.assetId}`);
    }
  }

  // Generate leases
  for (let i = 0; i < config.generateLeases && i < assets.length; i++) {
    const asset = assets[i]!;
    const lease = generateSampleLease(asset.assetId, asset.assetType, i);

    const result = await storage.saveLease(lease);

    if (result.success) {
      console.log(`Generated lease: ${lease.leaseId} for asset ${asset.assetId}`);
    } else {
      console.error(`Failed to save lease: ${lease.leaseId}`);
    }
  }

  console.log(`Sample data generation complete!`);
  console.log(`Generated ${assets.length} assets and ${Math.min(config.generateLeases, assets.length)} leases`);
}

/**
 * CLI interface
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const config = { ...defaultConfig };

  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];

    switch (key) {
      case '--output-dir':
        config.outputDir = value!;
        break;
      case '--assets':
        config.generateAssets = parseInt(value!, 10);
        break;
      case '--leases':
        config.generateLeases = parseInt(value!, 10);
        break;
      case '--help':
        console.log(`
Usage: tsx scripts/generate-sample-data.ts [options]

Options:
  --output-dir <dir>    Output directory (default: ./data)
  --assets <count>      Number of assets to generate (default: 10)
  --leases <count>      Number of leases to generate (default: 5)
  --help               Show this help message
`);
        process.exit(0);
    }
  }

  try {
    await generateSampleData(config);
  } catch (error) {
    console.error('Error generating sample data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}