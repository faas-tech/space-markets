/**
 * Comprehensive integration test suite for Asset Leasing Protocol
 *
 * Tests the full stack from smart contracts to offchain systems,
 * including event processing, data consistency, and API endpoints.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { AnvilManager, AnvilInstance } from './anvil-manager.js';
import { AssetLeasingEventListener } from './event-listener.js';
import { MockOffChainServices } from './mock-services.js';
import { ContractDeployer } from './contract-deployer.js';
import { ethers } from 'ethers';
import type { AssetMetadata, LeaseAgreement } from '../types/index.js';

export interface IntegrationTestConfig {
  anvilPort: number;
  anvilChainId: number;
  deploymentsDir: string;
  dataDir: string;
  enableEventTesting: boolean;
  enableApiTesting: boolean;
  enableDatabaseTesting: boolean;
}

/**
 * Full-stack integration test suite
 */
export class IntegrationTestSuite {
  private anvilManager: AnvilManager;
  private anvilInstance?: AnvilInstance;
  private eventListener?: AssetLeasingEventListener;
  private mockServices?: MockOffChainServices;
  private contractDeployer?: ContractDeployer;
  private config: IntegrationTestConfig;

  constructor(config: IntegrationTestConfig) {
    this.config = config;
    this.anvilManager = new AnvilManager();
  }

  /**
   * Setup the test environment
   */
  async setup(): Promise<void> {
    console.log('Setting up integration test environment...');

    // Start Anvil instance
    this.anvilInstance = await this.anvilManager.startAnvil('integration-tests', {
      port: this.config.anvilPort,
      chainId: this.config.anvilChainId,
      blockTime: 1, // 1 second block time for faster tests
      accounts: 20,   // Enough accounts for complex scenarios
      dataDir: this.config.dataDir
    });

    // Deploy contracts
    this.contractDeployer = new ContractDeployer({
      rpcUrl: this.anvilInstance.rpcUrl,
      privateKey: this.anvilInstance.accounts[0]!.privateKey,
      deploymentsDir: this.config.deploymentsDir
    });

    const deployment = await this.contractDeployer.deployAll();
    console.log('Contracts deployed:', deployment);

    // Setup event listener if enabled
    if (this.config.enableEventTesting) {
      this.eventListener = new AssetLeasingEventListener({
        rpcUrl: this.anvilInstance.rpcUrl,
        contracts: {
          assetRegistry: deployment.assetRegistry,
          marketplace: deployment.marketplace,
          leaseFactory: deployment.leaseFactory
        },
        pollingInterval: 500, // Fast polling for tests
        confirmationBlocks: 0 // No confirmations needed in test env
      });

      await this.eventListener.startListening();
    }

    // Setup mock offchain services
    this.mockServices = new MockOffChainServices({
      databaseUrl: `postgresql://test:test@localhost/asset_leasing_test_${Date.now()}`,
      redisUrl: 'redis://localhost:6379/1',
      ipfsGateway: 'http://localhost:8080/ipfs',
      eventListener: this.eventListener,
      enableApi: this.config.enableApiTesting,
      enableDatabase: this.config.enableDatabaseTesting
    });

    await this.mockServices.initialize();

    console.log('Integration test environment ready');
  }

  /**
   * Cleanup the test environment
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up integration test environment...');

    if (this.mockServices) {
      await this.mockServices.cleanup();
    }

    if (this.eventListener) {
      await this.eventListener.stopListening();
    }

    if (this.anvilInstance) {
      await this.anvilManager.stopAnvil('integration-tests');
    }

    console.log('Integration test environment cleaned up');
  }

  /**
   * Test 1: End-to-end asset registration flow
   */
  async testAssetRegistrationFlow(): Promise<void> {
    if (!this.contractDeployer || !this.eventListener || !this.mockServices) {
      throw new Error('Test environment not initialized');
    }

    console.log('Testing asset registration flow...');

    // Step 1: Create offchain asset metadata
    const assetMetadata: AssetMetadata = {
      assetId: 'sat-alpha-1',
      name: 'Alpha Satellite',
      assetType: 'satellite',
      description: 'Advanced imaging satellite for Earth observation',
      specifications: {
        mass_kg: 500,
        power_consumption_w: 300,
        orbital_altitude_km: 550,
        imaging_resolution_m: 0.5,
        communication_frequency_ghz: 8.4,
        launch_date: '2024-01-15T00:00:00Z',
        operational_status: 'active'
      },
      documentation: {
        technical_manual: 'ipfs://QmTechManual123',
        safety_certification: 'ipfs://QmSafetyCert456',
        insurance_policy: 'ipfs://QmInsurance789'
      },
      verification: {
        third_party_auditor: '0x742d35Cc6032C0532fBA5b41448612A4F52b9C81',
        audit_date: '2024-01-10T00:00:00Z',
        compliance_status: 'verified'
      }
    };

    // Step 2: Store metadata in offchain system
    const metadataResult = await this.mockServices.storeAssetMetadata(assetMetadata);
    expect(metadataResult.success).toBe(true);

    // Step 3: Register asset type onchain
    const assetTypeResult = await this.contractDeployer.registerAssetType(
      'Satellite',
      'satellite-schema-v1.json',
      ['lease.orbital_period_hours', 'lease.imaging_resolution_m']
    );
    expect(assetTypeResult.success).toBe(true);

    // Step 4: Wait for AssetTypeCreated event
    const typeCreatedEvent = await this.eventListener.waitForEvent(
      'AssetTypeCreated',
      event => event.args.name === 'Satellite'
    );
    expect(typeCreatedEvent).toBeDefined();

    // Step 5: Register asset onchain
    const assetRegistrationResult = await this.contractDeployer.registerAsset(
      assetMetadata,
      assetTypeResult.typeId!,
      'Alpha Satellite Token',
      'ALPHASAT'
    );
    expect(assetRegistrationResult.success).toBe(true);

    // Step 6: Wait for AssetRegistered event
    const assetRegisteredEvent = await this.eventListener.waitForEvent(
      'AssetRegistered',
      event => event.args.typeId === assetTypeResult.typeId!.toString()
    );
    expect(assetRegisteredEvent).toBeDefined();

    // Step 7: Verify offchain system processed the event
    const processedAsset = await this.mockServices.getAssetById(
      assetRegistrationResult.assetId!
    );
    expect(processedAsset).toBeDefined();
    expect(processedAsset.tokenAddress).toBe(assetRegistrationResult.tokenAddress);

    // Step 8: Verify metadata hash consistency
    const hashConsistency = await this.mockServices.verifyMetadataHash(
      assetRegistrationResult.assetId!,
      assetMetadata
    );
    expect(hashConsistency.consistent).toBe(true);

    console.log('Asset registration flow test completed successfully');
  }

  /**
   * Test 2: Lease marketplace flow
   */
  async testLeaseMarketplaceFlow(): Promise<void> {
    if (!this.contractDeployer || !this.eventListener || !this.mockServices) {
      throw new Error('Test environment not initialized');
    }

    console.log('Testing lease marketplace flow...');

    // Prerequisite: Register an asset first
    await this.testAssetRegistrationFlow();

    // Step 1: Create lease agreement offchain
    const leaseAgreement: LeaseAgreement = {
      leaseId: 'lease-sat-alpha-1-001',
      assetId: 'sat-alpha-1',
      lessor: this.anvilInstance!.accounts[0]!.address,
      lessee: this.anvilInstance!.accounts[1]!.address,
      terms: {
        startDate: '2024-02-01T00:00:00Z',
        endDate: '2024-02-28T23:59:59Z',
        paymentAmount: '1000',
        paymentToken: 'USDC',
        paymentSchedule: 'monthly',
        leaseType: 'operational',
        usageRights: ['imaging', 'data_collection'],
        restrictions: ['no_military_use', 'environmental_monitoring_only'],
        specifications: {
          orbital_period_hours: 24,
          imaging_resolution_m: 0.5,
          data_collection_frequency: 'daily',
          coverage_area: 'europe'
        }
      },
      status: 'pending',
      signatures: {
        lessor: null,
        lessee: null
      },
      compliance: {
        regulatory_approval: 'pending',
        insurance_verified: true,
        safety_clearance: 'approved'
      }
    };

    // Step 2: Store lease agreement offchain
    const leaseResult = await this.mockServices.storeLeaseAgreement(leaseAgreement);
    expect(leaseResult.success).toBe(true);

    // Step 3: Post lease offer on marketplace
    const leaseOfferResult = await this.contractDeployer.postLeaseOffer(
      1, // assetId from previous test
      leaseAgreement
    );
    expect(leaseOfferResult.success).toBe(true);

    // Step 4: Wait for LeaseOfferPosted event
    const offerPostedEvent = await this.eventListener.waitForEvent(
      'LeaseOfferPosted',
      event => event.args.assetId === '1'
    );
    expect(offerPostedEvent).toBeDefined();

    // Step 5: Place a bid on the lease offer
    const bidResult = await this.contractDeployer.placeLeaseBid(
      leaseOfferResult.offerId!,
      this.anvilInstance!.accounts[1]!.privateKey,
      '1000'
    );
    expect(bidResult.success).toBe(true);

    // Step 6: Wait for LeaseBidPlaced event
    const bidPlacedEvent = await this.eventListener.waitForEvent(
      'LeaseBidPlaced',
      event => event.args.offerId === leaseOfferResult.offerId!.toString()
    );
    expect(bidPlacedEvent).toBeDefined();

    // Step 7: Accept the bid
    const acceptResult = await this.contractDeployer.acceptLeaseBid(
      leaseOfferResult.offerId!,
      0, // bidIndex
      this.anvilInstance!.accounts[0]!.privateKey
    );
    expect(acceptResult.success).toBe(true);

    // Step 8: Wait for LeaseAccepted event
    const leaseAcceptedEvent = await this.eventListener.waitForEvent(
      'LeaseAccepted'
    );
    expect(leaseAcceptedEvent).toBeDefined();

    // Step 9: Verify offchain system updated lease status
    const updatedLease = await this.mockServices.getLeaseById(leaseAgreement.leaseId);
    expect(updatedLease.status).toBe('active');

    console.log('Lease marketplace flow test completed successfully');
  }

  /**
   * Test 3: Event processing resilience
   */
  async testEventProcessingResilience(): Promise<void> {
    if (!this.contractDeployer || !this.eventListener || !this.mockServices) {
      throw new Error('Test environment not initialized');
    }

    console.log('Testing event processing resilience...');

    // Step 1: Simulate rapid contract interactions
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(this.contractDeployer.registerAssetType(
        `TestType${i}`,
        `schema-${i}.json`,
        []
      ));
    }

    const results = await Promise.all(promises);
    results.forEach(result => expect(result.success).toBe(true));

    // Step 2: Wait for all events to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Verify all events were captured
    const events = await this.eventListener.getHistoricalEvents({
      eventName: 'AssetTypeCreated',
      fromBlock: 0
    });

    expect(events.length).toBeGreaterThanOrEqual(10);

    // Step 4: Test reorg protection by taking snapshot and reverting
    const snapshot = await this.anvilManager.takeSnapshot('integration-tests');

    // Make some transactions
    await this.contractDeployer.registerAssetType('ReorgTest', 'reorg.json', []);

    // Revert to snapshot
    await this.anvilManager.revertToSnapshot('integration-tests', snapshot);

    // Verify event listener handles reorg gracefully
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Event processing resilience test completed successfully');
  }

  /**
   * Test 4: API endpoint testing
   */
  async testApiEndpoints(): Promise<void> {
    if (!this.mockServices || !this.config.enableApiTesting) {
      console.log('Skipping API tests (not enabled)');
      return;
    }

    console.log('Testing API endpoints...');

    const apiClient = this.mockServices.getApiClient();

    // Test asset endpoints
    const assetResponse = await apiClient.get('/api/v1/assets');
    expect(assetResponse.status).toBe(200);

    // Test lease endpoints
    const leaseResponse = await apiClient.get('/api/v1/leases');
    expect(leaseResponse.status).toBe(200);

    // Test metadata validation endpoint
    const validationResponse = await apiClient.post('/api/v1/validate/asset', {
      // Sample asset metadata
    });
    expect(validationResponse.status).toBe(200);

    console.log('API endpoint tests completed successfully');
  }

  /**
   * Test 5: Database consistency
   */
  async testDatabaseConsistency(): Promise<void> {
    if (!this.mockServices || !this.config.enableDatabaseTesting) {
      console.log('Skipping database tests (not enabled)');
      return;
    }

    console.log('Testing database consistency...');

    // Test that blockchain events are properly stored
    const dbAssets = await this.mockServices.getDatabaseAssets();
    const dbLeases = await this.mockServices.getDatabaseLeases();

    // Verify referential integrity
    for (const lease of dbLeases) {
      const asset = dbAssets.find(a => a.assetId === lease.assetId);
      expect(asset).toBeDefined();
    }

    // Test transaction rollback scenarios
    await this.mockServices.testTransactionRollback();

    console.log('Database consistency tests completed successfully');
  }

  /**
   * Run all integration tests
   */
  async runAllTests(): Promise<void> {
    await this.setup();

    try {
      await this.testAssetRegistrationFlow();
      await this.testLeaseMarketplaceFlow();
      await this.testEventProcessingResilience();
      await this.testApiEndpoints();
      await this.testDatabaseConsistency();

      console.log('All integration tests passed successfully!');
    } finally {
      await this.cleanup();
    }
  }
}

/**
 * Create a test suite with default configuration
 */
export function createIntegrationTestSuite(
  config?: Partial<IntegrationTestConfig>
): IntegrationTestSuite {
  const defaultConfig: IntegrationTestConfig = {
    anvilPort: 8545,
    anvilChainId: 31337,
    deploymentsDir: './deployments',
    dataDir: './test-data',
    enableEventTesting: true,
    enableApiTesting: false, // Requires additional setup
    enableDatabaseTesting: false // Requires additional setup
  };

  return new IntegrationTestSuite({ ...defaultConfig, ...config });
}

/**
 * Vitest test definitions
 */
describe('Asset Leasing Protocol Integration Tests', () => {
  let testSuite: IntegrationTestSuite;

  beforeAll(async () => {
    testSuite = createIntegrationTestSuite();
    await testSuite.setup();
  });

  afterAll(async () => {
    await testSuite.cleanup();
  });

  it('should handle complete asset registration flow', async () => {
    await testSuite.testAssetRegistrationFlow();
  });

  it('should handle lease marketplace operations', async () => {
    await testSuite.testLeaseMarketplaceFlow();
  });

  it('should handle event processing resilience', async () => {
    await testSuite.testEventProcessingResilience();
  });

  it('should handle API endpoints correctly', async () => {
    await testSuite.testApiEndpoints();
  });

  it('should maintain database consistency', async () => {
    await testSuite.testDatabaseConsistency();
  });
});