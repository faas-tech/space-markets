/**
 * Comprehensive test runner for Asset Leasing Protocol
 *
 * Orchestrates the complete test environment including Anvil blockchain,
 * contract deployment, offchain services, and integration testing.
 */

import { program } from 'commander';
import { AnvilManager } from './anvil-manager.js';
import { ContractDeployer } from './contract-deployer.js';
import { AssetLeasingEventListener } from './event-listener.js';
import { MockOffChainServices } from './mock-services.js';
import { IntegrationTestSuite } from './integration-test-suite.js';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface TestRunnerConfig {
  // Blockchain settings
  anvilPort?: number;
  anvilChainId?: number;
  anvilBlockTime?: number;

  // Directories
  workingDir?: string;
  deploymentsDir?: string;
  dataDir?: string;
  outputDir?: string;

  // Test settings
  enableIntegrationTests?: boolean;
  enableEventTests?: boolean;
  enableApiTests?: boolean;
  enableDatabaseTests?: boolean;

  // Timeouts
  setupTimeoutMs?: number;
  testTimeoutMs?: number;

  // Logging
  verbose?: boolean;
  logFile?: string;
}

export interface TestResults {
  success: boolean;
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    duration: number;
  };
  details: Array<{
    testName: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
  }>;
  environment: {
    anvilInstance?: any;
    deployment?: any;
    services?: any;
  };
}

/**
 * Main test runner orchestrator
 */
export class AssetLeasingTestRunner {
  private config: Required<TestRunnerConfig>;
  private anvilManager: AnvilManager;
  private results: TestResults;
  private startTime: number = 0;

  constructor(config: TestRunnerConfig = {}) {
    this.config = {
      anvilPort: config.anvilPort || 8545,
      anvilChainId: config.anvilChainId || 31337,
      anvilBlockTime: config.anvilBlockTime || 1,
      workingDir: config.workingDir || process.cwd(),
      deploymentsDir: config.deploymentsDir || './deployments',
      dataDir: config.dataDir || './test-data',
      outputDir: config.outputDir || './test-output',
      enableIntegrationTests: config.enableIntegrationTests ?? true,
      enableEventTests: config.enableEventTests ?? true,
      enableApiTests: config.enableApiTests ?? false,
      enableDatabaseTests: config.enableDatabaseTests ?? false,
      setupTimeoutMs: config.setupTimeoutMs || 60000,
      testTimeoutMs: config.testTimeoutMs || 300000,
      verbose: config.verbose ?? false,
      logFile: config.logFile || 'test-runner.log'
    };

    this.anvilManager = new AnvilManager();
    this.results = this.initializeResults();
  }

  /**
   * Initialize test results structure
   */
  private initializeResults(): TestResults {
    return {
      success: false,
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        duration: 0
      },
      details: [],
      environment: {}
    };
  }

  /**
   * Run all tests
   */
  async runTests(): Promise<TestResults> {
    this.startTime = Date.now();
    this.log('Starting Asset Leasing Protocol test suite...');

    try {
      // Create output directories
      this.ensureDirectories();

      // Setup test environment
      this.log('Setting up test environment...');
      const environment = await this.setupEnvironment();

      // Run integration tests
      if (this.config.enableIntegrationTests) {
        await this.runIntegrationTests(environment);
      }

      // Run event processing tests
      if (this.config.enableEventTests) {
        await this.runEventTests(environment);
      }

      // Run API tests
      if (this.config.enableApiTests) {
        await this.runApiTests(environment);
      }

      // Run database tests
      if (this.config.enableDatabaseTests) {
        await this.runDatabaseTests(environment);
      }

      // Calculate final results
      this.calculateResults();

      // Save results
      await this.saveResults();

      this.log(`Test suite completed. Success: ${this.results.success}`);
      return this.results;

    } catch (error) {
      this.log(`Test suite failed: ${error instanceof Error ? error.message : error}`);
      this.results.success = false;
      return this.results;

    } finally {
      // Clean up environment
      await this.cleanupEnvironment();
    }
  }

  /**
   * Setup the complete test environment
   */
  private async setupEnvironment(): Promise<{
    anvil: any;
    deployment: any;
    eventListener: AssetLeasingEventListener;
    services: MockOffChainServices;
  }> {
    this.log('Starting Anvil blockchain...');

    // Start Anvil
    const anvilInstance = await this.anvilManager.startAnvil('test-runner', {
      port: this.config.anvilPort,
      chainId: this.config.anvilChainId,
      blockTime: this.config.anvilBlockTime,
      accounts: 20,
      dataDir: join(this.config.dataDir, 'anvil')
    });

    this.log(`Anvil started on port ${this.config.anvilPort}`);

    // Deploy contracts
    this.log('Deploying smart contracts...');
    const deployer = new ContractDeployer({
      rpcUrl: anvilInstance.rpcUrl,
      privateKey: anvilInstance.accounts[0]!.privateKey,
      deploymentsDir: this.config.deploymentsDir
    });

    const deployment = await deployer.deployAll();
    this.log('Smart contracts deployed successfully');

    // Setup event listener
    this.log('Setting up event listener...');
    const eventListener = new AssetLeasingEventListener({
      rpcUrl: anvilInstance.rpcUrl,
      contracts: {
        assetRegistry: deployment.assetRegistry,
        marketplace: deployment.marketplace,
        leaseFactory: deployment.leaseFactory
      },
      pollingInterval: 500,
      confirmationBlocks: 0
    });

    await eventListener.startListening();
    this.log('Event listener started');

    // Setup mock services
    this.log('Initializing mock offchain services...');
    const services = new MockOffChainServices({
      databaseUrl: `postgresql://test:test@localhost/test_${Date.now()}`,
      redisUrl: 'redis://localhost:6379/1',
      eventListener,
      enableApi: this.config.enableApiTests,
      enableDatabase: this.config.enableDatabaseTests
    });

    await services.initialize();
    this.log('Mock services initialized');

    // Store environment info
    this.results.environment = {
      anvilInstance,
      deployment,
      services
    };

    return {
      anvil: anvilInstance,
      deployment,
      eventListener,
      services
    };
  }

  /**
   * Run integration tests
   */
  private async runIntegrationTests(environment: any): Promise<void> {
    this.log('Running integration tests...');

    const testSuite = new IntegrationTestSuite({
      anvilPort: this.config.anvilPort,
      anvilChainId: this.config.anvilChainId,
      deploymentsDir: this.config.deploymentsDir,
      dataDir: this.config.dataDir,
      enableEventTesting: this.config.enableEventTests,
      enableApiTesting: this.config.enableApiTests,
      enableDatabaseTesting: this.config.enableDatabaseTests
    });

    // The test suite will use the existing environment
    const tests = [
      { name: 'Asset Registration Flow', fn: () => testSuite.testAssetRegistrationFlow() },
      { name: 'Lease Marketplace Flow', fn: () => testSuite.testLeaseMarketplaceFlow() },
      { name: 'Event Processing Resilience', fn: () => testSuite.testEventProcessingResilience() }
    ];

    for (const test of tests) {
      await this.runSingleTest(test.name, test.fn);
    }
  }

  /**
   * Run event processing tests
   */
  private async runEventTests(environment: any): Promise<void> {
    this.log('Running event processing tests...');

    const tests = [
      {
        name: 'Event Listener Connection',
        fn: async () => {
          const status = environment.eventListener.getStatus();
          if (!status.isListening) {
            throw new Error('Event listener not running');
          }
        }
      },
      {
        name: 'Event Processing Latency',
        fn: async () => {
          const start = Date.now();

          // Create a test transaction
          const deployer = new ContractDeployer({
            rpcUrl: environment.anvil.rpcUrl,
            privateKey: environment.anvil.accounts[0].privateKey,
            deploymentsDir: this.config.deploymentsDir
          });

          await deployer.registerAssetType('EventTest', 'test-schema.json', []);

          // Wait for event
          await environment.eventListener.waitForEvent('AssetTypeCreated', undefined, 5000);

          const latency = Date.now() - start;
          if (latency > 3000) {
            throw new Error(`Event processing too slow: ${latency}ms`);
          }
        }
      },
      {
        name: 'Event Buffer Management',
        fn: async () => {
          const status = environment.eventListener.getStatus();
          if (status.bufferedEvents > 100) {
            throw new Error('Too many buffered events');
          }
        }
      }
    ];

    for (const test of tests) {
      await this.runSingleTest(test.name, test.fn);
    }
  }

  /**
   * Run API tests
   */
  private async runApiTests(environment: any): Promise<void> {
    if (!this.config.enableApiTests) {
      this.log('Skipping API tests (disabled)');
      return;
    }

    this.log('Running API tests...');

    const apiClient = environment.services.getApiClient();

    const tests = [
      {
        name: 'Assets API Endpoint',
        fn: async () => {
          const response = await apiClient.get('/api/v1/assets');
          if (response.status !== 200) {
            throw new Error(`API returned ${response.status}`);
          }
        }
      },
      {
        name: 'Leases API Endpoint',
        fn: async () => {
          const response = await apiClient.get('/api/v1/leases');
          if (response.status !== 200) {
            throw new Error(`API returned ${response.status}`);
          }
        }
      },
      {
        name: 'Validation API Endpoint',
        fn: async () => {
          const response = await apiClient.post('/api/v1/validate/asset', {
            test: 'data'
          });
          if (response.status !== 200) {
            throw new Error(`Validation API returned ${response.status}`);
          }
        }
      }
    ];

    for (const test of tests) {
      await this.runSingleTest(test.name, test.fn);
    }
  }

  /**
   * Run database tests
   */
  private async runDatabaseTests(environment: any): Promise<void> {
    if (!this.config.enableDatabaseTests) {
      this.log('Skipping database tests (disabled)');
      return;
    }

    this.log('Running database tests...');

    const tests = [
      {
        name: 'Database Connection',
        fn: async () => {
          // Test basic database operations
          const assets = await environment.services.getDatabaseAssets();
          // Should not throw
        }
      },
      {
        name: 'Transaction Rollback',
        fn: async () => {
          await environment.services.testTransactionRollback();
        }
      },
      {
        name: 'Data Consistency',
        fn: async () => {
          const assets = await environment.services.getDatabaseAssets();
          const leases = await environment.services.getDatabaseLeases();

          // Verify referential integrity
          for (const lease of leases) {
            const asset = assets.find(a => a.assetId === lease.assetId);
            if (!asset) {
              throw new Error(`Orphaned lease: ${lease.leaseId}`);
            }
          }
        }
      }
    ];

    for (const test of tests) {
      await this.runSingleTest(test.name, test.fn);
    }
  }

  /**
   * Run a single test with error handling and timing
   */
  private async runSingleTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    this.results.summary.totalTests++;

    try {
      this.log(`Running test: ${name}`);

      // Set timeout for individual tests
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), this.config.testTimeoutMs);
      });

      await Promise.race([testFn(), timeoutPromise]);

      const duration = Date.now() - startTime;
      this.results.summary.passedTests++;
      this.results.details.push({
        testName: name,
        status: 'passed',
        duration
      });

      this.log(`✓ ${name} (${duration}ms)`);

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.results.summary.failedTests++;
      this.results.details.push({
        testName: name,
        status: 'failed',
        duration,
        error: errorMessage
      });

      this.log(`✗ ${name} (${duration}ms): ${errorMessage}`);
    }
  }

  /**
   * Calculate final test results
   */
  private calculateResults(): void {
    this.results.summary.duration = Date.now() - this.startTime;
    this.results.success = this.results.summary.failedTests === 0;
  }

  /**
   * Save test results to file
   */
  private async saveResults(): Promise<void> {
    const resultsFile = join(this.config.outputDir, 'test-results.json');
    const reportFile = join(this.config.outputDir, 'test-report.md');

    // Save JSON results
    writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));

    // Generate markdown report
    const report = this.generateMarkdownReport();
    writeFileSync(reportFile, report);

    this.log(`Results saved to ${resultsFile}`);
    this.log(`Report saved to ${reportFile}`);
  }

  /**
   * Generate markdown test report
   */
  private generateMarkdownReport(): string {
    const { summary, details } = this.results;
    const passRate = Math.round((summary.passedTests / summary.totalTests) * 100);

    let report = `# Asset Leasing Protocol Test Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    report += `## Summary\n\n`;
    report += `- **Total Tests:** ${summary.totalTests}\n`;
    report += `- **Passed:** ${summary.passedTests}\n`;
    report += `- **Failed:** ${summary.failedTests}\n`;
    report += `- **Skipped:** ${summary.skippedTests}\n`;
    report += `- **Pass Rate:** ${passRate}%\n`;
    report += `- **Duration:** ${summary.duration}ms\n\n`;

    if (summary.failedTests > 0) {
      report += `## Failed Tests\n\n`;
      const failedTests = details.filter(d => d.status === 'failed');
      for (const test of failedTests) {
        report += `### ${test.testName}\n`;
        report += `- **Duration:** ${test.duration}ms\n`;
        report += `- **Error:** ${test.error}\n\n`;
      }
    }

    report += `## All Test Results\n\n`;
    report += `| Test Name | Status | Duration (ms) | Error |\n`;
    report += `|-----------|--------|---------------|-------|\n`;

    for (const test of details) {
      const status = test.status === 'passed' ? '✓' : test.status === 'failed' ? '✗' : '⊝';
      const error = test.error || '';
      report += `| ${test.testName} | ${status} ${test.status} | ${test.duration} | ${error} |\n`;
    }

    return report;
  }

  /**
   * Clean up test environment
   */
  private async cleanupEnvironment(): Promise<void> {
    this.log('Cleaning up test environment...');

    try {
      await this.anvilManager.stopAll();
      this.log('Test environment cleaned up');
    } catch (error) {
      this.log(`Error during cleanup: ${error}`);
    }
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    const dirs = [
      this.config.deploymentsDir,
      this.config.dataDir,
      this.config.outputDir
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Log message with optional file output
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;

    if (this.config.verbose) {
      console.log(logMessage);
    }

    // Write to log file
    if (this.config.logFile) {
      const logPath = join(this.config.outputDir, this.config.logFile);
      try {
        const fs = require('fs');
        fs.appendFileSync(logPath, logMessage + '\n');
      } catch (error) {
        // Ignore log file errors
      }
    }
  }
}

/**
 * CLI interface for the test runner
 */
async function main() {
  program
    .name('asset-leasing-test-runner')
    .description('Comprehensive test runner for Asset Leasing Protocol')
    .version('1.0.0');

  program
    .command('run')
    .description('Run the complete test suite')
    .option('-p, --port <number>', 'Anvil port', '8545')
    .option('-c, --chain-id <number>', 'Chain ID', '31337')
    .option('-d, --data-dir <path>', 'Data directory', './test-data')
    .option('-o, --output-dir <path>', 'Output directory', './test-output')
    .option('--no-integration', 'Disable integration tests')
    .option('--no-events', 'Disable event tests')
    .option('--enable-api', 'Enable API tests')
    .option('--enable-database', 'Enable database tests')
    .option('-v, --verbose', 'Verbose logging')
    .option('-t, --timeout <number>', 'Test timeout in ms', '300000')
    .action(async (options) => {
      const config: TestRunnerConfig = {
        anvilPort: parseInt(options.port),
        anvilChainId: parseInt(options.chainId),
        dataDir: options.dataDir,
        outputDir: options.outputDir,
        enableIntegrationTests: options.integration !== false,
        enableEventTests: options.events !== false,
        enableApiTests: options.enableApi || false,
        enableDatabaseTests: options.enableDatabase || false,
        verbose: options.verbose || false,
        testTimeoutMs: parseInt(options.timeout)
      };

      const runner = new AssetLeasingTestRunner(config);
      const results = await runner.runTests();

      process.exit(results.success ? 0 : 1);
    });

  program
    .command('anvil')
    .description('Start Anvil for manual testing')
    .option('-p, --port <number>', 'Port', '8545')
    .option('-c, --chain-id <number>', 'Chain ID', '31337')
    .action(async (options) => {
      const manager = new AnvilManager();
      await manager.startAnvil('manual', {
        port: parseInt(options.port),
        chainId: parseInt(options.chainId),
        accounts: 20
      });

      console.log(`Anvil started on port ${options.port}`);
      console.log('Press Ctrl+C to stop');

      // Keep process alive
      process.on('SIGINT', async () => {
        await manager.stopAll();
        process.exit(0);
      });
    });

  await program.parseAsync();
}

// Export for programmatic use
export { AssetLeasingTestRunner };

// Run CLI if this file is executed directly
if (process.argv[1] && process.argv[1].endsWith('test-runner.ts')) {
  main().catch(console.error);
}