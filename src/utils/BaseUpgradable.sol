// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Roles} from "../libraries/Roles.sol";

// OpenZeppelin Contracts
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";

contract BaseUpgradable is UUPSUpgradeable, Initializable, AccessControlUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); // Required for upgradeable contracts
    }

    /// @notice Authorizes contract upgrades
    /// @dev Only callable by addresses with UPGRADER_ROLE
    /// @param newImplementation Address of the new implementation contract
    function _authorizeUpgrade(address newImplementation) internal virtual override onlyRole(Roles.UPGRADER_ROLE) {}

    /// @notice Get the UUPS implementation address
    function getUupsImplementation() external view returns (address) {
        return ERC1967Utils.getImplementation();
    }
}
