// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "openzeppelin-contracts/token/ERC20/ERC20.sol";
import {ERC20Snapshot} from "openzeppelin-contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import {AccessControl} from "openzeppelin-contracts/access/AccessControl.sol";

/// @title AssetERC20
/// @notice ERC-20 token representing full and fractional ownership of a single registered asset.
/// @dev One instance of this contract is deployed per asset by the AssetRegistry.
///      It includes OpenZeppelin's ERC20Snapshot to support snapshot-based revenue sharing.
contract AssetERC20 is ERC20, ERC20Snapshot, AccessControl {
    /// @notice Role that is allowed to mint (used only at construction-time by the registry).
    bytes32 public constant MINTER_ROLE   = keccak256("MINTER_ROLE");
    /// @notice Role that is allowed to create snapshots (granted to the marketplace in this prototype).
    bytes32 public constant SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");

    /// @notice The id of the asset in the registry that this ERC-20 represents.
    uint256 public immutable assetId;

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
    ) ERC20(name_, symbol_) {
        assetId = assetId_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(SNAPSHOT_ROLE, admin);
        _mint(initialOwner, totalSupply);
    }

    /// @notice Takes a snapshot of balances for revenue distribution.
    /// @return snapshotId The id of the newly created snapshot.
    function snapshot() external onlyRole(SNAPSHOT_ROLE) returns (uint256 snapshotId) {
        snapshotId = _snapshot();
    }

    // ---------------------------------------------------------------------
    // Multiple inheritance glue
    // ---------------------------------------------------------------------
    /// @dev OpenZeppelin v5 routes transfers through _update().
    ///      Both ERC20 and ERC20Snapshot implement their own _update, so we override
    ///      once and forward to super._update() to ensure all parent hooks run exactly once.
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Snapshot)
    {
        super._update(from, to, value);
    }
}
