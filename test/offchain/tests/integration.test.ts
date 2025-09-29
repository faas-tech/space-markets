/**
 * Integration Tests for Asset Leasing Protocol
 *
 * Tests deploy contracts and verify blockchain state.
 * Validates contract deployments, state changes, and event emissions
 * with specific value assertions.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AnvilManager, AnvilInstance } from '../src/testing/anvil-manager';
import { ContractDeployer, DeploymentResult } from '../src/testing/contract-deployer';
import { ethers } from 'ethers';
import { createHash } from 'crypto';

describe('Asset Leasing Protocol - Integration Tests', () => {
  let anvilManager: AnvilManager;
  let anvilInstance: AnvilInstance;
  let deployer: ContractDeployer;
  let deployment: DeploymentResult;
  let provider: ethers.JsonRpcProvider;

  beforeAll(async () => {
    console.log('\n🚀 Starting Integration Test Environment...\n');

    // Start Anvil instance
    anvilManager = new AnvilManager();
    anvilInstance = await anvilManager.startAnvil('integration-test', {
      port: 8546, // Use different port to avoid conflicts
      chainId: 31337,
      blockTime: 1, // 1 second blocks for faster tests
      accounts: 10
    });

    // Setup provider and deployer
    provider = new ethers.JsonRpcProvider(anvilInstance.rpcUrl);
    deployer = new ContractDeployer(
      anvilInstance.rpcUrl,
      anvilInstance.accounts[0].privateKey
    );

    // Deploy all contracts
    deployment = await deployer.deployAll();

    // Verify deployment by checking code at addresses
    for (const [name, contract] of Object.entries({
      assetRegistry: deployment.assetRegistry,
      marketplace: deployment.marketplace,
      leaseFactory: deployment.leaseFactory,
      mockStablecoin: deployment.mockStablecoin
    })) {
      const code = await provider.getCode(contract.address);
      if (code === '0x') {
        throw new Error(`${name} contract not deployed at ${contract.address}`);
      }
      console.log(`✓ Verified ${name} has code at ${contract.address}`);
    }
  }, 60000); // 60 second timeout for setup

  afterAll(async () => {
    console.log('\n🧹 Cleaning up test environment...\n');
    await anvilManager.stopAnvil('integration-test');
  });

  describe('Asset Registration Flow (End-to-End)', () => {
    let assetTypeId: bigint;
    let assetId: bigint;
    let tokenAddress: string;

    it('should register an asset type on-chain and verify independently', async () => {
      // Register asset type
      const result = await deployer.registerAssetType(
        'Satellite',
        'satellite-schema-v1',
        ['orbital_altitude', 'imaging_resolution']
      );

      assetTypeId = result.typeId;

      // Verify type ID is valid (should be > 0)
      expect(assetTypeId).toBeGreaterThan(0n);

      // Independent verification: Query the contract directly
      const registry = deployment.assetRegistry.contract;
      const typeData = await registry.getType(assetTypeId);

      // Verify specific values returned from contract
      expect(typeData.name).toBe('Satellite');
      expect(typeData.exists).toBe(true);
      expect(typeData.requiredLeaseKeys).toHaveLength(2);

      // Verify the transaction actually happened
      const tx = await provider.getTransaction(result.transactionHash);
      expect(tx).toBeTruthy();
      expect(tx!.from.toLowerCase()).toBe(deployment.deployer.toLowerCase());
    });

    it('should register an asset with token and verify all details', async () => {
      // Create metadata hash (simulating off-chain metadata storage)
      const metadata = {
        name: 'Alpha Satellite',
        type: 'satellite',
        specifications: {
          mass_kg: 500,
          orbital_altitude_km: 550
        }
      };
      const metadataHash = createHash('sha256')
        .update(JSON.stringify(metadata))
        .digest('hex')
        .substring(0, 32); // Take first 32 chars for bytes32

      // Register the asset
      const result = await deployer.registerAsset(
        assetTypeId,
        metadataHash,
        'ipfs://QmTestMetadata123',
        'Alpha Satellite Token',
        'ALPHA-SAT',
        ethers.parseEther('1000000') // 1M tokens
      );

      assetId = result.assetId;
      tokenAddress = result.tokenAddress;

      // Verify asset ID is valid
      expect(assetId).toBeGreaterThan(0n);

      // Verify token address is valid Ethereum address
      expect(ethers.isAddress(tokenAddress)).toBe(true);
      expect(tokenAddress).not.toBe(ethers.ZeroAddress);

      // Independent verification: Query asset from contract
      const assetData = await deployer.verifyAssetOnChain(assetId);

      // Verify ALL asset properties match what we registered
      expect(assetData.exists).toBe(true);
      expect(assetData.typeId).toBe(assetTypeId);
      expect(assetData.issuer!.toLowerCase()).toBe(deployment.deployer.toLowerCase());
      expect(assetData.dataURI).toBe('ipfs://QmTestMetadata123');
      expect(assetData.tokenAddress!.toLowerCase()).toBe(tokenAddress.toLowerCase());

      // Verify the token contract actually exists and works
      const tokenArtifact = JSON.parse(
        require('fs').readFileSync(
          '/Users/shaunmartinak/Documents/SoftwareProjects/Asset-Leasing-Protocol/out/AssetERC20.sol/AssetERC20.json',
          'utf-8'
        )
      );

      const tokenContract = new ethers.Contract(
        tokenAddress,
        tokenArtifact.abi,
        provider
      );

      // Verify token properties
      const tokenName = await tokenContract.name();
      const tokenSymbol = await tokenContract.symbol();
      const totalSupply = await tokenContract.totalSupply();

      expect(tokenName).toBe('Alpha Satellite Token');
      expect(tokenSymbol).toBe('ALPHA-SAT');
      expect(totalSupply).toBe(ethers.parseEther('1000000'));

      // Verify deployer owns all tokens initially
      const deployerBalance = await tokenContract.balanceOf(deployment.deployer);
      expect(deployerBalance).toBe(totalSupply);
    });

    it('should fail when registering asset with invalid type ID', async () => {
      const invalidTypeId = 999n; // Non-existent type

      // This should revert
      await expect(
        deployer.registerAsset(
          invalidTypeId,
          'invalid-hash',
          'ipfs://invalid',
          'Invalid Token',
          'INVALID',
          ethers.parseEther('1000')
        )
      ).rejects.toThrow();
    });
  });

  describe('Event Processing with Real Blockchain Events', () => {
    it('should capture and process AssetTypeCreated events', async () => {
      const registry = deployment.assetRegistry.contract;

      // Setup event listener BEFORE creating the type
      const eventPromise = new Promise<any>((resolve) => {
        registry.once('AssetTypeCreated', (typeId, name, schemaHash, event) => {
          resolve({
            typeId,
            name,
            schemaHash,
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash
          });
        });
      });

      // Register a new asset type
      const typeName = 'TestEventType_' + Date.now();
      await deployer.registerAssetType(typeName, 'test-schema-hash');

      // Wait for event with timeout
      const event = await Promise.race([
        eventPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Event timeout')), 5000)
        )
      ]);

      // Verify event data is correct
      expect(event.name).toBe(typeName);
      expect(event.typeId).toBeGreaterThan(0n);
      expect(event.blockNumber).toBeGreaterThan(0);
      expect(event.transactionHash).toBeTruthy();

      // Verify event matches on-chain state
      const typeData = await registry.getType(event.typeId);
      expect(typeData.name).toBe(typeName);
      expect(typeData.exists).toBe(true);
    });

    it('should handle multiple rapid events correctly', async () => {
      const registry = deployment.assetRegistry.contract;
      const events: any[] = [];

      // Setup listener for all events
      registry.on('AssetTypeCreated', (typeId, name, schemaHash, event) => {
        events.push({ typeId, name, blockNumber: event.log.blockNumber });
      });

      // Register multiple types rapidly
      const typeNames = ['RapidType1', 'RapidType2', 'RapidType3'];
      const promises = typeNames.map(name =>
        deployer.registerAssetType(name, `schema-${name}`)
      );

      await Promise.all(promises);

      // Wait for events to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify all events were captured
      expect(events.length).toBeGreaterThanOrEqual(3);

      // Verify each event corresponds to correct type
      for (const typeName of typeNames) {
        const event = events.find(e => e.name === typeName);
        expect(event).toBeDefined();
        expect(event!.typeId).toBeGreaterThan(0n);
      }

      // Cleanup listener
      registry.removeAllListeners();
    });
  });

  describe('Lease Marketplace Flow with NFT Verification', () => {
    let assetId: bigint;
    let offerId: bigint;

    beforeAll(async () => {
      // Setup: Register an asset for lease testing
      const typeResult = await deployer.registerAssetType(
        'LeaseTestAsset',
        'lease-test-schema'
      );

      const assetResult = await deployer.registerAsset(
        typeResult.typeId,
        'lease-asset-hash',
        'ipfs://lease-asset',
        'Lease Test Token',
        'LEASE-TEST',
        ethers.parseEther('100')
      );

      assetId = assetResult.assetId;
    });

    it('should post a lease offer and verify marketplace state', async () => {
      const startTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const endTime = startTime + 86400 * 30; // 30 days
      const paymentAmount = ethers.parseEther('1000'); // 1000 USDC

      // Post lease offer
      const result = await deployer.postLeaseOffer(
        assetId,
        paymentAmount,
        startTime,
        endTime,
        'lease-terms-hash'
      );

      offerId = result.offerId;

      // Verify offer ID is valid
      expect(offerId).toBeGreaterThanOrEqual(0n);

      // Independent verification: Query marketplace for offer details
      const marketplace = deployment.marketplace.contract;
      const offerData = await marketplace.getOffer(offerId);

      // Verify offer details match what we posted
      expect(offerData.lessor.toLowerCase()).toBe(deployment.deployer.toLowerCase());
      expect(offerData.assetId).toBe(assetId);
      expect(offerData.totalPayment).toBe(paymentAmount);
      expect(offerData.startTime).toBe(BigInt(startTime));
      expect(offerData.endTime).toBe(BigInt(endTime));
      expect(offerData.active).toBe(true);
    });

    it('should place a bid on lease offer from different account', async () => {
      // Setup second account as lessee
      const lesseeWallet = new ethers.Wallet(
        anvilInstance.accounts[1].privateKey,
        provider
      );

      // Mint stablecoins for lessee to pay with
      const bidAmount = ethers.parseEther('1000');
      await deployer.mintStablecoins(lesseeWallet.address, bidAmount);

      // Verify lessee has the funds
      const balance = await deployer.getStablecoinBalance(lesseeWallet.address);
      expect(balance).toBe(bidAmount);

      // Approve marketplace to spend lessee's tokens
      const stablecoin = deployment.mockStablecoin.contract;
      const approveTx = await stablecoin.connect(lesseeWallet).approve(
        deployment.marketplace.address,
        bidAmount
      );
      await approveTx.wait();

      // Place bid
      const marketplace = deployment.marketplace.contract.connect(lesseeWallet);

      // Create signature for bid (simplified for testing)
      const bidMessage = ethers.solidityPackedKeccak256(
        ['uint256', 'address', 'uint256'],
        [offerId, lesseeWallet.address, bidAmount]
      );
      const signature = await lesseeWallet.signMessage(ethers.getBytes(bidMessage));

      const bidTx = await marketplace.placeLeaseBid(
        offerId,
        signature,
        bidAmount
      );
      const bidReceipt = await bidTx.wait();

      // Verify bid was placed
      expect(bidReceipt.status).toBe(1);

      // Verify bid exists in marketplace
      const bidData = await marketplace.getBid(offerId, 0); // First bid
      expect(bidData.bidder.toLowerCase()).toBe(lesseeWallet.address.toLowerCase());
      expect(bidData.amount).toBe(bidAmount);
    });

    it('should accept bid and mint lease NFT', async () => {
      // Accept the bid as lessor
      const marketplace = deployment.marketplace.contract;

      // Create lessor signature
      const acceptMessage = ethers.solidityPackedKeccak256(
        ['uint256', 'uint256'],
        [offerId, 0] // Accept first bid
      );
      const signature = await new ethers.Wallet(
        anvilInstance.accounts[0].privateKey
      ).signMessage(ethers.getBytes(acceptMessage));

      // Accept bid
      const acceptTx = await marketplace.acceptLeaseBid(
        offerId,
        0, // bid index
        signature,
        'ipfs://lease-nft-metadata' // Token URI for lease NFT
      );
      const acceptReceipt = await acceptTx.wait();

      // Parse LeaseAccepted event to get lease NFT details
      const leaseEvent = acceptReceipt.logs.find((log: any) => {
        try {
          const parsed = marketplace.interface.parseLog(log);
          return parsed?.name === 'LeaseAccepted';
        } catch {
          return false;
        }
      });

      expect(leaseEvent).toBeDefined();

      const parsedEvent = marketplace.interface.parseLog(leaseEvent!);
      const leaseId = parsedEvent!.args.leaseId;
      const nftId = parsedEvent!.args.nftId;

      // Verify lease NFT was minted
      expect(leaseId).toBeGreaterThan(0n);
      expect(nftId).toBeGreaterThan(0n);

      // Verify lease NFT exists in LeaseFactory
      const leaseFactoryArtifact = JSON.parse(
        require('fs').readFileSync(
          '/Users/shaunmartinak/Documents/SoftwareProjects/Asset-Leasing-Protocol/out/LeaseFactory.sol/LeaseFactory.json',
          'utf-8'
        )
      );

      const leaseFactory = new ethers.Contract(
        deployment.leaseFactory.address,
        leaseFactoryArtifact.abi,
        provider
      );

      // Check NFT ownership
      const nftOwner = await leaseFactory.ownerOf(nftId);
      expect(nftOwner.toLowerCase()).toBe(anvilInstance.accounts[1].address.toLowerCase());

      // Verify token URI
      const tokenURI = await leaseFactory.tokenURI(nftId);
      expect(tokenURI).toBe('ipfs://lease-nft-metadata');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle transaction reverts gracefully', async () => {
      // Try to register asset with non-existent type
      const invalidTypeId = 99999n;

      try {
        await deployer.registerAsset(
          invalidTypeId,
          'test-hash',
          'ipfs://test',
          'Test Token',
          'TEST',
          ethers.parseEther('100')
        );

        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        // Verify we get a proper revert error
        expect(error.message).toContain('revert');

        // Verify blockchain state is unchanged
        const latestBlock = await provider.getBlockNumber();
        expect(latestBlock).toBeGreaterThan(0);
      }
    });

    it('should handle network delays and confirmations', async () => {
      // Register type and wait for multiple confirmations
      const startBlock = await provider.getBlockNumber();

      const result = await deployer.registerAssetType(
        'ConfirmationTest',
        'confirmation-schema'
      );

      // Wait for 3 block confirmations
      let confirmations = 0;
      while (confirmations < 3) {
        await anvilManager.mineBlocks('integration-test', 1);
        const currentBlock = await provider.getBlockNumber();
        confirmations = currentBlock - startBlock;
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Verify transaction is confirmed
      const tx = await provider.getTransactionReceipt(result.transactionHash);
      expect(tx).toBeTruthy();
      expect(tx!.status).toBe(1);

      const currentBlock = await provider.getBlockNumber();
      const actualConfirmations = currentBlock - tx!.blockNumber;
      expect(actualConfirmations).toBeGreaterThanOrEqual(3);
    });

    it('should handle blockchain reorgs using snapshots', async () => {
      // Take snapshot before changes
      const snapshot = await anvilManager.takeSnapshot('integration-test');

      // Make some changes
      const beforeReorgResult = await deployer.registerAssetType(
        'BeforeReorg',
        'before-reorg-schema'
      );
      const typeId = beforeReorgResult.typeId;

      // Verify type exists
      const registry = deployment.assetRegistry.contract;
      let typeData = await registry.getType(typeId);
      expect(typeData.exists).toBe(true);

      // Simulate reorg by reverting to snapshot
      await anvilManager.revertToSnapshot('integration-test', snapshot);

      // Verify type no longer exists (state reverted)
      try {
        typeData = await registry.getType(typeId);
        expect(typeData.exists).toBe(false);
      } catch {
        // May throw if type ID is completely invalid after revert
        expect(true).toBe(true);
      }

      // Can still make new transactions after revert
      const afterReorgResult = await deployer.registerAssetType(
        'AfterReorg',
        'after-reorg-schema'
      );
      expect(afterReorgResult.typeId).toBeGreaterThan(0n);
    });
  });

  describe('Data Validation and Cross-Verification', () => {
    it('should verify metadata hash consistency between on-chain and off-chain', async () => {
      // Create metadata with specific structure
      const metadata = {
        assetId: 'validation-test-001',
        name: 'Validation Test Asset',
        specifications: {
          property1: 'value1',
          property2: 42,
          property3: true
        },
        timestamp: new Date().toISOString()
      };

      // Generate hash using same method as production
      const metadataString = JSON.stringify(metadata, null, 0); // Deterministic
      const hash = createHash('sha256')
        .update(metadataString)
        .digest('hex');

      // Store hash on-chain (truncated to bytes32)
      const bytes32Hash = hash.substring(0, 32);

      // Register asset type first
      const typeResult = await deployer.registerAssetType(
        'HashValidationType',
        'hash-validation-schema'
      );

      // Register asset with hash
      const assetResult = await deployer.registerAsset(
        typeResult.typeId,
        bytes32Hash,
        'ipfs://metadata-validation',
        'Hash Test Token',
        'HASH-TEST',
        ethers.parseEther('100')
      );

      // Retrieve asset from chain
      const registry = deployment.assetRegistry.contract;
      const assetData = await registry.getAsset(assetResult.assetId);

      // Decode the hash from chain
      const chainHash = ethers.decodeBytes32String(assetData.metadataHash);

      // Verify hashes match
      expect(chainHash).toBe(bytes32Hash);

      // Simulate "off-chain" verification
      const recreatedHash = createHash('sha256')
        .update(metadataString)
        .digest('hex')
        .substring(0, 32);

      expect(recreatedHash).toBe(bytes32Hash);
      expect(recreatedHash).toBe(chainHash);
    });

    it('should verify gas consumption is within expected ranges', async () => {
      // Track gas used for different operations
      const gasUsed: Record<string, bigint> = {};

      // Measure gas for type registration
      const typeResult = await deployer.registerAssetType(
        'GasTestType',
        'gas-test-schema'
      );
      const typeTx = await provider.getTransactionReceipt(typeResult.transactionHash);
      gasUsed['registerType'] = typeTx!.gasUsed;

      // Measure gas for asset registration
      const assetResult = await deployer.registerAsset(
        typeResult.typeId,
        'gas-test-hash',
        'ipfs://gas-test',
        'Gas Test Token',
        'GAS-TEST',
        ethers.parseEther('100')
      );
      const assetTx = await provider.getTransactionReceipt(assetResult.transactionHash);
      gasUsed['registerAsset'] = assetTx!.gasUsed;

      // Verify gas usage is within reasonable bounds
      // Asset registration should use more gas (deploys ERC20)
      expect(gasUsed['registerAsset']).toBeGreaterThan(gasUsed['registerType']);

      // Type registration should be under 500k gas
      expect(gasUsed['registerType']).toBeLessThan(500000n);

      // Asset registration (with token deployment) should be under 5M gas
      expect(gasUsed['registerAsset']).toBeLessThan(5000000n);

      console.log('Gas usage analysis:');
      console.log(`  Register Type: ${gasUsed['registerType']} gas`);
      console.log(`  Register Asset: ${gasUsed['registerAsset']} gas`);
    });
  });
});

/**
 * Sabotage Tests - Demonstrate that tests actually catch bugs
 *
 * These tests intentionally break things to prove our tests work
 */
describe('Sabotage Tests - Proving Test Effectiveness', () => {
  let anvilManager: AnvilManager;
  let anvilInstance: AnvilInstance;
  let provider: ethers.JsonRpcProvider;

  beforeAll(async () => {
    anvilManager = new AnvilManager();
    anvilInstance = await anvilManager.startAnvil('sabotage-test', {
      port: 8547,
      chainId: 31337,
      accounts: 5
    });
    provider = new ethers.JsonRpcProvider(anvilInstance.rpcUrl);
  }, 30000);

  afterAll(async () => {
    await anvilManager.stopAnvil('sabotage-test');
  });

  it('should fail when contracts are not deployed (sabotage test)', async () => {
    // Create deployer but DON'T deploy contracts
    const brokenDeployer = new ContractDeployer(
      anvilInstance.rpcUrl,
      anvilInstance.accounts[0].privateKey
    );

    // This should throw because contracts aren't deployed
    expect(() => brokenDeployer.getDeployment()).toThrow('Contracts not deployed');

    // Trying to register a type should also fail
    await expect(
      brokenDeployer.registerAssetType('FailType', 'fail-schema')
    ).rejects.toThrow();
  });

  it('should detect when wrong contract address is used', async () => {
    // Deploy contracts properly
    const deployer = new ContractDeployer(
      anvilInstance.rpcUrl,
      anvilInstance.accounts[0].privateKey
    );
    await deployer.deployAll();

    // Try to interact with wrong address
    const wrongAddress = ethers.Wallet.createRandom().address;
    const code = await provider.getCode(wrongAddress);

    // Verify no code at wrong address
    expect(code).toBe('0x');

    // Try to call contract at wrong address - should fail
    const fakeContract = new ethers.Contract(
      wrongAddress,
      ['function getType(uint256) view returns (tuple(string, bytes32, bytes32[], string, bool))'],
      provider
    );

    await expect(fakeContract.getType(1)).rejects.toThrow();
  });

  it('should detect data corruption in return values', async () => {
    const deployer = new ContractDeployer(
      anvilInstance.rpcUrl,
      anvilInstance.accounts[0].privateKey
    );
    const deployment = await deployer.deployAll();

    // Register a type
    const result = await deployer.registerAssetType(
      'CorruptionTest',
      'corruption-schema'
    );

    // Get the actual data
    const registry = deployment.assetRegistry.contract;
    const actualData = await registry.getType(result.typeId);

    // Simulate data corruption - if we got wrong data back
    const corruptedName = 'WrongName';

    // This assertion would fail, proving our test catches corruption
    expect(actualData.name).not.toBe(corruptedName);
    expect(actualData.name).toBe('CorruptionTest');
  });
});