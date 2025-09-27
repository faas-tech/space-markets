// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console} from "forge-std/Script.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {AssetERC20} from "../src/AssetERC20.sol";
import {LeaseFactory} from "../src/LeaseFactory.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {DeployConfig} from "./config/DeployConfig.s.sol";

/**
 * @title PostDeploy
 * @notice Post-deployment setup script for the Asset Leasing Protocol
 * @dev Handles role setup, permissions, and initial configuration after deployment
 *
 * Usage:
 *   forge script script/PostDeploy.s.sol:PostDeploy --rpc-url $RPC_URL --broadcast
 *
 * Environment Variables Required:
 *   - PRIVATE_KEY: Admin private key
 *   - DEPLOYMENT_FILE: Path to deployment JSON file (optional, auto-detected)
 */
contract PostDeploy is Script {

    // Contract instances
    AssetRegistry public assetRegistry;
    LeaseFactory public leaseFactory;
    Marketplace public marketplace;

    // Configuration
    address public admin;
    string public deploymentFile;

    struct DeploymentData {
        address assetRegistry;
        address leaseFactory;
        address marketplace;
        address stablecoin;
        address deployer;
        address admin;
    }

    /**
     * @notice Main post-deployment function
     */
    function run() external {
        _loadDeploymentData();
        _validateContracts();

        admin = vm.addr(vm.envUint("PRIVATE_KEY"));

        vm.startBroadcast(admin);

        _setupAdditionalRoles();
        _verifyPermissions();
        _setupInitialConfiguration();

        vm.stopBroadcast();

        _logPostDeploymentSummary();
    }

    /**
     * @notice Load deployment data from artifacts
     */
    function _loadDeploymentData() internal {
        // Try to auto-detect deployment file
        deploymentFile = vm.envOr("DEPLOYMENT_FILE", string(abi.encodePacked(
            "./deployments/",
            vm.toString(block.chainid),
            "-",
            DeployConfig.getNetworkName(block.chainid),
            ".json"
        )));

        console.log("Loading deployment data from:", deploymentFile);

        string memory json = vm.readFile(deploymentFile);

        // Parse deployment data
        address assetRegistryAddr = vm.parseJsonAddress(json, "$.contracts.AssetRegistry");
        address leaseFactoryAddr = vm.parseJsonAddress(json, "$.contracts.LeaseFactory");
        address marketplaceAddr = vm.parseJsonAddress(json, "$.contracts.Marketplace");

        // Initialize contract instances
        assetRegistry = AssetRegistry(assetRegistryAddr);
        leaseFactory = LeaseFactory(leaseFactoryAddr);
        marketplace = Marketplace(marketplaceAddr);

        console.log("Contracts loaded:");
        console.log("  AssetRegistry:", address(assetRegistry));
        console.log("  LeaseFactory:", address(leaseFactory));
        console.log("  Marketplace:", address(marketplaceAddr));
    }

    /**
     * @notice Validate that contracts are properly deployed and accessible
     */
    function _validateContracts() internal view {
        // Check that contracts exist and have correct admin
        require(address(assetRegistry).code.length > 0, "AssetRegistry not deployed");
        require(address(leaseFactory).code.length > 0, "LeaseFactory not deployed");
        require(address(marketplace).code.length > 0, "Marketplace not deployed");

        console.log("Contract validation passed");
    }

    /**
     * @notice Setup additional roles and permissions
     */
    function _setupAdditionalRoles() internal {
        console.log("Setting up additional roles...");

        // Grant REGISTRAR_ROLE to admin for easy asset registration
        if (!assetRegistry.hasRole(assetRegistry.REGISTRAR_ROLE(), admin)) {
            assetRegistry.grantRole(assetRegistry.REGISTRAR_ROLE(), admin);
            console.log("Granted REGISTRAR_ROLE to admin");
        }

        // Note: SNAPSHOT_ROLE will be granted to marketplace per asset token
        // This is done when assets are registered to ensure marketplace can create snapshots

        console.log("Additional roles configured");
    }

    /**
     * @notice Verify all permissions are correctly set
     */
    function _verifyPermissions() internal view {
        console.log("Verifying permissions...");

        // Verify AssetRegistry permissions
        require(assetRegistry.hasRole(assetRegistry.DEFAULT_ADMIN_ROLE(), admin), "Admin missing DEFAULT_ADMIN_ROLE on AssetRegistry");
        require(assetRegistry.hasRole(assetRegistry.ADMIN_ROLE(), admin), "Admin missing ADMIN_ROLE on AssetRegistry");
        require(assetRegistry.hasRole(assetRegistry.REGISTRAR_ROLE(), admin), "Admin missing REGISTRAR_ROLE on AssetRegistry");

        // Verify LeaseFactory permissions
        require(leaseFactory.hasRole(leaseFactory.DEFAULT_ADMIN_ROLE(), admin), "Admin missing DEFAULT_ADMIN_ROLE on LeaseFactory");
        require(leaseFactory.hasRole(leaseFactory.ADMIN_ROLE(), admin), "Admin missing ADMIN_ROLE on LeaseFactory");

        // Verify Marketplace permissions
        require(marketplace.hasRole(marketplace.DEFAULT_ADMIN_ROLE(), admin), "Admin missing DEFAULT_ADMIN_ROLE on Marketplace");
        require(marketplace.hasRole(marketplace.ADMIN_ROLE(), admin), "Admin missing ADMIN_ROLE on Marketplace");

        // Verify contract interconnections
        require(address(leaseFactory.registry()) == address(assetRegistry), "LeaseFactory registry not linked correctly");
        require(address(marketplace.leaseFactory()) == address(leaseFactory), "Marketplace lease factory not linked correctly");

        console.log("Permission verification passed");
    }

    /**
     * @notice Setup initial configuration
     */
    function _setupInitialConfiguration() internal {
        console.log("Setting up initial configuration...");

        // Initial configuration is minimal since most setup happens when assets are created
        // The main setup will happen when:
        // 1. Asset types are created
        // 2. Assets are registered
        // 3. SNAPSHOT_ROLE is granted to marketplace for each asset token

        console.log("Initial configuration completed");
        console.log("Note: SNAPSHOT_ROLE must be granted to Marketplace for each asset token");
    }

    /**
     * @notice Log comprehensive post-deployment summary
     */
    function _logPostDeploymentSummary() internal view {
        console.log("\n=== Post-Deployment Summary ===");
        console.log("Network:", DeployConfig.getNetworkName(block.chainid));
        console.log("Chain ID:", block.chainid);
        console.log("Admin:", admin);
        console.log("");
        console.log("Contract Addresses:");
        console.log("  AssetRegistry:", address(assetRegistry));
        console.log("  LeaseFactory:", address(leaseFactory));
        console.log("  Marketplace:", address(marketplace));
        console.log("");
        console.log("Permissions Configured:");
        console.log("  Admin has full access to all contracts");
        console.log("  Marketplace linked to LeaseFactory");
        console.log("  LeaseFactory linked to AssetRegistry");
        console.log("");
        console.log("Next Steps:");
        console.log("1. Create asset types: AssetRegistry.createAssetType()");
        console.log("2. Register assets: AssetRegistry.registerAsset()");
        console.log("3. Grant SNAPSHOT_ROLE to Marketplace for asset tokens");
        console.log("4. Test the full flow with sample data");
        console.log("===============================\n");
    }
}

/**
 * @title GrantSnapshotRole
 * @notice Helper script to grant SNAPSHOT_ROLE to Marketplace for asset tokens
 * @dev Should be run after asset registration
 *
 * Usage:
 *   forge script script/PostDeploy.s.sol:GrantSnapshotRole --rpc-url $RPC_URL --broadcast --sig "run(address)" $ASSET_TOKEN_ADDRESS
 */
contract GrantSnapshotRole is Script {

    /**
     * @notice Grant SNAPSHOT_ROLE to marketplace for a specific asset token
     * @param assetToken The asset token address
     */
    function run(address assetToken) external {
        // Load deployment data to get marketplace address
        string memory deploymentFile = string(abi.encodePacked(
            "./deployments/",
            vm.toString(block.chainid),
            "-",
            DeployConfig.getNetworkName(block.chainid),
            ".json"
        ));

        string memory json = vm.readFile(deploymentFile);
        address marketplaceAddr = vm.parseJsonAddress(json, "$.contracts.Marketplace");

        address admin = vm.addr(vm.envUint("PRIVATE_KEY"));

        vm.startBroadcast(admin);

        AssetERC20 token = AssetERC20(assetToken);

        // Grant SNAPSHOT_ROLE to marketplace
        if (!token.hasRole(token.SNAPSHOT_ROLE(), marketplaceAddr)) {
            token.grantRole(token.SNAPSHOT_ROLE(), marketplaceAddr);
            console.log("Granted SNAPSHOT_ROLE to Marketplace for asset token:", assetToken);
        } else {
            console.log("Marketplace already has SNAPSHOT_ROLE for asset token:", assetToken);
        }

        vm.stopBroadcast();
    }
}