// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {Marketplace} from "../../src/Marketplace.sol";
import {LeaseFactory} from "../../src/LeaseFactory.sol";
import {AssetRegistry} from "../../src/AssetRegistry.sol";
import {AssetERC20} from "../../src/AssetERC20.sol";
import {MetadataStorage} from "../../src/MetadataStorage.sol";
import {Roles} from "../../src/libraries/Roles.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title Mock Stablecoin for testing
contract MockStablecoin is Test {
    string public name = "Mock USD";
    string public symbol = "mUSD";
    uint8 public decimals = 6;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "insufficient balance");
        require(allowance[from][msg.sender] >= amount, "insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }
}

/// @title MarketplaceTest
/// @notice Comprehensive test suite for Marketplace contract functionality
contract MarketplaceTest is Test {
    Marketplace public marketplace;
    LeaseFactory public leaseFactory;
    AssetRegistry public registry;
    MockStablecoin public stablecoin;
    AssetERC20 public assetImplementation;

    address public admin = address(0x1);
    address public upgrader = address(0x2);
    address public seller = address(0x3);
    address public buyer = address(0x4);
    address public lessor = address(0x5);
    address public lessee = address(0x6);
    address public bidder1 = address(0x7);
    address public bidder2 = address(0x8);

    uint256 public lessorPrivateKey = 0xA11CE;
    uint256 public lesseePrivateKey = 0xB0B;

    uint256 constant ASSET_ID = 1;
    uint256 constant TYPE_ID = 1;

    function setUp() public {
        // Deploy stablecoin
        stablecoin = new MockStablecoin();

        // Deploy AssetERC20 implementation first
        assetImplementation = new AssetERC20();

        // Deploy and initialize AssetRegistry with implementation
        AssetRegistry registryImplementation = new AssetRegistry();
        bytes memory registryData = abi.encodeWithSelector(
            AssetRegistry.initialize.selector,
            admin,
            upgrader,
            admin, // registrar role
            address(assetImplementation)
        );
        ERC1967Proxy registryProxy = new ERC1967Proxy(address(registryImplementation), registryData);
        registry = AssetRegistry(address(registryProxy));

        // Deploy and initialize LeaseFactory
        LeaseFactory leaseFactoryImplementation = new LeaseFactory();
        bytes memory leaseData = abi.encodeWithSelector(
            LeaseFactory.initialize.selector,
            admin,
            upgrader,
            address(registry)
        );
        ERC1967Proxy leaseProxy = new ERC1967Proxy(address(leaseFactoryImplementation), leaseData);
        leaseFactory = LeaseFactory(address(leaseProxy));

        // Deploy and initialize Marketplace
        Marketplace marketplaceImplementation = new Marketplace();
        bytes memory marketplaceData = abi.encodeWithSelector(
            Marketplace.initialize.selector,
            admin,
            upgrader,
            address(stablecoin),
            address(leaseFactory)
        );
        ERC1967Proxy marketplaceProxy = new ERC1967Proxy(address(marketplaceImplementation), marketplaceData);
        marketplace = Marketplace(address(marketplaceProxy));

        // Setup test data: create asset type and register asset
        vm.startPrank(admin);

        MetadataStorage.Metadata[] memory typeMetadata = new MetadataStorage.Metadata[](1);
        typeMetadata[0] = MetadataStorage.Metadata({key: "description", value: "Test asset type"});

        bytes32[] memory requiredKeys = new bytes32[](0);
        bytes32 assetType = keccak256("TestAsset");
        registry.createAssetType("TestAsset", assetType, requiredKeys, typeMetadata);

        MetadataStorage.Metadata[] memory assetMetadata = new MetadataStorage.Metadata[](1);
        assetMetadata[0] = MetadataStorage.Metadata({key: "serial", value: "TEST-001"});

        registry.registerAsset(
            assetType,
            "Test Token",
            "TST",
            1000e18,
            admin,
            upgrader,
            lessor,
            assetMetadata
        );
        vm.stopPrank();

        // Fund test accounts with stablecoin
        stablecoin.mint(buyer, 1000000e6);
        stablecoin.mint(bidder1, 1000000e6);
        stablecoin.mint(bidder2, 1000000e6);
        stablecoin.mint(lessee, 1000000e6);

        // Approve marketplace
        vm.prank(buyer);
        stablecoin.approve(address(marketplace), type(uint256).max);
        vm.prank(bidder1);
        stablecoin.approve(address(marketplace), type(uint256).max);
        vm.prank(bidder2);
        stablecoin.approve(address(marketplace), type(uint256).max);
        vm.prank(lessee);
        stablecoin.approve(address(marketplace), type(uint256).max);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     Sale Functionality Tests                */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_PostSale() public {
        address assetToken = registry.getAsset(ASSET_ID).tokenAddress;

        vm.prank(seller);
        uint256 saleId = marketplace.postSale(assetToken, 100e18, 10e6);

        (address saleSeller, address saleAssetToken, uint256 amount, uint256 askPrice, bool active) =
            marketplace.sales(saleId);

        assertEq(saleSeller, seller);
        assertEq(saleAssetToken, assetToken);
        assertEq(amount, 100e18);
        assertEq(askPrice, 10e6);
        assertTrue(active);
    }

    function test_EventEmission_SalePosted() public {
        address assetToken = registry.getAsset(ASSET_ID).tokenAddress;

        vm.expectEmit(true, true, false, true);
        emit Marketplace.SalePosted(0, seller, assetToken, 100e18, 10e6);

        vm.prank(seller);
        marketplace.postSale(assetToken, 100e18, 10e6);
    }

    function test_RevertWhen_PostSaleWithZeroAmount() public {
        address assetToken = registry.getAsset(ASSET_ID).tokenAddress;

        vm.prank(seller);
        vm.expectRevert("amount=0");
        marketplace.postSale(assetToken, 0, 10e6);
    }

    function test_PlaceSaleBid() public {
        address assetToken = registry.getAsset(ASSET_ID).tokenAddress;

        vm.prank(seller);
        uint256 saleId = marketplace.postSale(assetToken, 100e18, 10e6);

        uint256 bidAmount = 50e18;
        uint256 pricePerUnit = 10e6;
        uint256 expectedFunds = (bidAmount * pricePerUnit) / 1e18;

        uint256 buyerBalanceBefore = stablecoin.balanceOf(buyer);

        vm.prank(buyer);
        uint256 bidIndex = marketplace.placeSaleBid(saleId, bidAmount, pricePerUnit);

        assertEq(bidIndex, 0);
        assertEq(stablecoin.balanceOf(buyer), buyerBalanceBefore - expectedFunds);
        assertEq(stablecoin.balanceOf(address(marketplace)), expectedFunds);
    }

    function test_EventEmission_SaleBidPlaced() public {
        address assetToken = registry.getAsset(ASSET_ID).tokenAddress;

        vm.prank(seller);
        uint256 saleId = marketplace.postSale(assetToken, 100e18, 10e6);

        uint256 bidAmount = 50e18;
        uint256 pricePerUnit = 10e6;
        uint256 expectedFunds = (bidAmount * pricePerUnit) / 1e18;

        vm.expectEmit(true, true, true, true);
        emit Marketplace.SaleBidPlaced(saleId, 0, buyer, bidAmount, pricePerUnit, expectedFunds);

        vm.prank(buyer);
        marketplace.placeSaleBid(saleId, bidAmount, pricePerUnit);
    }

    function test_RevertWhen_BidOnInactiveSale() public {
        vm.prank(buyer);
        vm.expectRevert("sale !active");
        marketplace.placeSaleBid(999, 50e18, 10e6);
    }

    function test_RevertWhen_BidExceedsSaleAmount() public {
        address assetToken = registry.getAsset(ASSET_ID).tokenAddress;

        vm.prank(seller);
        uint256 saleId = marketplace.postSale(assetToken, 100e18, 10e6);

        vm.prank(buyer);
        vm.expectRevert("bad amount");
        marketplace.placeSaleBid(saleId, 200e18, 10e6);
    }

    function test_AcceptSaleBid() public {
        address assetToken = registry.getAsset(ASSET_ID).tokenAddress;

        // Seller needs tokens to sell
        vm.prank(lessor); // lessor is the initial token holder
        AssetERC20(assetToken).transfer(seller, 100e18);

        // Seller approves marketplace
        vm.prank(seller);
        AssetERC20(assetToken).approve(address(marketplace), type(uint256).max);

        // Post sale
        vm.prank(seller);
        uint256 saleId = marketplace.postSale(assetToken, 100e18, 10e6);

        // Place bid
        uint256 bidAmount = 50e18;
        uint256 pricePerUnit = 10e6;
        uint256 expectedPayment = (bidAmount * pricePerUnit) / 1e18;

        vm.prank(buyer);
        marketplace.placeSaleBid(saleId, bidAmount, pricePerUnit);

        // Accept bid
        uint256 sellerBalanceBefore = stablecoin.balanceOf(seller);

        vm.prank(seller);
        marketplace.acceptSaleBid(saleId, 0);

        // Verify token transfer
        assertEq(AssetERC20(assetToken).balanceOf(buyer), bidAmount);
        assertEq(AssetERC20(assetToken).balanceOf(seller), 50e18);

        // Verify payment
        assertEq(stablecoin.balanceOf(seller), sellerBalanceBefore + expectedPayment);
    }

    function test_SaleBidRefundOnAcceptance() public {
        address assetToken = registry.getAsset(ASSET_ID).tokenAddress;

        vm.prank(lessor);
        AssetERC20(assetToken).transfer(seller, 100e18);

        vm.prank(seller);
        AssetERC20(assetToken).approve(address(marketplace), type(uint256).max);

        vm.prank(seller);
        uint256 saleId = marketplace.postSale(assetToken, 100e18, 10e6);

        // Place two bids
        vm.prank(bidder1);
        marketplace.placeSaleBid(saleId, 50e18, 10e6);

        vm.prank(bidder2);
        marketplace.placeSaleBid(saleId, 50e18, 10e6);

        uint256 bidder2BalanceBefore = stablecoin.balanceOf(bidder2);
        uint256 expectedRefund = (50e18 * 10e6) / 1e18;

        // Accept first bid
        vm.prank(seller);
        marketplace.acceptSaleBid(saleId, 0);

        // Verify second bidder was refunded
        assertEq(stablecoin.balanceOf(bidder2), bidder2BalanceBefore + expectedRefund);
    }

    function test_RevertWhen_NonSellerAcceptsBid() public {
        address assetToken = registry.getAsset(ASSET_ID).tokenAddress;

        vm.prank(seller);
        uint256 saleId = marketplace.postSale(assetToken, 100e18, 10e6);

        vm.prank(buyer);
        marketplace.placeSaleBid(saleId, 50e18, 10e6);

        vm.prank(buyer);
        vm.expectRevert("not seller");
        marketplace.acceptSaleBid(saleId, 0);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    Lease Functionality Tests                */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_PostLeaseOffer() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "terms", value: "Standard lease"});

        LeaseFactory.Lease memory lease = LeaseFactory.Lease({
            lessor: lessor,
            lessee: address(0),
            assetId: ASSET_ID,
            paymentToken: address(stablecoin),
            rentAmount: 1000e6,
            rentPeriod: 30 days,
            securityDeposit: 5000e6,
            startTime: uint64(block.timestamp + 1 days),
            endTime: uint64(block.timestamp + 365 days),
            legalDocHash: bytes32("ipfs://legal-doc"),
            termsVersion: 1,
            metadata: metadata
        });

        LeaseFactory.LeaseIntent memory intent = LeaseFactory.LeaseIntent({
            deadline: uint64(block.timestamp + 7 days),
            assetType: bytes32(0),
            lease: lease
        });

        vm.prank(lessor);
        uint256 offerId = marketplace.postLeaseOffer(intent);

        (address offerLessor,, bool active) = marketplace.leaseOffers(offerId);
        assertEq(offerLessor, lessor);
        assertTrue(active);
    }

    function test_EventEmission_LeaseOfferPosted() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](0);

        LeaseFactory.Lease memory lease = LeaseFactory.Lease({
            lessor: lessor,
            lessee: address(0),
            assetId: ASSET_ID,
            paymentToken: address(stablecoin),
            rentAmount: 1000e6,
            rentPeriod: 30 days,
            securityDeposit: 5000e6,
            startTime: uint64(block.timestamp + 1 days),
            endTime: uint64(block.timestamp + 365 days),
            legalDocHash: bytes32("ipfs://legal-doc"),
            termsVersion: 1,
            metadata: metadata
        });

        LeaseFactory.LeaseIntent memory intent = LeaseFactory.LeaseIntent({
            deadline: uint64(block.timestamp + 7 days),
            assetType: bytes32(0),
            lease: lease
        });

        vm.expectEmit(true, true, false, true);
        emit Marketplace.LeaseOfferPosted(0, lessor, ASSET_ID);

        vm.prank(lessor);
        marketplace.postLeaseOffer(intent);
    }

    function test_RevertWhen_NonLessorPostsOffer() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](0);

        LeaseFactory.Lease memory lease = LeaseFactory.Lease({
            lessor: lessor,
            lessee: address(0),
            assetId: ASSET_ID,
            paymentToken: address(stablecoin),
            rentAmount: 1000e6,
            rentPeriod: 30 days,
            securityDeposit: 5000e6,
            startTime: uint64(block.timestamp + 1 days),
            endTime: uint64(block.timestamp + 365 days),
            legalDocHash: bytes32("ipfs://legal-doc"),
            termsVersion: 1,
            metadata: metadata
        });

        LeaseFactory.LeaseIntent memory intent = LeaseFactory.LeaseIntent({
            deadline: uint64(block.timestamp + 7 days),
            assetType: bytes32(0),
            lease: lease
        });

        vm.prank(buyer); // Not the lessor
        vm.expectRevert("not lessor");
        marketplace.postLeaseOffer(intent);
    }

    function test_RevertWhen_WrongPaymentToken() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](0);

        LeaseFactory.Lease memory lease = LeaseFactory.Lease({
            lessor: lessor,
            lessee: address(0),
            assetId: ASSET_ID,
            paymentToken: address(0x123), // Wrong payment token
            rentAmount: 1000e6,
            rentPeriod: 30 days,
            securityDeposit: 5000e6,
            startTime: uint64(block.timestamp + 1 days),
            endTime: uint64(block.timestamp + 365 days),
            legalDocHash: bytes32("ipfs://legal-doc"),
            termsVersion: 1,
            metadata: metadata
        });

        LeaseFactory.LeaseIntent memory intent = LeaseFactory.LeaseIntent({
            deadline: uint64(block.timestamp + 7 days),
            assetType: bytes32(0),
            lease: lease
        });

        vm.prank(lessor);
        vm.expectRevert("must pay in stable");
        marketplace.postLeaseOffer(intent);
    }

    function test_PlaceLeaseBid() public {
        // First create a lease offer
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](0);

        LeaseFactory.Lease memory lease = LeaseFactory.Lease({
            lessor: lessor,
            lessee: address(0),
            assetId: ASSET_ID,
            paymentToken: address(stablecoin),
            rentAmount: 1000e6,
            rentPeriod: 30 days,
            securityDeposit: 5000e6,
            startTime: uint64(block.timestamp + 1 days),
            endTime: uint64(block.timestamp + 365 days),
            legalDocHash: bytes32("ipfs://legal-doc"),
            termsVersion: 1,
            metadata: metadata
        });

        LeaseFactory.LeaseIntent memory intent = LeaseFactory.LeaseIntent({
            deadline: uint64(block.timestamp + 7 days),
            assetType: bytes32(0),
            lease: lease
        });

        vm.prank(lessor);
        uint256 offerId = marketplace.postLeaseOffer(intent);

        // Place a bid
        bytes memory signature = new bytes(65); // Placeholder signature
        uint256 funds = 10000e6;

        uint256 bidderBalanceBefore = stablecoin.balanceOf(lessee);

        vm.prank(lessee);
        uint256 bidIndex = marketplace.placeLeaseBid(offerId, signature, funds);

        assertEq(bidIndex, 0);
        assertEq(stablecoin.balanceOf(lessee), bidderBalanceBefore - funds);
        assertEq(stablecoin.balanceOf(address(marketplace)), funds);
    }

    function test_EventEmission_LeaseBidPlaced() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](0);

        LeaseFactory.Lease memory lease = LeaseFactory.Lease({
            lessor: lessor,
            lessee: address(0),
            assetId: ASSET_ID,
            paymentToken: address(stablecoin),
            rentAmount: 1000e6,
            rentPeriod: 30 days,
            securityDeposit: 5000e6,
            startTime: uint64(block.timestamp + 1 days),
            endTime: uint64(block.timestamp + 365 days),
            legalDocHash: bytes32("ipfs://legal-doc"),
            termsVersion: 1,
            metadata: metadata
        });

        LeaseFactory.LeaseIntent memory intent = LeaseFactory.LeaseIntent({
            deadline: uint64(block.timestamp + 7 days),
            assetType: bytes32(0),
            lease: lease
        });

        vm.prank(lessor);
        uint256 offerId = marketplace.postLeaseOffer(intent);

        bytes memory signature = new bytes(65);
        uint256 funds = 10000e6;

        vm.expectEmit(true, true, true, true);
        emit Marketplace.LeaseBidPlaced(offerId, 0, lessee, funds);

        vm.prank(lessee);
        marketplace.placeLeaseBid(offerId, signature, funds);
    }

    function test_RevertWhen_BidOnInactiveOffer() public {
        bytes memory signature = new bytes(65);

        vm.prank(lessee);
        vm.expectRevert("offer !active");
        marketplace.placeLeaseBid(999, signature, 10000e6);
    }

    function test_RevertWhen_BidWithZeroFunds() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](0);

        LeaseFactory.Lease memory lease = LeaseFactory.Lease({
            lessor: lessor,
            lessee: address(0),
            assetId: ASSET_ID,
            paymentToken: address(stablecoin),
            rentAmount: 1000e6,
            rentPeriod: 30 days,
            securityDeposit: 5000e6,
            startTime: uint64(block.timestamp + 1 days),
            endTime: uint64(block.timestamp + 365 days),
            legalDocHash: bytes32("ipfs://legal-doc"),
            termsVersion: 1,
            metadata: metadata
        });

        LeaseFactory.LeaseIntent memory intent = LeaseFactory.LeaseIntent({
            deadline: uint64(block.timestamp + 7 days),
            assetType: bytes32(0),
            lease: lease
        });

        vm.prank(lessor);
        uint256 offerId = marketplace.postLeaseOffer(intent);

        bytes memory signature = new bytes(65);

        vm.prank(lessee);
        vm.expectRevert("funds=0");
        marketplace.placeLeaseBid(offerId, signature, 0);
    }

    function test_MultipleCompetingLeaseBids() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](0);

        LeaseFactory.Lease memory lease = LeaseFactory.Lease({
            lessor: lessor,
            lessee: address(0),
            assetId: ASSET_ID,
            paymentToken: address(stablecoin),
            rentAmount: 1000e6,
            rentPeriod: 30 days,
            securityDeposit: 5000e6,
            startTime: uint64(block.timestamp + 1 days),
            endTime: uint64(block.timestamp + 365 days),
            legalDocHash: bytes32("ipfs://legal-doc"),
            termsVersion: 1,
            metadata: metadata
        });

        LeaseFactory.LeaseIntent memory intent = LeaseFactory.LeaseIntent({
            deadline: uint64(block.timestamp + 7 days),
            assetType: bytes32(0),
            lease: lease
        });

        vm.prank(lessor);
        uint256 offerId = marketplace.postLeaseOffer(intent);

        bytes memory sig1 = new bytes(65);
        bytes memory sig2 = new bytes(65);

        // Two bidders place bids
        vm.prank(bidder1);
        marketplace.placeLeaseBid(offerId, sig1, 10000e6);

        vm.prank(bidder2);
        uint256 bidIndex2 = marketplace.placeLeaseBid(offerId, sig2, 12000e6);

        assertEq(bidIndex2, 1);

        // Both funds are escrowed
        assertEq(stablecoin.balanceOf(address(marketplace)), 22000e6);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    Revenue Claiming Tests                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_RevertWhen_ClaimWithNoClaims() public {
        vm.prank(buyer);
        vm.expectRevert("no claims");
        marketplace.claimRevenue();
    }

    // Note: Revenue claiming with actual claims is tested in integration tests
    // where lease acceptance generates real revenue distributions
}
