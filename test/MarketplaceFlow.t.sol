// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AssetRegistry.sol";
import "../src/AssetERC20.sol";
import "../src/LeaseFactory.sol";
import "../src/Marketplace.sol";
import "../test/mocks/MockStablecoin.sol";
import "../src/interfaces/IAssetRegistry.sol";

contract MarketplaceFlowTest is Test {
    AssetRegistry registry;
    LeaseFactory leaseFactory;
    Marketplace market;
    MockStablecoin mUSD;

    // private keys
    uint256 pkAdmin  = 0xA11CE;
    uint256 pkSeller = 0xB0B;
    uint256 pkA      = 0xC01;
    uint256 pkB      = 0xC02;

    address admin;
    address seller;
    address addrA;
    address addrB;

    function setUp() public {
        admin  = vm.addr(pkAdmin);
        seller = vm.addr(pkSeller);
        addrA  = vm.addr(pkA);
        addrB  = vm.addr(pkB);

        vm.startPrank(admin);
        registry     = new AssetRegistry(admin);
        leaseFactory = new LeaseFactory(admin, address(registry));
        mUSD         = new MockStablecoin();
        market       = new Marketplace(admin, address(mUSD), address(leaseFactory));
        vm.stopPrank();
    }

    function _deployAsset() internal returns (uint256 assetId, address tokenAddr, bytes32 schemaHash) {
        vm.startPrank(admin);
        schemaHash = keccak256("schema");
        bytes32[] memory reqKeys = new bytes32[](1);
        reqKeys[0] = keccak256("lease.start_time");
        uint256 typeId = registry.createAssetType("Satellite", schemaHash, reqKeys, "ipfs://schema");
        (assetId, tokenAddr) = registry.registerAsset(
            typeId,
            seller,
            keccak256("meta"),
            "ipfs://sat",
            "SatelliteOne",
            "SAT1",
            1e18
        );
        // grant marketplace snapshot role
        AssetERC20(tokenAddr).grantRole(AssetERC20(tokenAddr).SNAPSHOT_ROLE(), address(market));
        vm.stopPrank();
    }

    function test_Sales_Leases_RevenueFlow() public {
        (uint256 assetId, address tokenAddr, bytes32 schemaHash) = _deployAsset();
        AssetERC20 sat = AssetERC20(tokenAddr);

        // --- SALES ---
        // Fund buyers with mUSD (6 decimals)
        mUSD.mint(addrA, 1_000_000_000); // 1,000 mUSD
        mUSD.mint(addrB, 1_000_000_000); // 1,000 mUSD

        // Seller posts sale for 0.5 units (5e17)
        vm.prank(seller);
        uint256 saleId = market.postSale(tokenAddr, 5e17, 1_000000); // ask 1.0 mUSD per unit (illustrative)

        // Buyers approve marketplace
        vm.startPrank(addrA);
        mUSD.approve(address(market), type(uint256).max);
        uint256 bidA = market.placeSaleBid(saleId, 2e17, 2); // 0.2 units @ 0.000002 mUSD/unit (toy numbers)
        vm.stopPrank();

        vm.startPrank(addrB);
        mUSD.approve(address(market), type(uint256).max);
        uint256 bidB = market.placeSaleBid(saleId, 3e17, 3); // 0.3 units @ 0.000003 mUSD/unit
        vm.stopPrank();

        // Seller approves marketplace to pull tokens and accepts bidB
        vm.prank(seller);
        sat.approve(address(market), 5e17);

        vm.prank(seller);
        market.acceptSaleBid(saleId, bidB);

        assertEq(sat.balanceOf(addrB), 3e17, "addrB should receive 0.3 units");
        // bidA should be refunded automatically; we won't assert balances since toy pricing

        // --- LEASES ---
        IAssetRegistry.Asset memory A = registry.getAsset(assetId);
        IAssetRegistry.AssetType memory T = registry.getType(A.typeId);

        LeaseFactory.LeaseIntent memory L = LeaseFactory.LeaseIntent({
            lessor: seller,
            lessee: addrA, // bidder A will be lessee
            assetId: assetId,
            paymentToken: address(mUSD),
            rentAmount: 100,
            rentPeriod: 30 days,
            securityDeposit: 500,
            startTime: uint64(block.timestamp + 1 days),
            endTime:   uint64(block.timestamp + 90 days),
            metadataHash: keccak256("leaseMeta"),
            legalDocHash: keccak256("leaseDoc"),
            nonce: 77,
            deadline: uint64(block.timestamp + 3 days),
            termsVersion: 1,
            assetTypeSchemaHash: T.schemaHash
        });

        // Post offer with lessee left zero in stored terms; marketplace will bind bidder as lessee at accept.
        LeaseFactory.LeaseIntent memory LO = L;
        LO.lessee = address(0);

        vm.prank(seller);
        uint256 offerId = market.postLeaseOffer(LO);

        // Lessee A signs the intent with their address included
        bytes32 digest = leaseFactory.hashLeaseIntent(L);
        (uint8 vA, bytes32 rA, bytes32 sA) = vm.sign(pkA, digest);
        bytes memory sigLessee = abi.encodePacked(rA, sA, vA);

        // Fund and approve lessee A for escrowed funds (e.g., 10,000 micro-units)
        mUSD.mint(addrA, 50_000_000); // additional funds
        vm.startPrank(addrA);
        mUSD.approve(address(market), type(uint256).max);
        uint256 bidIdx = market.placeLeaseBid(offerId, sigLessee, 10_000_000); // 10 mUSD with 6 decimals
        vm.stopPrank();

        // Lessor signs the same digest
        (uint8 vL, bytes32 rL, bytes32 sL) = vm.sign(pkSeller, digest);
        bytes memory sigLessor = abi.encodePacked(rL, sL, vL);

        vm.prank(seller);
        (uint256 leaseId, uint256 roundId) = market.acceptLeaseBid(offerId, bidIdx, sigLessor, "ipfs://lease");

        assertTrue(leaseFactory.leases(leaseId).exists, "lease exists");

        // Claims: at snapshot time, balances were:
        // seller started with 1e18, sold 3e17 -> 7e17 remaining
        // addrB holds 3e17
        // addrA holds 0 (didn't buy in sale)
        // total 1e18
        // payout 10_000_000 => seller 7_000_000, addrB 3_000_000
        vm.prank(seller);
        market.claimRevenue(roundId);
        vm.prank(addrB);
        market.claimRevenue(roundId);

        assertEq(mUSD.balanceOf(seller), 7_000_000, "seller claim");
        assertEq(mUSD.balanceOf(addrB), 3_000_000, "addrB claim");
    }
}
