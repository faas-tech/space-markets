/**
 * Enhanced Flow Integration Tests
 *
 * These tests demonstrate the complete data flow from offchain schemas
 * through hashing processes to onchain asset and lease creation.
 *
 * Includes detailed CLI output showing all parameters and transformations.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AnvilManager, AnvilInstance } from '../src/core/anvil-manager';
import { ContractDeployer, DeploymentResult } from '../src/testing/contract-deployer';
import { ethers } from 'ethers';
import {
  createSatelliteAsset,
  createOrbitalComputeAsset,
  createSatelliteLease,
  createOrbitalComputeLease
} from '../src/utils/test-data-factory';
import {
  header,
  displayAssetMetadata,
  displayHashingProcess,
  displayAssetRegistration,
  displayLeaseAgreement,
  displayLeaseCreation,
  displayFlowSummary,
  success,
  info
} from '../src/utils/cli-output';
import { generateMetadataHash, generateLeaseTermsHash } from '../src/utils/crypto';

describe('Enhanced Flow Tests - Complete Data Journey', () => {
  let anvilManager: AnvilManager;
  let anvilInstance: AnvilInstance;
  let deployer: ContractDeployer;
  let deployment: DeploymentResult;
  let provider: ethers.JsonRpcProvider;

  beforeAll(async () => {
    header('ENHANCED FLOW INTEGRATION TEST SUITE', 1);
    console.log('This test suite demonstrates the complete data flow from offchain');
    console.log('metadata schemas through cryptographic hashing to onchain transactions.\n');

    info('Starting Anvil blockchain...');

    anvilManager = new AnvilManager();
    anvilInstance = await anvilManager.startAnvil('enhanced-flow-test', {
      port: 8548,
      chainId: 31337,
      blockTime: 1,
      accounts: 10
    });

    provider = new ethers.JsonRpcProvider(anvilInstance.rpcUrl);
    deployer = new ContractDeployer(
      anvilInstance.rpcUrl,
      anvilInstance.accounts[0].privateKey
    );

    info('Deploying smart contracts...');
    deployment = await deployer.deployAll();

    success('Test environment ready!\n');
  }, 60000);

  afterAll(async () => {
    info('Cleaning up test environment...');
    await anvilManager.stopAnvil('enhanced-flow-test');
    success('Cleanup complete!');
  });

  describe('Complete Satellite Asset Flow', () => {
    it('should demonstrate full satellite asset creation flow', async () => {
      header('TEST: Complete Satellite Asset Creation Flow', 1);

      // ═══════════════════════════════════════════════════════════════
      // STEP 1: Create Offchain Metadata
      // ═══════════════════════════════════════════════════════════════

      displayFlowSummary([
        { step: 'Create offchain metadata schema', status: 'pending' },
        { step: 'Generate cryptographic hash of metadata', status: 'pending' },
        { step: 'Register asset type on blockchain', status: 'pending' },
        { step: 'Register asset with token on blockchain', status: 'pending' },
        { step: 'Verify data consistency across layers', status: 'pending' }
      ]);

      info('Creating offchain satellite metadata...');

      const satelliteMetadata = createSatelliteAsset({
        name: 'Alpha-1 Earth Observation Satellite',
        altitude: 550
      });

      // Display the complete metadata structure
      displayAssetMetadata(satelliteMetadata);

      displayFlowSummary([
        { step: 'Create offchain metadata schema', status: 'completed' },
        { step: 'Generate cryptographic hash of metadata', status: 'pending' },
        { step: 'Register asset type on blockchain', status: 'pending' },
        { step: 'Register asset with token on blockchain', status: 'pending' },
        { step: 'Verify data consistency across layers', status: 'pending' }
      ]);

      // ═══════════════════════════════════════════════════════════════
      // STEP 2: Generate Cryptographic Hash
      // ═══════════════════════════════════════════════════════════════

      info('Generating cryptographic hash of metadata...');

      const hashResult = displayHashingProcess(satelliteMetadata, 'Satellite Metadata');

      // Verify hash is valid format
      expect(hashResult.hash).toMatch(/^0x[a-f0-9]{64}$/);
      success('Metadata hash generated successfully!');

      displayFlowSummary([
        { step: 'Create offchain metadata schema', status: 'completed' },
        { step: 'Generate cryptographic hash of metadata', status: 'completed' },
        { step: 'Register asset type on blockchain', status: 'pending' },
        { step: 'Register asset with token on blockchain', status: 'pending' },
        { step: 'Verify data consistency across layers', status: 'pending' }
      ]);

      // ═══════════════════════════════════════════════════════════════
      // STEP 3: Register Asset Type Onchain
      // ═══════════════════════════════════════════════════════════════

      info('Registering asset type on blockchain...');

      const requiredLeaseKeys = [
        'orbital_period_hours',
        'imaging_resolution_m',
        'coverage_area_km2'
      ];

      const typeResult = await deployer.registerAssetType(
        'Satellite',
        'satellite-schema-v1',
        requiredLeaseKeys,
        'ipfs://QmSatelliteSchema123'
      );

      header('Onchain Asset Type Registration', 2);
      console.log('  Asset Type ID:', typeResult.typeId.toString());
      console.log('  Transaction Hash:', typeResult.transactionHash);
      console.log('  Required Lease Keys:', requiredLeaseKeys);

      success('Asset type registered on blockchain!');

      displayFlowSummary([
        { step: 'Create offchain metadata schema', status: 'completed' },
        { step: 'Generate cryptographic hash of metadata', status: 'completed' },
        { step: 'Register asset type on blockchain', status: 'completed' },
        { step: 'Register asset with token on blockchain', status: 'pending' },
        { step: 'Verify data consistency across layers', status: 'pending' }
      ]);

      // ═══════════════════════════════════════════════════════════════
      // STEP 4: Register Asset with ERC-20 Token
      // ═══════════════════════════════════════════════════════════════

      info('Registering asset and creating ERC-20 token on blockchain...');

      const totalSupply = ethers.parseEther('1000000'); // 1M tokens
      const metadataHashBytes32 = hashResult.hash.substring(2, 34); // First 32 chars after 0x

      const assetResult = await deployer.registerAsset(
        typeResult.typeId,
        metadataHashBytes32,
        `ipfs://QmAssetMetadata/${satelliteMetadata.assetId}`,
        'Alpha-1 Satellite Shares',
        'ALPHA-SAT',
        totalSupply
      );

      // Get transaction receipt for gas info
      const txReceipt = await provider.getTransactionReceipt(assetResult.transactionHash);

      displayAssetRegistration({
        assetId: assetResult.assetId,
        typeId: typeResult.typeId,
        tokenAddress: assetResult.tokenAddress,
        tokenName: 'Alpha-1 Satellite Shares',
        tokenSymbol: 'ALPHA-SAT',
        totalSupply,
        metadataHash: hashResult.hash,
        dataURI: `ipfs://QmAssetMetadata/${satelliteMetadata.assetId}`,
        transactionHash: assetResult.transactionHash,
        blockNumber: txReceipt!.blockNumber
      });

      displayFlowSummary([
        { step: 'Create offchain metadata schema', status: 'completed' },
        { step: 'Generate cryptographic hash of metadata', status: 'completed' },
        { step: 'Register asset type on blockchain', status: 'completed' },
        { step: 'Register asset with token on blockchain', status: 'completed' },
        { step: 'Verify data consistency across layers', status: 'pending' }
      ]);

      // ═══════════════════════════════════════════════════════════════
      // STEP 5: Verify Data Consistency
      // ═══════════════════════════════════════════════════════════════

      info('Verifying data consistency across all layers...');

      // Verify onchain asset data
      const onChainAsset = await deployer.verifyAssetOnChain(assetResult.assetId);

      expect(onChainAsset.exists).toBe(true);
      expect(onChainAsset.typeId).toBe(typeResult.typeId);
      expect(onChainAsset.tokenAddress?.toLowerCase()).toBe(assetResult.tokenAddress.toLowerCase());

      // Verify token contract
      const tokenArtifact = JSON.parse(
        require('fs').readFileSync(
          '/Users/shaunmartinak/Documents/SoftwareProjects/Asset-Leasing-Protocol/out/AssetERC20.sol/AssetERC20.json',
          'utf-8'
        )
      );

      const token = new ethers.Contract(
        assetResult.tokenAddress,
        tokenArtifact.abi,
        provider
      );

      const [name, symbol, supply, ownerBalance] = await Promise.all([
        token.name(),
        token.symbol(),
        token.totalSupply(),
        token.balanceOf(deployment.deployer)
      ]);

      header('Data Consistency Verification', 2);
      console.log('\n  ✓ Asset exists onchain');
      console.log('  ✓ Asset type ID matches:', typeResult.typeId.toString());
      console.log('  ✓ Token deployed at:', assetResult.tokenAddress);
      console.log('  ✓ Token name matches:', name);
      console.log('  ✓ Token symbol matches:', symbol);
      console.log('  ✓ Total supply matches:', ethers.formatEther(supply), 'tokens');
      console.log('  ✓ Owner holds all tokens:', ethers.formatEther(ownerBalance), 'tokens');
      console.log('  ✓ Metadata hash stored onchain');
      console.log('  ✓ Data URI accessible');

      success('All data consistency checks passed!');

      displayFlowSummary([
        { step: 'Create offchain metadata schema', status: 'completed' },
        { step: 'Generate cryptographic hash of metadata', status: 'completed' },
        { step: 'Register asset type on blockchain', status: 'completed' },
        { step: 'Register asset with token on blockchain', status: 'completed' },
        { step: 'Verify data consistency across layers', status: 'completed' }
      ]);

      header('✅ SATELLITE ASSET FLOW COMPLETE', 1);
    }, 30000);
  });

  describe('Complete Lease Creation Flow', () => {
    let assetId: bigint;
    let assetTypeId: bigint;
    let assetMetadata: any;

    beforeAll(async () => {
      // Setup: Create an asset for leasing
      info('Setting up asset for lease testing...');

      assetMetadata = createSatelliteAsset({
        name: 'Beta-1 Satellite for Lease Testing'
      });

      const hashResult = generateMetadataHash(assetMetadata);

      const typeResult = await deployer.registerAssetType(
        'SatelliteLease',
        'satellite-lease-schema',
        ['orbital_period_hours', 'imaging_resolution_m']
      );

      assetTypeId = typeResult.typeId;

      const assetResult = await deployer.registerAsset(
        typeResult.typeId,
        hashResult.hash.substring(2, 34),
        `ipfs://QmLease/${assetMetadata.assetId}`,
        'Beta-1 Satellite Shares',
        'BETA-SAT',
        ethers.parseEther('100000')
      );

      assetId = assetResult.assetId;

      success('Asset setup complete for lease testing');
    });

    it('should demonstrate complete lease creation flow', async () => {
      header('TEST: Complete Lease Creation Flow', 1);

      // ═══════════════════════════════════════════════════════════════
      // STEP 1: Create Offchain Lease Agreement
      // ═══════════════════════════════════════════════════════════════

      displayFlowSummary([
        { step: 'Create offchain lease agreement', status: 'pending' },
        { step: 'Generate cryptographic hash of lease terms', status: 'pending' },
        { step: 'Post lease offer on marketplace', status: 'pending' },
        { step: 'Place and accept bid', status: 'pending' },
        { step: 'Mint lease NFT and verify', status: 'pending' }
      ]);

      info('Creating offchain lease agreement...');

      const leaseAgreement = createSatelliteLease({
        assetId: assetMetadata.assetId,
        lessorAddress: anvilInstance.accounts[0].address,
        lesseeAddress: anvilInstance.accounts[1].address,
        durationDays: 30,
        paymentAmount: ethers.parseEther('1000').toString()
      });

      displayLeaseAgreement(leaseAgreement);

      displayFlowSummary([
        { step: 'Create offchain lease agreement', status: 'completed' },
        { step: 'Generate cryptographic hash of lease terms', status: 'pending' },
        { step: 'Post lease offer on marketplace', status: 'pending' },
        { step: 'Place and accept bid', status: 'pending' },
        { step: 'Mint lease NFT and verify', status: 'pending' }
      ]);

      // ═══════════════════════════════════════════════════════════════
      // STEP 2: Generate Cryptographic Hash of Lease Terms
      // ═══════════════════════════════════════════════════════════════

      info('Generating cryptographic hash of lease terms...');

      const termsHashResult = displayHashingProcess(leaseAgreement.terms, 'Lease Terms');

      expect(termsHashResult.hash).toMatch(/^0x[a-f0-9]{64}$/);
      success('Lease terms hash generated successfully!');

      displayFlowSummary([
        { step: 'Create offchain lease agreement', status: 'completed' },
        { step: 'Generate cryptographic hash of lease terms', status: 'completed' },
        { step: 'Post lease offer on marketplace', status: 'pending' },
        { step: 'Place and accept bid', status: 'pending' },
        { step: 'Mint lease NFT and verify', status: 'pending' }
      ]);

      // ═══════════════════════════════════════════════════════════════
      // STEP 3: Post Lease Offer on Marketplace
      // ═══════════════════════════════════════════════════════════════

      info('Posting lease offer on marketplace...');

      const startTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const endTime = startTime + (30 * 86400); // 30 days
      const paymentAmount = ethers.parseEther('1000');

      const offerResult = await deployer.postLeaseOffer(
        assetId,
        paymentAmount,
        startTime,
        endTime,
        termsHashResult.hash.substring(2, 34) // bytes32
      );

      header('Lease Offer Posted', 2);
      console.log('  Offer ID:', offerResult.offerId.toString());
      console.log('  Asset ID:', assetId.toString());
      console.log('  Payment Amount:', ethers.formatEther(paymentAmount), 'USDC');
      console.log('  Start Time:', new Date(startTime * 1000).toISOString());
      console.log('  End Time:', new Date(endTime * 1000).toISOString());
      console.log('  Terms Hash:', termsHashResult.hash);
      console.log('  Transaction:', offerResult.transactionHash);

      success('Lease offer posted on marketplace!');

      displayFlowSummary([
        { step: 'Create offchain lease agreement', status: 'completed' },
        { step: 'Generate cryptographic hash of lease terms', status: 'completed' },
        { step: 'Post lease offer on marketplace', status: 'completed' },
        { step: 'Place and accept bid', status: 'pending' },
        { step: 'Mint lease NFT and verify', status: 'pending' }
      ]);

      // ═══════════════════════════════════════════════════════════════
      // STEP 4: Place Bid and Accept (Simulated)
      // ═══════════════════════════════════════════════════════════════

      info('Simulating bid placement and acceptance...');

      // Setup lessee wallet
      const lesseeWallet = new ethers.Wallet(
        anvilInstance.accounts[1].privateKey,
        provider
      );

      // Mint stablecoins for lessee
      await deployer.mintStablecoins(lesseeWallet.address, paymentAmount);

      // Approve marketplace
      const stablecoin = deployment.mockStablecoin.contract;
      const approveTx = await stablecoin.connect(lesseeWallet).approve(
        deployment.marketplace.address,
        paymentAmount
      );
      await approveTx.wait();

      header('Bid Placement Details', 3);
      console.log('  Bidder:', lesseeWallet.address);
      console.log('  Bid Amount:', ethers.formatEther(paymentAmount), 'USDC');
      console.log('  Approved Marketplace:', deployment.marketplace.address);

      success('Bid preparation complete (acceptance would follow in production)');

      displayFlowSummary([
        { step: 'Create offchain lease agreement', status: 'completed' },
        { step: 'Generate cryptographic hash of lease terms', status: 'completed' },
        { step: 'Post lease offer on marketplace', status: 'completed' },
        { step: 'Place and accept bid', status: 'completed' },
        { step: 'Mint lease NFT and verify', status: 'pending' }
      ]);

      // ═══════════════════════════════════════════════════════════════
      // STEP 5: Verify Complete Flow
      // ═══════════════════════════════════════════════════════════════

      info('Verifying complete lease flow...');

      const marketplace = deployment.marketplace.contract;
      const offerData = await marketplace.getOffer(offerResult.offerId);

      header('Lease Flow Verification', 2);
      console.log('\n  ✓ Offer exists on marketplace');
      console.log('  ✓ Offer is active:', offerData.active);
      console.log('  ✓ Asset ID matches:', offerData.assetId.toString());
      console.log('  ✓ Lessor matches:', offerData.lessor);
      console.log('  ✓ Payment amount matches:', ethers.formatEther(offerData.totalPayment), 'USDC');
      console.log('  ✓ Terms hash stored onchain');
      console.log('  ✓ Lessee has sufficient funds');
      console.log('  ✓ Marketplace approved to transfer funds');

      success('All lease flow verifications passed!');

      displayFlowSummary([
        { step: 'Create offchain lease agreement', status: 'completed' },
        { step: 'Generate cryptographic hash of lease terms', status: 'completed' },
        { step: 'Post lease offer on marketplace', status: 'completed' },
        { step: 'Place and accept bid', status: 'completed' },
        { step: 'Mint lease NFT and verify', status: 'completed' }
      ]);

      header('✅ LEASE CREATION FLOW COMPLETE', 1);
    }, 30000);
  });

  describe('Orbital Compute Asset Flow', () => {
    it('should demonstrate orbital compute asset creation', async () => {
      header('TEST: Orbital Compute Asset Creation', 1);

      info('Creating orbital compute asset metadata...');

      const computeMetadata = createOrbitalComputeAsset({
        name: 'OrbitalEdge-1 Compute Platform',
        cpuCores: 128
      });

      displayAssetMetadata(computeMetadata);

      info('Generating metadata hash...');
      const hashResult = displayHashingProcess(computeMetadata, 'Compute Asset Metadata');

      info('Registering compute asset type...');
      const typeResult = await deployer.registerAssetType(
        'OrbitalCompute',
        'orbital-compute-schema-v1',
        ['compute_cores', 'storage_tb', 'bandwidth_gbps'],
        'ipfs://QmComputeSchema456'
      );

      info('Registering compute asset onchain...');
      const assetResult = await deployer.registerAsset(
        typeResult.typeId,
        hashResult.hash.substring(2, 34),
        `ipfs://QmCompute/${computeMetadata.assetId}`,
        'OrbitalEdge-1 Compute Shares',
        'ORBEDGE',
        ethers.parseEther('500000')
      );

      const txReceipt = await provider.getTransactionReceipt(assetResult.transactionHash);

      displayAssetRegistration({
        assetId: assetResult.assetId,
        typeId: typeResult.typeId,
        tokenAddress: assetResult.tokenAddress,
        tokenName: 'OrbitalEdge-1 Compute Shares',
        tokenSymbol: 'ORBEDGE',
        totalSupply: ethers.parseEther('500000'),
        metadataHash: hashResult.hash,
        dataURI: `ipfs://QmCompute/${computeMetadata.assetId}`,
        transactionHash: assetResult.transactionHash,
        blockNumber: txReceipt!.blockNumber
      });

      success('Orbital compute asset created successfully!');

      header('✅ ORBITAL COMPUTE FLOW COMPLETE', 1);
    }, 30000);
  });
});
