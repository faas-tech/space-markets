// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.24;

// import {ERC20} from "openzeppelin-contracts/token/ERC20/ERC20.sol";

// /// @title MockStablecoin
// /// @notice Minimal 6-decimal ERC-20 used in tests to simulate a USD stablecoin.
// /// @dev Inherits all standard ERC-20 behavior (transfer/approve/allowance). `mint` is open for testing.
// contract MockStablecoin is ERC20 {
//     constructor() ERC20("Mock USD", "mUSD") {}

//     /// @notice Faucet-style mint for tests.
//     function mint(address to, uint256 amount) external {
//         _mint(to, amount);
//     }

//     /// @notice Use 6 decimals similar to USDC.
//     function decimals() public pure override returns (uint8) {
//         return 6;
//     }
// }
