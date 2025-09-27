# Asset Leasing Protocol - Deployment Scripts

This directory contains comprehensive deployment scripts for the Asset Leasing Protocol, following Foundry best practices for professional, production-ready deployments.

## 📁 Directory Structure

```
script/
├── README.md                    # This documentation
├── Deploy.s.sol                 # Main deployment script
├── PostDeploy.s.sol            # Post-deployment setup and permissions
├── CreateTestAssets.s.sol       # Create sample assets for testing
├── VerifyDeployment.s.sol       # Comprehensive deployment verification
└── config/
    └── DeployConfig.s.sol       # Network-specific configurations
```

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env` file in the project root:

```bash
# Required
PRIVATE_KEY=0x1234...  # Deployer private key

# Optional
ADMIN_ADDRESS=0x5678...        # Admin address (defaults to deployer)
STABLECOIN_ADDRESS=0x9abc...   # Existing stablecoin address (optional)
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
ETHERSCAN_API_KEY=your-etherscan-api-key
BASESCAN_API_KEY=your-basescan-api-key
```

### 2. Deploy Protocol

Deploy to testnet (Sepolia):
```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

Deploy to mainnet:
```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --gas-estimate-multiplier 120
```

### 3. Post-Deployment Setup

```bash
forge script script/PostDeploy.s.sol:PostDeploy \
  --rpc-url $RPC_URL \
  --broadcast
```

### 4. Verification

Quick check:
```bash
forge script script/VerifyDeployment.s.sol:QuickCheck --rpc-url $RPC_URL
```

Full verification:
```bash
forge script script/VerifyDeployment.s.sol:VerifyDeployment --rpc-url $RPC_URL
```

## 📋 Deployment Scripts

### Deploy.s.sol

The main deployment script that:
- Deploys all core contracts in proper dependency order
- Configures initial permissions and roles
- Sets up contract interconnections
- Saves deployment artifacts to `deployments/` directory
- Provides comprehensive logging throughout the process

**Features:**
- Network-specific configuration via `DeployConfig`
- Automatic stablecoin detection or mock deployment
- Gas optimization settings per network
- Deployment verification checks
- Comprehensive error handling

### PostDeploy.s.sol

Post-deployment configuration script that:
- Sets up additional roles and permissions
- Verifies all contract interconnections
- Configures marketplace permissions
- Provides helper functions for ongoing management

**Also includes:**
- `GrantSnapshotRole` contract for per-asset permission setup

### CreateTestAssets.s.sol

Creates orbital asset test data including:
- 3 orbital asset types: Satellite, Orbital Compute Station, Orbital Relay Station
- 4 sample orbital assets with realistic specifications:
  - Satellite Alpha-1 (Communications satellite)
  - Satellite Beta-2 (Earth observation satellite)
  - OCS-Primary (Orbital compute station)
  - ORS-Gateway (Orbital relay station)
- Marketplace permissions for all asset tokens
- IPFS-style metadata URIs for authentic decentralized storage

### VerifyDeployment.s.sol

Comprehensive verification including:
- Contract deployment verification
- Configuration validation
- Permission and role checks
- Contract interconnection verification
- Basic functionality testing

**Also includes:**
- `QuickCheck` contract for fast deployment status validation

### config/DeployConfig.s.sol

Centralized configuration management providing:
- Network-specific settings for all major chains
- Known stablecoin addresses
- Gas optimization parameters
- Block explorer URLs for verification
- Minimum balance requirements

## 🌐 Supported Networks (5 Networks Only)

### Production Networks
- **Ethereum Mainnet** (Chain ID: 1) - Primary production network
- **Base Mainnet** (Chain ID: 8453) - L2 production network

### Testnets
- **Ethereum Sepolia** (Chain ID: 11155111) - Primary testnet
- **Base Sepolia** (Chain ID: 84532) - L2 testnet

### Local Development
- **Anvil Localhost** (Chain ID: 31337) - Local development environment

**Note:** The protocol deployment has been streamlined to support only these 5 networks for focused development and maintenance. All other networks (Polygon, Arbitrum, Optimism) have been removed to concentrate on the Ethereum and Base ecosystems.

## 📦 Deployment Artifacts

Deployment artifacts are saved to `deployments/{chainId}-{networkName}.json`:

```json
{
  "network": "ethereum-sepolia",
  "chainId": 11155111,
  "deployer": "0x...",
  "admin": "0x...",
  "contracts": {
    "AssetRegistry": "0x...",
    "LeaseFactory": "0x...",
    "Marketplace": "0x...",
    "Stablecoin": "0x..."
  },
  "deployedAt": 1234567890,
  "blockNumber": 12345
}
```

## 🔧 Advanced Usage

### Custom Network Configuration

To deploy on a custom network, update `DeployConfig.s.sol` with your network's configuration:

```solidity
} else if (chainId == YOUR_CHAIN_ID) {
    config = Config({
        networkName: "your-network",
        stablecoin: YOUR_STABLECOIN_ADDRESS,
        minDeployerBalance: 0.01 ether,
        gasLimit: 3_000_000,
        gasPrice: 0,
        verify: true,
        blockExplorerUrl: "https://your-explorer.com"
    });
```

### Custom Stablecoin

To use a specific stablecoin address:

```bash
export STABLECOIN_ADDRESS=0x123...
forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL --broadcast
```

### Dry Run Deployment

Test deployment without broadcasting:

```bash
forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL
```

### Grant Snapshot Role for New Assets

After registering new assets:

```bash
forge script script/PostDeploy.s.sol:GrantSnapshotRole \
  --rpc-url $RPC_URL \
  --broadcast \
  --sig "run(address)" $ASSET_TOKEN_ADDRESS
```

## 🔒 Security Considerations

### Private Key Management
- Use hardware wallets for mainnet deployments
- Never commit private keys to version control
- Use environment variables or secure key management systems

### Multi-sig Setup
For production deployments, consider transferring admin roles to a multi-sig:

```solidity
// Transfer admin roles to multi-sig after deployment
assetRegistry.grantRole(DEFAULT_ADMIN_ROLE, MULTISIG_ADDRESS);
assetRegistry.revokeRole(DEFAULT_ADMIN_ROLE, DEPLOYER_ADDRESS);
```

### Gas Optimization
- Use appropriate gas limits per network
- Monitor gas prices for optimal deployment timing
- Consider CREATE2 for deterministic addresses (already implemented)

## 🐛 Troubleshooting

### Common Issues

**Insufficient balance:**
```
Error: Insufficient deployer balance
```
Solution: Fund the deployer address with native token

**Stablecoin not found:**
```
Error: Stablecoin deployment failed
```
Solution: Check network configuration or provide STABLECOIN_ADDRESS

**Verification failed:**
```
Error: Contract verification failed
```
Solution: Check ETHERSCAN_API_KEY and network block explorer support

**Permission errors:**
```
Error: Admin missing role
```
Solution: Run PostDeploy script to configure permissions

### Logs and Debugging

All scripts provide comprehensive logging. Check the output for:
- Contract addresses
- Transaction hashes
- Gas usage
- Error messages

### Recovery

If deployment fails partway through:
1. Check deployment artifacts in `deployments/` directory
2. Identify which contracts were successfully deployed
3. Manually continue from the failed step or redeploy

## 📝 Best Practices

1. **Always test on testnets first**
2. **Verify contracts immediately after deployment**
3. **Save deployment artifacts securely**
4. **Use multi-sig wallets for production admin roles**
5. **Monitor gas prices for cost optimization**
6. **Keep deployment scripts up to date with contract changes**
7. **Document any custom configurations or modifications**

## 🔄 Upgrade Path

For future protocol upgrades:
1. Deploy new contract versions
2. Use timelock contracts for admin functions
3. Consider proxy patterns for upgradeability
4. Maintain backward compatibility where possible

## 📞 Support

For deployment issues:
1. Check this documentation
2. Review Foundry documentation
3. Check contract source code and tests
4. Submit issues with full deployment logs

---

**Note:** This deployment setup follows Solidity and Foundry best practices for production-ready smart contract deployment. Always audit contracts before mainnet deployment and consider professional security reviews for production systems.