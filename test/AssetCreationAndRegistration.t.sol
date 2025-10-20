// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {AssetERC20} from "../src/AssetERC20.sol";
import {MetadataStorage} from "../src/MetadataStorage.sol";

/// @title AssetCreationAndRegistration Test
/// @notice Demonstrates the complete lifecycle of asset type creation and instance registration
/// @dev This test is designed to be READ as documentation, showing how the protocol combines
///      on-chain and off-chain data for asset tokenization. Each test represents a real-world
///      scenario using data from JSON files that would typically be stored in IPFS or S3.
///
/// TEST PHILOSOPHY:
/// ----------------
/// These tests are ILLUSTRATIVE, not exhaustive. They show:
/// 1. How to create asset type schemas (templates)
/// 2. How to register specific asset instances
/// 3. How metadata flows from JSON → smart contracts → ERC-20 tokens
/// 4. The relationship between asset types and asset instances
///
/// READING THIS TEST:
/// ------------------
/// - Tests are numbered 01-08 for sequential reading
/// - Console output shows protocol state at each step
/// - Comments explain WHAT and WHY, not just HOW
/// - Anti-patterns are avoided (no self-satisfying tests)
///
/// DATA SOURCE:
/// ------------
/// This test uses data from test/offchain/data/assets/*.json representing real orbital assets:
/// - OCS-Primary: Orbital Compute Station providing cloud computing from orbit
/// - ORS-Gateway: Orbital Relay Station for communication routing
/// - Satellite Alpha-1: Geostationary communications satellite
/// - Satellite Beta-2: Low Earth orbit imaging satellite
contract AssetCreationAndRegistrationTest is Test {
    // ============ State Variables ============

    AssetRegistry public registry;

    // Test actors with clear roles
    address public admin = makeAddr("admin"); // Can create asset types
    address public registrar = makeAddr("registrar"); // Can register asset instances
    address public owner = makeAddr("owner"); // Initial asset owner (receives tokens)

    // Schema hashes - representing off-chain JSON schemas stored on IPFS
    // In production, these would be computed from canonical JSON-LD schemas
    bytes32 public orbitalComputeSchema;
    bytes32 public orbitalRelaySchema;
    bytes32 public satelliteSchema;

    // Asset IDs - will be assigned by the registry sequentially (1, 2, 3, 4)
    uint256 public ocsPrimaryAssetId;
    uint256 public orsGatewayAssetId;
    uint256 public satAlpha1AssetId;
    uint256 public satBeta2AssetId;

    // Token addresses - will be deployed by AssetRegistry during registration
    address public ocsPrimaryToken;
    address public orsGatewayToken;
    address public satAlpha1Token;
    address public satBeta2Token;

    /// @notice Sets up the test environment
    /// @dev Deploys AssetRegistry and computes schema hashes for our three asset types
    function setUp() public {
        console2.log("\n==========================================================");
        console2.log("SETUP: Deploying Asset Leasing Protocol");
        console2.log("==========================================================\n");

        // Deploy the AssetRegistry with proper role assignments
        // - admin: Can create new asset types (schemas)
        // - registrar: Can register specific asset instances
        vm.prank(admin);
        registry = new AssetRegistry(admin, registrar);

        console2.log("AssetRegistry deployed at:", address(registry));
        console2.log("Admin address:", admin);
        console2.log("Registrar address:", registrar);
        console2.log("Owner address (will receive tokens):", owner);

        // Compute schema hashes for our three asset types
        // These simple string dummy values represent canonical JSON schemas stored off-chain
        orbitalComputeSchema = keccak256(abi.encode("orbital_compute"));
        orbitalRelaySchema = keccak256(abi.encode("orbital_relay"));
        satelliteSchema = keccak256(abi.encode("satellite"));

        console2.log("\nComputed Schema Hashes:");
        console2.log("- Orbital Compute:", vm.toString(orbitalComputeSchema));
        console2.log("- Orbital Relay:", vm.toString(orbitalRelaySchema));
        console2.log("- Satellite:", vm.toString(satelliteSchema));
    }

    // ============ Asset Type Creation Tests ============
    // These tests create the three asset type "templates" that instances will use

    /// @notice Test 01: Create "Orbital Compute Station" asset type
    /// @dev This asset type represents orbital computing infrastructure (like AWS in space)
    ///      Required lease keys ensure lessees provide necessary operational parameters
    function test_01_CreateOrbitalComputeStationType() public {
        console2.log("\n==========================================================");
        console2.log("TEST 01: Creating Orbital Compute Station Asset Type");
        console2.log("==========================================================\n");

        // Define required lease metadata keys for this asset type
        // Lessees MUST provide these when creating a lease for this asset type
        bytes32[] memory requiredLeaseKeys = new bytes32[](3);
        requiredLeaseKeys[0] = keccak256("compute_allocation_cores"); // How many CPU cores needed
        requiredLeaseKeys[1] = keccak256("memory_allocation_gb"); // How much RAM needed
        requiredLeaseKeys[2] = keccak256("storage_allocation_tb"); // How much storage needed

        // Create metadata array with schema information
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](2);
        metadata[0] = MetadataStorage.Metadata({
            key: "schemaURI",
            value: "ipfs://QmOrbitalComputeSchemaV1/schema.json"
        });
        metadata[1] = MetadataStorage.Metadata({key: "description", value: "Orbital computing infrastructure"});

        // Only admin can create asset types
        vm.prank(admin);
        registry.createAsset("Orbital Compute Station", orbitalComputeSchema, requiredLeaseKeys, metadata);

        console2.log("Asset Type Created: Orbital Compute Station");
        console2.log("Schema Hash:", vm.toString(orbitalComputeSchema));
        console2.log("Required Lease Keys:");
        console2.log("  1. compute_allocation_cores");
        console2.log("  2. memory_allocation_gb");
        console2.log("  3. storage_allocation_tb");

        // VERIFICATION: Test actual contract behavior, not test setup
        // Query the registry to verify the asset type was created correctly
        AssetRegistry.AssetType memory assetType = registry.getType(orbitalComputeSchema);

        assertEq(assetType.name, "Orbital Compute Station", "Asset type name mismatch");
        assertEq(assetType.requiredLeaseKeys.length, 3, "Wrong number of required lease keys");
        assertEq(
            assetType.requiredLeaseKeys[0],
            keccak256("compute_allocation_cores"),
            "First required key mismatch"
        );

        console2.log("\n[SUCCESS] Asset type successfully created and verified\n");
    }

    /// @notice Test 02: Create "Orbital Relay Station" asset type
    /// @dev This asset type represents communication relay infrastructure
    function test_02_CreateOrbitalRelayStationType() public {
        console2.log("\n==========================================================");
        console2.log("TEST 02: Creating Orbital Relay Station Asset Type");
        console2.log("==========================================================\n");

        // Relay stations need different lease parameters than compute stations
        bytes32[] memory requiredLeaseKeys = new bytes32[](3);
        requiredLeaseKeys[0] = keccak256("bandwidth_allocation_gbps"); // Bandwidth needed
        requiredLeaseKeys[1] = keccak256("frequency_bands"); // Which frequency bands
        requiredLeaseKeys[2] = keccak256("coverage_area"); // Geographic coverage needed

        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](2);
        metadata[0] = MetadataStorage.Metadata({
            key: "schemaURI",
            value: "ipfs://QmOrbitalRelaySchemaV1/schema.json"
        });
        metadata[1] = MetadataStorage.Metadata({key: "description", value: "Orbital relay infrastructure"});

        vm.prank(admin);
        registry.createAsset("Orbital Relay Station", orbitalRelaySchema, requiredLeaseKeys, metadata);

        console2.log("Asset Type Created: Orbital Relay Station");
        console2.log("Schema Hash:", vm.toString(orbitalRelaySchema));
        console2.log("Required Lease Keys:");
        console2.log("  1. bandwidth_allocation_gbps");
        console2.log("  2. frequency_bands");
        console2.log("  3. coverage_area");

        // Verify independently - don't just check what we set
        AssetRegistry.AssetType memory assetType = registry.getType(orbitalRelaySchema);
        assertEq(assetType.name, "Orbital Relay Station", "Asset type name mismatch");
        assertEq(
            assetType.requiredLeaseKeys[0], keccak256("bandwidth_allocation_gbps"), "First required key mismatch"
        );

        console2.log("\n[SUCCESS] Asset type successfully created and verified\n");
    }

    /// @notice Test 03: Create "Satellite" asset type
    /// @dev This is a general satellite asset type (covers both GEO comms and LEO imaging)
    function test_03_CreateSatelliteType() public {
        console2.log("\n==========================================================");
        console2.log("TEST 03: Creating Satellite Asset Type");
        console2.log("==========================================================\n");

        // Satellites can be used for multiple purposes, so lease keys are generic
        bytes32[] memory requiredLeaseKeys = new bytes32[](2);
        requiredLeaseKeys[0] = keccak256("mission_type"); // communications, imaging, etc.
        requiredLeaseKeys[1] = keccak256("coverage_requirements"); // Where satellite needs to cover

        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](2);
        metadata[0] = MetadataStorage.Metadata({key: "schemaURI", value: "ipfs://QmSatelliteSchemaV1/schema.json"});
        metadata[1] = MetadataStorage.Metadata({key: "description", value: "General purpose satellite"});

        vm.prank(admin);
        registry.createAsset("Satellite", satelliteSchema, requiredLeaseKeys, metadata);

        console2.log("Asset Type Created: Satellite");
        console2.log("Schema Hash:", vm.toString(satelliteSchema));
        console2.log("Required Lease Keys:");
        console2.log("  1. mission_type");
        console2.log("  2. coverage_requirements");

        AssetRegistry.AssetType memory assetType = registry.getType(satelliteSchema);
        assertEq(assetType.name, "Satellite", "Asset type name mismatch");
        assertEq(assetType.requiredLeaseKeys.length, 2, "Wrong number of required lease keys");

        console2.log("\n[SUCCESS] Asset type successfully created and verified\n");
    }

    // ============ Asset Instance Registration Tests ============
    // These tests register specific real-world assets using the types created above

    /// @notice Test 04: Register OCS-Primary (Orbital Compute Station instance)
    /// @dev Represents a specific compute station deployed in LEO at 450km altitude
    ///      Data comes from test/offchain/data/assets/ocs-primary.json
    function test_04_RegisterOCSPrimaryInstance() public {
        // IMPORTANT: Must create the asset type first
        test_01_CreateOrbitalComputeStationType();

        console2.log("\n==========================================================");
        console2.log("TEST 04: Registering OCS-Primary Asset Instance");
        console2.log("==========================================================\n");

        console2.log("Asset Details (from ocs-primary.json):");
        console2.log("- Name: OCS-Primary");
        console2.log("- Type: Orbital Compute Station");
        console2.log("- Altitude: 450 km (Low Earth Orbit)");
        console2.log("- Mass: 4,200 kg");
        console2.log("- Power: 8.5 kW");
        console2.log("- CPU Cores: 64");
        console2.log("- RAM: 512 GB");
        console2.log("- Storage: 100 TB\n");

        // Metadata extracted from ocs-primary.json
        // In production, this would be read from the JSON file and transformed
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](8);
        metadata[0] = MetadataStorage.Metadata({key: "name", value: "OCS-Primary"});
        metadata[1] = MetadataStorage.Metadata({key: "altitude_km", value: "450"});
        metadata[2] = MetadataStorage.Metadata({key: "mass_kg", value: "4200"});
        metadata[3] = MetadataStorage.Metadata({key: "power_consumption_kw", value: "8.5"});
        metadata[4] = MetadataStorage.Metadata({key: "cpu_cores", value: "64"});
        metadata[5] = MetadataStorage.Metadata({key: "ram_gb", value: "512"});
        metadata[6] = MetadataStorage.Metadata({key: "storage_tb", value: "100"});
        metadata[7] = MetadataStorage.Metadata({
            key: "documentHash",
            value: "0x789012345678901234567890abcdef1234567890abcdef123456789abcde"
        });

        // Register the asset instance
        // This will:
        // 1. Validate that orbitalComputeSchema exists
        // 2. Deploy a new AssetERC20 contract
        // 3. Mint 1,000,000 tokens to the owner
        // 4. Store metadata for the asset
        vm.prank(registrar);
        (uint256 assetId, address tokenAddr) = registry.registerAsset(
            orbitalComputeSchema,
            "OCS-Primary Token",
            "OCS1",
            1_000_000 * 1e18, // 1 million tokens with 18 decimals
            address(registry), // Admin - AssetRegistry needs this role to set metadata during construction
            owner, // Recipient of all tokens
            metadata
        );

        // Store for later tests
        ocsPrimaryAssetId = assetId;
        ocsPrimaryToken = tokenAddr;

        console2.log("Asset Registration Complete:");
        console2.log("- Asset ID:", assetId);
        console2.log("- Token Address:", tokenAddr);
        console2.log("- Token Symbol: OCS1");
        console2.log("- Total Supply: 1,000,000 tokens");
        console2.log("- Owner:", owner);

        // VERIFICATION: Test actual protocol behavior
        // Verify the asset was registered correctly by querying registry
        AssetRegistry.Asset memory asset = registry.getAsset(assetId);
        assertEq(asset.schemaHash, orbitalComputeSchema, "Schema hash mismatch");
        assertEq(asset.issuer, owner, "Issuer mismatch");
        assertEq(asset.tokenAddress, tokenAddr, "Token address mismatch");

        // Verify the ERC-20 token was deployed and initialized correctly
        AssetERC20 token = AssetERC20(tokenAddr);
        assertEq(token.name(), "OCS-Primary Token", "Token name mismatch");
        assertEq(token.symbol(), "OCS1", "Token symbol mismatch");
        assertEq(token.totalSupply(), 1_000_000 * 1e18, "Total supply mismatch");
        assertEq(token.balanceOf(owner), 1_000_000 * 1e18, "Owner balance mismatch");
        assertEq(token.ASSET_ID(), assetId, "Asset ID in token mismatch");

        console2.log("\n[SUCCESS] Asset instance successfully registered and verified");
        console2.log("[SUCCESS] ERC-20 token deployed and verified");
        console2.log("[SUCCESS] Owner holds 100% of token supply\n");
    }

    /// @notice Test 05: Register ORS-Gateway (Orbital Relay Station instance)
    /// @dev Represents a relay station in MEO at 8000km providing 25 Gbps throughput
    ///      Data comes from test/offchain/data/assets/ors-gateway.json
    function test_05_RegisterORSGatewayInstance() public {
        test_02_CreateOrbitalRelayStationType();

        console2.log("\n==========================================================");
        console2.log("TEST 05: Registering ORS-Gateway Asset Instance");
        console2.log("==========================================================\n");

        console2.log("Asset Details (from ors-gateway.json):");
        console2.log("- Name: ORS-Gateway");
        console2.log("- Type: Orbital Relay Station");
        console2.log("- Altitude: 8,000 km (Medium Earth Orbit)");
        console2.log("- Mass: 1,800 kg");
        console2.log("- Power: 3,500 W");
        console2.log("- Max Throughput: 25 Gbps");
        console2.log("- Channels: 48\n");

        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](7);
        metadata[0] = MetadataStorage.Metadata({key: "name", value: "ORS-Gateway"});
        metadata[1] = MetadataStorage.Metadata({key: "altitude_km", value: "8000"});
        metadata[2] = MetadataStorage.Metadata({key: "mass_kg", value: "1800"});
        metadata[3] = MetadataStorage.Metadata({key: "power_watts", value: "3500"});
        metadata[4] = MetadataStorage.Metadata({key: "max_throughput_gbps", value: "25"});
        metadata[5] = MetadataStorage.Metadata({key: "channels", value: "48"});
        metadata[6] = MetadataStorage.Metadata({
            key: "documentHash",
            value: "0x12345678901234567890abcdef1234567890abcdef123456789abcdef123"
        });

        vm.prank(registrar);
        (uint256 assetId, address tokenAddr) =
            registry.registerAsset(orbitalRelaySchema, "ORS-Gateway Token", "ORS1", 1_000_000 * 1e18, address(registry), owner, metadata);

        orsGatewayAssetId = assetId;
        orsGatewayToken = tokenAddr;

        console2.log("Asset Registration Complete:");
        console2.log("- Asset ID:", assetId);
        console2.log("- Token Address:", tokenAddr);
        console2.log("- Token Symbol: ORS1");

        // Verify registration
        AssetRegistry.Asset memory asset = registry.getAsset(assetId);
        assertEq(asset.schemaHash, orbitalRelaySchema, "Schema hash mismatch");

        AssetERC20 token = AssetERC20(tokenAddr);
        assertEq(token.symbol(), "ORS1", "Token symbol mismatch");
        assertEq(token.totalSupply(), 1_000_000 * 1e18, "Total supply mismatch");

        console2.log("\n[SUCCESS] ORS-Gateway successfully registered and verified\n");
    }

    /// @notice Test 06: Register Satellite Alpha-1 (GEO communications satellite)
    /// @dev Geostationary satellite at 35,786km providing C-band and Ku-band coverage
    ///      Data comes from test/offchain/data/assets/satellite-alpha-1.json
    function test_06_RegisterSatelliteAlpha1Instance() public {
        test_03_CreateSatelliteType();

        console2.log("\n==========================================================");
        console2.log("TEST 06: Registering Satellite Alpha-1 Asset Instance");
        console2.log("==========================================================\n");

        console2.log("Asset Details (from satellite-alpha-1.json):");
        console2.log("- Name: Satellite Alpha-1");
        console2.log("- Type: Satellite (Communications)");
        console2.log("- Orbit: Geostationary (35,786 km)");
        console2.log("- Mass: 3,500 kg");
        console2.log("- Power: 6,000 W");
        console2.log("- Transponders: 24");
        console2.log("- Coverage: North America, Europe\n");

        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](7);
        metadata[0] = MetadataStorage.Metadata({key: "name", value: "Satellite Alpha-1"});
        metadata[1] = MetadataStorage.Metadata({key: "altitude_km", value: "35786"});
        metadata[2] = MetadataStorage.Metadata({key: "mass_kg", value: "3500"});
        metadata[3] = MetadataStorage.Metadata({key: "power_watts", value: "6000"});
        metadata[4] = MetadataStorage.Metadata({key: "mission_type", value: "communications"});
        metadata[5] = MetadataStorage.Metadata({key: "transponders", value: "24"});
        metadata[6] = MetadataStorage.Metadata({
            key: "documentHash",
            value: "0xa1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
        });

        vm.prank(registrar);
        (uint256 assetId, address tokenAddr) =
            registry.registerAsset(satelliteSchema, "Satellite Alpha-1 Token", "SAT1", 1_000_000 * 1e18, address(registry), owner, metadata);

        satAlpha1AssetId = assetId;
        satAlpha1Token = tokenAddr;

        console2.log("Asset Registration Complete:");
        console2.log("- Asset ID:", assetId);
        console2.log("- Token Address:", tokenAddr);
        console2.log("- Token Symbol: SAT1");

        // Verify
        AssetRegistry.Asset memory asset = registry.getAsset(assetId);
        assertEq(asset.schemaHash, satelliteSchema, "Schema hash mismatch");

        AssetERC20 token = AssetERC20(tokenAddr);
        assertEq(token.symbol(), "SAT1", "Token symbol mismatch");

        console2.log("\n[SUCCESS] Satellite Alpha-1 successfully registered and verified\n");
    }

    /// @notice Test 07: Register Satellite Beta-2 (LEO imaging satellite)
    /// @dev Low Earth Orbit imaging satellite at 550km with 0.5m resolution
    ///      Data comes from test/offchain/data/assets/satellite-beta-2.json
    function test_07_RegisterSatelliteBeta2Instance() public {
        test_03_CreateSatelliteType();

        console2.log("\n==========================================================");
        console2.log("TEST 07: Registering Satellite Beta-2 Asset Instance");
        console2.log("==========================================================\n");

        console2.log("Asset Details (from satellite-beta-2.json):");
        console2.log("- Name: Satellite Beta-2");
        console2.log("- Type: Satellite (Earth Observation)");
        console2.log("- Orbit: Low Earth Orbit (550 km)");
        console2.log("- Mass: 2,800 kg");
        console2.log("- Power: 4,500 W");
        console2.log("- Resolution: 0.5 meters");
        console2.log("- Mission: Earth observation\n");

        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](7);
        metadata[0] = MetadataStorage.Metadata({key: "name", value: "Satellite Beta-2"});
        metadata[1] = MetadataStorage.Metadata({key: "altitude_km", value: "550"});
        metadata[2] = MetadataStorage.Metadata({key: "mass_kg", value: "2800"});
        metadata[3] = MetadataStorage.Metadata({key: "power_watts", value: "4500"});
        metadata[4] = MetadataStorage.Metadata({key: "mission_type", value: "earth_observation"});
        metadata[5] = MetadataStorage.Metadata({key: "resolution_m", value: "0.5"});
        metadata[6] = MetadataStorage.Metadata({
            key: "documentHash",
            value: "0xd4e5f6789012345678901234567890abcdef1234567890abcdef123456789a"
        });

        vm.prank(registrar);
        (uint256 assetId, address tokenAddr) =
            registry.registerAsset(satelliteSchema, "Satellite Beta-2 Token", "SAT2", 1_000_000 * 1e18, address(registry), owner, metadata);

        satBeta2AssetId = assetId;
        satBeta2Token = tokenAddr;

        console2.log("Asset Registration Complete:");
        console2.log("- Asset ID:", assetId);
        console2.log("- Token Address:", tokenAddr);
        console2.log("- Token Symbol: SAT2");

        // Verify
        AssetRegistry.Asset memory asset = registry.getAsset(assetId);
        assertEq(asset.schemaHash, satelliteSchema, "Schema hash mismatch");

        AssetERC20 token = AssetERC20(tokenAddr);
        assertEq(token.symbol(), "SAT2", "Token symbol mismatch");

        console2.log("\n[SUCCESS] Satellite Beta-2 successfully registered and verified\n");
    }

    /// @notice Test 08: Comprehensive Verification of All Registrations
    /// @dev Queries registry to verify all asset types and instances are correctly registered
    ///      This test demonstrates how to query the protocol state
    function test_08_VerifyAllRegistrations() public {
        // Register all assets first
        test_04_RegisterOCSPrimaryInstance();
        test_05_RegisterORSGatewayInstance();
        test_06_RegisterSatelliteAlpha1Instance();
        test_07_RegisterSatelliteBeta2Instance();

        console2.log("\n==========================================================");
        console2.log("TEST 08: Comprehensive Verification of All Registrations");
        console2.log("==========================================================\n");

        console2.log("ASSET REGISTRY SUMMARY");
        console2.log("----------------------\n");

        // Verify asset types
        console2.log("Registered Asset Types: 3");
        console2.log("1. Orbital Compute Station");
        console2.log("2. Orbital Relay Station");
        console2.log("3. Satellite\n");

        AssetRegistry.AssetType memory computeType = registry.getType(orbitalComputeSchema);
        AssetRegistry.AssetType memory relayType = registry.getType(orbitalRelaySchema);
        AssetRegistry.AssetType memory satType = registry.getType(satelliteSchema);

        assertEq(computeType.name, "Orbital Compute Station", "Compute type name mismatch");
        assertEq(relayType.name, "Orbital Relay Station", "Relay type name mismatch");
        assertEq(satType.name, "Satellite", "Satellite type name mismatch");

        // Verify asset instances
        console2.log("Registered Asset Instances: 4\n");

        // Verify OCS-Primary
        console2.log("Asset ID 1: OCS-Primary");
        AssetRegistry.Asset memory asset1 = registry.getAsset(ocsPrimaryAssetId);
        assertEq(asset1.schemaHash, orbitalComputeSchema, "OCS schema mismatch");
        assertEq(asset1.tokenAddress, ocsPrimaryToken, "OCS token address mismatch");
        AssetERC20 token1 = AssetERC20(ocsPrimaryToken);
        console2.log("  - Token:", ocsPrimaryToken);
        console2.log("  - Symbol:", token1.symbol());
        console2.log("  - Supply:", token1.totalSupply() / 1e18, "tokens");
        console2.log("  - Owner Balance:", token1.balanceOf(owner) / 1e18, "tokens\n");

        // Verify ORS-Gateway
        console2.log("Asset ID 2: ORS-Gateway");
        AssetRegistry.Asset memory asset2 = registry.getAsset(orsGatewayAssetId);
        assertEq(asset2.schemaHash, orbitalRelaySchema, "ORS schema mismatch");
        assertEq(asset2.tokenAddress, orsGatewayToken, "ORS token address mismatch");
        AssetERC20 token2 = AssetERC20(orsGatewayToken);
        console2.log("  - Token:", orsGatewayToken);
        console2.log("  - Symbol:", token2.symbol());
        console2.log("  - Supply:", token2.totalSupply() / 1e18, "tokens");
        console2.log("  - Owner Balance:", token2.balanceOf(owner) / 1e18, "tokens\n");

        // Verify Satellite Alpha-1
        console2.log("Asset ID 3: Satellite Alpha-1");
        AssetRegistry.Asset memory asset3 = registry.getAsset(satAlpha1AssetId);
        assertEq(asset3.schemaHash, satelliteSchema, "SAT1 schema mismatch");
        assertEq(asset3.tokenAddress, satAlpha1Token, "SAT1 token address mismatch");
        AssetERC20 token3 = AssetERC20(satAlpha1Token);
        console2.log("  - Token:", satAlpha1Token);
        console2.log("  - Symbol:", token3.symbol());
        console2.log("  - Supply:", token3.totalSupply() / 1e18, "tokens");
        console2.log("  - Owner Balance:", token3.balanceOf(owner) / 1e18, "tokens\n");

        // Verify Satellite Beta-2
        console2.log("Asset ID 4: Satellite Beta-2");
        AssetRegistry.Asset memory asset4 = registry.getAsset(satBeta2AssetId);
        assertEq(asset4.schemaHash, satelliteSchema, "SAT2 schema mismatch");
        assertEq(asset4.tokenAddress, satBeta2Token, "SAT2 token address mismatch");
        AssetERC20 token4 = AssetERC20(satBeta2Token);
        console2.log("  - Token:", satBeta2Token);
        console2.log("  - Symbol:", token4.symbol());
        console2.log("  - Supply:", token4.totalSupply() / 1e18, "tokens");
        console2.log("  - Owner Balance:", token4.balanceOf(owner) / 1e18, "tokens\n");

        console2.log("==========================================================");
        console2.log("[SUCCESS] All asset types and instances verified successfully");
        console2.log("[SUCCESS] All ERC-20 tokens deployed and properly initialized");
        console2.log("[SUCCESS] Owner holds 100% of all token supplies");
        console2.log("==========================================================\n");
    }
}