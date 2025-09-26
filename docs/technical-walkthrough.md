# Technical Walkthrough

This document explains the code architecture, file structure, Ethereum standards used, code patterns, OpenZeppelin libraries, and a function-by-function map (with short descriptions). It ends with workflow diagrams showing how the system operates end-to-end.

---

## Codebase Overview

### File Structure (top-level)

```
/src
  /interfaces
    IAssetRegistry.sol
  AssetRegistry.sol
  AssetERC20.sol
  LeaseFactory.sol
  Marketplace.sol

/test
  /mocks
    MockStablecoin.sol
  AssetFlow.t.sol
  MarketplaceFlow.t.sol

/docs
  README.md
  technical-walkthrough.md
```

### Key Contracts

- **AssetRegistry** — Registers asset types and assets, deploys an ERC-20 per asset, anchors schema and metadata hashes.
- **AssetERC20** — One ERC-20 per asset; entire supply minted to the initial owner; implements ERC20Votes with custom snapshots for revenue sharing and auto-delegation for seamless governance tracking.
- **LeaseFactory** — Mints ERC-721 "Lease" NFTs using dual EIP-712 signatures (lessor + lessee); stores minimal on-chain lease payload.
- **Marketplace** — Lists sales (whole/fractional ERC-20) and lease offers; requires **funded** bids; handles accepts, refunds, and lease revenue distribution via ERC20Votes-based snapshots.
- **MockStablecoin** — Minimal ERC-20 with 6 decimals and a faucet `mint` for testing.

---

## Ethereum Standards & Libraries

- **ERC-20 (OpenZeppelin)** — Asset ownership and fractionalization via per-asset ERC-20 contracts.
- **ERC-721 (OpenZeppelin)** — Lease NFTs (proof of a signed lease).
- **EIP-712 (OpenZeppelin `EIP712` + `ECDSA`)** — Typed data signatures for lease intents and voting delegation.
- **ERC-20 Votes (OpenZeppelin `ERC20Votes`)** — Governance-ready token with efficient checkpoint system for historical balance queries.
- **Custom Snapshot System** — Clock-based snapshot mechanism built on top of ERC20Votes checkpoints for revenue distribution.
- **AccessControl (OpenZeppelin)** — Roles for admin/registrar/snapshot/minter.
- **OpenZeppelin v5 patterns** — Internal `_update` override for multiple inheritance with auto-delegation support.

### Migration from ERC20Snapshot to ERC20Votes

The protocol has been migrated from the deprecated `ERC20Snapshot` to `ERC20Votes` with the following improvements:
- **Future-proof**: Uses actively maintained OpenZeppelin contracts
- **Gas efficient**: Binary search for historical queries instead of linear storage
- **Auto-delegation**: Automatic delegation enables seamless voting power tracking
- **Governance-ready**: Foundation for future DAO features if needed
- **Interface compatibility**: Same function signatures (`snapshot()`, `balanceOfAt()`, `totalSupplyAt()`) maintained

---

## Function Map

(see previous answer — listing all functions with descriptions)

---

## Diagrams

### Architecture

```mermaid
flowchart LR
  subgraph Registry Layer
    R[AssetRegistry]
  end

  subgraph Asset Tokens
    T1[AssetERC20 (per asset)]
  end

  subgraph Leasing
    L[LeaseFactory (ERC-721)]
  end

  subgraph Market
    M[Marketplace]
    S[mUSD (MockStablecoin)]
  end

  U[Users / Wallets]

  U -->|register via registrar| R
  R -->|deploy| T1
  U -->|transfer fractions| T1
  U -->|post sales & lease offers| M
  M -->|escrow stablecoin| S
  M -->|mint lease via signatures| L
  M -->|snapshot + revenue rounds| T1
  U -->|claim revenue| M
```

### Asset Registration

```mermaid
sequenceDiagram
  participant Registrar
  participant Registry as AssetRegistry
  participant Token as AssetERC20
  Registrar->>Registry: registerAsset(...)
  Registry->>Token: deploy AssetERC20
  Token-->>Registry: tokenAddress
  Registry-->>Registrar: assetId, tokenAddress
```

### Sale Flow

```mermaid
sequenceDiagram
  participant Seller
  participant Buyer
  participant M as Marketplace
  participant S as mUSD
  participant T as AssetERC20

  Seller->>M: postSale()
  Buyer->>M: placeSaleBid()
  Seller->>M: acceptSaleBid()
  M->>T: transferFrom(seller, buyer, tokens)
  M->>S: pay seller, refund losers
```

### Lease Flow

```mermaid
sequenceDiagram
  participant Lessor
  participant Lessee
  participant M as Marketplace
  participant F as LeaseFactory
  participant T as AssetERC20
  participant S as mUSD

  Lessor->>M: postLeaseOffer()
  Lessee->>M: placeLeaseBid()
  Lessor->>M: acceptLeaseBid()
  M->>F: mintLease()
  M->>T: snapshot balances
  M->>S: distribute funds via revenue round
```

### Revenue Claim

```mermaid
sequenceDiagram
  participant Holder
  participant M as Marketplace
  participant T as AssetERC20
  participant S as mUSD

  Holder->>M: claimRevenue(roundId)
  M->>T: balanceOfAt(holder)
  M->>S: transfer(holder, share)
```
