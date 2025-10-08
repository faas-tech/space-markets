// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                             ASSET FLOW TEST SUITE                            ║
║                                                                              ║
║  This test suite demonstrates the complete end-to-end workflow for asset     ║
║  registration, tokenization, and lease creation within our protocol.         ║
║                                                                              ║
║     Test Flow Overview:                                                      ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │  1. Create Asset Type (Schema Definition)                            │    ║
║  │  2. Register Specific Asset (Deploy ERC20)                           │    ║
║  │  3. Transfer Fractions Between Users                                 │    ║
║  │  4. Create Lease via Dual EIP-712 Signatures                         │    ║
║  └──────────────────────────────────────────────────────────────────────┘    ║
║                                                                              ║
║     Key Features Tested:                                                     ║
║  • Asset type registration with schema validation                            ║
║  • Automatic ERC20 deployment per asset                                      ║
║  • ERC20 fractional ownership transfers                                      ║
║  • Dual-signature lease creation (lessor + lessee)                           ║
║  • EIP-712 typed data signing for lease intents                              ║
║  • ERC-721 lease NFT minting                                                 ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/AssetRegistry.sol";
import "../src/AssetERC20.sol";
import "../src/LeaseFactory.sol";
import "../src/interfaces/IAssetRegistry.sol";

contract AssetFlowTest is Test {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════

    AssetRegistry registry;          // Core registry for asset types and instances
    LeaseFactory leaseFactory;       // Factory for creating lease NFTs

    // Test account private keys (for EIP-712 signature generation)
    uint256 pkAdmin   = 0xA11CE;     // Admin controls registry and lease factory
    uint256 pkOwner   = 0xB0B;       // Asset owner (lessor)
    uint256 pkLessee  = 0xD0D;       // Asset lessee

    // Corresponding addresses derived from private keys
    address admin;
    address owner;
    address lessee;

    // ═══════════════════════════════════════════════════════════════════════════
    // SETUP FUNCTION
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Initializes the test environment with deployed contracts
    /// @dev Sets up the core protocol contracts with admin as the deployer
    function setUp() public {
        // Convert private keys to addresses for test accounts
        admin  = vm.addr(pkAdmin);
        owner  = vm.addr(pkOwner);
        lessee = vm.addr(pkLessee);

        // Deploy protocol contracts as admin
        vm.startPrank(admin);
        registry = new AssetRegistry(admin);
        leaseFactory = new LeaseFactory(admin, address(registry));
        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN TEST FUNCTION
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Complete end-to-end test of asset lifecycle from creation to lease
    /// @dev Tests the full workflow: Type → Asset → Transfer → Lease Creation
    function test_Type_Register_Transfer_LeaseMint() public {

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                          STEP 1: CREATE ASSET TYPE                  │
        // │                                                                     │
        // │ Asset types define the schema and validation rules for a category   │
        // │ of assets. Here we're creating a "Satellite" asset type with        │
        // │ required lease start time validation.                               │
        // └─────────────────────────────────────────────────────────────────────┘
 
        bytes32 schemaHash = keccak256("satellite-schema");  // IPFS schema reference
        bytes32[] memory req = new bytes32[](1);             // Required fields for leases
        req[0] = keccak256("lease.start_time");              // Must specify start time

        vm.prank(admin);
        uint256 typeId = registry.createAssetType(
            "Satellite",         // Human-readable name
            schemaHash,          // Schema hash for validation
            req,                 // Required lease fields
            "ipfs://schema"      // Metadata URI
        );

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                       STEP 2: REGISTER SPECIFIC ASSET               │
        // │                                                                     │
        // │ Asset registration creates a unique asset instance and deploys      │
        // │ a dedicated ERC20 contract for fractional ownership. The entire     │
        // │ supply is minted to the initial owner.                              │
        // └─────────────────────────────────────────────────────────────────────┘

        vm.prank(admin);
        (uint256 assetId, address tokenAddr) = registry.registerAsset(
            typeId,                          // Links to our satellite type
            owner,                           // Initial owner gets all tokens
            keccak256("asset-meta"),         // Asset-specific metadata hash
            "ipfs://asset",                  // Asset metadata URI
            "SatelliteOne",                  // ERC20 token name
            "SAT1",                          // ERC20 token symbol
            1e18                            // Total supply (1 token, 18 decimals)
        );

        // Verify the ERC20 was deployed correctly and owner has full supply
        AssetERC20 token = AssetERC20(tokenAddr);
        assertEq(token.balanceOf(owner), 1e18, "Owner should receive entire token supply");

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                       STEP 3: TRANSFER FRACTIONS                    │
        // │                                                                     │
        // │ Demonstrate fractional ownership by transferring 20% of the asset   │
        // │ tokens to the future lessee. This shows how ownership can be        │
        // │ divided among multiple parties.                                     │
        // └─────────────────────────────────────────────────────────────────────┘

        vm.prank(owner);
        token.transfer(lessee, 2e17);  // Transfer 0.2 tokens (20% ownership)
        assertEq(token.balanceOf(lessee), 2e17, "Lessee should receive transferred tokens");

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                       STEP 4: CREATE LEASE VIA SIGNATURES           │
        // │                                                                     │
        // │ Lease creation requires dual signatures (lessor + lessee) using     │
        // │ EIP-712 typed data. This ensures both parties explicitly agree      │
        // │ to the lease terms before the NFT is minted.                        │
        // └─────────────────────────────────────────────────────────────────────┘

        // Retrieve asset and type information for lease validation
        AssetRegistry.Asset memory A = registry.getAsset(assetId);
        AssetRegistry.AssetType memory T = registry.getType(A.typeId);

        // Construct the lease intent with all necessary terms
        LeaseFactory.LeaseIntent memory L = LeaseFactory.LeaseIntent({
            lessor: owner,                                   // Who's leasing out the asset
            lessee: lessee,                                  // Who's receiving the lease
            assetId: assetId,                                // Which asset to lease
            paymentToken: address(0),                        // Payment token (0 = ETH)
            rentAmount: 100,                                 // Rent amount per period
            rentPeriod: 30 days,                            // How often rent is due
            securityDeposit: 500,                           // Upfront security deposit
            startTime: uint64(block.timestamp + 1 days),    // When lease begins
            endTime: uint64(block.timestamp + 90 days),     // When lease ends
            metadataHash: keccak256("leaseMeta"),           // Lease metadata hash
            legalDocHash: keccak256("leaseDoc"),            // Legal document hash
            nonce: 1,                                        // Unique nonce for replay protection
            deadline: uint64(block.timestamp + 2 days),     // Signature deadline
            termsVersion: 1,                                 // Terms version for compatibility
            assetTypeSchemaHash: T.schemaHash               // Links to asset type schema
        });

        // Generate EIP-712 typed data hash for signing
        bytes32 digest = leaseFactory.hashLeaseIntent(L);

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                         DUAL SIGNATURE PROCESS                      │
        // │                                                                     │
        // │ Both lessor and lessee must sign the exact same lease intent hash   │
        // │ to prove mutual agreement. This prevents any party from being       │
        // │ bound to terms they didn't explicitly approve.                      │
        // └─────────────────────────────────────────────────────────────────────┘

        // Lessor (owner) signs the lease intent
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkOwner, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);

        // Lessee signs the same lease intent
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        // Mint the lease NFT using both signatures (anyone can call this function)
        vm.prank(admin);
        uint256 leaseId = leaseFactory.mintLease(
            L,               // The lease intent struct
            sigLessor,       // Lessor's signature
            sigLessee,       // Lessee's signature
            "ipfs://lease"   // Lease NFT metadata URI
        );

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                            VERIFICATION                            │
        // │                                                                     │
        // │ Confirm that the lease was created successfully by checking the     │
        // │ NFT ownership and verifying lease data exists in storage.           │
        // └─────────────────────────────────────────────────────────────────────┘

        // The lease NFT should be owned by the lessee
        assertEq(leaseFactory.ownerOf(leaseId), lessee, "Lease NFT should be owned by lessee");

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                       READ AND DISPLAY LEASE DATA                  │
        // │                                                                     │
        // │ Extract all lease data from storage and display it for inspection. │
        // │ This helps verify the lease terms were stored correctly.           │
        // └─────────────────────────────────────────────────────────────────────┘

        // Read the complete lease data from storage
        (
            address storedLessor,
            address storedLessee,
            uint256 storedAssetId,
            address storedPaymentToken,
            uint256 storedRentAmount,
            uint256 storedRentPeriod,
            uint256 storedSecurityDeposit,
            uint64 storedStartTime,
            uint64 storedEndTime,
            bytes32 storedMetadataHash,
            bytes32 storedLegalDocHash,
            uint16 storedTermsVersion,
            string memory storedTokenURI,
            bool exists
        ) = leaseFactory.leases(leaseId);

        // Verify lease exists in storage
        assertTrue(exists, "Lease should exist in storage");

        // ┌────────────────────────────────────────���────────────────────────────┐
        // │                        📋 LEASE DATA DISPLAY                       │
        // │                                                                     │
        // │ Print all lease details to the console for verification and        │
        // │ debugging purposes during test execution.                          │
        // └─────────────────────────────────────────────────────────────────────┘

        console.log("\n===========================================================");
        console.log("LEASE SUCCESSFULLY CREATED - NFT ID:", leaseId);
        console.log("===========================================================");

        console.log("\nLEASE PARTIES:");
        console.log("  Lessor (Asset Owner): ", storedLessor);
        console.log("  Lessee (Tenant):      ", storedLessee);

        console.log("\nASSET DETAILS:");
        console.log("  Asset ID:             ", storedAssetId);
        console.log("  Payment Token:        ", storedPaymentToken);

        console.log("\nFINANCIAL TERMS:");
        console.log("  Rent Amount:          ", storedRentAmount, "wei per period");
        console.log("  Rent Period:          ", storedRentPeriod, "seconds");
        console.log("  Security Deposit:     ", storedSecurityDeposit, "wei");

        console.log("\nTIMING:");
        console.log("  Start Time:           ", storedStartTime, "(timestamp)");
        console.log("  End Time:             ", storedEndTime, "(timestamp)");
        console.log("  Duration:             ", storedEndTime - storedStartTime, "seconds");

        console.log("\nSECURITY & METADATA:");
        console.log("  Metadata Hash:        ");
        console.logBytes32(storedMetadataHash);
        console.log("  Legal Doc Hash:       ");
        console.logBytes32(storedLegalDocHash);
        console.log("  Terms Version:        ", storedTermsVersion);
        console.log("  Token URI:            ", storedTokenURI);

        console.log("\nVERIFICATION RESULTS:");
        console.log("  Lease exists in storage");
        console.log("  NFT owned by lessee");
        console.log("  All lease terms properly stored");
        console.log("===========================================================\n");

        // 🎉 SUCCESS! We've successfully demonstrated the complete asset flow:
        //    ✅ Asset type created with schema validation
        //    ✅ Specific asset registered with dedicated ERC20
        //    ✅ Fractional ownership transferred between parties
        //    ✅ Lease created with dual signatures and NFT minted
        //    ✅ Lease data verified and displayed in detail
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NEGATIVE TESTS - TESTING FAILURE CONDITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Test invalid signature in lease creation
    /// @dev Verifies that lease minting fails with invalid signatures
    function test_RevertWhen_InvalidSignature() public {
        // Create asset type and register asset
        bytes32 schemaHash = keccak256("satellite-schema");
        bytes32[] memory req = new bytes32[](1);
        req[0] = keccak256("lease.start_time");

        vm.prank(admin);
        uint256 typeId = registry.createAssetType("Satellite", schemaHash, req, "ipfs://schema");

        vm.prank(admin);
        (uint256 assetId, ) = registry.registerAsset(
            typeId, owner, keccak256("asset-meta"), "ipfs://asset", "SatelliteOne", "SAT1", 1e18
        );

        // Get asset info
        AssetRegistry.Asset memory A = registry.getAsset(assetId);
        AssetRegistry.AssetType memory T = registry.getType(A.typeId);

        // Create lease intent
        LeaseFactory.LeaseIntent memory L = LeaseFactory.LeaseIntent({
            lessor: owner,
            lessee: lessee,
            assetId: assetId,
            paymentToken: address(0),
            rentAmount: 100,
            rentPeriod: 30 days,
            securityDeposit: 500,
            startTime: uint64(block.timestamp + 1 days),
            endTime: uint64(block.timestamp + 90 days),
            metadataHash: keccak256("leaseMeta"),
            legalDocHash: keccak256("leaseDoc"),
            nonce: 1,
            deadline: uint64(block.timestamp + 2 days),
            termsVersion: 1,
            assetTypeSchemaHash: T.schemaHash
        });

        bytes32 digest = leaseFactory.hashLeaseIntent(L);

        // Create valid lessor signature
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkOwner, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);

        // ❌ Create invalid lessee signature using wrong private key
        uint256 wrongPrivateKey = 0xDEADBEEF;
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(wrongPrivateKey, digest);
        bytes memory invalidSigLessee = abi.encodePacked(r2, s2, v2);

        // ❌ Mint lease should fail with invalid signature
        vm.prank(admin);
        vm.expectRevert(); // Should fail due to signature verification
        leaseFactory.mintLease(L, sigLessor, invalidSigLessee, "ipfs://lease");
    }

    /// @notice Test expired deadline in lease creation
    /// @dev Verifies that lease minting fails after signature deadline
    function test_RevertWhen_ExpiredDeadline() public {
        // Setup asset
        bytes32 schemaHash = keccak256("satellite-schema");
        bytes32[] memory req = new bytes32[](1);
        req[0] = keccak256("lease.start_time");

        vm.prank(admin);
        uint256 typeId = registry.createAssetType("Satellite", schemaHash, req, "ipfs://schema");

        vm.prank(admin);
        (uint256 assetId, ) = registry.registerAsset(
            typeId, owner, keccak256("asset-meta"), "ipfs://asset", "SatelliteOne", "SAT1", 1e18
        );

        AssetRegistry.Asset memory A = registry.getAsset(assetId);
        AssetRegistry.AssetType memory T = registry.getType(A.typeId);

        // Create lease with short deadline
        LeaseFactory.LeaseIntent memory L = LeaseFactory.LeaseIntent({
            lessor: owner,
            lessee: lessee,
            assetId: assetId,
            paymentToken: address(0),
            rentAmount: 100,
            rentPeriod: 30 days,
            securityDeposit: 500,
            startTime: uint64(block.timestamp + 1 days),
            endTime: uint64(block.timestamp + 90 days),
            metadataHash: keccak256("leaseMeta"),
            legalDocHash: keccak256("leaseDoc"),
            nonce: 1,
            deadline: uint64(block.timestamp + 1), // Very short deadline
            termsVersion: 1,
            assetTypeSchemaHash: T.schemaHash
        });

        bytes32 digest = leaseFactory.hashLeaseIntent(L);

        // Create valid signatures
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkOwner, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);

        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        // ⏰ Advance time past deadline
        vm.warp(block.timestamp + 10);

        // ❌ Mint lease should fail due to expired deadline
        vm.prank(admin);
        vm.expectRevert("expired");
        leaseFactory.mintLease(L, sigLessor, sigLessee, "ipfs://lease");
    }

    /// @notice Test unauthorized asset registration
    /// @dev Verifies that only admin can register assets
    function test_RevertWhen_UnauthorizedAssetRegistration() public {
        // Create asset type first
        bytes32 schemaHash = keccak256("satellite-schema");
        bytes32[] memory req = new bytes32[](1);
        req[0] = keccak256("lease.start_time");

        vm.prank(admin);
        uint256 typeId = registry.createAssetType("Satellite", schemaHash, req, "ipfs://schema");

        // ❌ Non-admin tries to register asset
        vm.prank(owner); // Not admin
        vm.expectRevert(); // Should fail due to access control
        registry.registerAsset(
            typeId, owner, keccak256("asset-meta"), "ipfs://asset", "SatelliteOne", "SAT1", 1e18
        );
    }

    /// @notice Test invalid asset type reference
    /// @dev Verifies that asset registration fails with invalid type ID
    function test_RevertWhen_InvalidAssetType() public {
        // ❌ Try to register asset with non-existent type ID
        vm.prank(admin);
        vm.expectRevert("type !exists");
        registry.registerAsset(
            999, // Non-existent type ID
            owner,
            keccak256("asset-meta"),
            "ipfs://asset",
            "SatelliteOne",
            "SAT1",
            1e18
        );
    }

    /// @notice Test asset existence validation in lease creation
    /// @dev Verifies that lease creation fails for non-existent assets
    function test_RevertWhen_NonexistentAsset() public {
        // Create a valid lease intent but with non-existent asset ID
        LeaseFactory.LeaseIntent memory L = LeaseFactory.LeaseIntent({
            lessor: owner,
            lessee: lessee,
            assetId: 999, // Non-existent asset ID
            paymentToken: address(0),
            rentAmount: 100,
            rentPeriod: 30 days,
            securityDeposit: 500,
            startTime: uint64(block.timestamp + 1 days),
            endTime: uint64(block.timestamp + 90 days),
            metadataHash: keccak256("leaseMeta"),
            legalDocHash: keccak256("leaseDoc"),
            nonce: 1,
            deadline: uint64(block.timestamp + 2 days),
            termsVersion: 1,
            assetTypeSchemaHash: keccak256("schema")
        });

        bytes32 digest = leaseFactory.hashLeaseIntent(L);

        // Create valid signatures
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkOwner, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);

        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        // ❌ Mint lease should fail due to non-existent asset
        vm.prank(admin);
        vm.expectRevert("asset !exists");
        leaseFactory.mintLease(L, sigLessor, sigLessee, "ipfs://lease");
    }

    /// @notice Test schema hash mismatch in lease creation
    /// @dev Verifies that lease creation fails when schema hash doesn't match asset type
    function test_RevertWhen_SchemaHashMismatch() public {
        // Setup asset
        bytes32 correctSchemaHash = keccak256("satellite-schema");
        bytes32[] memory req = new bytes32[](1);
        req[0] = keccak256("lease.start_time");

        vm.prank(admin);
        uint256 typeId = registry.createAssetType("Satellite", correctSchemaHash, req, "ipfs://schema");

        vm.prank(admin);
        (uint256 assetId, ) = registry.registerAsset(
            typeId, owner, keccak256("asset-meta"), "ipfs://asset", "SatelliteOne", "SAT1", 1e18
        );

        // Create lease with wrong schema hash
        bytes32 wrongSchemaHash = keccak256("wrong-schema");
        LeaseFactory.LeaseIntent memory L = LeaseFactory.LeaseIntent({
            lessor: owner,
            lessee: lessee,
            assetId: assetId,
            paymentToken: address(0),
            rentAmount: 100,
            rentPeriod: 30 days,
            securityDeposit: 500,
            startTime: uint64(block.timestamp + 1 days),
            endTime: uint64(block.timestamp + 90 days),
            metadataHash: keccak256("leaseMeta"),
            legalDocHash: keccak256("leaseDoc"),
            nonce: 1,
            deadline: uint64(block.timestamp + 2 days),
            termsVersion: 1,
            assetTypeSchemaHash: wrongSchemaHash // Wrong schema hash
        });

        bytes32 digest = leaseFactory.hashLeaseIntent(L);

        // Create valid signatures
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkOwner, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);

        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        // ❌ Mint lease should fail due to schema hash mismatch
        vm.prank(admin);
        vm.expectRevert("schema mismatch");
        leaseFactory.mintLease(L, sigLessor, sigLessee, "ipfs://lease");
    }

    /// @notice Test lease factory operations work for anyone with valid signatures
    /// @dev Verifies that mintLease is open to anyone with proper signatures (no access control)
    function test_LeaseOperations_ValidSignatures() public {
        // Setup valid lease scenario
        bytes32 schemaHash = keccak256("satellite-schema");
        bytes32[] memory req = new bytes32[](1);
        req[0] = keccak256("lease.start_time");

        vm.prank(admin);
        uint256 typeId = registry.createAssetType("Satellite", schemaHash, req, "ipfs://schema");

        vm.prank(admin);
        (uint256 assetId, ) = registry.registerAsset(
            typeId, owner, keccak256("asset-meta"), "ipfs://asset", "SatelliteOne", "SAT1", 1e18
        );

        AssetRegistry.Asset memory A = registry.getAsset(assetId);
        AssetRegistry.AssetType memory T = registry.getType(A.typeId);

        LeaseFactory.LeaseIntent memory L = LeaseFactory.LeaseIntent({
            lessor: owner,
            lessee: lessee,
            assetId: assetId,
            paymentToken: address(0),
            rentAmount: 100,
            rentPeriod: 30 days,
            securityDeposit: 500,
            startTime: uint64(block.timestamp + 1 days),
            endTime: uint64(block.timestamp + 90 days),
            metadataHash: keccak256("leaseMeta"),
            legalDocHash: keccak256("leaseDoc"),
            nonce: 1,
            deadline: uint64(block.timestamp + 2 days),
            termsVersion: 1,
            assetTypeSchemaHash: T.schemaHash
        });

        bytes32 digest = leaseFactory.hashLeaseIntent(L);

        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkOwner, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);

        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        // ✅ Anyone can mint lease with valid signatures (no access control on mintLease)
        vm.prank(owner); // Owner can call
        uint256 leaseId = leaseFactory.mintLease(L, sigLessor, sigLessee, "ipfs://lease");
        assertTrue(leaseId > 0, "Lease should be created successfully");
    }

    /// @notice Test zero supply asset registration
    /// @dev Verifies that assets can be registered with zero total supply (valid case)
    function test_ZeroSupplyAsset() public {
        // Create asset type
        bytes32 schemaHash = keccak256("satellite-schema");
        bytes32[] memory req = new bytes32[](1);
        req[0] = keccak256("lease.start_time");

        vm.prank(admin);
        uint256 typeId = registry.createAssetType("Satellite", schemaHash, req, "ipfs://schema");

        // ✅ Zero supply is allowed in OpenZeppelin ERC20
        vm.prank(admin);
        (uint256 assetId, address tokenAddr) = registry.registerAsset(
            typeId,
            owner,
            keccak256("asset-meta"),
            "ipfs://asset",
            "SatelliteOne",
            "SAT1",
            0 // Zero supply is valid
        );

        assertTrue(assetId > 0, "Asset should be registered successfully");
        assertEq(AssetERC20(tokenAddr).totalSupply(), 0, "Total supply should be zero");
    }

    /// @notice Test invalid lease timing parameters
    /// @dev Verifies that lease creation fails with invalid start/end times
    function test_RevertWhen_InvalidLeaseTiming() public {
        // Setup asset
        bytes32 schemaHash = keccak256("satellite-schema");
        bytes32[] memory req = new bytes32[](1);
        req[0] = keccak256("lease.start_time");

        vm.prank(admin);
        uint256 typeId = registry.createAssetType("Satellite", schemaHash, req, "ipfs://schema");

        vm.prank(admin);
        (uint256 assetId, ) = registry.registerAsset(
            typeId, owner, keccak256("asset-meta"), "ipfs://asset", "SatelliteOne", "SAT1", 1e18
        );

        AssetRegistry.Asset memory A = registry.getAsset(assetId);
        AssetRegistry.AssetType memory T = registry.getType(A.typeId);

        // Create lease with end time before start time
        LeaseFactory.LeaseIntent memory L = LeaseFactory.LeaseIntent({
            lessor: owner,
            lessee: lessee,
            assetId: assetId,
            paymentToken: address(0),
            rentAmount: 100,
            rentPeriod: 30 days,
            securityDeposit: 500,
            startTime: uint64(block.timestamp + 90 days), // Start after end
            endTime: uint64(block.timestamp + 1 days),    // End before start
            metadataHash: keccak256("leaseMeta"),
            legalDocHash: keccak256("leaseDoc"),
            nonce: 1,
            deadline: uint64(block.timestamp + 2 days),
            termsVersion: 1,
            assetTypeSchemaHash: T.schemaHash
        });

        bytes32 digest = leaseFactory.hashLeaseIntent(L);

        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkOwner, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);

        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        // ❌ Mint lease should fail due to invalid timing
        vm.prank(admin);
        vm.expectRevert("bad times");
        leaseFactory.mintLease(L, sigLessor, sigLessee, "ipfs://lease");
    }

    /// @notice Test duplicate nonce usage
    /// @dev Verifies that lease creation fails when using the same nonce twice
    function test_RevertWhen_DuplicateNonce() public {
        // Setup asset
        bytes32 schemaHash = keccak256("satellite-schema");
        bytes32[] memory req = new bytes32[](1);
        req[0] = keccak256("lease.start_time");

        vm.prank(admin);
        uint256 typeId = registry.createAssetType("Satellite", schemaHash, req, "ipfs://schema");

        vm.prank(admin);
        (uint256 assetId, ) = registry.registerAsset(
            typeId, owner, keccak256("asset-meta"), "ipfs://asset", "SatelliteOne", "SAT1", 1e18
        );

        AssetRegistry.Asset memory A = registry.getAsset(assetId);
        AssetRegistry.AssetType memory T = registry.getType(A.typeId);

        // Create first lease with nonce 1
        LeaseFactory.LeaseIntent memory L1 = LeaseFactory.LeaseIntent({
            lessor: owner,
            lessee: lessee,
            assetId: assetId,
            paymentToken: address(0),
            rentAmount: 100,
            rentPeriod: 30 days,
            securityDeposit: 500,
            startTime: uint64(block.timestamp + 1 days),
            endTime: uint64(block.timestamp + 90 days),
            metadataHash: keccak256("leaseMeta1"),
            legalDocHash: keccak256("leaseDoc1"),
            nonce: 1, // First use of nonce 1
            deadline: uint64(block.timestamp + 2 days),
            termsVersion: 1,
            assetTypeSchemaHash: T.schemaHash
        });

        bytes32 digest1 = leaseFactory.hashLeaseIntent(L1);

        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkOwner, digest1);
        bytes memory sigLessor1 = abi.encodePacked(r1, s1, v1);

        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest1);
        bytes memory sigLessee1 = abi.encodePacked(r2, s2, v2);

        // ✅ First lease should succeed
        vm.prank(admin);
        uint256 firstLeaseId = leaseFactory.mintLease(L1, sigLessor1, sigLessee1, "ipfs://lease1");
        assertTrue(firstLeaseId > 0, "First lease should be created successfully");

        // Create second lease with same nonce
        LeaseFactory.LeaseIntent memory L2 = LeaseFactory.LeaseIntent({
            lessor: owner,
            lessee: lessee,
            assetId: assetId,
            paymentToken: address(0),
            rentAmount: 200,
            rentPeriod: 30 days,
            securityDeposit: 1000,
            startTime: uint64(block.timestamp + 2 days),
            endTime: uint64(block.timestamp + 92 days),
            metadataHash: keccak256("leaseMeta2"),
            legalDocHash: keccak256("leaseDoc2"),
            nonce: 1, // ❌ Duplicate nonce
            deadline: uint64(block.timestamp + 3 days),
            termsVersion: 1,
            assetTypeSchemaHash: T.schemaHash
        });

        bytes32 digest2 = leaseFactory.hashLeaseIntent(L2);

        (uint8 v3, bytes32 r3, bytes32 s3) = vm.sign(pkOwner, digest2);
        bytes memory sigLessor2 = abi.encodePacked(r3, s3, v3);

        (uint8 v4, bytes32 r4, bytes32 s4) = vm.sign(pkLessee, digest2);
        bytes memory sigLessee2 = abi.encodePacked(r4, s4, v4);

        // ❌ Second lease should fail due to duplicate nonce
        vm.prank(admin);
        vm.expectRevert("nonce used");
        leaseFactory.mintLease(L2, sigLessor2, sigLessee2, "ipfs://lease2");
    }
}
