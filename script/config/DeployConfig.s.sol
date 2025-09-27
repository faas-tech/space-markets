// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console} from "forge-std/Script.sol";

/**
 * @title DeployConfig
 * @notice Centralized configuration management for deployments across different networks
 * @dev Provides network-specific settings and validation for protocol deployment
 */
library DeployConfig {

    /**
     * @notice Configuration parameters for deployment
     */
    struct Config {
        string networkName;          // Human-readable network name
        address stablecoin;          // Stablecoin contract address (zero for mock deployment)
        uint256 minDeployerBalance;  // Minimum ETH balance required for deployment
        uint256 gasLimit;            // Gas limit for deployment transactions
        uint256 gasPrice;            // Gas price for deployment (zero for auto)
        bool verify;                 // Whether to verify contracts on block explorer
        string blockExplorerUrl;     // Block explorer URL for verification
    }

    // Chain ID constants - Supported Networks Only
    uint256 public constant ETHEREUM_MAINNET = 1;
    uint256 public constant ETHEREUM_SEPOLIA = 11155111;
    uint256 public constant BASE_MAINNET = 8453;
    uint256 public constant BASE_SEPOLIA = 84532;
    uint256 public constant ANVIL_LOCALHOST = 31337;

    // Known stablecoin addresses
    address public constant USDC_ETHEREUM = 0xA0b86a33E6441B8e947e072ed7DFa5C6C79F2c40;
    address public constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    /**
     * @notice Get deployment configuration for a specific chain ID
     * @param chainId The chain ID to get configuration for
     * @return config The deployment configuration
     */
    function getConfig(uint256 chainId) internal pure returns (Config memory config) {
        if (chainId == ETHEREUM_MAINNET) {
            config = Config({
                networkName: "ethereum-mainnet",
                stablecoin: USDC_ETHEREUM,
                minDeployerBalance: 0.1 ether,
                gasLimit: 3_000_000,
                gasPrice: 0, // Auto
                verify: true,
                blockExplorerUrl: "https://etherscan.io"
            });
        } else if (chainId == ETHEREUM_SEPOLIA) {
            config = Config({
                networkName: "ethereum-sepolia",
                stablecoin: address(0), // Deploy mock
                minDeployerBalance: 0.01 ether,
                gasLimit: 3_000_000,
                gasPrice: 0, // Auto
                verify: true,
                blockExplorerUrl: "https://sepolia.etherscan.io"
            });
        } else if (chainId == BASE_MAINNET) {
            config = Config({
                networkName: "base-mainnet",
                stablecoin: USDC_BASE,
                minDeployerBalance: 0.01 ether,
                gasLimit: 10_000_000,
                gasPrice: 0, // Auto
                verify: true,
                blockExplorerUrl: "https://basescan.org"
            });
        } else if (chainId == BASE_SEPOLIA) {
            config = Config({
                networkName: "base-sepolia",
                stablecoin: address(0), // Deploy mock
                minDeployerBalance: 0.001 ether,
                gasLimit: 10_000_000,
                gasPrice: 0, // Auto
                verify: true,
                blockExplorerUrl: "https://sepolia.basescan.org"
            });
        } else if (chainId == ANVIL_LOCALHOST) {
            config = Config({
                networkName: "anvil-localhost",
                stablecoin: address(0), // Deploy mock
                minDeployerBalance: 0.001 ether,
                gasLimit: 30_000_000,
                gasPrice: 0, // Auto
                verify: false,
                blockExplorerUrl: ""
            });
        } else {
            // Default configuration for unknown networks
            config = Config({
                networkName: "unknown",
                stablecoin: address(0), // Deploy mock
                minDeployerBalance: 0.001 ether,
                gasLimit: 3_000_000,
                gasPrice: 0, // Auto
                verify: false,
                blockExplorerUrl: ""
            });
        }
    }

    /**
     * @notice Check if a chain ID is supported
     * @param chainId The chain ID to check
     * @return True if the chain is supported
     */
    function isSupported(uint256 chainId) internal pure returns (bool) {
        return chainId == ETHEREUM_MAINNET ||
               chainId == ETHEREUM_SEPOLIA ||
               chainId == BASE_MAINNET ||
               chainId == BASE_SEPOLIA ||
               chainId == ANVIL_LOCALHOST;
    }

    /**
     * @notice Get network name for a chain ID
     * @param chainId The chain ID
     * @return The network name
     */
    function getNetworkName(uint256 chainId) internal pure returns (string memory) {
        return getConfig(chainId).networkName;
    }

    /**
     * @notice Check if verification is enabled for a chain
     * @param chainId The chain ID
     * @return True if verification is enabled
     */
    function shouldVerify(uint256 chainId) internal pure returns (bool) {
        return getConfig(chainId).verify;
    }

    /**
     * @notice Get the block explorer URL for a chain
     * @param chainId The chain ID
     * @return The block explorer URL
     */
    function getBlockExplorerUrl(uint256 chainId) internal pure returns (string memory) {
        return getConfig(chainId).blockExplorerUrl;
    }
}