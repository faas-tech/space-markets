# Asset Leasing Protocol

## Purpose

This protocol provides a set of smart contracts for:
- Registering assets with canonical metadata and schemas.
- Representing each asset as its own ERC-20 token contract, allowing full or fractional transfers.
- Creating leases between lessors and lessees, stored as ERC-721 NFTs with signed terms.
- Running a marketplace for sales of assets or fractions, and for posting and accepting lease bids.
- Distributing lease revenue to all token holders through a snapshot-based claim process.

The goal is to keep all asset, lease, and transaction data verifiable on-chain, while allowing the heavy JSON metadata and legal documents to live off-chain with cryptographic hashes stored on-chain.

---

## Components

### Asset Registry
- Stores asset types and their required schema hashes.
- Registers individual assets and deploys a new ERC-20 token contract for each one.
- ERC-20 supply represents 100% ownership of the asset. Tokens can be transferred or subdivided freely.
- Records canonical metadata hashes and URIs for off-chain JSON descriptions.

### AssetERC20
- Standard ERC-20 token contract deployed per asset.
- Entire supply is minted to the initial owner at registration.
- Supports transfers of whole or fractional ownership.
- Extends with **snapshots** for revenue distribution. A snapshot captures balances at a specific block for later pro-rata calculations.

### LeaseFactory
- Creates **Lease NFTs** (ERC-721) when lessor and lessee both sign an EIP-712 message with the lease terms.
- Lease NFTs reference:
  - The underlying asset (by ID and schema hash).
  - The hash of the lease metadata.
  - The hash of the legal document.
- Provides deterministic token IDs so the same lease cannot be minted twice.
- Stores lease data in a mapping for off-chain systems to read.

### Marketplace
- Handles two types of actions:

**Sales**
- Owners can post a sale listing for a given amount of their asset tokens.
- Buyers place fully funded bids in the stablecoin.
- The seller may accept any one bid. The winning bidder receives the tokens; the seller receives payment; all other bids are refunded.

**Leases**
- Lessors post a lease offer with terms (asset, schema hash, payment info).
- Lessees place bids by signing the lease intent and depositing stablecoins.
- Lessor accepts one bid, which mints the Lease NFT.
- Non-accepted bids are refunded.

**Revenue Sharing**
- When a lease bid is accepted, the payment is recorded as revenue.
- The asset’s ERC-20 takes a snapshot of balances.
- A revenue round is opened. Each token holder may claim their share of revenue, proportional to their balance at that snapshot.

### MockStablecoin
- Minimal ERC-20 token used for testing marketplace flows.
- Uses 6 decimals to match stablecoins like USDC.
- Includes a `mint` function for tests.

---

## How it works together

1. **Register an asset**  
   - Create an asset type with a schema hash.  
   - Register an asset of that type. The registry deploys an ERC-20 token contract and mints the full supply to the initial owner.

2. **Transfer ownership**  
   - Owners transfer any amount of the ERC-20 tokens to others. This represents partial or full ownership of the asset.

3. **Create a lease**  
   - Lessor and lessee sign the lease terms.  
   - The LeaseFactory mints an ERC-721 NFT that encodes the signed lease.  

4. **Sell fractions**  
   - A seller lists asset tokens on the marketplace.  
   - Buyers place bids with stablecoins.  
   - When one bid is accepted, payment and token transfer occur atomically; other bidders are refunded.

5. **Lease through marketplace**  
   - A lessor posts a lease offer.  
   - Lessees place funded bids with their signature.  
   - One bid is accepted, which mints a Lease NFT and distributes the upfront funds as revenue.

6. **Claim revenue**  
   - Revenue rounds are created at lease acceptance.  
   - Token holders claim their proportional share of the funds, based on their balance at the snapshot block.

---

## Notes

- All data heavy lifting (schemas, asset metadata, lease metadata, legal docs) is off-chain. On-chain we only store **hashes** for verification.  
- The marketplace does not cancel listings or offers automatically when asset ownership changes. Ownership checks happen at the time of acceptance.  
- This is a minimal prototype design. It omits features like bid cancellation, offer expiry, or protocol fees.
