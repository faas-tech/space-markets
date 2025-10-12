// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.25;

// import {Script, console} from "forge-std/Script.sol";
// import {AssetRegistry} from "../src/AssetRegistry.sol";
// import {AssetERC20} from "../src/AssetERC20.sol";
// import {Marketplace} from "../src/Marketplace.sol";
// import {DeployConfig} from "./config/DeployConfig.s.sol";

// /**
//  * @title CreateTestAssets
//  * @notice Script to create sample asset types and assets for testing the protocol
//  * @dev Creates realistic test data to demonstrate the full protocol functionality
//  *
//  * Usage:
//  *   forge script script/CreateTestAssets.s.sol:CreateTestAssets --rpc-url $RPC_URL --broadcast
//  *
//  * Environment Variables Required:
//  *   - PRIVATE_KEY: Admin private key with ADMIN_ROLE and REGISTRAR_ROLE
//  */
// contract CreateTestAssets is Script {
//     AssetRegistry public assetRegistry;
//     Marketplace public marketplace;
//     address public admin;

//     // Test asset data
//     struct TestAssetType {
//         string name;
//         string schemaURI;
//         bytes32[] requiredLeaseKeys;
//     }

//     struct TestAsset {
//         uint256 typeId;
//         address owner;
//         string dataURI;
//         string tokenName;
//         string tokenSymbol;
//         uint256 totalSupply;
//     }

//     /**
//      * @notice Main function to create test assets
//      */
//     function run() external {
//         _loadContracts();
//         admin = vm.addr(vm.envUint("PRIVATE_KEY"));

//         vm.startBroadcast(admin);

//         uint256[] memory typeIds = _createAssetTypes();
//         address[] memory assetTokens = _createAssets(typeIds);
//         _setupMarketplacePermissions(assetTokens);

//         vm.stopBroadcast();

//         _logTestAssetsSummary(typeIds, assetTokens);
//     }

//     /**
//      * @notice Load deployed contracts from artifacts
//      */
//     function _loadContracts() internal {
//         string memory deploymentFile = string(
//             abi.encodePacked(
//                 "./deployments/", vm.toString(block.chainid), "-", DeployConfig.getNetworkName(block.chainid), ".json"
//             )
//         );

//         string memory json = vm.readFile(deploymentFile);

//         address assetRegistryAddr = vm.parseJsonAddress(json, "$.contracts.AssetRegistry");
//         address marketplaceAddr = vm.parseJsonAddress(json, "$.contracts.Marketplace");

//         assetRegistry = AssetRegistry(assetRegistryAddr);
//         marketplace = Marketplace(marketplaceAddr);

//         console.log("Loaded contracts:");
//         console.log("  AssetRegistry:", address(assetRegistry));
//         console.log("  Marketplace:", address(marketplace));
//     }

//     /**
//      * @notice Create sample asset types
//      */
//     function _createAssetTypes() internal returns (uint256[] memory typeIds) {
//         console.log("Creating asset types...");

//         TestAssetType[] memory types = _getTestAssetTypes();
//         typeIds = new uint256[](types.length);

//         for (uint256 i = 0; i < types.length; i++) {
//             bytes32 schemaHash = keccak256(abi.encodePacked(types[i].name, block.timestamp, i));

//             typeIds[i] =
//                 assetRegistry.createAssetType(types[i].name, schemaHash, types[i].requiredLeaseKeys, types[i].schemaURI);

//             console.log("Created asset type:", types[i].name, "with ID:", typeIds[i]);
//         }

//         return typeIds;
//     }

//     /**
//      * @notice Create sample assets for each type
//      */
//     function _createAssets(uint256[] memory typeIds) internal returns (address[] memory assetTokens) {
//         console.log("Creating assets...");

//         TestAsset[] memory assets = _getTestAssets(typeIds);
//         assetTokens = new address[](assets.length);

//         for (uint256 i = 0; i < assets.length; i++) {
//             bytes32 metadataHash = keccak256(abi.encodePacked(assets[i].tokenName, block.timestamp, i));

//             (uint256 assetId, address tokenAddress) = assetRegistry.registerAsset(
//                 assets[i].typeId,
//                 assets[i].owner,
//                 metadataHash,
//                 assets[i].dataURI,
//                 assets[i].tokenName,
//                 assets[i].tokenSymbol,
//                 assets[i].totalSupply
//             );

//             assetTokens[i] = tokenAddress;

//             console.log("Created asset:", assets[i].tokenName);
//             console.log("  Asset ID:", assetId);
//             console.log("  Token Address:", tokenAddress);
//             console.log("  Owner:", assets[i].owner);
//         }

//         return assetTokens;
//     }

//     /**
//      * @notice Setup marketplace permissions for asset tokens
//      */
//     function _setupMarketplacePermissions(address[] memory assetTokens) internal {
//         console.log("Setting up marketplace permissions...");

//         for (uint256 i = 0; i < assetTokens.length; i++) {
//             AssetERC20 token = AssetERC20(assetTokens[i]);

//             // Grant SNAPSHOT_ROLE to marketplace
//             if (!token.hasRole(token.SNAPSHOT_ROLE(), address(marketplace))) {
//                 token.grantRole(token.SNAPSHOT_ROLE(), address(marketplace));
//                 console.log("Granted SNAPSHOT_ROLE to Marketplace for token:", assetTokens[i]);
//             }
//         }
//     }

//     /**
//      * @notice Get test asset type configurations
//      */
//     function _getTestAssetTypes() internal pure returns (TestAssetType[] memory) {
//         TestAssetType[] memory types = new TestAssetType[](3);

//         // Satellite asset type
//         bytes32[] memory satelliteKeys = new bytes32[](4);
//         satelliteKeys[0] = keccak256("lease.orbital_period_hours");
//         satelliteKeys[1] = keccak256("lease.communication_frequency_ghz");
//         satelliteKeys[2] = keccak256("lease.coverage_area_km2");
//         satelliteKeys[3] = keccak256("lease.imaging_resolution_m");

//         types[0] = TestAssetType({
//             name: "Satellite",
//             schemaURI: "ipfs://QmSatelliteSchemaV1ABC123/satellite-schema.json",
//             requiredLeaseKeys: satelliteKeys
//         });

//         // Orbital Compute Station asset type
//         bytes32[] memory computeKeys = new bytes32[](4);
//         computeKeys[0] = keccak256("lease.compute_cores");
//         computeKeys[1] = keccak256("lease.storage_tb");
//         computeKeys[2] = keccak256("lease.bandwidth_gbps");
//         computeKeys[3] = keccak256("lease.power_consumption_kw");

//         types[1] = TestAssetType({
//             name: "Orbital Compute Station",
//             schemaURI: "ipfs://QmOrbitalComputeSchemaV1DEF456/compute-schema.json",
//             requiredLeaseKeys: computeKeys
//         });

//         // Orbital Relay Station asset type
//         bytes32[] memory relayKeys = new bytes32[](4);
//         relayKeys[0] = keccak256("lease.relay_channels");
//         relayKeys[1] = keccak256("lease.max_throughput_gbps");
//         relayKeys[2] = keccak256("lease.coverage_area_km2");
//         relayKeys[3] = keccak256("lease.signal_power_dbm");

//         types[2] = TestAssetType({
//             name: "Orbital Relay Station",
//             schemaURI: "ipfs://QmOrbitalRelaySchemaV1GHI789/relay-schema.json",
//             requiredLeaseKeys: relayKeys
//         });

//         return types;
//     }

//     /**
//      * @notice Get test asset configurations
//      */
//     function _getTestAssets(uint256[] memory typeIds) internal view returns (TestAsset[] memory) {
//         require(typeIds.length >= 3, "Not enough asset types created");

//         TestAsset[] memory assets = new TestAsset[](4);

//         // Satellite Alpha-1 - Communications satellite
//         assets[0] = TestAsset({
//             typeId: typeIds[0],
//             owner: admin,
//             dataURI: "ipfs://QmSatelliteAlpha1MetadataXYZ/satellite-alpha-1.json",
//             tokenName: "Satellite Alpha-1",
//             tokenSymbol: "SAT-A1",
//             totalSupply: 10000 * 1e18 // Fractionalized ownership
//         });

//         // Satellite Beta-2 - Earth observation satellite
//         assets[1] = TestAsset({
//             typeId: typeIds[0],
//             owner: admin,
//             dataURI: "ipfs://QmSatelliteBeta2MetadataABC/satellite-beta-2.json",
//             tokenName: "Satellite Beta-2",
//             tokenSymbol: "SAT-B2",
//             totalSupply: 8000 * 1e18 // Fractionalized ownership
//         });

//         // OCS-Primary - Orbital Compute Station
//         assets[2] = TestAsset({
//             typeId: typeIds[1],
//             owner: admin,
//             dataURI: "ipfs://QmOCSPrimaryMetadataDEF/ocs-primary.json",
//             tokenName: "OCS-Primary",
//             tokenSymbol: "OCS-P",
//             totalSupply: 25000 * 1e18 // High-value compute infrastructure
//         });

//         // ORS-Gateway - Orbital Relay Station
//         assets[3] = TestAsset({
//             typeId: typeIds[2],
//             owner: admin,
//             dataURI: "ipfs://QmORSGatewayMetadataGHI/ors-gateway.json",
//             tokenName: "ORS-Gateway",
//             tokenSymbol: "ORS-G",
//             totalSupply: 15000 * 1e18 // Critical communication infrastructure
//         });

//         return assets;
//     }

//     /**
//      * @notice Log summary of created test assets
//      */
//     function _logTestAssetsSummary(uint256[] memory typeIds, address[] memory assetTokens) internal view {
//         console.log("\n=== Test Assets Created ===");
//         console.log("Network:", DeployConfig.getNetworkName(block.chainid));
//         console.log("Chain ID:", block.chainid);
//         console.log("");

//         console.log("Asset Types Created:");
//         string[3] memory typeNames = ["Satellite", "Orbital Compute Station", "Orbital Relay Station"];
//         for (uint256 i = 0; i < typeIds.length && i < 3; i++) {
//             console.log("  ", typeNames[i], "- Type ID:", typeIds[i]);
//         }

//         console.log("");
//         console.log("Assets Created:");
//         string[4] memory assetNames = [
//             "Satellite Alpha-1 (Communications)",
//             "Satellite Beta-2 (Earth Observation)",
//             "OCS-Primary (Orbital Compute Station)",
//             "ORS-Gateway (Orbital Relay Station)"
//         ];

//         for (uint256 i = 0; i < assetTokens.length && i < 4; i++) {
//             console.log("  ", assetNames[i]);
//             console.log("    Token Address:", assetTokens[i]);
//         }

//         console.log("");
//         console.log("Next Steps:");
//         console.log("1. Use these assets to test marketplace functionality");
//         console.log("2. Create sale listings with postSale()");
//         console.log("3. Create lease offers with postLeaseOffer()");
//         console.log("4. Test the full lease bidding and acceptance flow");
//         console.log("===========================\n");
//     }
// }
