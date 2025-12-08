/**
 * Test manual EIP-712 encoding against Solidity contract
 */

import { ethers } from 'ethers';
import { calculateLeaseIntentDigestManual } from './src/utils/eip712-manual.js';
import { calculateLeaseIntentDigest } from './src/utils/eip712-signatures.js';
import type { LeaseIntentData } from './src/types/lease.js';

async function testManualEncoding() {
  console.log('\n' + '='.repeat(70));
  console.log('  EIP-712 Manual Encoding Verification');
  console.log('='.repeat(70) + '\n');

  // Connect to Anvil
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const wallet = new ethers.Wallet(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    provider
  );

  // From latest demo run
  const leaseFactoryAddress = '0xdF46e54aAadC1d55198A4a8b4674D7a4c927097A';
  const stablecoinAddress = '0x4593ed9CbE6003e687e5e77368534bb04b162503';
  const chainId = 31337;

  console.log('Configuration:');
  console.log(`  Chain ID: ${chainId}`);
  console.log(`  LeaseFactory: ${leaseFactoryAddress}`);
  console.log(`  Stablecoin: ${stablecoinAddress}\n`);

  // Build test LeaseIntent
  const now = Math.floor(Date.now() / 1000);
  const leaseIntent: LeaseIntentData = {
    deadline: now + 86400,
    assetTypeSchemaHash: ethers.keccak256(ethers.toUtf8Bytes('orbital_compute')),
    lease: {
      lessor: wallet.address,
      lessee: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      assetId: 1,
      paymentToken: stablecoinAddress,
      rentAmount: ethers.parseEther('1000'),
      rentPeriod: 30 * 24 * 60 * 60,
      securityDeposit: ethers.parseEther('5000'),
      startTime: now,
      endTime: now + 365 * 24 * 60 * 60,
      legalDocHash: ethers.keccak256(ethers.toUtf8Bytes('legal-doc-v1')),
      termsVersion: 1
    }
  };

  console.log('Digest Calculations:');
  console.log('-'.repeat(70));

  const autoDigest = calculateLeaseIntentDigest(
    leaseIntent,
    leaseFactoryAddress,
    chainId
  );
  console.log(`  Automatic (ethers.js):  ${autoDigest}`);

  const manualDigest = calculateLeaseIntentDigestManual(
    leaseIntent,
    leaseFactoryAddress,
    chainId
  );
  console.log(`  Manual (abi.encode):    ${manualDigest}`);

  // Query contract
  const leaseFactory = new ethers.Contract(
    leaseFactoryAddress,
    [
      'function hashLeaseIntent((uint64 deadline, bytes32 assetType, (address lessor, address lessee, uint256 assetId, address paymentToken, uint256 rentAmount, uint256 rentPeriod, uint256 securityDeposit, uint64 startTime, uint64 endTime, bytes32 legalDocHash, uint16 termsVersion, (string,string)[] metadata) lease)) external view returns (bytes32)'
    ],
    provider
  );

  const solidityLeaseIntent = {
    deadline: leaseIntent.deadline,
    assetType: leaseIntent.assetTypeSchemaHash,
    lease: {
      lessor: leaseIntent.lease.lessor,
      lessee: leaseIntent.lease.lessee,
      assetId: leaseIntent.lease.assetId,
      paymentToken: leaseIntent.lease.paymentToken,
      rentAmount: leaseIntent.lease.rentAmount,
      rentPeriod: leaseIntent.lease.rentPeriod,
      securityDeposit: leaseIntent.lease.securityDeposit,
      startTime: leaseIntent.lease.startTime,
      endTime: leaseIntent.lease.endTime,
      legalDocHash: leaseIntent.lease.legalDocHash,
      termsVersion: leaseIntent.lease.termsVersion,
      metadata: []
    }
  };

  const contractDigest = await leaseFactory.hashLeaseIntent(solidityLeaseIntent);
  console.log(`  Contract (Solidity):    ${contractDigest}`);

  console.log('\n' + '-'.repeat(70));

  const autoMatch = autoDigest.toLowerCase() === contractDigest.toLowerCase();
  const manualMatch = manualDigest.toLowerCase() === contractDigest.toLowerCase();

  console.log(`  Automatic matches contract: ${autoMatch ? '✅ YES' : '❌ NO'}`);
  console.log(`  Manual matches contract:    ${manualMatch ? '✅ YES' : '❌ NO'}`);

  if (manualMatch) {
    console.log('\n✅ SUCCESS: Manual encoding matches Solidity!\n');
    return 0;
  } else {
    console.log('\n❌ FAILURE: Still investigating...\n');
    return 1;
  }
}

testManualEncoding().then(code => process.exit(code)).catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
