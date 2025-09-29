#!/usr/bin/env node

/**
 * Standalone API server for Asset Leasing Protocol
 *
 * Starts the REST API server without blockchain components.
 * Useful for frontend development and API testing.
 */

import { program } from 'commander';
import { AssetLeasingApiServer } from './server.js';
import { MockOffChainServices } from '../testing/mock-services.js';
import { ContractDeployer } from '../testing/contract-deployer.js';

interface StandaloneConfig {
  port: number;
  host: string;
  mockData: boolean;
  verbose: boolean;
}

async function startStandaloneServer(config: StandaloneConfig): Promise<void> {
  console.log('🚀 Starting Asset Leasing Protocol API Server...');

  try {
    // Initialize mock services
    const services = new MockOffChainServices({
      enableApi: true,
      enableDatabase: true
    });

    await services.initialize();

    if (config.mockData) {
      console.log('📊 Loading mock data...');
      await services.loadSampleData();
    }

    // Initialize mock contract deployer (no real blockchain connection)
    const deployer = new ContractDeployer({
      rpcUrl: 'http://localhost:8545', // Will be mocked
      privateKey: '0x' + '0'.repeat(64), // Mock private key
      contracts: {}
    });

    // Create and start API server
    const server = new AssetLeasingApiServer(
      {
        port: config.port,
        host: config.host,
        corsOrigins: ['http://localhost:3000', 'http://localhost:5173']
      },
      {
        offChainServices: services,
        contractDeployer: deployer
      }
    );

    await server.start();

    console.log(`✅ API Server running at http://${config.host}:${config.port}`);
    console.log(`📚 Available endpoints:`);
    console.log(`   GET  /health                 - Health check`);
    console.log(`   GET  /api/assets             - List all assets`);
    console.log(`   POST /api/assets             - Register new asset`);
    console.log(`   GET  /api/assets/:id         - Get specific asset`);
    console.log(`   GET  /api/leases             - List all leases`);
    console.log(`   POST /api/leases             - Create lease offer`);
    console.log(`   GET  /api/leases/:id         - Get specific lease`);
    console.log(`   GET  /api/blockchain/network - Network information`);
    console.log(`   GET  /api/system/status      - System status`);

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n🛑 Shutting down server...');
      await server.stop();
      await services.shutdown();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// CLI setup
program
  .name('asset-leasing-api')
  .description('Standalone API server for Asset Leasing Protocol')
  .version('1.0.0')
  .option('-p, --port <number>', 'Server port', '3001')
  .option('-h, --host <host>', 'Server host', 'localhost')
  .option('--no-mock-data', 'Skip loading mock data')
  .option('-v, --verbose', 'Verbose logging')
  .action(async (options) => {
    const config: StandaloneConfig = {
      port: parseInt(options.port),
      host: options.host,
      mockData: options.mockData,
      verbose: options.verbose
    };

    await startStandaloneServer(config);
  });

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}