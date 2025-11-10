// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.25;

// import {Script, console} from "forge-std/Script.sol";
// import {AssetRegistry} from "../src/AssetRegistry.sol";
// import {AssetERC20} from "../src/AssetERC20.sol";
// import {LeaseFactory} from "../src/LeaseFactory.sol";
// import {Marketplace} from "../src/Marketplace.sol";
// import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
// import {IERC20Metadata} from "openzeppelin-contracts/token/ERC20/extensions/IERC20Metadata.sol";
// import {DeployConfig} from "./config/DeployConfig.s.sol";

// /**
//  * @title VerifyDeployment
//  * @notice Comprehensive verification script for the Asset Leasing Protocol deployment
//  * @dev Performs extensive checks on contract deployment, configuration, and functionality
//  *
//  * Usage:
//  *   forge script script/VerifyDeployment.s.sol:VerifyDeployment --rpc-url $RPC_URL
//  */
// contract VerifyDeployment is Script {
//     // Contract instances
//     AssetRegistry public assetRegistry;
//     LeaseFactory public leaseFactory;
//     Marketplace public marketplace;
//     IERC20Metadata public stablecoin;

//     // Verification results
//     uint256 public totalChecks;
//     uint256 public passedChecks;
//     uint256 public failedChecks;

//     struct ContractInfo {
//         address assetRegistry;
//         address leaseFactory;
//         address marketplace;
//         address stablecoin;
//         address deployer;
//         address admin;
//     }

//     /**
//      * @notice Main verification function
//      */
//     function run() external {
//         console.log("=== Asset Leasing Protocol Deployment Verification ===");
//         console.log("Network:", DeployConfig.getNetworkName(block.chainid));
//         console.log("Chain ID:", block.chainid);
//         console.log("");

//         ContractInfo memory info = _loadContractInfo();
//         _initializeContracts(info);

//         _verifyContractDeployment(info);
//         _verifyContractConfiguration(info);
//         _verifyPermissions(info);
//         _verifyInterconnections();
//         _verifyFunctionality();

//         _printVerificationSummary();
//     }

//     /**
//      * @notice Load contract information from deployment artifacts
//      */
//     function _loadContractInfo() internal view returns (ContractInfo memory info) {
//         string memory deploymentFile = string(
//             abi.encodePacked(
//                 "./deployments/", vm.toString(block.chainid), "-", DeployConfig.getNetworkName(block.chainid), ".json"
//             )
//         );

//         console.log("Loading deployment data from:", deploymentFile);

//         try vm.readFile(deploymentFile) returns (string memory json) {
//             info.assetRegistry = vm.parseJsonAddress(json, "$.contracts.AssetRegistry");
//             info.leaseFactory = vm.parseJsonAddress(json, "$.contracts.LeaseFactory");
//             info.marketplace = vm.parseJsonAddress(json, "$.contracts.Marketplace");
//             info.stablecoin = vm.parseJsonAddress(json, "$.contracts.Stablecoin");
//             info.deployer = vm.parseJsonAddress(json, "$.deployer");
//             info.admin = vm.parseJsonAddress(json, "$.admin");

//             console.log("Deployment artifacts loaded successfully");
//         } catch {
//             console.log("FAIL: Failed to load deployment artifacts");
//             console.log("  Make sure deployment file exists and is valid JSON");
//             revert("Deployment artifacts not found");
//         }

//         return info;
//     }

//     /**
//      * @notice Initialize contract instances
//      */
//     function _initializeContracts(ContractInfo memory info) internal {
//         assetRegistry = AssetRegistry(info.assetRegistry);
//         leaseFactory = LeaseFactory(info.leaseFactory);
//         marketplace = Marketplace(info.marketplace);
//         stablecoin = IERC20Metadata(info.stablecoin);
//     }

//     /**
//      * @notice Verify contract deployment
//      */
//     function _verifyContractDeployment(ContractInfo memory info) internal view {
//         console.log("=== Contract Deployment Verification ===");

//         _check("AssetRegistry deployed", info.assetRegistry.code.length > 0);
//         _check("LeaseFactory deployed", info.leaseFactory.code.length > 0);
//         _check("Marketplace deployed", info.marketplace.code.length > 0);
//         _check("Stablecoin available", info.stablecoin.code.length > 0);

//         console.log("Contract addresses:");
//         console.log("  AssetRegistry:", info.assetRegistry);
//         console.log("  LeaseFactory:", info.leaseFactory);
//         console.log("  Marketplace:", info.marketplace);
//         console.log("  Stablecoin:", info.stablecoin);
//         console.log("");
//     }

//     /**
//      * @notice Verify contract configuration
//      */
//     function _verifyContractConfiguration(ContractInfo memory info) internal view {
//         console.log("=== Contract Configuration Verification ===");

//         // Verify AssetRegistry
//         _check("AssetRegistry nextTypeId initialized", assetRegistry.nextTypeId() == 1);
//         _check("AssetRegistry nextAssetId initialized", assetRegistry.nextAssetId() == 1);

//         // Verify LeaseFactory
//         _check("LeaseFactory registry set", address(leaseFactory.registry()) == info.assetRegistry);

//         // Verify Marketplace
//         _check("Marketplace stablecoin set", address(marketplace.stable()) == info.stablecoin);
//         _check("Marketplace lease factory set", address(marketplace.leaseFactory()) == info.leaseFactory);
//         _check("Marketplace nextSaleId initialized", marketplace.nextSaleId() == 1);
//         _check("Marketplace nextLeaseOfferId initialized", marketplace.nextLeaseOfferId() == 1);
//         _check("Marketplace nextRevenueRoundId initialized", marketplace.nextRevenueRoundId() == 1);

//         console.log("");
//     }

//     /**
//      * @notice Verify permissions and roles
//      */
//     function _verifyPermissions(ContractInfo memory info) internal view {
//         console.log("=== Permissions Verification ===");

//         // AssetRegistry roles
//         _check(
//             "AssetRegistry DEFAULT_ADMIN_ROLE", assetRegistry.hasRole(assetRegistry.DEFAULT_ADMIN_ROLE(), info.admin)
//         );
//         _check("AssetRegistry ADMIN_ROLE", assetRegistry.hasRole(assetRegistry.ADMIN_ROLE(), info.admin));
//         _check("AssetRegistry REGISTRAR_ROLE", assetRegistry.hasRole(assetRegistry.REGISTRAR_ROLE(), info.admin));

//         // LeaseFactory roles
//         _check("LeaseFactory DEFAULT_ADMIN_ROLE", leaseFactory.hasRole(leaseFactory.DEFAULT_ADMIN_ROLE(), info.admin));
//         _check("LeaseFactory ADMIN_ROLE", leaseFactory.hasRole(leaseFactory.ADMIN_ROLE(), info.admin));

//         // Marketplace roles
//         _check("Marketplace DEFAULT_ADMIN_ROLE", marketplace.hasRole(marketplace.DEFAULT_ADMIN_ROLE(), info.admin));
//         _check("Marketplace ADMIN_ROLE", marketplace.hasRole(marketplace.ADMIN_ROLE(), info.admin));

//         console.log("");
//     }

//     /**
//      * @notice Verify contract interconnections
//      */
//     function _verifyInterconnections() internal view {
//         console.log("=== Interconnections Verification ===");

//         _check("LeaseFactory -> AssetRegistry connection", address(leaseFactory.registry()) == address(assetRegistry));
//         _check("Marketplace -> LeaseFactory connection", address(marketplace.leaseFactory()) == address(leaseFactory));
//         _check("Marketplace -> Stablecoin connection", address(marketplace.stable()) == address(stablecoin));

//         console.log("");
//     }

//     /**
//      * @notice Verify basic functionality (read-only)
//      */
//     function _verifyFunctionality() internal view {
//         console.log("=== Functionality Verification ===");

//         // Test view functions
//         try assetRegistry.nextTypeId() returns (uint256 nextTypeId) {
//             _check("AssetRegistry.nextTypeId() callable", nextTypeId > 0);
//         } catch {
//             _check("AssetRegistry.nextTypeId() callable", false);
//         }

//         try assetRegistry.nextAssetId() returns (uint256 nextAssetId) {
//             _check("AssetRegistry.nextAssetId() callable", nextAssetId > 0);
//         } catch {
//             _check("AssetRegistry.nextAssetId() callable", false);
//         }

//         // Test computeKeyId function
//         try assetRegistry.computeKeyId("test.key") returns (bytes32 keyId) {
//             _check("AssetRegistry.computeKeyId() callable", keyId != bytes32(0));
//         } catch {
//             _check("AssetRegistry.computeKeyId() callable", false);
//         }

//         // Test marketplace view functions
//         try marketplace.nextSaleId() returns (uint256 nextSaleId) {
//             _check("Marketplace.nextSaleId() callable", nextSaleId > 0);
//         } catch {
//             _check("Marketplace.nextSaleId() callable", false);
//         }

//         try marketplace.nextLeaseOfferId() returns (uint256 nextOfferId) {
//             _check("Marketplace.nextLeaseOfferId() callable", nextOfferId > 0);
//         } catch {
//             _check("Marketplace.nextLeaseOfferId() callable", false);
//         }

//         // Test stablecoin basic functions
//         try stablecoin.name() returns (string memory name) {
//             _check("Stablecoin.name() callable", bytes(name).length > 0);
//         } catch {
//             _check("Stablecoin.name() callable", false);
//         }

//         try stablecoin.symbol() returns (string memory symbol) {
//             _check("Stablecoin.symbol() callable", bytes(symbol).length > 0);
//         } catch {
//             _check("Stablecoin.symbol() callable", false);
//         }

//         console.log("");
//     }

//     /**
//      * @notice Helper function to perform a check and log result
//      */
//     function _check(string memory description, bool condition) internal view {
//         // Note: This is a view function, so we can't modify state
//         // We'll use a different approach for counting in the summary
//         if (condition) {
//             console.log("PASS:", description);
//         } else {
//             console.log("FAIL:", description);
//         }
//     }

//     /**
//      * @notice Print verification summary
//      */
//     function _printVerificationSummary() internal view {
//         console.log("=== Verification Summary ===");

//         // Since this is a view function, we can't track counts with state variables
//         // Instead, we'll provide a general summary
//         console.log("Verification completed.");
//         console.log("");
//         console.log("If any checks failed (marked with FAIL), please:");
//         console.log("1. Review the deployment logs");
//         console.log("2. Check that all environment variables are set correctly");
//         console.log("3. Ensure the deployer had sufficient permissions");
//         console.log("4. Run the PostDeploy script if permissions are missing");
//         console.log("");
//         console.log("If all checks passed (marked with PASS), your deployment is ready!");
//         console.log("===========================");
//     }
// }

// /**
//  * @title QuickCheck
//  * @notice Quick verification script for basic deployment health
//  * @dev Provides a fast sanity check for deployment status
//  */
// contract QuickCheck is Script {
//     function run() external view {
//         console.log("=== Quick Deployment Check ===");

//         string memory deploymentFile = string(
//             abi.encodePacked(
//                 "./deployments/", vm.toString(block.chainid), "-", DeployConfig.getNetworkName(block.chainid), ".json"
//             )
//         );

//         try vm.readFile(deploymentFile) returns (string memory json) {
//             address assetRegistry = vm.parseJsonAddress(json, "$.contracts.AssetRegistry");
//             address leaseFactory = vm.parseJsonAddress(json, "$.contracts.LeaseFactory");
//             address marketplace = vm.parseJsonAddress(json, "$.contracts.Marketplace");
//             address stablecoin = vm.parseJsonAddress(json, "$.contracts.Stablecoin");

//             console.log("Deployment file found");
//             console.log("Contract addresses loaded");
//             console.log("");
//             console.log("AssetRegistry:", assetRegistry);
//             console.log("LeaseFactory:", leaseFactory);
//             console.log("Marketplace:", marketplace);
//             console.log("Stablecoin:", stablecoin);
//             console.log("");
//             console.log("Run full verification: forge script script/VerifyDeployment.s.sol:VerifyDeployment");
//         } catch {
//             console.log("FAIL: Deployment file not found or invalid");
//             console.log("Expected file:", deploymentFile);
//             console.log("");
//             console.log("Please run deployment first: forge script script/Deploy.s.sol:Deploy");
//         }

//         console.log("===============================");
//     }
// }
