# Database Migration Guide - Asset Leasing Protocol

**Version:** 1.0.0
**Branch:** `dev/offchain-systems-alpha`
**Last Updated:** 2026-02-25
**Source:** `test/offchain/src/storage/database.ts`

---

## Overview

The Asset Leasing Protocol offchain system currently uses `MockDatabase`, an in-memory implementation of the `Database` interface. This guide covers migrating to PostgreSQL for production deployment.

---

## 1. Current MockDatabase Interface

The `Database` interface (defined in `test/offchain/src/storage/database.ts`) specifies all methods that any storage backend must implement.

### Connection

```typescript
connect(): Promise<void>;
disconnect(): Promise<void>;
isConnected(): boolean;
```

### Asset Operations

```typescript
saveAsset(asset: Omit<StoredAsset, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoredAsset>;
getAsset(assetId: string): Promise<StoredAsset | null>;
getAssetByTokenAddress(tokenAddress: string): Promise<StoredAsset | null>;
getAllAssets(): Promise<StoredAsset[]>;
updateAsset(assetId: string, updates: Partial<StoredAsset>): Promise<StoredAsset | null>;
```

### Lease Operations

```typescript
saveLease(lease: Omit<StoredLease, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoredLease>;
getLease(leaseId: string): Promise<StoredLease | null>;
getLeasesByAsset(assetId: string): Promise<StoredLease[]>;
getLeasesByStatus(status: 'pending' | 'active' | 'completed' | 'terminated'): Promise<StoredLease[]>;
updateLease(leaseId: string, updates: Partial<StoredLease>): Promise<StoredLease | null>;
```

### Event Operations

```typescript
saveEvent(event: Omit<StoredEvent, 'id' | 'createdAt'>): Promise<StoredEvent>;
getEvent(transactionHash: string, logIndex: number): Promise<StoredEvent | null>;
getUnprocessedEvents(): Promise<StoredEvent[]>;
markEventProcessed(id: string): Promise<void>;
```

### X402 Streaming Payment Operations

```typescript
saveX402Payment(payment: Omit<StoredX402Payment, 'id' | 'createdAt'>): Promise<StoredX402Payment>;
getX402PaymentsByLease(leaseId: string): Promise<StoredX402Payment[]>;
getX402PaymentsByBucket(bucketSlot: string): Promise<StoredX402Payment[]>;
saveX402Batch(batch: Omit<StoredX402Batch, 'id' | 'createdAt'>): Promise<StoredX402Batch>;
getX402BatchesByLease(leaseId: string): Promise<StoredX402Batch[]>;
getOpenBatchForLease(leaseId: string, bucket: string): Promise<StoredX402Batch | null>;
updateX402Batch(id: string, updates: Partial<StoredX402Batch>): Promise<StoredX402Batch | null>;
```

### Utility

```typescript
recordPayment(params: { leaseId: string; amount: string; timestamp: string; mode: string }): Promise<void>;
clear(): Promise<void>;
```

---

## 2. Data Types

### StoredAsset

```typescript
interface StoredAsset {
  id: string;                    // Internal database ID (e.g., "asset_1")
  assetId: string;               // Offchain asset identifier (e.g., "OCS-Primary")
  chainId: number;               // Blockchain chain ID (31337 for Anvil, 84532 for Base Sepolia)
  contractAddress: string;       // AssetRegistry proxy address
  tokenAddress: string;          // Deployed AssetERC20 clone address
  metadata: AssetMetadata;       // Full asset metadata (stored as JSONB)
  metadataHash: string;          // Onchain schema hash (bytes32)
  blockNumber: number;           // Block where registration was confirmed
  transactionHash: string;       // Registration transaction hash
  createdAt: Date;
  updatedAt: Date;
}
```

### StoredLease

```typescript
interface StoredLease {
  id: string;                    // Internal database ID (e.g., "lease_1")
  leaseId: string;               // Offchain lease identifier
  assetId: string;               // Linked asset ID
  chainId: number;               // Blockchain chain ID
  contractAddress: string;       // Marketplace or LeaseFactory address
  lessor: string;                // Lessor Ethereum address
  lessee: string;                // Lessee Ethereum address
  agreement: LeaseAgreement;     // Full lease terms (stored as JSONB)
  status: 'pending' | 'active' | 'completed' | 'terminated';
  blockNumber: number;           // Block where lease was created/minted
  transactionHash: string;       // Transaction hash
  createdAt: Date;
  updatedAt: Date;
}
```

### StoredEvent

```typescript
interface StoredEvent {
  id: string;                    // Internal database ID
  eventName: string;             // Solidity event name (e.g., "AssetRegistered")
  contractAddress: string;       // Contract that emitted the event
  blockNumber: number;
  transactionHash: string;
  logIndex: number;              // Position within the transaction receipt
  args: Record<string, any>;    // Decoded event arguments (stored as JSONB)
  processed: boolean;            // Whether the event has been handled
  createdAt: Date;
}
```

### StoredX402Payment

```typescript
interface StoredX402Payment {
  id: string;                    // Internal database ID
  leaseId: string;               // Linked lease ID
  mode: 'second' | 'batch-5s';  // Payment mode
  intervalSeconds: number;       // 1 for per-second, 5 for batch
  amountMinorUnits: bigint;      // USDC amount (6 decimal precision)
  payer: string;                 // Payer Ethereum address
  paymentTimestamp: Date;        // When the payment was made
  facilitatorTxHash: string;     // Facilitator settlement transaction hash
  bucketSlot: string;            // UTC hour bucket (e.g., "2026-02-25T12:00:00.000Z")
  createdAt: Date;
}
```

### StoredX402Batch

```typescript
interface StoredX402Batch {
  id: string;                    // Internal database ID
  leaseId: string;               // Linked lease ID
  hourBucket: string;            // ISO string at top-of-hour UTC
  totalAmountMinorUnits: bigint; // Aggregate USDC for this batch
  paymentCount: number;          // Number of payments in batch
  revenueRoundId?: string;       // Reference to revenue distribution round
  settlementTxHash?: string;     // Onchain settlement transaction
  startedAt: Date;
  closedAt: Date;
  createdAt: Date;
}
```

---

## 3. Target PostgreSQL Schema

### 3.1 Schema DDL

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Assets table
CREATE TABLE assets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id        VARCHAR(255) NOT NULL UNIQUE,
  chain_id        INTEGER NOT NULL,
  contract_address VARCHAR(42) NOT NULL,
  token_address   VARCHAR(42) NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  metadata_hash   VARCHAR(66) NOT NULL,
  block_number    BIGINT NOT NULL DEFAULT 0,
  transaction_hash VARCHAR(66) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assets_chain_id ON assets(chain_id);
CREATE INDEX idx_assets_token_address ON assets(LOWER(token_address));
CREATE INDEX idx_assets_metadata_hash ON assets(metadata_hash);

-- Leases table
CREATE TABLE leases (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id        VARCHAR(255) NOT NULL UNIQUE,
  asset_id        VARCHAR(255) NOT NULL REFERENCES assets(asset_id),
  chain_id        INTEGER NOT NULL,
  contract_address VARCHAR(42) NOT NULL,
  lessor          VARCHAR(42) NOT NULL,
  lessee          VARCHAR(42) NOT NULL,
  agreement       JSONB NOT NULL DEFAULT '{}',
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'active', 'completed', 'terminated')),
  block_number    BIGINT NOT NULL DEFAULT 0,
  transaction_hash VARCHAR(66) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leases_asset_id ON leases(asset_id);
CREATE INDEX idx_leases_status ON leases(status);
CREATE INDEX idx_leases_lessor ON leases(LOWER(lessor));
CREATE INDEX idx_leases_lessee ON leases(LOWER(lessee));

-- Events table
CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name      VARCHAR(100) NOT NULL,
  contract_address VARCHAR(42) NOT NULL,
  block_number    BIGINT NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL,
  log_index       INTEGER NOT NULL,
  args            JSONB NOT NULL DEFAULT '{}',
  processed       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(transaction_hash, log_index)
);

CREATE INDEX idx_events_processed ON events(processed) WHERE NOT processed;
CREATE INDEX idx_events_block_number ON events(block_number);
CREATE INDEX idx_events_event_name ON events(event_name);

-- X402 streaming payments
CREATE TABLE x402_payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id        VARCHAR(255) NOT NULL REFERENCES leases(lease_id),
  mode            VARCHAR(20) NOT NULL CHECK (mode IN ('second', 'batch-5s')),
  interval_seconds INTEGER NOT NULL,
  amount_minor_units NUMERIC(20, 0) NOT NULL,
  payer           VARCHAR(42) NOT NULL,
  payment_timestamp TIMESTAMPTZ NOT NULL,
  facilitator_tx_hash VARCHAR(66) NOT NULL,
  bucket_slot     TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_x402_payments_lease_id ON x402_payments(lease_id);
CREATE INDEX idx_x402_payments_bucket ON x402_payments(bucket_slot);
CREATE INDEX idx_x402_payments_payer ON x402_payments(LOWER(payer));

-- X402 batch settlements
CREATE TABLE x402_batches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id        VARCHAR(255) NOT NULL REFERENCES leases(lease_id),
  hour_bucket     TIMESTAMPTZ NOT NULL,
  total_amount_minor_units NUMERIC(20, 0) NOT NULL DEFAULT 0,
  payment_count   INTEGER NOT NULL DEFAULT 0,
  revenue_round_id VARCHAR(255),
  settlement_tx_hash VARCHAR(66),
  started_at      TIMESTAMPTZ NOT NULL,
  closed_at       TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_x402_batches_lease_id ON x402_batches(lease_id);
CREATE INDEX idx_x402_batches_hour_bucket ON x402_batches(hour_bucket);
CREATE UNIQUE INDEX idx_x402_batches_lease_bucket ON x402_batches(lease_id, hour_bucket);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leases_updated_at BEFORE UPDATE ON leases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.2 Column Type Notes

- **Ethereum addresses** are stored as `VARCHAR(42)` (0x prefix + 40 hex characters). Queries on addresses should use `LOWER()` for case-insensitive matching.
- **Metadata and agreement fields** use `JSONB` for flexible, queryable storage.
- **USDC amounts** use `NUMERIC(20, 0)` to handle the full range of minor-unit values without floating point issues. The TypeScript `bigint` maps to this type.
- **Block numbers** use `BIGINT` for future-proofing.
- **Transaction hashes** are stored as `VARCHAR(66)` (0x prefix + 64 hex characters).

---

## 4. Migration Strategy

### Phase 1: Schema Creation

1. Create the PostgreSQL database and apply the DDL above.
2. Run the schema against a fresh database to verify it compiles.

```bash
createdb asset_leasing
psql asset_leasing < migrations/001_initial_schema.sql
```

### Phase 2: Implement PostgresDatabase Class

Create a new class that implements the `Database` interface:

```typescript
// test/offchain/src/storage/postgres-database.ts
import { Pool } from 'pg';
import type { Database, StoredAsset, StoredLease, StoredEvent } from './database.js';
import type { StoredX402Payment, StoredX402Batch } from '../types/x402.js';

export class PostgresDatabase implements Database {
  private pool: Pool;
  private connected: boolean = false;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20,            // Maximum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async connect(): Promise<void> {
    await this.pool.query('SELECT 1');
    this.connected = true;
    console.log('Connected to PostgreSQL');
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ... implement all Database interface methods
}
```

### Phase 3: Data Migration (if needed)

If existing data in MockDatabase needs to be preserved (e.g., from a long-running development session):

```typescript
async function migrateData(source: MockDatabase, target: PostgresDatabase): Promise<void> {
  const assets = await source.getAllAssets();
  for (const asset of assets) {
    await target.saveAsset(asset);
  }

  const leases = await source.getAllLeases();
  for (const lease of leases) {
    await target.saveLease(lease);
  }

  console.log(`Migrated ${assets.length} assets and ${leases.length} leases`);
}
```

### Phase 4: Integration Testing

Run the existing test suite against PostgreSQL:

```bash
DATABASE_URL=postgresql://localhost:5432/asset_leasing_test \
USE_MOCK_DATABASE=false \
npx vitest run tests/api-integration.test.ts
```

### Phase 5: Swap in Production

Update the service initialization to use `PostgresDatabase`:

```typescript
import { PostgresDatabase } from './storage/postgres-database.js';

const database = new PostgresDatabase(process.env.DATABASE_URL!);
await database.connect();
```

---

## 5. Connection Pooling Configuration

### Recommended Pool Settings

| Setting | Development | Production | Description |
|---------|------------|------------|-------------|
| `max` | 5 | 20 | Maximum pool size |
| `idleTimeoutMillis` | 30000 | 30000 | Close idle connections after 30s |
| `connectionTimeoutMillis` | 5000 | 5000 | Fail fast on connection timeout |
| `ssl` | false | `{ rejectUnauthorized: false }` | SSL for production |

### Pool Monitoring

```typescript
pool.on('connect', () => console.log('New PG connection'));
pool.on('error', (err) => console.error('PG pool error', err));

// Periodic stats
setInterval(() => {
  console.log('Pool stats:', {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  });
}, 60000);
```

---

## 6. Query Patterns

### Lease Status Queries

The most common query pattern is filtering leases by status:

```sql
-- Active leases for a specific asset
SELECT * FROM leases
WHERE asset_id = $1 AND status = 'active'
ORDER BY created_at DESC;

-- All leases for a lessor
SELECT * FROM leases
WHERE LOWER(lessor) = LOWER($1)
ORDER BY created_at DESC;
```

### X402 Payment Aggregation

```sql
-- Total payments for a lease in the current hour
SELECT
  SUM(amount_minor_units) as total_amount,
  COUNT(*) as payment_count
FROM x402_payments
WHERE lease_id = $1
  AND bucket_slot = date_trunc('hour', NOW());

-- Daily revenue by lease
SELECT
  lease_id,
  DATE(payment_timestamp) as day,
  SUM(amount_minor_units) as daily_total,
  COUNT(*) as payment_count
FROM x402_payments
GROUP BY lease_id, DATE(payment_timestamp)
ORDER BY day DESC;
```

### Event Processing

```sql
-- Get unprocessed events in order
SELECT * FROM events
WHERE processed = FALSE
ORDER BY block_number ASC, log_index ASC
LIMIT 100;

-- Mark event as processed
UPDATE events SET processed = TRUE WHERE id = $1;
```

---

## 7. Backup and Recovery

### Automated Backups

```bash
# Daily full backup
pg_dump asset_leasing > backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump asset_leasing | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Point-in-Time Recovery

Enable WAL archiving in `postgresql.conf`:

```
wal_level = replica
archive_mode = on
archive_command = 'cp %p /archive/%f'
```

### Restore

```bash
psql asset_leasing < backup_20260225.sql
```

---

## 8. MockDatabase to PostgreSQL Mapping

| MockDatabase Method | PostgreSQL Query |
|-------------------|-----------------|
| `saveAsset(asset)` | `INSERT INTO assets (...) VALUES (...) RETURNING *` |
| `getAsset(assetId)` | `SELECT * FROM assets WHERE asset_id = $1` |
| `getAssetByTokenAddress(addr)` | `SELECT * FROM assets WHERE LOWER(token_address) = LOWER($1)` |
| `getAllAssets()` | `SELECT * FROM assets ORDER BY created_at` |
| `updateAsset(id, updates)` | `UPDATE assets SET ... WHERE asset_id = $1 RETURNING *` |
| `saveLease(lease)` | `INSERT INTO leases (...) VALUES (...) RETURNING *` |
| `getLease(leaseId)` | `SELECT * FROM leases WHERE lease_id = $1` |
| `getLeasesByAsset(assetId)` | `SELECT * FROM leases WHERE asset_id = $1` |
| `getLeasesByStatus(status)` | `SELECT * FROM leases WHERE status = $1` |
| `saveX402Payment(payment)` | `INSERT INTO x402_payments (...) VALUES (...) RETURNING *` |
| `getX402PaymentsByLease(id)` | `SELECT * FROM x402_payments WHERE lease_id = $1` |
| `getX402PaymentsByBucket(slot)` | `SELECT * FROM x402_payments WHERE bucket_slot = $1` |
| `getOpenBatchForLease(id, bucket)` | `SELECT * FROM x402_batches WHERE lease_id = $1 AND hour_bucket = $2` |
| `clear()` | `TRUNCATE assets, leases, events, x402_payments, x402_batches CASCADE` |
