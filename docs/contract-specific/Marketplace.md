# Marketplace

## Purpose
The Marketplace handles trading of asset ERC-20 tokens (whole or fractions) and lease agreements. It also manages escrow, refunds, and revenue distribution.

## Key Concepts
- **Sales**: Sellers list asset tokens, buyers place fully funded bids, sellers accept one bid.
- **Leases**: Lessors post lease offers, lessees place funded bids, and acceptance mints a Lease NFT.
- **Revenue Rounds**: Lease income is distributed to token holders pro-rata using snapshots.

## Functions
### Sales
- `postSale(assetToken, amount, askPricePerUnit)`  
  Posts a new sale.

- `placeSaleBid(saleId, amount, pricePerUnit)`  
  Places a funded bid on a sale.

- `acceptSaleBid(saleId, bidIndex)`  
  Transfers tokens, pays seller, and refunds all other bidders.

### Leases
- `postLeaseOffer(LeaseIntent)`  
  Posts a lease offer (intent skeleton).

- `placeLeaseBid(offerId, sigLessee, funds)`  
  Places a funded lease bid with a signature.

- `acceptLeaseBid(offerId, bidIndex, sigLessor, tokenURI)`  
  Accepts one bid, mints Lease NFT, distributes funds, refunds others.

### Revenue
- `claimRevenue(roundId)`  
  Lets token holders claim their share of lease revenue.

## Workflow
1. For sales, bids are escrowed in stablecoin; on acceptance, the winner is paid and losers refunded.
2. For leases, bids are escrowed with signatures; acceptance mints Lease NFT and opens a revenue round.
3. Token holders claim revenue shares according to snapshot balances.


---

## Diagrams


### Sale Flow (sequence)
```mermaid
sequenceDiagram
  participant Seller
  participant Buyer1
  participant Buyer2
  participant M as Marketplace
  participant S as mUSD
  participant T as AssetERC20

  Seller->>M: postSale(T, amount, ask)
  Buyer1->>S: approve(M, funds1)
  Buyer1->>M: placeSaleBid(amount1, price1)
  Buyer2->>S: approve(M, funds2)
  Buyer2->>M: placeSaleBid(amount2, price2)
  Seller->>T: approve(M, amount)
  Seller->>M: acceptSaleBid(bidIndex2)
  M->>T: transferFrom(Seller, Buyer2, amount2)
  M->>S: transfer(Seller, funds2)
  M->>S: refund Buyer1 (funds1)
```

### Lease Offer & Revenue Round (sequence)
```mermaid
sequenceDiagram
  participant Lessor
  participant Lessee
  participant M as Marketplace
  participant F as LeaseFactory
  participant T as AssetERC20
  participant S as mUSD

  Lessor->>M: postLeaseOffer(L skeleton)
  Lessee->>S: approve(M, funds)
  Lessee->>M: placeLeaseBid(sigLessee, funds)
  Lessor->>M: acceptLeaseBid(bidIndex, sigLessor, tokenURI)
  M->>F: mintLease(L, sigLessor, sigLessee, tokenURI)
  F-->>M: leaseTokenId
  M->>T: snapshot()
  M->>M: open RevenueRound(amount)
```

### Marketplace Structures (class)
```mermaid
classDiagram
  class Marketplace {
    +postSale(...)
    +placeSaleBid(...)
    +acceptSaleBid(...)
    +postLeaseOffer(...)
    +placeLeaseBid(...)
    +acceptLeaseBid(...)
    +claimRevenue(...)
    -_openRevenueRound(...)
  }
  class LeaseFactory
  class AssetERC20 {
    +snapshot() uint256
  }
  class IERC20
  Marketplace --> LeaseFactory : mintLease
  Marketplace --> AssetERC20 : snapshot
  Marketplace --> IERC20 : escrow/payout
```
