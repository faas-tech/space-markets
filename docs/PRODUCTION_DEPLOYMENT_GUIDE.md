# Production Deployment Guide - Asset Leasing Protocol

**Version:** 1.0.0
**Branch:** `dev/offchain-systems-alpha`
**Last Updated:** 2026-02-25

---

## Overview

This guide covers deploying the Asset Leasing Protocol from a local Anvil development environment to Base Sepolia (testnet) or Base Mainnet. It addresses smart contract deployment, API server configuration, X402 facilitator setup, and production monitoring.

**Current State:** The offchain system uses `MockDatabase` (in-memory) and a mock X402 facilitator. Production requires PostgreSQL, Redis, and Coinbase CDP credentials.

---

## 1. Prerequisites

### Runtime Requirements

| Dependency | Minimum Version | Purpose |
|-----------|----------------|---------|
| Node.js | 18.0+ | API server and offchain services |
| PostgreSQL | 14+ | Persistent storage (replaces MockDatabase) |
| Redis | 7+ | Cache layer (replaces in-memory Cache) |
| Foundry | Latest | Smart contract compilation and deployment |

### Development Tools

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install Node.js dependencies
cd test/offchain
npm install
```

### Required Accounts and Credentials

| Credential | Purpose | Where to Obtain |
|-----------|---------|-----------------|
| Deployer private key | Contract deployment and admin operations | Generate securely; never reuse Anvil keys |
| Base Sepolia RPC URL | Testnet JSON-RPC | Alchemy, Infura, or Coinbase Cloud |
| Base Mainnet RPC URL | Production JSON-RPC | Alchemy, Infura, or Coinbase Cloud |
| Coinbase CDP API key | X402 facilitator access | Coinbase Developer Platform |
| Etherscan API key | Contract verification | Etherscan / Basescan |

---

## 2. Environment Variables Reference

All configuration is loaded through `test/offchain/src/config/index.ts`. The following environment variables override defaults.

### Core Network Configuration

```bash
# Network
RPC_URL=https://sepolia.base.org           # JSON-RPC endpoint
CHAIN_ID=84532                              # Base Sepolia: 84532, Base Mainnet: 8453
PRIVATE_KEY=0x...                           # Deployer private key (NEVER use Anvil defaults)

# Server
API_PORT=3000                               # API server port
API_HOST=0.0.0.0                            # Bind address (0.0.0.0 for containers)
NODE_ENV=production                         # Environment identifier

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:5432/asset_leasing
USE_MOCK_DATABASE=false                     # Must be false for production

# Cache (Redis)
REDIS_URL=redis://host:6379
USE_MOCK_CACHE=false                        # Must be false for production
```

### X402 Facilitator Configuration

```bash
# X402 Payment Protocol (V2)
X402_FACILITATOR_URL=https://api.x402.xyz/facilitator   # Coinbase facilitator endpoint
X402_NETWORK=base-sepolia                                # base-sepolia or base-mainnet
X402_NETWORK_CAIP=eip155:84532                           # CAIP-2 network ID (84532=Sepolia, 8453=Mainnet)
X402_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913  # USDC on Base
X402_USE_MOCK=false                                      # Must be false for production
```

### Deployment Paths

```bash
DEPLOYMENTS_DIR=./deployments               # Contract deployment artifacts
DATA_DIR=./data                             # Offchain data storage
```

---

## 3. Smart Contract Deployment

### 3.1 Compile Contracts

```bash
# From repository root
forge build
```

### 3.2 Deploy to Base Sepolia

The contracts use the UUPS upgradeable proxy pattern. Deployment order matters due to inter-contract dependencies.

**Deployment order:**
1. `AssetERC20` (implementation -- used as clone template)
2. `AssetRegistry` (proxy -- requires AssetERC20 implementation address)
3. `LeaseFactory` (proxy -- requires AssetRegistry address)
4. `Marketplace` (proxy -- requires LeaseFactory address, stablecoin address)

```bash
# Deploy using Foundry script
forge script script/Deploy.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

Alternatively, deploy programmatically using the offchain toolkit:

```bash
cd test/offchain
RPC_URL=https://sepolia.base.org \
PRIVATE_KEY=0x... \
npx tsx scripts/deploy-refactored.ts
```

### 3.3 Verify Contracts

```bash
forge verify-contract \
  --chain-id 84532 \
  --compiler-version v0.8.30 \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  <CONTRACT_ADDRESS> \
  src/AssetRegistry.sol:AssetRegistry
```

### 3.4 Record Deployment Artifacts

Save all deployed addresses in `deployments/base-sepolia.json`:

```json
{
  "chainId": 84532,
  "deployer": "0x...",
  "contracts": {
    "AssetRegistry": {
      "proxy": "0x...",
      "implementation": "0x..."
    },
    "LeaseFactory": {
      "proxy": "0x...",
      "implementation": "0x..."
    },
    "Marketplace": {
      "proxy": "0x...",
      "implementation": "0x..."
    },
    "AssetERC20": {
      "implementation": "0x..."
    }
  },
  "deployedAt": "2026-02-25T12:00:00.000Z"
}
```

---

## 4. API Server Production Configuration

### 4.1 Server Setup

The `AssetLeasingApiServer` class in `test/offchain/src/api/server.ts` is the entry point. For production:

```typescript
import { AssetLeasingApiServer } from './api/server.js';
import { getConfig } from './config/index.js';

const config = getConfig();

const server = new AssetLeasingApiServer(
  {
    port: config.apiPort || 3000,
    host: config.apiHost || '0.0.0.0',
    corsOrigins: ['https://your-frontend-domain.com']
  },
  {
    offChainServices: productionServices,   // PostgreSQL-backed
    contractDeployer: productionDeployer    // Connected to Base
  }
);

await server.start();
```

### 4.2 CORS Configuration

Update allowed origins for production:

```typescript
corsOrigins: [
  'https://your-frontend-domain.com',
  'https://admin.your-domain.com'
]
```

### 4.3 Request Limits

The server defaults to a 10 MB JSON body limit. For production, consider lowering this:

```typescript
app.use(express.json({ limit: '1mb' }));
```

### 4.4 Process Management

Use PM2 or a container orchestrator:

```bash
# PM2
pm2 start dist/server.js --name asset-leasing-api

# Docker
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e RPC_URL=https://... \
  asset-leasing-api
```

---

## 5. X402 Facilitator Setup

### 5.1 Overview

The X402 payment flow uses Coinbase's facilitator service to verify and settle USDC payments on Base. The `X402FacilitatorClient` in `test/offchain/src/x402/facilitator-client.ts` wraps two endpoints:

- `POST /verify` -- validates that a payment header is legitimate
- `POST /settle` -- settles the USDC transfer on-chain

### 5.2 Coinbase CDP Credentials

1. Create an account at [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
2. Generate API credentials for X402 facilitator access
3. Set the facilitator URL and ensure `X402_USE_MOCK=false`

### 5.3 Configuration

```bash
X402_FACILITATOR_URL=https://api.x402.xyz/facilitator
X402_NETWORK=base-sepolia             # Use base-mainnet for production
X402_NETWORK_CAIP=eip155:84532        # Use eip155:8453 for production
X402_USE_MOCK=false
```

### 5.4 Payment Flow

1. Client requests `/api/leases/:leaseId/access` without payment header
2. Server responds 402 with payment requirements
3. Client obtains payment proof from facilitator
4. Client retries with `Payment-Signature` header (Base64-encoded JSON)
5. Server verifies via `X402FacilitatorClient.verify()`
6. Server settles via `X402FacilitatorClient.settle()`
7. Payment recorded in database

### 5.5 USDC Addresses

| Network | USDC Contract Address |
|---------|----------------------|
| Base Mainnet | `0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913` |
| Base Sepolia | Use testnet USDC (check Base Sepolia faucet) |

---

## 6. Database Requirements

### 6.1 Current State

The development system uses `MockDatabase` (in-memory `Map`-based storage in `test/offchain/src/storage/database.ts`). Production requires a PostgreSQL implementation of the `Database` interface.

See `docs/DATABASE_MIGRATION_GUIDE.md` for the complete migration strategy.

### 6.2 Quick Setup

```bash
# Create database
createdb asset_leasing

# Set connection string
export DATABASE_URL=postgresql://localhost:5432/asset_leasing

# Run migrations (when available)
npx tsx scripts/migrate.ts
```

---

## 7. Monitoring and Observability

### 7.1 Health Check

The `/health` endpoint returns server status and should be used by load balancers:

```bash
curl http://localhost:3000/health
# {"status":"healthy","timestamp":"...","version":"1.0.0"}
```

### 7.2 System Status

The `/api/system/status` endpoint provides database counts:

```bash
curl http://localhost:3000/api/system/status
```

### 7.3 Recommended Monitoring

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| API response time (p95) | Request logging middleware | > 500ms |
| X402 verification failures | Facilitator client errors | > 5% error rate |
| Database connection pool | PostgreSQL driver metrics | < 2 available connections |
| Memory usage | Node.js process metrics | > 512 MB RSS |
| Blockchain RPC latency | Provider call timing | > 2000ms |
| Event processing lag | Block number delta | > 10 blocks behind |

### 7.4 Structured Logging

The current implementation uses `console.log` with `[API]` prefixes. For production, replace with a structured logging library (e.g., Pino or Winston):

```typescript
// Replace console.log('[API] ...')
logger.info({ method: req.method, path: req.path }, 'API request');
```

---

## 8. Security Checklist

### Pre-Deployment

- [ ] **Private keys**: Deployer key is NOT an Anvil default key
- [ ] **Private keys**: Keys stored in a secrets manager (not environment files)
- [ ] **RPC endpoint**: Uses HTTPS and is rate-limited
- [ ] **CORS**: Origins restricted to known frontend domains
- [ ] **Body parsing**: JSON limit reduced from 10 MB to 1 MB
- [ ] **Database**: Connection uses SSL in production
- [ ] **X402**: Mock facilitator disabled (`X402_USE_MOCK=false`)

### Post-Deployment

- [ ] **Contracts verified**: All proxy and implementation contracts verified on Basescan
- [ ] **Admin roles**: `DEFAULT_ADMIN_ROLE` transferred to multisig
- [ ] **Upgrader role**: `UPGRADER_ROLE` assigned to timelock or multisig
- [ ] **Health check**: `/health` endpoint responds correctly
- [ ] **Monitoring**: Alerts configured for error rates and latency
- [ ] **Backup**: Database backup schedule configured
- [ ] **System reset disabled**: `/api/system/reset` endpoint removed or auth-gated

### Ongoing

- [ ] Regular security updates for dependencies
- [ ] Contract upgrade review process documented
- [ ] Incident response procedures in place
- [ ] Regular database backup verification

---

## 9. Network Reference

| Parameter | Base Sepolia | Base Mainnet |
|-----------|-------------|--------------|
| Chain ID | 84532 | 8453 |
| RPC URL | `https://sepolia.base.org` | `https://mainnet.base.org` |
| Block Explorer | `https://sepolia.basescan.org` | `https://basescan.org` |
| USDC Address | (testnet USDC) | `0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913` |
| Solidity Version | 0.8.30 | 0.8.30 |

---

## 10. Troubleshooting

### Common Issues

**Contract deployment fails with "insufficient funds"**
- Ensure the deployer wallet has enough ETH for gas on the target network
- Base Sepolia ETH can be obtained from the Base faucet

**X402 facilitator returns 401**
- Verify CDP API credentials are valid
- Ensure `X402_USE_MOCK=false` is set
- Check that the facilitator URL is correct

**Database connection refused**
- Verify PostgreSQL is running and accepting connections
- Check `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- Ensure SSL mode is set correctly for production

**API server cannot connect to blockchain**
- Verify `RPC_URL` is accessible from the server
- Check rate limits on the RPC provider
- For IPv4/IPv6 issues: `NODE_OPTIONS=--dns-result-order=ipv4first`
