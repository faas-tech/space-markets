# AssetERC20

## Purpose
Each registered asset is represented by its own ERC-20 token contract. The full supply represents 100% ownership. Tokens can be transferred or subdivided freely.

## Key Concepts
- **ERC20Votes Integration**: Uses OpenZeppelin's ERC20Votes for efficient balance tracking and governance readiness
- **Custom Snapshot System**: Clock-based snapshot mechanism that captures balances at specific points for revenue distribution
- **Auto-Delegation**: New token holders are automatically delegated to themselves for seamless voting power tracking
- **AccessControl**: Roles manage minting and snapshot-taking

## Functions
- `constructor(name, symbol, assetId, admin, initialOwner, totalSupply)`
  Deploys the ERC-20, mints total supply to the initial owner with EIP712 initialization and auto-delegation.

- `snapshot()`
  Takes a snapshot of balances using the custom clock-based system and returns a snapshotId.

- `balanceOfAt(account, snapshotId)`
  Returns the token balance of an account at a specific snapshot using ERC20Votes historical data.

- `totalSupplyAt(snapshotId)`
  Returns the total supply at a specific snapshot using ERC20Votes historical data.

- `getCurrentSnapshotId()`
  Returns the current snapshot ID counter.

- `_update(from, to, value)` (override)
  Internal function ensuring both ERC20 and ERC20Votes logic run when transfers occur, plus auto-delegation for new token holders.

## Workflow
1. ERC-20 supply is minted to the initial owner at asset registration with auto-delegation.
2. Owners transfer tokens for fractional ownership, with recipients auto-delegated.
3. Marketplace uses `snapshot()` when revenue distribution is required, leveraging ERC20Votes checkpoints.
4. Revenue claims use `balanceOfAt()` and `totalSupplyAt()` for historical balance queries.


---

## Diagrams


### Transfers & Snapshot (sequence)
```mermaid
sequenceDiagram
  participant HolderA
  participant HolderB
  participant Token as AssetERC20
  participant Market as Marketplace

  HolderA->>Token: transfer(HolderB, amount)
  Note right of Token: Internal _update runs (ERC20 + ERC20Votes hooks)
  Note right of Token: Auto-delegate HolderB if not already delegated

  Market->>Token: snapshot()
  Note right of Token: Store clock value for snapshot ID
  Token-->>Market: snapshotId

  Market->>Token: balanceOfAt(HolderB, snapshotId)
  Note right of Token: Query ERC20Votes checkpoints using stored clock
  Token-->>Market: historical balance
```

### Inheritance (class)
```mermaid
classDiagram
  class ERC20
  class ERC20Votes {
    +getPastVotes(account, timepoint)
    +getPastTotalSupply(timepoint)
    +delegate(delegatee)
  }
  class EIP712
  class AccessControl
  class AssetERC20 {
    +snapshot() uint256
    +balanceOfAt(account, snapshotId) uint256
    +totalSupplyAt(snapshotId) uint256
    +getCurrentSnapshotId() uint256
    -_update(from,to,value)
  }
  AssetERC20 --|> ERC20
  AssetERC20 --|> ERC20Votes
  AssetERC20 --|> AccessControl
  ERC20Votes --|> ERC20
  ERC20Votes --|> EIP712
```
