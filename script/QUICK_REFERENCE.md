# Quick Reference - Asset Leasing Protocol Deployment

## 🚀 One-Command Deployments

### Local Development
```bash
./script/examples.sh local
```

### Testnet Deployment
```bash
# Setup environment
cp script/.env.example .env
# Edit .env with your values

# Deploy to Ethereum Sepolia
./script/examples.sh sepolia

# Deploy to Base Sepolia (includes orbital test assets)
./script/examples.sh base-sepolia
```

### Production Deployment
```bash
# Ethereum Mainnet
./script/examples.sh mainnet

# Base Mainnet
./script/examples.sh base-mainnet
```

## 📋 Essential Commands

### Deploy Core Contracts
```bash
forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL --broadcast --verify
```

### Post-Deployment Setup
```bash
forge script script/PostDeploy.s.sol:PostDeploy --rpc-url $RPC_URL --broadcast
```

### Verify Deployment
```bash
forge script script/VerifyDeployment.s.sol:VerifyDeployment --rpc-url $RPC_URL
```

### Create Orbital Test Assets
```bash
forge script script/CreateTestAssets.s.sol:CreateTestAssets --rpc-url $RPC_URL --broadcast
```

## 🔧 Common Tasks

### Check Deployment Status
```bash
./script/examples.sh check
```

### Grant Marketplace Permissions
```bash
./script/examples.sh grant-snapshot 0x1234...  # Replace with asset token address
```

### View All Deployments
```bash
./script/examples.sh status
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `Deploy.s.sol` | Main deployment script |
| `PostDeploy.s.sol` | Post-deployment configuration |
| `CreateTestAssets.s.sol` | Create orbital test assets |
| `VerifyDeployment.s.sol` | Comprehensive verification |
| `config/DeployConfig.s.sol` | Network configurations (5 networks) |
| `.env.example` | Environment template |
| `examples.sh` | Deployment automation |

## 🌐 Supported Networks (5 Networks Only)

| Network | Chain ID | Stablecoin | Command |
|---------|----------|------------|---------|
| Ethereum Mainnet | 1 | USDC | `mainnet` |
| Ethereum Sepolia | 11155111 | Mock | `sepolia` |
| Base Mainnet | 8453 | USDC | `base-mainnet` |
| Base Sepolia | 84532 | Mock | `base-sepolia` |
| Local Anvil | 31337 | Mock | `local` |

**Note:** Only these 5 networks are supported. All other networks (Polygon, Arbitrum, Optimism) have been removed for focused development.

## 🔑 Required Environment Variables

### Minimum Setup
```bash
PRIVATE_KEY=your_private_key_here
RPC_URL=https://your-rpc-url.com
```

### Full Setup
```bash
PRIVATE_KEY=your_private_key_here
RPC_URL=https://your-rpc-url.com
ADMIN_ADDRESS=0x...              # Optional: admin address
STABLECOIN_ADDRESS=0x...         # Optional: existing stablecoin
ETHERSCAN_API_KEY=your_key       # For Ethereum networks
BASESCAN_API_KEY=your_key        # For Base networks
```

## 📊 Deployment Output

Deployment creates:
- Contract addresses in console output
- Artifacts in `deployments/{chainId}-{network}.json`
- Verification on block explorer (if API key provided)

Example artifact:
```json
{
  "network": "ethereum-sepolia",
  "chainId": 11155111,
  "contracts": {
    "AssetRegistry": "0x...",
    "LeaseFactory": "0x...",
    "Marketplace": "0x...",
    "Stablecoin": "0x..."
  }
}
```

## 🛠 Troubleshooting

### Common Errors

**Insufficient balance:**
```bash
# Check balance
cast balance $(cast wallet address $PRIVATE_KEY) --rpc-url $RPC_URL
```

**Invalid private key:**
```bash
# Verify address
cast wallet address $PRIVATE_KEY
```

**Network issues:**
```bash
# Test RPC connection
cast chain-id --rpc-url $RPC_URL
```

**Missing API key:**
```bash
# Skip verification
forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL --broadcast
```

### Recovery Steps

1. **Check deployment artifacts** in `deployments/` directory
2. **Run verification** to see what succeeded
3. **Continue with PostDeploy** if contracts deployed but setup failed
4. **Create test assets** if everything deployed correctly

## 🔒 Security Checklist

- [ ] Private key is secure and not committed to git
- [ ] Deployer has sufficient balance
- [ ] Admin address is correct (use multi-sig for production)
- [ ] Network configuration is correct
- [ ] Contract verification succeeded
- [ ] Post-deployment permissions are configured
- [ ] Test the deployment with sample transactions

## 📝 Next Steps After Deployment

1. **Verify deployment** with verification script
2. **Create orbital asset types** using `CreateTestAssets.s.sol` or manually with `AssetRegistry.createAssetType()`
3. **Register orbital assets** (Satellites, Orbital Compute Stations, Orbital Relay Stations)
4. **Grant SNAPSHOT_ROLE** to marketplace for each asset token
5. **Test marketplace** functionality with orbital asset leasing
6. **Consider multi-sig** for production admin roles

### Orbital Asset Types Created:
- **Satellites** - Communications and Earth observation satellites
- **Orbital Compute Stations** - Space-based computing infrastructure
- **Orbital Relay Stations** - Communication relay and data transmission

---

**Need help?** Check the full [README.md](./README.md) for comprehensive documentation.