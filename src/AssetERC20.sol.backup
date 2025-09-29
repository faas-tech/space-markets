// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC20} from "openzeppelin-contracts/token/ERC20/ERC20.sol";
import {ERC20Votes} from "openzeppelin-contracts/token/ERC20/extensions/ERC20Votes.sol";
import {EIP712} from "openzeppelin-contracts/utils/cryptography/EIP712.sol";
import {AccessControl} from "openzeppelin-contracts/access/AccessControl.sol";

/// @title AssetERC20
/// @notice ERC-20 token representing full and fractional ownership of a single registered asset.
/// @dev One instance of this contract is deployed per asset by the AssetRegistry.
///      It includes OpenZeppelin's ERC20Snapshot to support snapshot-based revenue sharing.
contract AssetERC20 is ERC20, ERC20Votes, AccessControl {
    /// @notice Role that is allowed to mint (used only at construction-time by the registry).
    bytes32 public constant MINTER_ROLE   = keccak256("MINTER_ROLE");
    /// @notice Role that is allowed to create snapshots (granted to the marketplace in this prototype).
    bytes32 public constant SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");

    /// @notice The id of the asset in the registry that this ERC-20 represents.
    uint256 public immutable assetId;

    /// @notice Current snapshot ID counter
    uint256 private _currentSnapshotId;
    /// @notice Mapping from snapshot ID to the clock value when snapshot was taken
    mapping(uint256 => uint256) private _snapshotClocks;

    /// @notice Emitted when a snapshot is created
    event Snapshot(uint256 id);

    /// @param name_ ERC-20 name.
    /// @param symbol_ ERC-20 symbol.
    /// @param assetId_ Registry asset id.
    /// @param admin Address that receives DEFAULT_ADMIN_ROLE (typically the registry/owner).
    /// @param initialOwner Address that receives the full initial supply.
    /// @param totalSupply Total supply to mint on deployment (represents 100% of the asset).
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 assetId_,
        address admin,
        address initialOwner,
        uint256 totalSupply
    ) ERC20(name_, symbol_) EIP712(name_, "1") {
        assetId = assetId_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(SNAPSHOT_ROLE, admin);
        _mint(initialOwner, totalSupply);

        // Auto-delegate initial owner to enable voting power tracking
        _delegate(initialOwner, initialOwner);
    }

    /// @notice Takes a snapshot of balances for revenue distribution.
    /// @return snapshotId The id of the newly created snapshot.
    function snapshot() external onlyRole(SNAPSHOT_ROLE) returns (uint256 snapshotId) {
        _currentSnapshotId++;
        snapshotId = _currentSnapshotId;

        uint256 currentClock = clock();

        // If we're at block 0 or 1, use current clock; otherwise use previous block
        // This ensures we capture state before any transactions in the current block
        if (currentClock <= 1) {
            _snapshotClocks[snapshotId] = currentClock;
        } else {
            _snapshotClocks[snapshotId] = currentClock - 1;
        }

        emit Snapshot(snapshotId);
    }

    /// @notice Get token balance of account at specific snapshot
    /// @param account The account to query
    /// @param snapshotId The snapshot ID to query
    /// @return The token balance at the snapshot
    function balanceOfAt(address account, uint256 snapshotId) public view returns (uint256) {
        require(snapshotId > 0 && snapshotId <= _currentSnapshotId, "ERC20Snapshot: nonexistent snapshot");
        uint256 clockValue = _snapshotClocks[snapshotId];

        // If the snapshot clock equals current clock, use current votes
        if (clockValue == clock()) {
            return getVotes(account);
        }

        return getPastVotes(account, clockValue);
    }

    /// @notice Get total supply at specific snapshot
    /// @param snapshotId The snapshot ID to query
    /// @return The total supply at the snapshot
    function totalSupplyAt(uint256 snapshotId) public view returns (uint256) {
        require(snapshotId > 0 && snapshotId <= _currentSnapshotId, "ERC20Snapshot: nonexistent snapshot");
        uint256 clockValue = _snapshotClocks[snapshotId];

        // If the snapshot clock equals current clock, use current total supply
        if (clockValue == clock()) {
            return totalSupply();
        }

        return getPastTotalSupply(clockValue);
    }

    /// @notice Get the current snapshot ID
    /// @return The current snapshot ID
    function getCurrentSnapshotId() public view returns (uint256) {
        return _currentSnapshotId;
    }

    // ---------------------------------------------------------------------
    // Multiple inheritance glue
    // ---------------------------------------------------------------------
    /// @dev OpenZeppelin v5 routes transfers through _update().
    ///      Both ERC20 and ERC20Votes implement their own _update, so we override
    ///      once and forward to super._update() to ensure all parent hooks run exactly once.
    ///      Also implements auto-delegation for new token holders.
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);

        // Auto-delegate new token holders to themselves for voting power tracking
        if (to != address(0) && to != from && delegates(to) == address(0)) {
            _delegate(to, to);
        }
    }
}
