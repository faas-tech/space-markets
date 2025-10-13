// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title Roles
/// @notice Library for roles
library Roles {
    /// @notice Upgraders can upgrade the contract.
    // UPGRADER_ROLE: 189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3
    bytes32 constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @notice Registrars can register new assets.
    // REGISTRAR_ROLE: edcc084d3dcd65a1f7f23c65c46722faca6953d28e43150a467cf43e5c309238
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
}
