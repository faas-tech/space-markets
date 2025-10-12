# API Reference

## Overview

The Asset Leasing Protocol API provides RESTful endpoints for interacting with the blockchain-based asset management system. This API enables client applications to register assets, create tokens, manage leases, and monitor blockchain events without directly interacting with smart contracts.

### Base URL
```
http://localhost:3001
```

### Response Format

All API responses follow a consistent JSON structure:

```json
{
  "success": true | false,
  "data": { ... } | null,
  "error": "error message" | null,
  "timestamp": "2025-01-29T12:00:00Z"
}
```

### Error Handling

The API uses standard HTTP status codes:

| Status Code | Description |
|------------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

Error responses include descriptive messages:

```json
{
  "success": false,
  "error": "Missing required field: name",
  "timestamp": "2025-01-29T12:00:00Z"
}
```

### Authentication

Currently, the API does not require authentication for testing purposes. Production deployments should implement appropriate authentication mechanisms.

---

## Health & Status Endpoints

### GET /health

Check if the API server is running and healthy.

#### Request
```http
GET /health HTTP/1.1
Host: localhost:3001
```

#### Response
```json
{
  "status": "healthy",
  "message": "Asset Leasing Protocol API is running",
  "timestamp": "2025-01-29T12:00:00Z",
  "uptime": 3600
}
```

#### Example curl
```bash
curl http://localhost:3001/health
```

---

### GET /api/network

Get current blockchain network information.

#### Request
```http
GET /api/network HTTP/1.1
Host: localhost:3001
```

#### Response
```json
{
  "success": true,
  "data": {
    "chainId": 31337,
    "name": "anvil",
    "blockNumber": 12345,
    "gasPrice": "1000000000",
    "accounts": [
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    ]
  },
  "timestamp": "2025-01-29T12:00:00Z"
}
```

#### TypeScript Types
```typescript
interface NetworkInfo {
  chainId: number;
  name: string;
  blockNumber: number;
  gasPrice: string;
  accounts: string[];
}
```

#### Example curl
```bash
curl http://localhost:3001/api/network
```

---

### GET /api/contracts

Get deployed contract addresses.

#### Request
```http
GET /api/contracts HTTP/1.1
Host: localhost:3001
```

#### Response
```json
{
  "success": true,
  "data": {
    "mockStablecoin": {
      "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      "deployedAt": "2025-01-29T11:00:00Z"
    },
    "assetRegistry": {
      "address": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      "deployedAt": "2025-01-29T11:00:01Z"
    },
    "leaseFactory": {
      "address": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      "deployedAt": "2025-01-29T11:00:02Z"
    },
    "marketplace": {
      "address": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
      "deployedAt": "2025-01-29T11:00:03Z"
    }
  },
  "timestamp": "2025-01-29T12:00:00Z"
}
```

#### TypeScript Types
```typescript
interface ContractInfo {
  address: string;
  deployedAt: string;
}

interface ContractsResponse {
  mockStablecoin: ContractInfo;
  assetRegistry: ContractInfo;
  leaseFactory: ContractInfo;
  marketplace: ContractInfo;
}
```

#### Example curl
```bash
curl http://localhost:3001/api/contracts
```

---

### GET /api/status

Get complete system status including contracts, network, and health.

#### Request
```http
GET /api/status HTTP/1.1
Host: localhost:3001
```

#### Response
```json
{
  "success": true,
  "data": {
    "health": "healthy",
    "network": {
      "chainId": 31337,
      "blockNumber": 12345
    },
    "contracts": {
      "deployed": true,
      "count": 4
    },
    "events": {
      "totalProcessed": 156,
      "lastProcessedBlock": 12340
    },
    "api": {
      "version": "1.0.0",
      "uptime": 3600
    }
  },
  "timestamp": "2025-01-29T12:00:00Z"
}
```

#### Example curl
```bash
curl http://localhost:3001/api/status
```

---

## Deployment Endpoints

### POST /api/deploy

Deploy all smart contracts to the blockchain. This endpoint is typically used only in development/testing environments.

#### Request
```http
POST /api/deploy HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "adminAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
}
```

#### Request Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| adminAddress | string | No | Admin address for contracts (defaults to first signer) |

#### Response
```json
{
  "success": true,
  "data": {
    "mockStablecoin": {
      "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      "transactionHash": "0x123...",
      "blockNumber": 1
    },
    "assetRegistry": {
      "address": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      "transactionHash": "0x456...",
      "blockNumber": 2
    },
    "leaseFactory": {
      "address": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      "transactionHash": "0x789...",
      "blockNumber": 3
    },
    "marketplace": {
      "address": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
      "transactionHash": "0xabc...",
      "blockNumber": 4
    }
  },
  "timestamp": "2025-01-29T12:00:00Z"
}
```

#### TypeScript Types
```typescript
interface DeploymentInfo {
  address: string;
  transactionHash: string;
  blockNumber: number;
}

interface DeployRequest {
  adminAddress?: string;
}

interface DeployResponse {
  mockStablecoin: DeploymentInfo;
  assetRegistry: DeploymentInfo;
  leaseFactory: DeploymentInfo;
  marketplace: DeploymentInfo;
}
```

#### Example curl
```bash
curl -X POST http://localhost:3001/api/deploy \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Error Responses

**400 Bad Request** - Invalid admin address
```json
{
  "success": false,
  "error": "Invalid Ethereum address",
  "timestamp": "2025-01-29T12:00:00Z"
}
```

**500 Internal Server Error** - Deployment failed
```json
{
  "success": false,
  "error": "Contract deployment failed: insufficient gas",
  "timestamp": "2025-01-29T12:00:00Z"
}
```

---

## Asset Management Endpoints

### POST /api/assets/register-type

Register a new asset type category in the system.

#### Request
```http
POST /api/assets/register-type HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "name": "Orbital Satellite",
  "assetType": "satellite",
  "schemaUrl": "https://example.com/satellite-schema.json"
}
```

#### Request Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Human-readable name for the asset type |
| assetType | string | Yes | Machine-readable identifier |
| schemaUrl | string | Yes | URL to JSON schema for validation |

#### Response
```json
{
  "success": true,
  "data": {
    "assetTypeId": 1,
    "name": "Orbital Satellite",
    "assetType": "satellite",
    "schemaHash": "0x7d865e34567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
    "transactionHash": "0x987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0",
    "blockNumber": 12345
  },
  "timestamp": "2025-01-29T12:00:00Z"
}
```

#### TypeScript Types
```typescript
interface RegisterAssetTypeRequest {
  name: string;
  assetType: string;
  schemaUrl: string;
}

interface RegisterAssetTypeResponse {
  assetTypeId: number;
  name: string;
  assetType: string;
  schemaHash: string;
  transactionHash: string;
  blockNumber: number;
}
```

#### Example curl
```bash
curl -X POST http://localhost:3001/api/assets/register-type \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Orbital Satellite",
    "assetType": "satellite",
    "schemaUrl": "https://example.com/satellite-schema.json"
  }'
```

#### Error Responses

**400 Bad Request** - Missing required fields
```json
{
  "success": false,
  "error": "Missing required field: name",
  "timestamp": "2025-01-29T12:00:00Z"
}
```

**500 Internal Server Error** - Transaction failed
```json
{
  "success": false,
  "error": "Transaction reverted: Asset type already exists",
  "timestamp": "2025-01-29T12:00:00Z"
}
```

---

### POST /api/assets/create-token

Create an ERC-20 token for a specific asset.

#### Request
```http
POST /api/assets/create-token HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "assetId": "satellite-001",
  "assetTypeId": 1,
  "name": "Orbital Satellite Alpha",
  "symbol": "OSA",
  "totalSupply": "1000000",
  "owner": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "metadataUrl": "https://example.com/satellite-001.json"
}
```

#### Request Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| assetId | string | Yes | Unique identifier for the asset |
| assetTypeId | number | Yes | ID of the asset type |
| name | string | Yes | Token name |
| symbol | string | Yes | Token symbol (3-5 characters) |
| totalSupply | string | Yes | Total token supply |
| owner | string | No | Initial owner address (defaults to sender) |
| metadataUrl | string | No | URL to asset metadata |

#### Response
```json
{
  "success": true,
  "data": {
    "assetId": "satellite-001",
    "tokenAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "name": "Orbital Satellite Alpha",
    "symbol": "OSA",
    "totalSupply": "1000000000000000000000000",
    "decimals": 18,
    "owner": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "transactionHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    "blockNumber": 12346
  },
  "timestamp": "2025-01-29T12:00:00Z"
}
```

#### TypeScript Types
```typescript
interface CreateTokenRequest {
  assetId: string;
  assetTypeId: number;
  name: string;
  symbol: string;
  totalSupply: string;
  owner?: string;
  metadataUrl?: string;
}

interface CreateTokenResponse {
  assetId: string;
  tokenAddress: string;
  name: string;
  symbol: string;
  totalSupply: string;
  decimals: number;
  owner: string;
  transactionHash: string;
  blockNumber: number;
}
```

#### Example curl
```bash
curl -X POST http://localhost:3001/api/assets/create-token \
  -H "Content-Type: application/json" \
  -d '{
    "assetId": "satellite-001",
    "assetTypeId": 1,
    "name": "Orbital Satellite Alpha",
    "symbol": "OSA",
    "totalSupply": "1000000"
  }'
```

---

## Lease Management Endpoints

### POST /api/leases/create-offer

Create a lease offer for an asset on the marketplace.

#### Request
```http
POST /api/leases/create-offer HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "assetId": "satellite-001",
  "tokenAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "pricePerDay": "1000",
  "minLeaseDuration": 7,
  "maxLeaseDuration": 365,
  "securityDepositRatio": 20,
  "availableTokens": "100",
  "terms": "Standard satellite lease terms and conditions",
  "paymentToken": "0x5FbDB2315678afecb367f032d93F642f64180aa3"
}
```

#### Request Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| assetId | string | Yes | Asset identifier |
| tokenAddress | string | Yes | Asset token contract address |
| pricePerDay | string | Yes | Daily rental price in payment tokens |
| minLeaseDuration | number | Yes | Minimum lease period in days |
| maxLeaseDuration | number | Yes | Maximum lease period in days |
| securityDepositRatio | number | Yes | Security deposit as percentage of total |
| availableTokens | string | Yes | Amount of tokens available for lease |
| terms | string | No | Lease terms and conditions |
| paymentToken | string | No | Payment token address (defaults to mUSD) |

#### Response
```json
{
  "success": true,
  "data": {
    "offerId": 1,
    "assetId": "satellite-001",
    "tokenAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "lessor": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "pricePerDay": "1000000000000000000000",
    "availableTokens": "100000000000000000000",
    "status": "active",
    "createdAt": "2025-01-29T12:00:00Z",
    "transactionHash": "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
    "blockNumber": 12347
  },
  "timestamp": "2025-01-29T12:00:00Z"
}
```

#### TypeScript Types
```typescript
interface CreateLeaseOfferRequest {
  assetId: string;
  tokenAddress: string;
  pricePerDay: string;
  minLeaseDuration: number;
  maxLeaseDuration: number;
  securityDepositRatio: number;
  availableTokens: string;
  terms?: string;
  paymentToken?: string;
}

interface CreateLeaseOfferResponse {
  offerId: number;
  assetId: string;
  tokenAddress: string;
  lessor: string;
  pricePerDay: string;
  availableTokens: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  transactionHash: string;
  blockNumber: number;
}
```

#### Example curl
```bash
curl -X POST http://localhost:3001/api/leases/create-offer \
  -H "Content-Type: application/json" \
  -d '{
    "assetId": "satellite-001",
    "tokenAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "pricePerDay": "1000",
    "minLeaseDuration": 7,
    "maxLeaseDuration": 365,
    "securityDepositRatio": 20,
    "availableTokens": "100",
    "terms": "Standard lease terms"
  }'
```

---

## Event Monitoring Endpoints

### GET /api/events/:contractName

Retrieve blockchain events for a specific contract.

#### Request
```http
GET /api/events/assetRegistry HTTP/1.1
Host: localhost:3001
```

#### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| contractName | string | Yes | Contract name: assetRegistry, marketplace, leaseFactory, or all |

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| fromBlock | number | No | Starting block number (default: 0) |
| toBlock | number | No | Ending block number (default: latest) |
| eventName | string | No | Filter by specific event name |
| limit | number | No | Maximum events to return (default: 100) |

#### Response
```json
{
  "success": true,
  "data": {
    "contract": "assetRegistry",
    "eventsCount": 3,
    "events": [
      {
        "eventName": "AssetTypeCreated",
        "args": {
          "assetTypeId": "1",
          "name": "Orbital Satellite",
          "schemaHash": "0x7d865e34567890abcdef1234567890abcdef1234567890abcdef1234567890ab"
        },
        "blockNumber": 12340,
        "transactionHash": "0xabc123...",
        "logIndex": 0
      },
      {
        "eventName": "AssetRegistered",
        "args": {
          "assetId": "1",
          "owner": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          "tokenAddress": "0x1234567890abcdef1234567890abcdef12345678"
        },
        "blockNumber": 12341,
        "transactionHash": "0xdef456...",
        "logIndex": 1
      }
    ],
    "fromBlock": 0,
    "toBlock": 12350
  },
  "timestamp": "2025-01-29T12:00:00Z"
}
```

#### TypeScript Types
```typescript
interface EventData {
  eventName: string;
  args: Record<string, any>;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}

interface EventsResponse {
  contract: string;
  eventsCount: number;
  events: EventData[];
  fromBlock: number;
  toBlock: number | 'latest';
}
```

#### Example curl Commands

**Get all events from AssetRegistry**:
```bash
curl http://localhost:3001/api/events/assetRegistry
```

**Get events from specific block range**:
```bash
curl "http://localhost:3001/api/events/marketplace?fromBlock=100&toBlock=200"
```

**Filter by event name**:
```bash
curl "http://localhost:3001/api/events/assetRegistry?eventName=AssetRegistered"
```

**Get latest 10 events**:
```bash
curl "http://localhost:3001/api/events/all?limit=10"
```

#### Available Event Names by Contract

**AssetRegistry Events**:
- `AssetTypeCreated` - New asset type registered
- `AssetRegistered` - New asset created with token
- `AssetMetadataUpdated` - Asset metadata changed

**Marketplace Events**:
- `SalePosted` - New token sale listed
- `SaleBidPlaced` - Bid placed on sale
- `SaleCompleted` - Sale executed
- `LeaseOfferPosted` - New lease offer created
- `LeaseBidPlaced` - Bid placed on lease
- `LeaseAccepted` - Lease agreement finalized
- `RevenueClaimed` - Revenue distributed to holder

**LeaseFactory Events**:
- `LeaseCreated` - New lease NFT minted
- `LeaseTermsUpdated` - Lease terms modified
- `LeaseExpired` - Lease reached end date

---

## Complete Workflow Examples

### Example 1: Register and Tokenize an Asset

```bash
# Step 1: Deploy contracts (development only)
curl -X POST http://localhost:3001/api/deploy

# Step 2: Register asset type
curl -X POST http://localhost:3001/api/assets/register-type \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Computing Cluster",
    "assetType": "compute",
    "schemaUrl": "https://example.com/compute-schema.json"
  }'

# Response: { "data": { "assetTypeId": 1, ... } }

# Step 3: Create asset token
curl -X POST http://localhost:3001/api/assets/create-token \
  -H "Content-Type: application/json" \
  -d '{
    "assetId": "cluster-001",
    "assetTypeId": 1,
    "name": "GPU Cluster Alpha",
    "symbol": "GCA",
    "totalSupply": "1000000"
  }'

# Response: { "data": { "tokenAddress": "0x...", ... } }

# Step 4: Verify creation via events
curl http://localhost:3001/api/events/assetRegistry
```

### Example 2: Create and Monitor Lease Offer

```bash
# Step 1: Create lease offer
curl -X POST http://localhost:3001/api/leases/create-offer \
  -H "Content-Type: application/json" \
  -d '{
    "assetId": "cluster-001",
    "tokenAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "pricePerDay": "500",
    "minLeaseDuration": 30,
    "maxLeaseDuration": 180,
    "securityDepositRatio": 25,
    "availableTokens": "500",
    "terms": "GPU cluster rental terms"
  }'

# Response: { "data": { "offerId": 1, ... } }

# Step 2: Monitor marketplace events
curl "http://localhost:3001/api/events/marketplace?eventName=LeaseOfferPosted"

# Step 3: Check system status
curl http://localhost:3001/api/status
```

### Example 3: Complete System Health Check

```bash
#!/bin/bash

# Health check script
echo "Checking API health..."
curl -s http://localhost:3001/health | jq '.status'

echo "Checking network..."
curl -s http://localhost:3001/api/network | jq '.data.chainId'

echo "Checking contracts..."
curl -s http://localhost:3001/api/contracts | jq '.data | keys'

echo "Checking recent events..."
curl -s "http://localhost:3001/api/events/all?limit=5" | jq '.data.eventsCount'

echo "System status..."
curl -s http://localhost:3001/api/status | jq '.data'
```

---

## WebSocket Support (Future Enhancement)

The API is designed to support WebSocket connections for real-time event streaming:

```javascript
// Client connection example (not yet implemented)
const ws = new WebSocket('ws://localhost:3001/ws');

ws.on('message', (data) => {
  const event = JSON.parse(data);
  console.log('New event:', event);
});

// Subscribe to specific events
ws.send(JSON.stringify({
  action: 'subscribe',
  contracts: ['assetRegistry', 'marketplace'],
  events: ['AssetRegistered', 'LeaseCreated']
}));
```

---

## Rate Limiting

In production, the API should implement rate limiting:

```javascript
// Example rate limit configuration (not yet implemented)
{
  "rateLimit": {
    "windowMs": 15 * 60 * 1000,  // 15 minutes
    "max": 100,                   // 100 requests per window
    "message": "Too many requests from this IP"
  }
}
```

---

## Error Codes Reference

| Code | Description | Example |
|------|-------------|---------|
| `INVALID_ADDRESS` | Invalid Ethereum address format | "0xinvalid" |
| `MISSING_FIELD` | Required field not provided | Missing "name" field |
| `TRANSACTION_FAILED` | Blockchain transaction reverted | "Insufficient balance" |
| `CONTRACT_NOT_FOUND` | Contract not deployed | No registry at address |
| `INVALID_BLOCK_RANGE` | Invalid block number range | fromBlock > toBlock |
| `RATE_LIMITED` | Too many requests | Exceeded 100 req/15min |
| `NETWORK_ERROR` | RPC connection failed | Cannot connect to node |

---

## Migration Guide

### From v0.9 to v1.0

Breaking changes:
1. Response format now includes timestamp in all responses
2. `/api/deploy` requires explicit adminAddress parameter
3. Event queries default limit changed from 1000 to 100

```javascript
// Old format (v0.9)
{
  "success": true,
  "data": { ... }
}

// New format (v1.0)
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-01-29T12:00:00Z"
}
```

---

## Support

For API support and questions:

- **Documentation**: Check `/test/docs/` for detailed guides
- **Integration Tests**: Review `/test/offchain/src/test.js` for usage examples
- **GitHub Issues**: Report bugs with reproducible curl commands
- **Discord**: Join #api-support channel for real-time help

---

*API Version: 1.0.0*
*Last Updated: January 2025*