// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AssetRegistry.sol";
import "../src/AssetERC20.sol";
import "../src/LeaseFactory.sol";
import "../src/interfaces/IAssetRegistry.sol";

contract AssetFlowTest is Test {
    AssetRegistry registry;
    LeaseFactory leaseFactory;

    uint256 pkAdmin   = 0xA11CE;
    uint256 pkOwner   = 0xB0B;
    uint256 pkLessee  = 0xC0C;

    address admin;
    address owner;
    address lessee;

    function setUp() public {
        admin  = vm.addr(pkAdmin);
        owner  = vm.addr(pkOwner);
        lessee = vm.addr(pkLessee);

        vm.startPrank(admin);
        registry = new AssetRegistry(admin);
        leaseFactory = new LeaseFactory(admin, address(registry));
        vm.stopPrank();
    }

    function test_Type_Register_Transfer_LeaseMint() public {
        // 1) Create asset type
        bytes32 schemaHash = keccak256("satellite-schema");
        bytes32[] memory req = new bytes32[](1);
        req[0] = keccak256("lease.start_time");

        vm.prank(admin);
        uint256 typeId = registry.createAssetType("Satellite", schemaHash, req, "ipfs://schema");

        // 2) Register asset => deploy ERC20
        vm.prank(admin);
        (uint256 assetId, address tokenAddr) = registry.registerAsset(
            typeId,
            owner,
            keccak256("asset-meta"),
            "ipfs://asset",
            "SatelliteOne",
            "SAT1",
            1e18
        );

        AssetERC20 token = AssetERC20(tokenAddr);
        assertEq(token.balanceOf(owner), 1e18, "owner should have full supply");

        // 3) Transfer a fraction from owner to lessee (as just a sanity check of ERC20)
        vm.prank(owner);
        token.transfer(lessee, 2e17);
        assertEq(token.balanceOf(lessee), 2e17);

        // 4) Mint a lease via EIP-712 signatures
        IAssetRegistry.Asset memory A = registry.getAsset(assetId);
        IAssetRegistry.AssetType memory T = registry.getType(A.typeId);

        LeaseFactory.LeaseIntent memory L = LeaseFactory.LeaseIntent({
            lessor: owner,
            lessee: lessee,
            assetId: assetId,
            paymentToken: address(0),
            rentAmount: 100,
            rentPeriod: 30 days,
            securityDeposit: 500,
            startTime: uint64(block.timestamp + 1 days),
            endTime:   uint64(block.timestamp + 90 days),
            metadataHash: keccak256("leaseMeta"),
            legalDocHash: keccak256("leaseDoc"),
            nonce: 1,
            deadline: uint64(block.timestamp + 2 days),
            termsVersion: 1,
            assetTypeSchemaHash: T.schemaHash
        });

        bytes32 digest = leaseFactory.hashLeaseIntent(L);

        // sign as lessor (owner)
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkOwner, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);

        // sign as lessee
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        vm.prank(admin); // anyone could call; using admin for convenience
        uint256 leaseId = leaseFactory.mintLease(L, sigLessor, sigLessee, "ipfs://lease");
        assertTrue(leaseFactory.leases(leaseId).exists, "lease should exist");
        assertEq(leaseFactory.ownerOf(leaseId), lessee, "lease NFT owner should be lessee");
    }
}
