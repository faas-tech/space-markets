# API Specification - Asset Leasing Protocol

**Version:** 1.0.0
**Branch:** `dev/offchain-systems-alpha`
**Last Updated:** 2026-02-25
**Source:** `test/offchain/src/api/server.ts`

---

## Overview

The Asset Leasing Protocol exposes a REST API via the `AssetLeasingApiServer` class (an Express application). The server provides endpoints for asset management, lease lifecycle operations, X402 streaming payment access, blockchain interaction, and system administration.

**Base URL (development):** `http://127.0.0.1:3000`

**CORS Origins (default):** `http://localhost:3000`, `http://localhost:5173`

**Body Parsing:** JSON with a 10 MB limit.

---

## Authentication

The current implementation does not require authentication headers. Access control for the `/api/leases/:leaseId/access` endpoint is enforced via the X402 V2 payment protocol (`Payment-Signature` header, with `X-PAYMENT` fallback for backward compatibility).

---

## Response Envelope

All endpoints return a consistent JSON envelope:

```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

---

## Endpoints

### 1. Health Check

#### `GET /health`

Returns server health status.

**Response (200):**

```json
{
  "status": "healthy",
  "timestamp": "2026-02-25T12:00:00.000Z",
  "version": "1.0.0"
}
```

---

### 2. Asset Management

#### `GET /api/assets`

List all registered assets.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "asset_1",
      "assetId": "OCS-Primary",
      "chainId": 31337,
      "contractAddress": "0x...",
      "tokenAddress": "0x...",
      "metadata": { "name": "OCS-Primary", "assetType": "orbital_compute", ... },
      "metadataHash": "0x...",
      "blockNumber": 5,
      "transactionHash": "0x...",
      "createdAt": "2026-02-25T12:00:00.000Z",
      "updatedAt": "2026-02-25T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

**Error (500):**

```json
{
  "success": false,
  "error": "Internal error message"
}
```

---

#### `GET /api/assets/:assetId`

Get a specific asset by its offchain asset ID.

**Parameters:**
| Parameter | Location | Type | Description |
|-----------|----------|------|-------------|
| `assetId` | path | string | The offchain asset identifier |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "asset_1",
    "assetId": "OCS-Primary",
    "chainId": 31337,
    "contractAddress": "0x...",
    "tokenAddress": "0x...",
    "metadata": { ... },
    "metadataHash": "0x...",
    "blockNumber": 5,
    "transactionHash": "0x...",
    "createdAt": "2026-02-25T12:00:00.000Z",
    "updatedAt": "2026-02-25T12:00:00.000Z"
  }
}
```

**Error (404):**

```json
{
  "success": false,
  "error": "Asset not found"
}
```

---

#### `POST /api/assets`

Register a new asset on-chain and store metadata offchain.

**Request Body:**

```json
{
  "metadata": {
    "assetId": "OCS-Primary",
    "name": "OCS-Primary",
    "assetType": "orbital_compute",
    "description": "Primary compute station",
    "specifications": { ... }
  },
  "tokenName": "OCS Primary Token",
  "tokenSymbol": "OCSP",
  "totalSupply": "100000000000000000000000",
  "dataURI": "ipfs://Qm..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `metadata` | object | Yes | Asset metadata object (must include `assetType`) |
| `tokenName` | string | No | ERC-20 token name |
| `tokenSymbol` | string | No | ERC-20 token symbol |
| `totalSupply` | string/number | No | Token total supply in wei (default: 100,000 ETH) |
| `dataURI` | string | No | IPFS or other URI for offchain data |

**Response (201):**

```json
{
  "success": true,
  "data": {
    "assetId": "1",
    "tokenAddress": "0x...",
    "metadataHash": "0x...",
    "transactionHash": "0x...",
    "blockNumber": 5
  }
}
```

**Error (400):**

```json
{
  "success": false,
  "error": "metadata is required"
}
```

---

### 3. Lease Management

#### `GET /api/leases`

List all leases.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "lease_1",
      "leaseId": "lease-001",
      "assetId": "OCS-Primary",
      "chainId": 31337,
      "contractAddress": "0x...",
      "lessor": "0x...",
      "lessee": "0x...",
      "agreement": { ... },
      "status": "active",
      "blockNumber": 10,
      "transactionHash": "0x...",
      "createdAt": "2026-02-25T12:00:00.000Z",
      "updatedAt": "2026-02-25T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

#### `GET /api/leases/:leaseId`

Get a specific lease.

**Parameters:**
| Parameter | Location | Type | Description |
|-----------|----------|------|-------------|
| `leaseId` | path | string | The lease identifier |

**Response (200):**

```json
{
  "success": true,
  "data": { ... }
}
```

**Error (404):**

```json
{
  "success": false,
  "error": "Lease not found"
}
```

---

#### `POST /api/leases`

Create a new lease offer on the marketplace.

**Request Body:**

```json
{
  "onChainAssetId": "1",
  "leaseAgreement": {
    "leaseId": "lease-001",
    "assetId": "OCS-Primary",
    "lessorAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "lesseeAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "terms": {
      "startDate": "2026-03-01T00:00:00Z",
      "endDate": "2026-04-01T00:00:00Z",
      "paymentAmount": "1000000000000000000000"
    }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `onChainAssetId` | string/number | Yes | On-chain asset ID (also accepts `assetId` or `assetOnChainId`) |
| `leaseAgreement` | object | Yes | Complete lease agreement |
| `leaseAgreement.leaseId` | string | Yes | Offchain lease identifier |
| `leaseAgreement.terms.startDate` | string | No | ISO 8601 start date (default: now + 10 min) |
| `leaseAgreement.terms.endDate` | string | No | ISO 8601 end date (default: start + 30 days) |
| `leaseAgreement.terms.paymentAmount` | string | No | Payment amount in wei (default: 1000 ETH) |

**Response (201):**

```json
{
  "success": true,
  "data": {
    "offerId": "0",
    "transactionHash": "0x..."
  }
}
```

**Error (400):**

```json
{
  "success": false,
  "error": "leaseAgreement is required"
}
```

---

### 4. X402 Streaming Payments

#### `GET /api/leases/:leaseId/x402/requirements`

Preview X402 payment requirements for a lease without triggering the 402 challenge.

**Parameters:**
| Parameter | Location | Type | Description |
|-----------|----------|------|-------------|
| `leaseId` | path | string | The lease identifier |
| `mode` | query | string | Payment mode: `second` (default) or `batch-5s` |
| `resource` | query | string | Resource URL (default: `/api/leases/:leaseId/access`) |
| `description` | query | string | Optional payment description |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "leaseId": "lease-001",
    "mode": "second",
    "amountMinorUnits": "277",
    "formattedAmount": "0.000277",
    "requirements": {
      "scheme": "exact",
      "network": "base-sepolia",
      "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913",
      "maxAmountRequired": "277",
      "payTo": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "resource": "/api/leases/lease-001/access",
      "description": "Lease lease-001 streaming payment (second)",
      "extra": {
        "decimals": 6,
        "verifyOptimistically": true,
        "paymentMode": "second"
      },
      "version": 2,
      "chainId": "eip155:84532"
    }
  }
}
```

**Error (400):**

```json
{
  "success": false,
  "error": "Lease lease-999 not found"
}
```

---

#### `POST /api/leases/:leaseId/access`

X402 payment-gated access endpoint. Without a payment header, returns 402 Payment Required (with `Payment-Required` response header). With a valid `Payment-Signature` header (or legacy `X-PAYMENT`), verifies and settles the payment, then grants access with a `Payment-Response` response header.

**Parameters:**
| Parameter | Location | Type | Description |
|-----------|----------|------|-------------|
| `leaseId` | path | string | The lease identifier |
| `mode` | query | string | Payment mode: `second` (default) or `batch-5s` |
| `resource` | query | string | Resource URL override |

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `Payment-Signature` | No | Base64-encoded JSON payment proof (V2). Legacy `X-PAYMENT` also accepted. |

**Payment-Signature Header Format:**

The header value is a Base64-encoded JSON object:

```json
{
  "payer": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "amount": "277",
  "txHash": "0xabc..."
}
```

**Response (402 -- no payment header):**

Response includes `Payment-Required` header with the requirements JSON.

```json
{
  "success": false,
  "error": "Payment required",
  "paymentRequirements": {
    "scheme": "exact",
    "network": "base-sepolia",
    "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913",
    "maxAmountRequired": "277",
    "payTo": "0x...",
    "resource": "/api/leases/lease-001/access",
    "description": "Lease lease-001 streaming payment (second)",
    "version": 2,
    "chainId": "eip155:84532"
  },
  "mode": "second",
  "formattedAmount": "0.000277 USDC"
}
```

**Response (402 -- insufficient payment):**

```json
{
  "success": false,
  "error": "Insufficient payment amount",
  "paymentRequirements": { ... }
}
```

**Response (200 -- access granted):**

Response includes `Payment-Response` header with `{ "success": true, "txHash": "...", "networkId": "..." }`.

```json
{
  "success": true,
  "txHash": "0xmock...",
  "networkId": "eip155:84532",
  "payer": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
}
```

**Error (403 -- lease not active / not started / expired):**

```json
{
  "success": false,
  "error": "Lease is not active",
  "status": "pending",
  "leaseId": "lease-001"
}
```

**Error (404 -- lease not found):**

```json
{
  "success": false,
  "error": "Lease not found",
  "leaseId": "lease-999"
}
```

---

#### `POST /api/leases/:leaseId/prefund`

Development helper to mint stablecoins for a lessee address.

**Request Body:**

```json
{
  "recipient": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "amountMinorUnits": "100000000"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `recipient` | string | Yes | Address to receive USDC |
| `amountMinorUnits` | string | No | Amount in USDC minor units (default: 100000000 = 100 USDC) |

**Response (200):**

```json
{
  "success": true,
  "recipient": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "amountMinorUnits": "100000000"
}
```

---

### 5. Blockchain Routes

#### `GET /api/blockchain/network`

Get blockchain network information.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "chainId": 31337,
    "name": "anvil",
    "blockNumber": 15,
    "gasPrice": "1000000000"
  }
}
```

---

#### `GET /api/blockchain/contracts`

List deployed contract addresses.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "AssetRegistry": "0x...",
    "LeaseFactory": "0x...",
    "Marketplace": "0x...",
    "MockStablecoin": "0x..."
  }
}
```

---

#### `POST /api/blockchain/deploy`

Trigger contract deployment (development only).

**Response (200):**

```json
{
  "success": true,
  "data": {
    "AssetRegistry": "0x...",
    "LeaseFactory": "0x...",
    "Marketplace": "0x...",
    "MockStablecoin": "0x..."
  }
}
```

---

### 6. System Routes

#### `GET /api/system/status`

Get system status and database statistics.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "timestamp": "2026-02-25T12:00:00.000Z",
    "database": {
      "assets": 3,
      "leases": 1
    }
  }
}
```

---

#### `POST /api/system/reset`

Reset the system (clears all mock database and cache state). Development use only.

**Response (200):**

```json
{
  "success": true,
  "message": "System reset complete"
}
```

---

### 7. Catch-All (404)

Any unmatched route returns:

```json
{
  "error": "Endpoint not found",
  "method": "GET",
  "path": "/api/unknown"
}
```

---

## Status Codes Summary

| Code | Meaning | Used By |
|------|---------|---------|
| 200 | Success | All GET endpoints, successful access |
| 201 | Created | `POST /api/assets`, `POST /api/leases` |
| 400 | Bad Request | Missing or invalid request body |
| 402 | Payment Required | `/api/leases/:leaseId/access` (no/invalid payment) |
| 403 | Forbidden | Lease not active, not started, or expired |
| 404 | Not Found | Unknown endpoint or missing resource |
| 500 | Internal Server Error | Unexpected server failures |

---

## Server Configuration

The `AssetLeasingApiServer` constructor accepts:

```typescript
interface ApiServerConfig {
  port: number;          // Default: 3000
  host: string;          // Default: '127.0.0.1'
  corsOrigins?: string[];  // Default: ['http://localhost:3000', 'http://localhost:5173']
  enableSwagger?: boolean; // Reserved for future use
}
```

Configuration for X402 is loaded from `getConfig()` (see `test/offchain/src/config/index.ts`).

---

## Running the Server

The API server is typically started inside tests or demos. For standalone use:

```typescript
import { AssetLeasingApiServer } from './api/server.js';
import { ContractDeployer } from './testing/contract-deployer.js';
import { MockOffChainServices } from './testing/mock-services.js';

const services = new MockOffChainServices();
const deployer = new ContractDeployer(config);

const server = new AssetLeasingApiServer(
  { port: 3000, host: '127.0.0.1' },
  { offChainServices: services, contractDeployer: deployer }
);

await server.start();
// Server running at http://127.0.0.1:3000
```

From the `test/offchain/` directory:

```bash
# Run API integration tests (auto-starts/stops server)
npx vitest run tests/api-integration.test.ts

# Run complete demo (includes API server)
npm run demo:complete
```
