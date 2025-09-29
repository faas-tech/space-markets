#!/usr/bin/env node

/**
 * Simple Demo of Asset Leasing Protocol Off-Chain Integration
 *
 * This script demonstrates how to:
 * 1. Start an Anvil blockchain locally
 * 2. Deploy smart contracts
 * 3. Run off-chain services that interact with the contracts
 * 4. Show the complete asset lifecycle
 *
 * Run with: node simple-demo.js
 */

const { spawn } = require('child_process');
const { ethers } = require('ethers');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

console.log('🚀 Asset Leasing Protocol - Off-Chain Integration Demo');
console.log('='.repeat(60));

// Configuration
const config = {
  anvil: {
    port: 8545,
    chainId: 31337
  },
  api: {
    port: 3001
  },
  contracts: {
    deployer: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' // Default anvil account
  }
};

let anvilProcess = null;
let apiServer = null;

// Sample orbital asset data
const sampleAssets = [
  {
    assetId: 'ORB-SAT-GEO-001',
    name: 'GeoComm Alpha Satellite',
    description: 'Geostationary communications satellite for North American coverage',
    assetType: 'satellite',
    specifications: {
      orbital: {
        type: 'geo',
        altitude_km: 35786,
        inclination_deg: 0.1,
        longitude_deg: -75.0
      },
      physical: {
        mass_kg: 3500,
        power_watts: 6000,
        design_life_years: 15
      },
      communications: {
        bands: ['C-band', 'Ku-band'],
        transponders: 24,
        coverage_area: 'North America'
      }
    }
  },
  {
    assetId: 'ORB-REL-LEO-001',
    name: 'GlobalNet Relay Station',
    description: 'Low Earth Orbit relay station for global communications',
    assetType: 'orbital_relay',
    specifications: {
      orbital: {
        type: 'leo',
        altitude_km: 550,
        inclination_deg: 53.0
      },
      relay: {
        capacity_gbps: 100,
        coverage_radius_km: 2500,
        supported_protocols: ['TCP/IP', 'UDP', 'QUIC']
      }
    }
  }
];

// Start Anvil blockchain
function startAnvil() {
  return new Promise((resolve, reject) => {
    console.log('\n📡 Starting Anvil blockchain...');

    anvilProcess = spawn('anvil', [
      '--port', config.anvil.port.toString(),
      '--chain-id', config.anvil.chainId.toString(),
      '--gas-limit', '30000000'
    ]);

    anvilProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Listening on')) {
        console.log('✅ Anvil started successfully');
        console.log(`   URL: http://localhost:${config.anvil.port}`);
        console.log(`   Chain ID: ${config.anvil.chainId}`);
        setTimeout(resolve, 2000); // Give it a moment to be fully ready
      }
    });

    anvilProcess.stderr.on('data', (data) => {
      console.error('Anvil error:', data.toString());
    });

    anvilProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Anvil exited with code ${code}`));
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error('Anvil startup timeout'));
    }, 10000);
  });
}

// Deploy contracts using Foundry
function deployContracts() {
  return new Promise((resolve, reject) => {
    console.log('\n🚀 Deploying smart contracts...');

    // Go back to project root for deployment
    const projectRoot = path.join(__dirname, '../..');

    const deployProcess = spawn('forge', [
      'script',
      'script/Deploy.s.sol:Deploy',
      '--rpc-url', `http://localhost:${config.anvil.port}`,
      '--private-key', config.contracts.deployer,
      '--broadcast'
    ], { cwd: projectRoot });

    let deployOutput = '';

    deployProcess.stdout.on('data', (data) => {
      const output = data.toString();
      deployOutput += output;
      console.log(output);
    });

    deployProcess.stderr.on('data', (data) => {
      console.log(data.toString());
    });

    deployProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Contracts deployed successfully');

        // Try to extract contract addresses from output
        const addresses = extractContractAddresses(deployOutput);
        resolve(addresses);
      } else {
        reject(new Error(`Contract deployment failed with code ${code}`));
      }
    });
  });
}

// Extract contract addresses from deployment output
function extractContractAddresses(output) {
  const addresses = {};

  // Look for common patterns in forge deployment output
  const patterns = {
    assetRegistry: /AssetRegistry.*?0x[a-fA-F0-9]{40}/,
    marketplace: /Marketplace.*?0x[a-fA-F0-9]{40}/,
    leaseFactory: /LeaseFactory.*?0x[a-fA-F0-9]{40}/,
    stablecoin: /Stablecoin.*?0x[a-fA-F0-9]{40}/
  };

  Object.entries(patterns).forEach(([name, pattern]) => {
    const match = output.match(pattern);
    if (match) {
      const addressMatch = match[0].match(/0x[a-fA-F0-9]{40}/);
      if (addressMatch) {
        addresses[name] = addressMatch[0];
      }
    }
  });

  return addresses;
}

// Start API server
function startAPIServer(contractAddresses) {
  return new Promise((resolve) => {
    console.log('\n🌐 Starting API server...');

    const app = express();
    app.use(cors());
    app.use(express.json());

    // In-memory database for demo
    let assets = [];
    let leases = [];

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        blockchain: {
          rpc: `http://localhost:${config.anvil.port}`,
          chainId: config.anvil.chainId
        },
        contracts: contractAddresses
      });
    });

    // Get all assets
    app.get('/api/assets', (req, res) => {
      res.json({
        success: true,
        count: assets.length,
        data: assets
      });
    });

    // Get specific asset
    app.get('/api/assets/:assetId', (req, res) => {
      const asset = assets.find(a => a.assetId === req.params.assetId);
      if (!asset) {
        return res.status(404).json({
          success: false,
          error: 'Asset not found'
        });
      }
      res.json({
        success: true,
        data: asset
      });
    });

    // Register new asset (simplified)
    app.post('/api/assets', (req, res) => {
      const asset = {
        ...req.body,
        registeredAt: new Date().toISOString(),
        blockchainStatus: 'pending',
        tokenAddress: null
      };

      assets.push(asset);

      res.status(201).json({
        success: true,
        message: 'Asset registered (demo mode)',
        data: asset
      });
    });

    // Get all leases
    app.get('/api/leases', (req, res) => {
      res.json({
        success: true,
        count: leases.length,
        data: leases
      });
    });

    // Create lease (simplified)
    app.post('/api/leases', (req, res) => {
      const lease = {
        ...req.body,
        leaseId: `LEASE-${Date.now()}`,
        createdAt: new Date().toISOString(),
        status: 'draft'
      };

      leases.push(lease);

      res.status(201).json({
        success: true,
        message: 'Lease created (demo mode)',
        data: lease
      });
    });

    // Start server
    apiServer = app.listen(config.api.port, () => {
      console.log('✅ API server started successfully');
      console.log(`   URL: http://localhost:${config.api.port}`);
      console.log(`   Health: http://localhost:${config.api.port}/api/health`);

      // Load sample data
      assets.push(...sampleAssets);
      console.log(`   Loaded ${sampleAssets.length} sample orbital assets`);

      resolve();
    });
  });
}

// Demonstrate API functionality
async function runAPIDemo() {
  console.log('\n🧪 Running API demonstration...');

  try {
    // Test health endpoint
    const healthResponse = await fetch(`http://localhost:${config.api.port}/api/health`);
    const health = await healthResponse.json();
    console.log('✅ Health check:', health.status);

    // Test assets endpoint
    const assetsResponse = await fetch(`http://localhost:${config.api.port}/api/assets`);
    const assetsData = await assetsResponse.json();
    console.log(`✅ Retrieved ${assetsData.count} assets from API`);

    // Test specific asset
    const assetResponse = await fetch(`http://localhost:${config.api.port}/api/assets/ORB-SAT-GEO-001`);
    const assetData = await assetResponse.json();
    console.log(`✅ Retrieved specific asset: ${assetData.data.name}`);

    // Test leases endpoint
    const leasesResponse = await fetch(`http://localhost:${config.api.port}/api/leases`);
    const leasesData = await leasesResponse.json();
    console.log(`✅ Retrieved ${leasesData.count} leases from API`);

  } catch (error) {
    console.error('❌ API demo error:', error.message);
  }
}

// Show usage instructions
function showUsageInstructions() {
  console.log('\n' + '='.repeat(60));
  console.log('🎉 System is running! Here\'s what you can do:');
  console.log('='.repeat(60));

  console.log('\n🌐 API Endpoints:');
  console.log(`   GET  http://localhost:${config.api.port}/api/health`);
  console.log(`   GET  http://localhost:${config.api.port}/api/assets`);
  console.log(`   GET  http://localhost:${config.api.port}/api/assets/:assetId`);
  console.log(`   POST http://localhost:${config.api.port}/api/assets`);
  console.log(`   GET  http://localhost:${config.api.port}/api/leases`);
  console.log(`   POST http://localhost:${config.api.port}/api/leases`);

  console.log('\n📡 Blockchain:');
  console.log(`   RPC URL: http://localhost:${config.anvil.port}`);
  console.log(`   Chain ID: ${config.anvil.chainId}`);

  console.log('\n🧪 Test Commands:');
  console.log(`   curl http://localhost:${config.api.port}/api/health`);
  console.log(`   curl http://localhost:${config.api.port}/api/assets`);

  console.log('\n⚠️  Press Ctrl+C to stop all services');
  console.log('='.repeat(60));
}

// Main execution
async function main() {
  try {
    // Step 1: Start Anvil
    await startAnvil();

    // Step 2: Deploy contracts
    const contractAddresses = await deployContracts();

    // Step 3: Start API server
    await startAPIServer(contractAddresses);

    // Step 4: Demo API functionality
    await runAPIDemo();

    // Step 5: Show instructions
    showUsageInstructions();

    // Keep running until interrupted
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

  } catch (error) {
    console.error('❌ Error:', error.message);
    cleanup();
    process.exit(1);
  }
}

// Cleanup function
function cleanup() {
  console.log('\n🧹 Cleaning up...');

  if (anvilProcess) {
    anvilProcess.kill();
    console.log('✅ Anvil stopped');
  }

  if (apiServer) {
    apiServer.close();
    console.log('✅ API server stopped');
  }

  console.log('👋 Goodbye!');
  process.exit(0);
}

// Add fetch polyfill for older Node versions
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

// Run the demo
main().catch(error => {
  console.error('Fatal error:', error);
  cleanup();
  process.exit(1);
});