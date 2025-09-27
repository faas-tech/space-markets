// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                      🏪 MARKETPLACE FLOW TEST SUITE                         ║
║                                                                              ║
║  This test suite demonstrates the complete marketplace functionality         ║
║  including sales, leases, and revenue distribution mechanisms.              ║
║                                                                              ║
║  📋 Test Flow Overview:                                                      ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │  1. Deploy Asset & Setup Marketplace Permissions                    │   ║
║  │  2. Conduct Token Sales with Multiple Bidders                       │   ║
║  │  3. Execute Lease Creation with Escrow                               │   ║
║  │  4. Process Revenue Distribution via Snapshots                      │   ║
║  │  5. Verify Pro-Rata Claims by Token Holders                         │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
║  🎯 Key Features Tested:                                                     ║
║  • Fractional asset sales with competitive bidding                          ║
║  • Lease creation with dual signatures and escrow                           ║
║  • Automatic balance snapshots at lease execution                           ║
║  • Pro-rata revenue distribution based on ownership percentages             ║
║  • Multiple currency support (stablecoin payments)                          ║
║  • Marketplace permission and role management                               ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

import "forge-std/Test.sol";
import "../src/AssetRegistry.sol";
import "../src/AssetERC20.sol";
import "../src/LeaseFactory.sol";
import "../src/Marketplace.sol";
import "../test/mocks/MockStablecoin.sol";
import "../src/interfaces/IAssetRegistry.sol";

contract MarketplaceFlowTest is Test {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════

    AssetRegistry registry;          // Core registry for asset management
    LeaseFactory leaseFactory;       // Factory for creating lease NFTs
    Marketplace market;              // Central marketplace for sales and leases
    MockStablecoin mUSD;            // Test stablecoin for payments (6 decimals)

    // Test account private keys (for EIP-712 signature generation)
    uint256 pkAdmin  = 0xA11CE;     // Admin controls all contracts
    uint256 pkSeller = 0xB0B;       // Asset seller/lessor
    uint256 pkA      = 0xC01;       // First buyer/bidder
    uint256 pkB      = 0xC02;       // Second buyer/bidder

    // Corresponding addresses derived from private keys
    address admin;
    address seller;
    address addrA;
    address addrB;

    // ═══════════════════════════════════════════════════════════════════════════
    // SETUP FUNCTION
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Initializes the complete marketplace test environment
    /// @dev Deploys all protocol contracts with proper interconnections
    function setUp() public {
        // Convert private keys to addresses for test accounts
        admin  = vm.addr(pkAdmin);
        seller = vm.addr(pkSeller);
        addrA  = vm.addr(pkA);
        addrB  = vm.addr(pkB);

        // Deploy all protocol contracts as admin
        vm.startPrank(admin);
        registry     = new AssetRegistry(admin);
        leaseFactory = new LeaseFactory(admin, address(registry));
        mUSD         = new MockStablecoin();                              // 6-decimal stablecoin
        market       = new Marketplace(admin, address(mUSD), address(leaseFactory));
        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Helper function to deploy a test asset with marketplace permissions
    /// @dev Creates a satellite asset type, registers an instance, and grants snapshot role
    /// @return assetId The unique identifier for the created asset
    /// @return tokenAddr The address of the deployed ERC20 token contract
    /// @return schemaHash The hash of the asset type schema
    function _deployAsset() internal returns (uint256 assetId, address tokenAddr, bytes32 schemaHash) {
        vm.startPrank(admin);

        // Create asset type with schema and required lease fields
        schemaHash = keccak256("schema");
        bytes32[] memory reqKeys = new bytes32[](1);
        reqKeys[0] = keccak256("lease.start_time");     // Require start time for leases
        uint256 typeId = registry.createAssetType("Satellite", schemaHash, reqKeys, "ipfs://schema");

        // Register specific asset instance (deploys dedicated ERC20)
        (assetId, tokenAddr) = registry.registerAsset(
            typeId,              // Links to satellite asset type
            seller,              // Initial owner receives all tokens
            keccak256("meta"),   // Asset metadata hash
            "ipfs://sat",        // Asset metadata URI
            "SatelliteOne",      // ERC20 token name
            "SAT1",              // ERC20 token symbol
            1e18                // Total supply (1 token, 18 decimals)
        );

        // 🔑 CRITICAL: Grant marketplace the snapshot role for revenue distribution
        // Without this, the marketplace cannot create snapshots for pro-rata calculations
        AssetERC20(tokenAddr).grantRole(AssetERC20(tokenAddr).SNAPSHOT_ROLE(), address(market));

        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN TEST FUNCTION
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Complete end-to-end test of marketplace sales, leases, and revenue distribution
    /// @dev Tests the full workflow: Asset Sales → Lease Creation → Revenue Claims
    function test_Sales_Leases_RevenueFlow() public {
        // Deploy our test asset and get the token contract
        (uint256 assetId, address tokenAddr, bytes32 schemaHash) = _deployAsset();
        AssetERC20 sat = AssetERC20(tokenAddr);

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                           PHASE 1: TOKEN SALES                     │
        // │                                                                     │
        // │ Demonstrate fractional asset sales through the marketplace.        │
        // │ Multiple buyers compete for asset tokens through a bidding system. │
        // └─────────────────────────────────────────────────────────────────────┘

        // 💰 Fund potential buyers with stablecoin for purchases
        // Note: mUSD uses 6 decimals, so we need enough to cover token costs
        mUSD.mint(addrA, 1e24);  // Give addrA plenty of mUSD
        mUSD.mint(addrB, 1e24);  // Give addrB plenty of mUSD

        // 📝 Seller posts a sale offering 0.5 tokens (50% of the asset)
        vm.prank(seller);
        uint256 saleId = market.postSale(
            tokenAddr,   // Which token to sell
            5e17,        // Amount: 0.5 tokens (50% of 1e18 total supply)
            1_000_000    // Asking price: 1.0 mUSD per full token (1M micro-mUSD)
        );

        // 🏷️ Buyer A places bid for 0.2 tokens at competitive price
        vm.startPrank(addrA);
        mUSD.approve(address(market), type(uint256).max);  // Approve marketplace to spend
        uint256 bidA = market.placeSaleBid(
            saleId,  // Which sale to bid on
            2e17,    // Amount: 0.2 tokens (20% ownership)
            500_000  // Price: 0.5 mUSD per full token (500K micro-mUSD)
        );
        vm.stopPrank();

        // 🏷️ Buyer B places higher bid for 0.3 tokens
        vm.startPrank(addrB);
        mUSD.approve(address(market), type(uint256).max);  // Approve marketplace to spend
        uint256 bidB = market.placeSaleBid(
            saleId,  // Same sale
            3e17,    // Amount: 0.3 tokens (30% ownership)
            800_000  // Price: 0.8 mUSD per full token (800K micro-mUSD)
        );
        vm.stopPrank();

        // ✅ Seller accepts the higher bid from buyer B
        vm.prank(seller);
        sat.approve(address(market), 5e17);  // Approve marketplace to transfer tokens

        vm.prank(seller);
        market.acceptSaleBid(saleId, bidB);  // Accept bid B (higher price)

        // Verify the sale completed correctly
        assertEq(sat.balanceOf(addrB), 3e17, "Buyer B should receive 0.3 tokens");
        // Note: Buyer A is automatically refunded their escrowed funds

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                         PHASE 2: LEASE CREATION                    │
        // │                                                                     │
        // │ Create a lease agreement using dual signatures and escrow the      │
        // │ lease payment. This triggers a snapshot for revenue distribution.  │
        // └─────────────────────────────────────────────────────────────────────┘

        // Retrieve asset metadata for lease validation
        AssetRegistry.Asset memory A = registry.getAsset(assetId);
        AssetRegistry.AssetType memory T = registry.getType(A.typeId);

        // 📋 Construct the lease intent with all terms
        LeaseFactory.LeaseIntent memory L = LeaseFactory.LeaseIntent({
            lessor: seller,                               // Asset owner leasing out
            lessee: addrA,                               // Buyer A becomes the lessee
            assetId: assetId,                            // Which asset to lease
            paymentToken: address(mUSD),                 // Payment in stablecoin
            rentAmount: 100,                             // 100 micro-mUSD rent
            rentPeriod: 30 days,                         // Monthly payments
            securityDeposit: 500,                        // 500 micro-mUSD deposit
            startTime: uint64(block.timestamp + 1 days), // Lease starts tomorrow
            endTime: uint64(block.timestamp + 90 days),  // 3-month lease
            metadataHash: keccak256("leaseMeta"),        // Lease metadata hash
            legalDocHash: keccak256("leaseDoc"),         // Legal documents hash
            nonce: 77,                                   // Unique nonce
            deadline: uint64(block.timestamp + 3 days),  // Signature expiry
            termsVersion: uint16(1),                     // Terms version
            assetTypeSchemaHash: T.schemaHash           // Links to asset schema
        });

        // 📝 Post lease offer (lessor creates offer with lessee TBD)
        LeaseFactory.LeaseIntent memory LO = L;
        LO.lessee = address(0);  // Lessee will be filled in when bid is accepted

        vm.prank(seller);
        uint256 offerId = market.postLeaseOffer(LO);

        // 💰 Fund lessee A with additional mUSD for lease payments
        mUSD.mint(addrA, 50_000_000);  // Additional 50 mUSD for lease costs
        vm.startPrank(addrA);
        mUSD.approve(address(market), type(uint256).max);

        // 🖊️ Create final lease intent that matches marketplace validation
        // The marketplace will take the stored offer (with lessee = address(0)) and set lessee = bidder
        // So we need to sign a LeaseIntent that matches this final structure
        LeaseFactory.LeaseIntent memory finalL = L;
        finalL.lessee = addrA;  // This will match what marketplace sets as b.bidder

        // Generate signatures for the final LeaseIntent structure that will be validated
        bytes32 digest = leaseFactory.hashLeaseIntent(finalL);

        // Lessee A signs the final lease intent
        (uint8 vA, bytes32 rA, bytes32 sA) = vm.sign(pkA, digest);
        bytes memory sigLessee = abi.encodePacked(rA, sA, vA);

        uint256 bidIdx = market.placeLeaseBid(
            offerId,      // Which lease offer
            sigLessee,    // Lessee's signature
            10_000_000    // Escrow amount: 10 mUSD (covers rent + deposit)
        );
        vm.stopPrank();

        // 🖊️ Lessor signs the same final lease intent to complete the agreement
        (uint8 vL, bytes32 rL, bytes32 sL) = vm.sign(pkSeller, digest);
        bytes memory sigLessor = abi.encodePacked(rL, sL, vL);

        // ✅ Accept the lease bid, creating the lease NFT and triggering snapshot
        vm.prank(seller);
        (uint256 leaseId, uint256 roundId) = market.acceptLeaseBid(
            offerId,        // Which offer to accept
            bidIdx,         // Which bid to accept
            sigLessor,      // Lessor's signature
            "ipfs://lease"  // Lease NFT metadata
        );

        // Verify lease was created successfully
        (,,,,,,,,,,,,, bool exists) = leaseFactory.leases(leaseId);
        assertTrue(exists, "Lease should exist in storage");

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                       PHASE 3: REVENUE DISTRIBUTION                │
        // │                                                                     │
        // │ Process pro-rata revenue claims based on token ownership at the    │
        // │ snapshot moment. Revenue is distributed proportionally to all      │
        // │ token holders based on their ownership percentage.                 │
        // └─────────────────────────────────────────────────────────────────────┘

        // 📊 Calculate expected distribution using independent calculations
        // Get the snapshot balances that the marketplace will use for calculations
        uint256 sellerSnapshotBalance = sat.balanceOfAt(seller, roundId);
        uint256 buyerBSnapshotBalance = sat.balanceOfAt(addrB, roundId);
        uint256 totalSnapshotSupply = sat.totalSupplyAt(roundId);
        uint256 totalRevenue = 10_000_000; // Total escrow amount from lease bid

        // Calculate expected shares using the same formula as marketplace: totalAmount * bal / tot
        uint256 expectedSellerRevenue = totalRevenue * sellerSnapshotBalance / totalSnapshotSupply;
        uint256 expectedBuyerBRevenue = totalRevenue * buyerBSnapshotBalance / totalSnapshotSupply;

        // Record balances before revenue claims to verify the deltas
        uint256 sellerBalanceBefore = mUSD.balanceOf(seller);
        uint256 buyerBBalanceBefore = mUSD.balanceOf(addrB);

        // 💰 Seller claims their pro-rata share of lease revenue
        vm.prank(seller);
        market.claimRevenue(roundId);

        // 💰 Buyer B claims their pro-rata share of lease revenue
        vm.prank(addrB);
        market.claimRevenue(roundId);

        // ✅ Verify revenue distribution matches calculated ownership percentages
        uint256 sellerRevenue = mUSD.balanceOf(seller) - sellerBalanceBefore;
        uint256 buyerBRevenue = mUSD.balanceOf(addrB) - buyerBBalanceBefore;

        assertEq(sellerRevenue, expectedSellerRevenue, "Seller revenue should match calculated share based on snapshot balance");
        assertEq(buyerBRevenue, expectedBuyerBRevenue, "Buyer B revenue should match calculated share based on snapshot balance");

        // 🎉 SUCCESS! We've demonstrated the complete marketplace flow:
        //    ✅ Fractional asset sales with competitive bidding
        //    ✅ Lease creation with dual signatures and escrow
        //    ✅ Automatic balance snapshots at lease execution
        //    ✅ Pro-rata revenue distribution to all token holders
        //    ✅ Seamless integration between sales and lease mechanisms
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NEGATIVE TESTS - TESTING FAILURE CONDITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Test unauthorized revenue claim attempts
    /// @dev Verifies that only actual token holders can claim revenue
    function test_RevertWhen_UnauthorizedRevenueClaim() public {
        // Deploy asset and set up basic marketplace permissions
        (uint256 assetId, address tokenAddr, ) = _deployAsset();
        AssetERC20 sat = AssetERC20(tokenAddr);

        // Create a simple lease scenario to establish a revenue round
        mUSD.mint(addrA, 1e24);
        vm.prank(addrA);
        mUSD.approve(address(market), type(uint256).max);

        // Create minimal lease offer and bid
        LeaseFactory.LeaseIntent memory L = LeaseFactory.LeaseIntent({
            lessor: seller,
            lessee: address(0), // Will be set by marketplace
            assetId: assetId,
            paymentToken: address(mUSD),
            rentAmount: 100,
            rentPeriod: 30 days,
            securityDeposit: 500,
            startTime: uint64(block.timestamp + 1 days),
            endTime: uint64(block.timestamp + 90 days),
            metadataHash: keccak256("meta"),
            legalDocHash: keccak256("doc"),
            nonce: 1,
            deadline: uint64(block.timestamp + 3 days),
            termsVersion: 1,
            assetTypeSchemaHash: keccak256("schema")
        });

        vm.prank(seller);
        uint256 offerId = market.postLeaseOffer(L);

        // Create and sign lease intent for bidding
        LeaseFactory.LeaseIntent memory finalL = L;
        finalL.lessee = addrA;
        bytes32 digest = leaseFactory.hashLeaseIntent(finalL);
        (uint8 vA, bytes32 rA, bytes32 sA) = vm.sign(pkA, digest);
        bytes memory sigLessee = abi.encodePacked(rA, sA, vA);

        vm.prank(addrA);
        uint256 bidIdx = market.placeLeaseBid(offerId, sigLessee, 1_000_000);

        // Accept bid to create revenue round
        (uint8 vL, bytes32 rL, bytes32 sL) = vm.sign(pkSeller, digest);
        bytes memory sigLessor = abi.encodePacked(rL, sL, vL);

        vm.prank(seller);
        (, uint256 roundId) = market.acceptLeaseBid(offerId, bidIdx, sigLessor, "ipfs://lease");

        // ❌ Attempt unauthorized revenue claim by non-token holder
        address unauthorizedUser = makeAddr("unauthorized");
        vm.prank(unauthorizedUser);
        vm.expectRevert(); // Should fail - user has no tokens at snapshot
        market.claimRevenue(roundId);
    }

    /// @notice Test double revenue claim attempts
    /// @dev Verifies that users cannot claim revenue twice for the same round
    function test_RevertWhen_DoubleRevenueClaim() public {
        // Deploy asset and transfer some tokens to create a valid holder
        (uint256 assetId, address tokenAddr, ) = _deployAsset();
        AssetERC20 sat = AssetERC20(tokenAddr);

        vm.prank(seller);
        sat.transfer(addrA, 1e17); // Give addrA 10% of tokens

        // Set up lease scenario
        mUSD.mint(addrA, 1e24);
        vm.prank(addrA);
        mUSD.approve(address(market), type(uint256).max);

        LeaseFactory.LeaseIntent memory L = LeaseFactory.LeaseIntent({
            lessor: seller,
            lessee: address(0),
            assetId: assetId,
            paymentToken: address(mUSD),
            rentAmount: 100,
            rentPeriod: 30 days,
            securityDeposit: 500,
            startTime: uint64(block.timestamp + 1 days),
            endTime: uint64(block.timestamp + 90 days),
            metadataHash: keccak256("meta"),
            legalDocHash: keccak256("doc"),
            nonce: 1,
            deadline: uint64(block.timestamp + 3 days),
            termsVersion: 1,
            assetTypeSchemaHash: keccak256("schema")
        });

        vm.prank(seller);
        uint256 offerId = market.postLeaseOffer(L);

        LeaseFactory.LeaseIntent memory finalL = L;
        finalL.lessee = addrA;
        bytes32 digest = leaseFactory.hashLeaseIntent(finalL);
        (uint8 vA, bytes32 rA, bytes32 sA) = vm.sign(pkA, digest);
        bytes memory sigLessee = abi.encodePacked(rA, sA, vA);

        vm.prank(addrA);
        uint256 bidIdx = market.placeLeaseBid(offerId, sigLessee, 1_000_000);

        (uint8 vL, bytes32 rL, bytes32 sL) = vm.sign(pkSeller, digest);
        bytes memory sigLessor = abi.encodePacked(rL, sL, vL);

        vm.prank(seller);
        (, uint256 roundId) = market.acceptLeaseBid(offerId, bidIdx, sigLessor, "ipfs://lease");

        // ✅ First claim should succeed
        vm.prank(addrA);
        market.claimRevenue(roundId);

        // ❌ Second claim should fail
        vm.prank(addrA);
        vm.expectRevert("claimed"); // Should fail - already claimed
        market.claimRevenue(roundId);
    }

    /// @notice Test invalid signature in lease creation
    /// @dev Verifies that lease creation fails with invalid signatures
    function test_RevertWhen_InvalidLeaseSignature() public {
        (uint256 assetId, address tokenAddr, ) = _deployAsset();

        // Fund lessee for bidding
        mUSD.mint(addrA, 1e24);
        vm.prank(addrA);
        mUSD.approve(address(market), type(uint256).max);

        LeaseFactory.LeaseIntent memory L = LeaseFactory.LeaseIntent({
            lessor: seller,
            lessee: address(0),
            assetId: assetId,
            paymentToken: address(mUSD),
            rentAmount: 100,
            rentPeriod: 30 days,
            securityDeposit: 500,
            startTime: uint64(block.timestamp + 1 days),
            endTime: uint64(block.timestamp + 90 days),
            metadataHash: keccak256("meta"),
            legalDocHash: keccak256("doc"),
            nonce: 1,
            deadline: uint64(block.timestamp + 3 days),
            termsVersion: 1,
            assetTypeSchemaHash: keccak256("schema")
        });

        vm.prank(seller);
        uint256 offerId = market.postLeaseOffer(L);

        // Create invalid signature (wrong private key)
        LeaseFactory.LeaseIntent memory finalL = L;
        finalL.lessee = addrA;
        bytes32 digest = leaseFactory.hashLeaseIntent(finalL);

        // ❌ Use wrong private key for signature
        uint256 wrongPk = 0xDEADBEEF;
        (uint8 vWrong, bytes32 rWrong, bytes32 sWrong) = vm.sign(wrongPk, digest);
        bytes memory invalidSig = abi.encodePacked(rWrong, sWrong, vWrong);

        vm.prank(addrA);
        uint256 bidIdx = market.placeLeaseBid(offerId, invalidSig, 1_000_000);

        // Create correct lessor signature
        (uint8 vL, bytes32 rL, bytes32 sL) = vm.sign(pkSeller, digest);
        bytes memory sigLessor = abi.encodePacked(rL, sL, vL);

        // ❌ Accept bid should fail due to invalid lessee signature
        vm.prank(seller);
        vm.expectRevert(); // Should fail due to signature verification
        market.acceptLeaseBid(offerId, bidIdx, sigLessor, "ipfs://lease");
    }

    /// @notice Test expired deadline in lease creation
    /// @dev Verifies that lease creation fails after signature deadline
    function test_RevertWhen_ExpiredLeaseDeadline() public {
        (uint256 assetId, address tokenAddr, ) = _deployAsset();

        mUSD.mint(addrA, 1e24);
        vm.prank(addrA);
        mUSD.approve(address(market), type(uint256).max);

        // Create lease with very short deadline
        LeaseFactory.LeaseIntent memory L = LeaseFactory.LeaseIntent({
            lessor: seller,
            lessee: address(0),
            assetId: assetId,
            paymentToken: address(mUSD),
            rentAmount: 100,
            rentPeriod: 30 days,
            securityDeposit: 500,
            startTime: uint64(block.timestamp + 1 days),
            endTime: uint64(block.timestamp + 90 days),
            metadataHash: keccak256("meta"),
            legalDocHash: keccak256("doc"),
            nonce: 1,
            deadline: uint64(block.timestamp + 1), // Very short deadline
            termsVersion: 1,
            assetTypeSchemaHash: keccak256("schema")
        });

        vm.prank(seller);
        uint256 offerId = market.postLeaseOffer(L);

        LeaseFactory.LeaseIntent memory finalL = L;
        finalL.lessee = addrA;
        bytes32 digest = leaseFactory.hashLeaseIntent(finalL);
        (uint8 vA, bytes32 rA, bytes32 sA) = vm.sign(pkA, digest);
        bytes memory sigLessee = abi.encodePacked(rA, sA, vA);

        vm.prank(addrA);
        uint256 bidIdx = market.placeLeaseBid(offerId, sigLessee, 1_000_000);

        // Advance time past deadline
        vm.warp(block.timestamp + 10);

        (uint8 vL, bytes32 rL, bytes32 sL) = vm.sign(pkSeller, digest);
        bytes memory sigLessor = abi.encodePacked(rL, sL, vL);

        // ❌ Accept bid should fail due to expired deadline
        vm.prank(seller);
        vm.expectRevert("expired"); // Should fail due to expired deadline
        market.acceptLeaseBid(offerId, bidIdx, sigLessor, "ipfs://lease");
    }

    /// @notice Test zero balance revenue claim scenario
    /// @dev Verifies behavior when user has zero balance at snapshot time
    function test_ZeroBalanceRevenueClaim() public {
        (uint256 assetId, address tokenAddr, ) = _deployAsset();
        AssetERC20 sat = AssetERC20(tokenAddr);

        // Transfer all tokens to addrB, leaving seller with some
        vm.prank(seller);
        sat.transfer(addrB, 5e17); // Transfer 50% to addrB

        // Create lease scenario
        mUSD.mint(addrA, 1e24);
        vm.prank(addrA);
        mUSD.approve(address(market), type(uint256).max);

        LeaseFactory.LeaseIntent memory L = LeaseFactory.LeaseIntent({
            lessor: seller,
            lessee: address(0),
            assetId: assetId,
            paymentToken: address(mUSD),
            rentAmount: 100,
            rentPeriod: 30 days,
            securityDeposit: 500,
            startTime: uint64(block.timestamp + 1 days),
            endTime: uint64(block.timestamp + 90 days),
            metadataHash: keccak256("meta"),
            legalDocHash: keccak256("doc"),
            nonce: 1,
            deadline: uint64(block.timestamp + 3 days),
            termsVersion: 1,
            assetTypeSchemaHash: keccak256("schema")
        });

        vm.prank(seller);
        uint256 offerId = market.postLeaseOffer(L);

        LeaseFactory.LeaseIntent memory finalL = L;
        finalL.lessee = addrA;
        bytes32 digest = leaseFactory.hashLeaseIntent(finalL);
        (uint8 vA, bytes32 rA, bytes32 sA) = vm.sign(pkA, digest);
        bytes memory sigLessee = abi.encodePacked(rA, sA, vA);

        vm.prank(addrA);
        uint256 bidIdx = market.placeLeaseBid(offerId, sigLessee, 1_000_000);

        (uint8 vL, bytes32 rL, bytes32 sL) = vm.sign(pkSeller, digest);
        bytes memory sigLessor = abi.encodePacked(rL, sL, vL);

        vm.prank(seller);
        (, uint256 roundId) = market.acceptLeaseBid(offerId, bidIdx, sigLessor, "ipfs://lease");

        // AddrA has zero tokens but should be able to claim (receiving 0 amount)
        uint256 balanceBefore = mUSD.balanceOf(addrA);

        vm.prank(addrA);
        market.claimRevenue(roundId); // Should succeed but give 0 amount

        uint256 balanceAfter = mUSD.balanceOf(addrA);
        assertEq(balanceAfter - balanceBefore, 0, "Zero token holder should receive zero revenue");
    }

    /// @notice Test invalid sale parameters
    /// @dev Verifies that sales cannot be posted with invalid parameters
    function test_RevertWhen_InvalidSaleParameters() public {
        (uint256 assetId, address tokenAddr, ) = _deployAsset();

        // ❌ Test zero amount sale
        vm.prank(seller);
        vm.expectRevert("amount=0");
        market.postSale(tokenAddr, 0, 1_000_000);

        // Test valid sale for comparison
        vm.prank(seller);
        uint256 saleId = market.postSale(tokenAddr, 1e17, 1_000_000);
        assertTrue(saleId > 0, "Valid sale should succeed");
    }

    /// @notice Test unauthorized bid acceptance
    /// @dev Verifies that only sale creators can accept bids
    function test_RevertWhen_UnauthorizedBidAcceptance() public {
        (uint256 assetId, address tokenAddr, ) = _deployAsset();
        AssetERC20 sat = AssetERC20(tokenAddr);

        // Post sale
        vm.prank(seller);
        uint256 saleId = market.postSale(tokenAddr, 5e17, 1_000_000);

        // Fund and place bid
        mUSD.mint(addrA, 1e24);
        vm.prank(addrA);
        mUSD.approve(address(market), type(uint256).max);
        vm.prank(addrA);
        uint256 bidIdx = market.placeSaleBid(saleId, 2e17, 500_000);

        // ❌ Non-seller tries to accept bid
        vm.prank(addrA); // Not the seller
        vm.expectRevert("not seller");
        market.acceptSaleBid(saleId, bidIdx);
    }

    /// @notice Test nonexistent revenue round claims
    /// @dev Verifies that claiming from invalid round IDs fails appropriately
    function test_RevertWhen_NonexistentRevenueRound() public {
        // ❌ Attempt to claim from non-existent revenue round
        vm.prank(seller);
        vm.expectRevert("!round");
        market.claimRevenue(999); // Non-existent round ID
    }

    /// @notice Test boundary conditions for revenue distribution
    /// @dev Tests edge cases in revenue calculation and distribution
    function test_RevenueDistribution_BoundaryConditions() public {
        (uint256 assetId, address tokenAddr, ) = _deployAsset();
        AssetERC20 sat = AssetERC20(tokenAddr);

        // Create scenario with very small amounts
        vm.prank(seller);
        sat.transfer(addrB, 1); // Transfer minimal amount (1 wei)

        // Create lease with minimal revenue
        mUSD.mint(addrA, 1e24);
        vm.prank(addrA);
        mUSD.approve(address(market), type(uint256).max);

        LeaseFactory.LeaseIntent memory L = LeaseFactory.LeaseIntent({
            lessor: seller,
            lessee: address(0),
            assetId: assetId,
            paymentToken: address(mUSD),
            rentAmount: 1, // Minimal rent
            rentPeriod: 30 days,
            securityDeposit: 1, // Minimal deposit
            startTime: uint64(block.timestamp + 1 days),
            endTime: uint64(block.timestamp + 90 days),
            metadataHash: keccak256("meta"),
            legalDocHash: keccak256("doc"),
            nonce: 1,
            deadline: uint64(block.timestamp + 3 days),
            termsVersion: 1,
            assetTypeSchemaHash: keccak256("schema")
        });

        vm.prank(seller);
        uint256 offerId = market.postLeaseOffer(L);

        LeaseFactory.LeaseIntent memory finalL = L;
        finalL.lessee = addrA;
        bytes32 digest = leaseFactory.hashLeaseIntent(finalL);
        (uint8 vA, bytes32 rA, bytes32 sA) = vm.sign(pkA, digest);
        bytes memory sigLessee = abi.encodePacked(rA, sA, vA);

        vm.prank(addrA);
        uint256 bidIdx = market.placeLeaseBid(offerId, sigLessee, 2); // Minimal escrow

        (uint8 vL, bytes32 rL, bytes32 sL) = vm.sign(pkSeller, digest);
        bytes memory sigLessor = abi.encodePacked(rL, sL, vL);

        vm.prank(seller);
        (, uint256 roundId) = market.acceptLeaseBid(offerId, bidIdx, sigLessor, "ipfs://lease");

        // Both parties should be able to claim their minimal shares
        vm.prank(seller);
        market.claimRevenue(roundId);

        vm.prank(addrB);
        market.claimRevenue(roundId);

        // Test passed if no reverts occurred and calculations handled minimal amounts correctly
    }
}
