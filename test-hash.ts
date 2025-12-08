import { ethers } from 'ethers';

async function testHash() {
  // Connect to Anvil
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const signer = await provider.getSigner(0);
  
  // LeaseFactory address from recent deployment
  const leaseFactoryAddress = '0x3B0a6C5f8899C8e5e8e8e8e8e8e8e8e8e8e8e8e8';  // Update this
  
  const leaseFactory = new ethers.Contract(
    leaseFactoryAddress,
    ['function hashLeaseIntent((uint64 deadline, bytes32 assetType, (address lessor, address lessee, uint256 assetId, address paymentToken, uint256 rentAmount, uint256 rentPeriod, uint256 securityDeposit, uint64 startTime, uint64 endTime, bytes32 legalDocHash, uint16 termsVersion, (string,string)[] metadata) lease) calldata L) external view returns (bytes32)'],
    signer
  );
  
  const leaseIntent = {
    deadline: 1234567890,
    assetType: ethers.keccak256(ethers.toUtf8Bytes('orbital_compute')),
    lease: {
      lessor: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      lessee: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      assetId: 1,
      paymentToken: '0xa6e99A4ED7498b3cdDCBB61a6A607a4925Faa1B7',
      rentAmount: ethers.parseEther('1000'),
      rentPeriod: 30 * 24 * 60 * 60,
      securityDeposit: ethers.parseEther('5000'),
      startTime: Math.floor(Date.now() / 1000),
      endTime: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
      legalDocHash: ethers.keccak256(ethers.toUtf8Bytes('legal-doc-v1')),
      termsVersion: 1,
      metadata: []
    }
  };
  
  const hash = await leaseFactory.hashLeaseIntent(leaseIntent);
  console.log('Contract hash:', hash);
}

testHash().catch(console.error);
