import { ethers } from 'ethers';
import { signLeaseIntent, calculateLeaseIntentDigest } from './src/utils/eip712-signatures.js';
import type { LeaseIntentData } from './src/types/lease.js';

async function debugEIP712() {
  console.log('\n=== EIP-712 Signature Debug ===\n');
  
  // Connect to Anvil
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const wallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
  
  // Hardcoded from recent demo run
  const chainId = 31337;
  const leaseFactoryAddress = '0x0fe4223AD99dF788A6Dcad148eB4086E6389cEB6';  // From most recent run
  const stablecoinAddress = '0x0Aec7C174554af8AEC3680bb58431f661831151';  // From most recent run
  
  console.log('Chain ID:', chainId);
  console.log('LeaseFactory:', leaseFactoryAddress);
  console.log('Stablecoin:', stablecoinAddress);
  
  // Build a test LeaseIntent
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
  
  console.log('\n--- LeaseIntent ---');
  console.log('Deadline:', leaseIntent.deadline);
  console.log('AssetTypeSchemaHash:', leaseIntent.assetTypeSchemaHash);
  console.log('Lessor:', leaseIntent.lease.lessor);
  console.log('Lessee:', leaseIntent.lease.lessee);
  
  // Calculate digest using our TypeScript implementation
  const tsDigest = calculateLeaseIntentDigest(leaseIntent, leaseFactoryAddress, chainId);
  console.log('\n--- TypeScript Digest ---');
  console.log(tsDigest);
  
  // Get digest from Solidity contract
  const leaseFactory = new ethers.Contract(
    leaseFactoryAddress,
    [
      'function hashLeaseIntent((uint64 deadline, bytes32 assetType, (address lessor, address lessee, uint256 assetId, address paymentToken, uint256 rentAmount, uint256 rentPeriod, uint256 securityDeposit, uint64 startTime, uint64 endTime, bytes32 legalDocHash, uint16 termsVersion, (string,string)[] metadata) lease)) external view returns (bytes32)'
    ],
    provider
  );
  
  // Convert to Solidity struct format
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
  
  const solidityDigest = await leaseFactory.hashLeaseIntent(solidityLeaseIntent);
  console.log('\n--- Solidity Digest ---');
  console.log(solidityDigest);
  
  console.log('\n--- Comparison ---');
  const match = tsDigest.toLowerCase() === solidityDigest.toLowerCase();
  console.log('Match:', match ? '✅ YES' : '❌ NO');
  
  if (!match) {
    console.log('\n⚠️  Digests do not match! EIP-712 implementation has a mismatch.');
  } else {
    console.log('\n✅ Digests match! EIP-712 implementation is correct.');
    
    // Test signing
    const signature = await signLeaseIntent(wallet, leaseIntent, leaseFactoryAddress, chainId);
    
    console.log('\n--- Signature Test ---');
    console.log('Signature:', signature);
    
    // Recover signer
    const recovered = ethers.recoverAddress(solidityDigest, signature);
    console.log('Recovered signer:', recovered);
    console.log('Expected signer:', wallet.address);
    console.log('Match:', recovered.toLowerCase() === wallet.address.toLowerCase() ? '✅ YES' : '❌ NO');
  }
}

debugEIP712().catch(console.error);
