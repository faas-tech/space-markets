// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console} from "forge-std/Script.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {AssetERC20} from "../src/AssetERC20.sol";
import {LeaseFactory} from "../src/LeaseFactory.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {DeployConfig} from "./config/DeployConfig.s.sol";
import {MockStablecoin} from "../test/mocks/MockStablecoin.sol";

/**
 * @title Deploy
 * @notice Main deployment script for the Asset Leasing Protocol
 * @dev Deploys all core contracts in proper dependency order and configures permissions
 *
 * Usage:
 *   forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL --broadcast --verify
 *
 * Environment Variables Required:
 *   - PRIVATE_KEY: Deployer private key
 *   - ADMIN_ADDRESS: Protocol admin address (optional, defaults to deployer)
 *   - STABLECOIN_ADDRESS: Stablecoin contract address (optional, deploys mock for testnets)
 */
contract Deploy is Script {
    using DeployConfig for DeployConfig.Config;

    // Deployment configuration
    DeployConfig.Config public config;

    // Deployed contract addresses
    address public assetRegistry;
    address public leaseFactory;
    address public marketplace;
    address public stablecoin;

    // Deployment parameters
    address public deployer;
    address public admin;


    /**
     * @notice Main deployment function
     * @dev Coordinates the entire deployment process
     */
    function run() external {
        _loadConfiguration();
        _validateConfiguration();
        _logDeploymentStart();

        vm.startBroadcast(deployer);

        _deployStablecoin();
        _deployAssetRegistry();
        _deployLeaseFactory();
        _deployMarketplace();
        _setupPermissions();
        _verifyDeployment();

        vm.stopBroadcast();

        _logDeploymentSummary();
        _saveDeploymentArtifacts();
    }

    /**
     * @notice Load and validate deployment configuration
     */
    function _loadConfiguration() internal {
        // Load configuration for current network
        config = DeployConfig.getConfig(block.chainid);

        // Set deployer from private key
        deployer = vm.addr(vm.envUint("PRIVATE_KEY"));

        // Set admin (default to deployer if not specified)
        admin = vm.envOr("ADMIN_ADDRESS", deployer);

        // Override stablecoin if specified in environment
        if (vm.envOr("STABLECOIN_ADDRESS", address(0)) != address(0)) {
            config.stablecoin = vm.envAddress("STABLECOIN_ADDRESS");
        }

        console.log("=== Configuration Loaded ===");
        console.log("Chain ID:", block.chainid);
        console.log("Network:", config.networkName);
        console.log("Deployer:", deployer);
        console.log("Admin:", admin);
        console.log("Stablecoin:", config.stablecoin);
    }

    /**
     * @notice Validate deployment configuration
     */
    function _validateConfiguration() internal view {
        require(bytes(config.networkName).length > 0, "Invalid network configuration");
        require(deployer != address(0), "Invalid deployer address");
        require(admin != address(0), "Invalid admin address");

        // Validate deployer has sufficient balance for deployment
        require(deployer.balance >= config.minDeployerBalance, "Insufficient deployer balance");

        console.log("Configuration validation passed");
    }

    /**
     * @notice Log deployment start information
     */
    function _logDeploymentStart() internal view {
        console.log("\n=== Asset Leasing Protocol Deployment ===");
        console.log("Network:", config.networkName);
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Admin:", admin);
        console.log("Gas Price:", tx.gasprice);
        console.log("Block Number:", block.number);
        console.log("==========================================\n");
    }

    /**
     * @notice Deploy or use existing stablecoin
     */
    function _deployStablecoin() internal {
        if (config.stablecoin != address(0)) {
            // Use existing stablecoin
            stablecoin = config.stablecoin;
            console.log("Using existing stablecoin:", stablecoin);
        } else {
            // Deploy mock stablecoin for testing
            console.log("Deploying mock stablecoin...");

            // Simple mock ERC20 for testing
            bytes memory bytecode = abi.encodePacked(
                type(MockStablecoin).creationCode,
                abi.encode("Test USDC", "USDC", 6)
            );

            bytes32 saltValue = salt();
            address deployedAddress;
            assembly {
                deployedAddress := create2(0, add(bytecode, 0x20), mload(bytecode), saltValue)
            }
            stablecoin = deployedAddress;

            require(stablecoin != address(0), "Stablecoin deployment failed");
            console.log("Mock stablecoin deployed:", stablecoin);
        }
    }

    /**
     * @notice Deploy AssetRegistry contract
     */
    function _deployAssetRegistry() internal {
        console.log("Deploying AssetRegistry...");

        assetRegistry = address(new AssetRegistry(admin));

        require(assetRegistry != address(0), "AssetRegistry deployment failed");
        console.log("AssetRegistry deployed:", assetRegistry);
    }

    /**
     * @notice Deploy LeaseFactory contract
     */
    function _deployLeaseFactory() internal {
        console.log("Deploying LeaseFactory...");

        leaseFactory = address(new LeaseFactory(admin, assetRegistry));

        require(leaseFactory != address(0), "LeaseFactory deployment failed");
        console.log("LeaseFactory deployed:", leaseFactory);
    }

    /**
     * @notice Deploy Marketplace contract
     */
    function _deployMarketplace() internal {
        console.log("Deploying Marketplace...");

        marketplace = address(new Marketplace(admin, stablecoin, leaseFactory));

        require(marketplace != address(0), "Marketplace deployment failed");
        console.log("Marketplace deployed:", marketplace);
    }

    /**
     * @notice Setup cross-contract permissions and roles
     */
    function _setupPermissions() internal {
        console.log("Setting up permissions...");

        // Grant SNAPSHOT_ROLE to Marketplace on AssetERC20 contracts
        // Note: This will be done per asset token as they are created
        // The marketplace needs this role to create snapshots for revenue distribution

        console.log("Basic permissions configured");
        console.log("Note: SNAPSHOT_ROLE will be granted to Marketplace per asset token");
    }

    /**
     * @notice Verify deployment by checking contract states
     */
    function _verifyDeployment() internal view {
        console.log("Verifying deployment...");

        // Verify AssetRegistry
        require(AssetRegistry(assetRegistry).hasRole(AssetRegistry(assetRegistry).DEFAULT_ADMIN_ROLE(), admin), "AssetRegistry admin role not set");
        require(AssetRegistry(assetRegistry).nextTypeId() == 1, "AssetRegistry not properly initialized");

        // Verify LeaseFactory
        require(LeaseFactory(leaseFactory).hasRole(LeaseFactory(leaseFactory).DEFAULT_ADMIN_ROLE(), admin), "LeaseFactory admin role not set");
        require(address(LeaseFactory(leaseFactory).registry()) == assetRegistry, "LeaseFactory registry not set correctly");

        // Verify Marketplace
        require(Marketplace(marketplace).hasRole(Marketplace(marketplace).DEFAULT_ADMIN_ROLE(), admin), "Marketplace admin role not set");
        require(address(Marketplace(marketplace).stable()) == stablecoin, "Marketplace stablecoin not set correctly");
        require(address(Marketplace(marketplace).leaseFactory()) == leaseFactory, "Marketplace lease factory not set correctly");

        console.log("Deployment verification passed");
    }

    /**
     * @notice Log comprehensive deployment summary
     */
    function _logDeploymentSummary() internal view {
        console.log("\n=== Deployment Summary ===");
        console.log("Network:", config.networkName);
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Admin:", admin);
        console.log("");
        console.log("Contract Addresses:");
        console.log("  AssetRegistry:", assetRegistry);
        console.log("  LeaseFactory:", leaseFactory);
        console.log("  Marketplace:", marketplace);
        console.log("  Stablecoin:", stablecoin);
        console.log("");
        console.log("Next Steps:");
        console.log("1. Verify contracts on block explorer");
        console.log("2. Create initial asset types using AssetRegistry.createAssetType()");
        console.log("3. Register assets using AssetRegistry.registerAsset()");
        console.log("4. Grant SNAPSHOT_ROLE to Marketplace on asset tokens");
        console.log("===========================\n");
    }

    /**
     * @notice Save deployment artifacts to file
     */
    function _saveDeploymentArtifacts() internal {
        string memory deploymentData = string(abi.encodePacked(
            '{\n',
            '  "network": "', config.networkName, '",\n',
            '  "chainId": ', vm.toString(block.chainid), ',\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "admin": "', vm.toString(admin), '",\n',
            '  "contracts": {\n',
            '    "AssetRegistry": "', vm.toString(assetRegistry), '",\n',
            '    "LeaseFactory": "', vm.toString(leaseFactory), '",\n',
            '    "Marketplace": "', vm.toString(marketplace), '",\n',
            '    "Stablecoin": "', vm.toString(stablecoin), '"\n',
            '  },\n',
            '  "deployedAt": ', vm.toString(block.timestamp), ',\n',
            '  "blockNumber": ', vm.toString(block.number), '\n',
            '}'
        ));

        string memory filename = string(abi.encodePacked(
            "./deployments/",
            vm.toString(block.chainid),
            "-",
            config.networkName,
            ".json"
        ));

        vm.writeFile(filename, deploymentData);
        console.log("Deployment artifacts saved to:", filename);
    }

    /**
     * @notice Generate deterministic salt for CREATE2 deployments
     */
    function salt() internal view returns (bytes32) {
        return keccak256(abi.encodePacked("AssetLeasingProtocol", block.chainid, deployer));
    }
}

