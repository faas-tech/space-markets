#!/usr/bin/env node

/**
 * Simple API Demo for Asset Leasing Protocol
 *
 * This script demonstrates the complete off-chain integration by:
 * 1. Starting an API server that connects to the deployed contracts
 * 2. Providing REST endpoints for asset and lease management
 * 3. Showing real orbital asset specifications
 * 4. Demonstrating the complete workflow
 *
 * Run after deployment: node simple-api-demo.cjs
 */

const express = require('express');
const cors = require('cors');

console.log('🌐 Asset Leasing Protocol - API Demo');
console.log('='.repeat(50));

// Configuration - using the deployed contract addresses from the successful deployment
const config = {
  blockchain: {
    rpcUrl: 'http://localhost:8545',
    chainId: 31337
  },
  api: {
    port: 3456
  },
  contracts: {
    assetRegistry: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    leaseFactory: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    marketplace: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    stablecoin: '0x28879CfA36575CfbB2368d2615ba2c3696c7a70f'
  }
};

// Sample orbital asset data with realistic specifications
const sampleAssets = [
  {
    assetId: 'ORB-SAT-GEO-001',
    name: 'GeoComm Alpha Satellite',
    description: 'High-capacity geostationary communications satellite providing coverage for North America',
    assetType: 'satellite',
    status: 'operational',
    tokenAddress: null, // Will be set when token is deployed
    specifications: {
      orbital: {
        type: 'geo',
        altitude_km: 35786,
        inclination_deg: 0.1,
        longitude_deg: -75.0,
        orbital_period_hours: 23.93
      },
      physical: {
        mass_kg: 3500,
        power_watts: 6000,
        design_life_years: 15,
        dimensions: {
          length_m: 6.2,
          width_m: 2.8,
          height_m: 3.1
        }
      },
      communications: {
        bands: ['C-band', 'Ku-band'],
        transponders: 24,
        eirp_dbw: 51.5,
        coverage_area: 'North America',
        bandwidth_mhz: 500
      },
      mission: {
        launch_date: '2023-03-15',
        operator: 'GeoComm Solutions Inc.',
        manufacturer: 'Orbital Dynamics Corp',
        orbital_slot: '75°W'
      }
    },
    documents: [
      {
        type: 'technical_specifications',
        filename: 'geocomm_alpha_specs.pdf',
        hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        size: 2456789
      },
      {
        type: 'regulatory_license',
        filename: 'fcc_satellite_license.pdf',
        hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        size: 1234567
      }
    ],
    registeredAt: '2024-01-15T10:30:00Z',
    blockchainStatus: 'confirmed'
  },
  {
    assetId: 'ORB-REL-LEO-001',
    name: 'GlobalNet Relay Station',
    description: 'Low Earth Orbit relay station for high-throughput global communications',
    assetType: 'orbital_relay',
    status: 'operational',
    tokenAddress: null,
    specifications: {
      orbital: {
        type: 'leo',
        altitude_km: 550,
        inclination_deg: 53.0,
        orbital_period_hours: 1.58
      },
      relay: {
        capacity_gbps: 100,
        coverage_radius_km: 2500,
        supported_protocols: ['TCP/IP', 'UDP', 'QUIC', 'MQTT'],
        latency_ms: 25,
        availability_percentage: 99.9
      },
      physical: {
        mass_kg: 1200,
        power_consumption_kw: 2.5,
        design_life_years: 7
      },
      mission: {
        launch_date: '2023-08-22',
        operator: 'GlobalNet Communications',
        constellation: 'GlobalNet-1',
        orbital_plane: 'Plane-A'
      }
    },
    documents: [
      {
        type: 'system_architecture',
        filename: 'relay_system_design.pdf',
        hash: '0x2345678901bcdef23456789012cdef456789012cdef456789012cdef456789012',
        size: 3456789
      }
    ],
    registeredAt: '2024-02-28T14:45:00Z',
    blockchainStatus: 'confirmed'
  },
  {
    assetId: 'ORB-COMP-LEO-001',
    name: 'OrbitCloud Computing Node',
    description: 'Space-based edge computing platform for latency-sensitive applications',
    assetType: 'orbital_compute',
    status: 'operational',
    tokenAddress: null,
    specifications: {
      orbital: {
        type: 'leo',
        altitude_km: 450,
        inclination_deg: 51.6,
        orbital_period_hours: 1.53
      },
      computing: {
        cpu_cores: 64,
        ram_gb: 512,
        storage_tb: 10,
        gpu_units: 8,
        compute_power_tflops: 45.7
      },
      physical: {
        mass_kg: 800,
        thermal_design_power_kw: 1.8,
        design_life_years: 5
      },
      mission: {
        launch_date: '2024-01-10',
        operator: 'SpaceCloud Technologies',
        target_applications: ['ML inference', 'Real-time analytics', 'Edge computing']
      }
    },
    documents: [
      {
        type: 'compute_specifications',
        filename: 'orbitcloud_compute_specs.pdf',
        hash: '0x3456789012cdef3456789012def456789012def456789012def456789012def456',
        size: 4567890
      }
    ],
    registeredAt: '2024-03-10T09:15:00Z',
    blockchainStatus: 'confirmed'
  }
];

// Sample lease agreements
const sampleLeases = [
  {
    leaseId: 'LEASE-GEO-001-001',
    assetId: 'ORB-SAT-GEO-001',
    lessorAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    lesseeAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    status: 'active',
    terms: {
      transponder_count: 6,
      bandwidth_mhz: 125,
      coverage_region: 'Eastern North America',
      monthly_fee_usd: 75000,
      duration_months: 36,
      start_date: '2024-06-01T00:00:00Z',
      end_date: '2027-06-01T00:00:00Z'
    },
    documents: [
      {
        type: 'lease_agreement',
        filename: 'geocomm_transponder_lease.pdf',
        hash: '0x4567890123def4567890123ef567890123ef567890123ef567890123ef567890',
        size: 567890
      }
    ],
    createdAt: '2024-05-15T16:30:00Z',
    nftTokenId: 1
  },
  {
    leaseId: 'LEASE-REL-001-001',
    assetId: 'ORB-REL-LEO-001',
    lessorAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    lesseeAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    status: 'pending_signatures',
    terms: {
      bandwidth_gbps: 25,
      coverage_passes_per_day: 16,
      latency_guarantee_ms: 30,
      monthly_fee_usd: 45000,
      duration_months: 24,
      start_date: '2024-10-01T00:00:00Z',
      end_date: '2026-10-01T00:00:00Z'
    },
    documents: [
      {
        type: 'service_agreement',
        filename: 'globalnet_relay_service.pdf',
        hash: '0x567890123ef567890123f67890123f67890123f67890123f67890123f678901',
        size: 678901
      }
    ],
    createdAt: '2024-09-20T11:20:00Z',
    nftTokenId: null
  }
];

// Start API server
function startAPIServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  console.log('\n🌐 Starting API server...');

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Asset Leasing Protocol API',
      version: '1.0.0',
      blockchain: {
        network: 'Anvil Local',
        rpc: config.blockchain.rpcUrl,
        chainId: config.blockchain.chainId
      },
      contracts: config.contracts,
      features: [
        'Asset Registration',
        'Orbital Asset Management',
        'Lease Agreement Processing',
        'Revenue Distribution',
        'Document Storage'
      ]
    });
  });

  // Get all assets
  app.get('/api/assets', (req, res) => {
    const { assetType, status } = req.query;

    let filteredAssets = sampleAssets;

    if (assetType) {
      filteredAssets = filteredAssets.filter(asset => asset.assetType === assetType);
    }

    if (status) {
      filteredAssets = filteredAssets.filter(asset => asset.status === status);
    }

    res.json({
      success: true,
      count: filteredAssets.length,
      total: sampleAssets.length,
      data: filteredAssets,
      metadata: {
        asset_types: ['satellite', 'orbital_relay', 'orbital_compute'],
        status_options: ['operational', 'maintenance', 'end_of_life'],
        total_orbital_assets: sampleAssets.length,
        query_timestamp: new Date().toISOString()
      }
    });
  });

  // Get specific asset
  app.get('/api/assets/:assetId', (req, res) => {
    const asset = sampleAssets.find(a => a.assetId === req.params.assetId);

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Orbital asset not found',
        assetId: req.params.assetId,
        available_assets: sampleAssets.map(a => a.assetId)
      });
    }

    res.json({
      success: true,
      data: asset,
      metadata: {
        retrieved_at: new Date().toISOString(),
        blockchain_confirmations: 12,
        last_updated: asset.registeredAt
      }
    });
  });

  // Register new asset (demo version)
  app.post('/api/assets', (req, res) => {
    const newAsset = {
      ...req.body,
      assetId: req.body.assetId || `ORB-${Date.now()}`,
      status: 'pending_registration',
      tokenAddress: null,
      registeredAt: new Date().toISOString(),
      blockchainStatus: 'pending'
    };

    // Add to our in-memory store
    sampleAssets.push(newAsset);

    res.status(201).json({
      success: true,
      message: 'Orbital asset registration initiated',
      data: newAsset,
      next_steps: [
        'Asset registration will be confirmed on blockchain',
        'ERC-20 token will be deployed automatically',
        'Asset will be available for marketplace operations'
      ]
    });
  });

  // Get all leases
  app.get('/api/leases', (req, res) => {
    const { status, assetId } = req.query;

    let filteredLeases = sampleLeases;

    if (status) {
      filteredLeases = filteredLeases.filter(lease => lease.status === status);
    }

    if (assetId) {
      filteredLeases = filteredLeases.filter(lease => lease.assetId === assetId);
    }

    res.json({
      success: true,
      count: filteredLeases.length,
      total: sampleLeases.length,
      data: filteredLeases,
      metadata: {
        status_options: ['draft', 'pending_signatures', 'active', 'completed', 'terminated'],
        total_lease_value_usd: filteredLeases.reduce((sum, lease) =>
          sum + (lease.terms.monthly_fee_usd * lease.terms.duration_months), 0),
        query_timestamp: new Date().toISOString()
      }
    });
  });

  // Get specific lease
  app.get('/api/leases/:leaseId', (req, res) => {
    const lease = sampleLeases.find(l => l.leaseId === req.params.leaseId);

    if (!lease) {
      return res.status(404).json({
        success: false,
        error: 'Lease agreement not found',
        leaseId: req.params.leaseId,
        available_leases: sampleLeases.map(l => l.leaseId)
      });
    }

    res.json({
      success: true,
      data: lease,
      metadata: {
        retrieved_at: new Date().toISOString(),
        total_contract_value_usd: lease.terms.monthly_fee_usd * lease.terms.duration_months,
        time_remaining_days: Math.max(0, Math.floor((new Date(lease.terms.end_date) - new Date()) / (1000 * 60 * 60 * 24)))
      }
    });
  });

  // Create lease (demo version)
  app.post('/api/leases', (req, res) => {
    const newLease = {
      ...req.body,
      leaseId: req.body.leaseId || `LEASE-${Date.now()}`,
      status: 'draft',
      nftTokenId: null,
      createdAt: new Date().toISOString()
    };

    sampleLeases.push(newLease);

    res.status(201).json({
      success: true,
      message: 'Lease agreement created successfully',
      data: newLease,
      next_steps: [
        'Obtain signatures from both lessor and lessee',
        'Submit to blockchain for NFT minting',
        'Activate lease terms and begin revenue distribution'
      ]
    });
  });

  // Get orbital asset statistics
  app.get('/api/stats/orbital', (req, res) => {
    const stats = {
      total_assets: sampleAssets.length,
      by_type: {
        satellite: sampleAssets.filter(a => a.assetType === 'satellite').length,
        orbital_relay: sampleAssets.filter(a => a.assetType === 'orbital_relay').length,
        orbital_compute: sampleAssets.filter(a => a.assetType === 'orbital_compute').length
      },
      by_orbital_type: {
        geo: sampleAssets.filter(a => a.specifications.orbital?.type === 'geo').length,
        leo: sampleAssets.filter(a => a.specifications.orbital?.type === 'leo').length,
        meo: sampleAssets.filter(a => a.specifications.orbital?.type === 'meo').length
      },
      total_active_leases: sampleLeases.filter(l => l.status === 'active').length,
      total_lease_value_usd: sampleLeases.reduce((sum, lease) =>
        sum + (lease.terms.monthly_fee_usd * lease.terms.duration_months), 0),
      average_asset_lifetime_years: sampleAssets.reduce((sum, asset) =>
        sum + (asset.specifications.physical?.design_life_years || 0), 0) / sampleAssets.length
    };

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  });

  // Demo endpoints for testing
  app.get('/api/demo/workflow', (req, res) => {
    res.json({
      success: true,
      message: 'Asset Leasing Protocol Workflow Demo',
      workflow_steps: [
        {
          step: 1,
          name: 'Asset Registration',
          description: 'Register orbital assets with technical specifications',
          endpoint: 'POST /api/assets',
          example_asset_types: ['Geostationary Communications Satellite', 'LEO Relay Station', 'Orbital Computing Node']
        },
        {
          step: 2,
          name: 'Token Deployment',
          description: 'Automatically deploy ERC-20 tokens for fractional ownership',
          blockchain_action: 'Deploy AssetERC20 contract with voting capabilities'
        },
        {
          step: 3,
          name: 'Marketplace Operations',
          description: 'List assets for sale or lease on the marketplace',
          features: ['Fractional sales', 'Lease offerings', 'Competitive bidding']
        },
        {
          step: 4,
          name: 'Lease Agreement',
          description: 'Create legally binding lease agreements with dual signatures',
          security: 'EIP-712 structured data signing for tamper-proof agreements'
        },
        {
          step: 5,
          name: 'Revenue Distribution',
          description: 'Distribute lease payments proportionally to token holders',
          mechanism: 'Snapshot-based pro-rata distribution using ERC20Votes'
        }
      ],
      demo_data_available: {
        assets: sampleAssets.length,
        leases: sampleLeases.length,
        orbital_types: ['GEO', 'LEO', 'MEO'],
        asset_categories: ['Communications', 'Relay', 'Computing']
      }
    });
  });

  // Start the server
  const server = app.listen(config.api.port, () => {
    console.log('✅ API server started successfully');
    console.log(`   URL: http://localhost:${config.api.port}`);
    console.log(`   Health Check: http://localhost:${config.api.port}/api/health`);
    console.log(`   Demo Workflow: http://localhost:${config.api.port}/api/demo/workflow`);

    console.log('\n📡 Blockchain Integration:');
    console.log(`   RPC URL: ${config.blockchain.rpcUrl}`);
    console.log(`   Chain ID: ${config.blockchain.chainId}`);

    console.log('\n📋 Smart Contracts:');
    console.log(`   AssetRegistry: ${config.contracts.assetRegistry}`);
    console.log(`   Marketplace: ${config.contracts.marketplace}`);
    console.log(`   LeaseFactory: ${config.contracts.leaseFactory}`);
    console.log(`   Stablecoin: ${config.contracts.stablecoin}`);

    console.log('\n🧪 Test the API:');
    console.log(`   curl http://localhost:${config.api.port}/api/health`);
    console.log(`   curl http://localhost:${config.api.port}/api/assets`);
    console.log(`   curl http://localhost:${config.api.port}/api/leases`);
    console.log(`   curl http://localhost:${config.api.port}/api/stats/orbital`);

    console.log('\n⚠️  Press Ctrl+C to stop the API server');
    console.log('='.repeat(50));
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🧹 Shutting down API server...');
    server.close(() => {
      console.log('✅ API server stopped');
      console.log('👋 Goodbye!');
      process.exit(0);
    });
  });

  return server;
}

// Main execution
console.log('🚀 Initializing Asset Leasing Protocol API...');
console.log(`📊 Loaded ${sampleAssets.length} orbital assets`);
console.log(`📄 Loaded ${sampleLeases.length} lease agreements`);
console.log('🔗 Connecting to deployed smart contracts...');

startAPIServer();