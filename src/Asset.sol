// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {ERC1155} from "openzeppelin-contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "openzeppelin-contracts/access/AccessControl.sol";

contract Asset is ERC1155, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(string memory uri) ERC1155(uri) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @dev Override supportsInterface to handle multiple inheritance
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
