#!/usr/bin/env node

/**
 * Full System Startup Script
 *
 * Orchestrates the complete Asset Leasing Protocol testing environment:
 * 1. Starts Anvil blockchain
 * 2. Deploys smart contracts
 * 3. Starts event listeners
 * 4. Launches API server
 * 5. Loads sample data
 * 6. Runs integration tests
 */

import { program } from 'commander';
import { AnvilManager } from '../src/testing/anvil-manager.js';
import { ContractDeployer } from '../src/testing/contract-deployer.js';
import { AssetLeasingEventListener } from '../src/testing/event-listener.js';
import { MockOffChainServices } from '../src/testing/mock-services.js';
import { AssetLeasingApiServer } from '../src/api/server.js';
import { IntegrationTestSuite } from '../src/testing/integration-test-suite.js';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

interface FullSystemConfig {
  anvilPort: number;
  anvilChainId: number;
  apiPort: number;
  skipTests: boolean;
  keepRunning: boolean;
  verbose: boolean;
  outputDir: string;
}

interface SystemComponents {
  anvil: AnvilManager;
  deployer: ContractDeployer;
  eventListener: AssetLeasingEventListener;
  services: MockOffChainServices;
  apiServer: AssetLeasingApiServer;
  testSuite: IntegrationTestSuite;
}

async function startFullSystem(config: FullSystemConfig): Promise<SystemComponents> {
  console.log('🚀 Starting Complete Asset Leasing Protocol System...\n');

  // Create output directory
  if (!existsSync(config.outputDir)) {
    mkdirSync(config.outputDir, { recursive: true });
  }

  const components = {} as SystemComponents;

  try {
    // 1. Start Anvil blockchain
    console.log('⛓️  Starting Anvil blockchain...');
    components.anvil = new AnvilManager();

    const anvilInstance = await components.anvil.startAnvil('main', {
      port: config.anvilPort,
      chainId: config.anvilChainId,
      accounts: 10,
      blockTime: 1
    });

    console.log(`   ✅ Anvil running on http://localhost:${config.anvilPort}`);
    console.log(`   ⚡ Chain ID: ${config.anvilChainId}`);
    console.log(`   💰 Test accounts: ${anvilInstance.accounts.length}`);

    // Save connection details
    writeFileSync(
      join(config.outputDir, 'anvil-config.json'),
      JSON.stringify({
        rpcUrl: anvilInstance.rpcUrl,
        chainId: config.anvilChainId,
        accounts: anvilInstance.accounts
      }, null, 2)
    );

    // 2. Deploy smart contracts
    console.log('\n📋 Deploying smart contracts...');
    components.deployer = new ContractDeployer({
      rpcUrl: anvilInstance.rpcUrl,
      privateKey: anvilInstance.accounts[0].privateKey,
      contracts: {}
    });

    const deploymentResult = await components.deployer.deployContracts();
    console.log('   ✅ Contracts deployed successfully');
    console.log(`   📄 Asset Registry: ${deploymentResult.assetRegistry}`);
    console.log(`   🏪 Marketplace: ${deploymentResult.marketplace}`);
    console.log(`   ⚙️  Lease Factory: ${deploymentResult.leaseFactory}`);

    // Save deployment details
    writeFileSync(
      join(config.outputDir, 'deployment.json'),
      JSON.stringify(deploymentResult, null, 2)
    );

    // 3. Start event listener
    console.log('\n👂 Starting blockchain event listener...');
    components.eventListener = new AssetLeasingEventListener({
      rpcUrl: anvilInstance.rpcUrl,
      contracts: {
        assetRegistry: deploymentResult.assetRegistry,
        marketplace: deploymentResult.marketplace,
        leaseFactory: deploymentResult.leaseFactory
      }
    });

    await components.eventListener.start();
    console.log('   ✅ Event listener active');

    // 4. Initialize off-chain services
    console.log('\n💾 Initializing off-chain services...');
    components.services = new MockOffChainServices({
      enableApi: true,
      enableDatabase: true,
      eventListener: components.eventListener
    });

    await components.services.initialize();
    console.log('   ✅ Mock database ready');
    console.log('   ✅ Services initialized');

    // 5. Start API server
    console.log('\n🌐 Starting API server...');
    components.apiServer = new AssetLeasingApiServer(
      {
        port: config.apiPort,
        host: 'localhost'
      },
      {
        offChainServices: components.services,
        contractDeployer: components.deployer
      }
    );

    await components.apiServer.start();
    console.log(`   ✅ API server running on http://localhost:${config.apiPort}`);

    // 6. Load sample data
    console.log('\n📊 Loading sample data...');
    await components.services.loadSampleData();

    // Create sample assets and leases on blockchain
    await createSampleAssetsAndLeases(components.deployer, components.services);
    console.log('   ✅ Sample data loaded');

    // 7. Run integration tests (if not skipped)
    if (!config.skipTests) {
      console.log('\n🧪 Running integration tests...');
      components.testSuite = new IntegrationTestSuite({
        anvil: components.anvil,
        deployer: components.deployer,
        eventListener: components.eventListener,
        services: components.services,
        apiServer: components.apiServer
      });

      const testResults = await components.testSuite.runFullSuite();

      writeFileSync(
        join(config.outputDir, 'test-results.json'),
        JSON.stringify(testResults, null, 2)
      );

      console.log(`   ✅ Tests completed: ${testResults.summary.passedTests}/${testResults.summary.totalTests} passed`);

      if (!testResults.success) {
        console.log(`   ⚠️  Some tests failed - check ${config.outputDir}/test-results.json`);
      }
    }

    // 8. System ready!
    console.log('\n🎉 Asset Leasing Protocol System is READY!');
    console.log('\n📋 System Overview:');
    console.log(`   🔗 Blockchain:     http://localhost:${config.anvilPort} (Chain ID: ${config.anvilChainId})`);
    console.log(`   🌐 API Server:     http://localhost:${config.apiPort}`);
    console.log(`   📊 Database:       In-memory (mock)`);
    console.log(`   👂 Event Listener: Active`);
    console.log(`   📁 Output Dir:     ${config.outputDir}`);

    console.log('\n🚀 Ready for Development!');
    console.log('\n💡 Try these commands:');
    console.log(`   curl http://localhost:${config.apiPort}/health`);
    console.log(`   curl http://localhost:${config.apiPort}/api/assets`);
    console.log(`   curl http://localhost:${config.apiPort}/api/leases`);

    if (config.keepRunning) {
      console.log('\n⏰ System will keep running. Press Ctrl+C to stop.');

      // Setup graceful shutdown
      const shutdown = async () => {
        console.log('\n🛑 Shutting down system...');
        await shutdownSystem(components);
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    }

    return components;

  } catch (error) {
    console.error('\n❌ System startup failed:', error);
    await shutdownSystem(components);
    throw error;
  }
}

async function createSampleAssetsAndLeases(
  deployer: ContractDeployer,
  services: MockOffChainServices
): Promise<void> {
  // Get sample data from services
  const assets = await services.database.getAssets();

  if (assets.length > 0) {
    console.log(`   📡 Registering ${assets.length} sample assets on blockchain...`);

    for (const asset of assets.slice(0, 3)) { // Register first 3 assets
      try {
        const result = await deployer.registerAsset(
          asset.metadata,
          getAssetTypeId(asset.metadata.assetType),
          `${asset.metadata.name} Token`,
          asset.metadata.assetId.replace(/-/g, '').toUpperCase(),
          '10000000000000000000000' // 10,000 tokens
        );

        console.log(`   ✅ Registered ${asset.metadata.name} (${result.tokenAddress})`);
      } catch (error) {
        console.warn(`   ⚠️  Failed to register ${asset.metadata.name}:`, error);
      }
    }
  }
}

function getAssetTypeId(assetType: string): number {
  const typeMap: Record<string, number> = {
    'satellite': 1,
    'orbital_compute': 2,
    'orbital_relay': 3
  };
  return typeMap[assetType] || 1;
}

async function shutdownSystem(components: Partial<SystemComponents>): Promise<void> {
  const shutdownPromises: Promise<void>[] = [];

  if (components.apiServer) {
    shutdownPromises.push(components.apiServer.stop());
  }

  if (components.eventListener) {
    shutdownPromises.push(components.eventListener.stop());
  }

  if (components.services) {
    shutdownPromises.push(components.services.shutdown());
  }

  if (components.anvil) {
    shutdownPromises.push(components.anvil.stopAll());
  }

  await Promise.allSettled(shutdownPromises);
  console.log('✅ System shutdown complete');
}

// CLI setup
program
  .name('start-full-system')
  .description('Start complete Asset Leasing Protocol testing environment')
  .version('1.0.0')
  .option('--anvil-port <port>', 'Anvil blockchain port', '8545')
  .option('--anvil-chain-id <id>', 'Anvil chain ID', '31337')
  .option('--api-port <port>', 'API server port', '3001')
  .option('--skip-tests', 'Skip integration tests')
  .option('--no-keep-running', 'Exit after startup instead of keeping system running')
  .option('-v, --verbose', 'Verbose logging')
  .option('-o, --output-dir <dir>', 'Output directory for logs and configs', './test-output')
  .action(async (options) => {
    const config: FullSystemConfig = {
      anvilPort: parseInt(options.anvilPort),
      anvilChainId: parseInt(options.anvilChainId),
      apiPort: parseInt(options.apiPort),
      skipTests: options.skipTests,
      keepRunning: options.keepRunning,
      verbose: options.verbose,
      outputDir: options.outputDir
    };

    try {
      await startFullSystem(config);

      if (!config.keepRunning) {
        console.log('\n✅ System startup complete! Exiting...');
        process.exit(0);
      }
    } catch (error) {
      console.error('\n❌ System startup failed');
      process.exit(1);
    }
  });

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}