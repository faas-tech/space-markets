# Deployment Artifacts

This directory contains deployment artifacts for the Asset Leasing Protocol across different networks.

## 📁 File Structure

Deployment files are automatically generated with the naming convention:
```
{chainId}-{networkName}.json
```

Examples:
- `1-ethereum-mainnet.json` - Ethereum Mainnet deployment
- `11155111-ethereum-sepolia.json` - Ethereum Sepolia testnet
- `137-polygon-mainnet.json` - Polygon Mainnet
- `31337-anvil-localhost.json` - Local Anvil deployment

## 📋 Artifact Format

Each deployment file contains:

```json
{
  "network": "ethereum-sepolia",
  "chainId": 11155111,
  "deployer": "0x1234567890123456789012345678901234567890",
  "admin": "0x1234567890123456789012345678901234567890",
  "contracts": {
    "AssetRegistry": "0xAbCdEf1234567890123456789012345678901234",
    "LeaseFactory": "0xAbCdEf1234567890123456789012345678901234",
    "Marketplace": "0xAbCdEf1234567890123456789012345678901234",
    "Stablecoin": "0xAbCdEf1234567890123456789012345678901234"
  },
  "deployedAt": 1672531200,
  "blockNumber": 12345678
}
```

## 🔐 Security Notice

- **Never commit mainnet deployment files** containing sensitive information
- **Use environment variables** for production deployments
- **Verify contract addresses** before using in production
- **Keep backup copies** of deployment artifacts securely

## 📖 Usage

These artifacts are used by:
- Post-deployment scripts for configuration
- Verification scripts for health checks
- Frontend applications for contract integration
- Other scripts that need contract addresses

Example usage in scripts:
```solidity
string memory json = vm.readFile("./deployments/11155111-ethereum-sepolia.json");
address assetRegistry = vm.parseJsonAddress(json, "$.contracts.AssetRegistry");
```

## 🔄 Updating

Artifacts are automatically:
- **Generated** during deployment by `Deploy.s.sol`
- **Updated** by post-deployment scripts
- **Verified** by verification scripts

Manual updates should be avoided - re-run deployment scripts instead.

## 🗂 Organization

For teams, consider organizing by environment:
```
deployments/
├── mainnet/
│   ├── 1-ethereum-mainnet.json
│   └── 137-polygon-mainnet.json
├── testnet/
│   ├── 11155111-ethereum-sepolia.json
│   └── 80001-polygon-mumbai.json
└── local/
    └── 31337-anvil-localhost.json
```

This structure can be implemented by updating the deployment scripts to save files in subdirectories.