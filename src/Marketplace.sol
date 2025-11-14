// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Protocol Contracts
import {BaseUpgradable} from "./utils/BaseUpgradable.sol";
import {Roles} from "./libraries/Roles.sol";
import {LeaseFactory} from "./LeaseFactory.sol";
import {AssetERC20} from "./AssetERC20.sol";
import {AssetRegistry} from "./AssetRegistry.sol";

// OpenZeppelin Contracts
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Marketplace
/// @notice Simple marketplace for selling whole/fractional asset ERC-20 tokens and for funded lease bidding.
/// @dev Uses a stablecoin for escrow/payout.
contract Marketplace is BaseUpgradable {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        Data / Storage                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice A sale listing for a given asset token and amount.
    struct Sale {
        address seller;
        address assetToken;
        uint256 amount;
        uint256 askPricePerUnit; // informational in v1
        bool active;
    }

    /// @notice A fully-funded bid on a sale listing.
    struct SaleBid {
        address bidder;
        uint256 amount;
        uint256 pricePerUnit;
        uint256 funds; // amount * pricePerUnit, escrowed in stablecoin
        bool active;
    }

    /// @notice A posted lease offer (intent skeleton). Lessee may be zero to indicate "open".
    struct LeaseOffer {
        address lessor;
        LeaseFactory.LeaseIntent terms;
        bool active;
    }

    /// @notice A fully-funded lease bid with the lessee's signature.
    struct LeaseBid {
        address bidder;
        bytes sigLessee;
        uint256 funds;
        bool active;
    }

    /// @notice The id of the next sale to be listed.
    uint256 public nextSaleId;

    /// @notice The id of the next lease offer to be posted.
    uint256 public nextLeaseOfferId;

    /// @notice Stablecoin used for bids, escrow, and payouts.
    IERC20 public stable;

    /// @notice Lease factory used to mint Lease NFTs after acceptance.
    LeaseFactory public leaseFactory;

    /// @notice Claims due to asset owners
    mapping(address => uint256) public claims;

    /// @notice Sales listings.
    mapping(uint256 => Sale) public sales;

    /// @notice Bids on sales.
    mapping(uint256 => SaleBid[]) public saleBids;

    /// @notice Lease offers.
    mapping(uint256 => LeaseOffer) public leaseOffers;

    /// @notice Bids on lease offers.
    mapping(uint256 => LeaseBid[]) public leaseBids;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Events                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when a sale is posted.
    event SalePosted(
        uint256 indexed saleId, address indexed seller, address assetToken, uint256 amount, uint256 askPricePerUnit
    );
    /// @notice Emitted when a funded sale bid is placed.
    event SaleBidPlaced(
        uint256 indexed saleId,
        uint256 indexed bidIndex,
        address indexed bidder,
        uint256 amount,
        uint256 pricePerUnit,
        uint256 funds
    );
    /// @notice Emitted when a sale bid is accepted.
    event SaleBidAccepted(uint256 indexed saleId, uint256 indexed bidIndex, address bidder);
    /// @notice Emitted when a sale bid is refunded.
    event SaleBidRefunded(uint256 indexed saleId, uint256 indexed bidIndex, address bidder, uint256 amount);

    /// @notice Emitted when a lease offer is posted.
    event LeaseOfferPosted(uint256 indexed offerId, address indexed lessor, uint256 assetId);

    /// @notice Emitted when a lease bid is placed.
    event LeaseBidPlaced(uint256 indexed offerId, uint256 indexed bidIndex, address indexed bidder, uint256 funds);

    /// @notice Emitted when a lease bid is accepted and a Lease NFT is minted.
    event LeaseAccepted(
        uint256 indexed offerId, uint256 indexed bidIndex, address indexed lessee, uint256 leaseTokenId
    );

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    Constructor / Initializer               */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @param admin Address receiving DEFAULT_ADMIN_ROLE.
    /// @param upgrader Address receiving UPGRADER_ROLE.
    /// @param stablecoin Address of the stablecoin.
    /// @param leaseFactory_ Address of the LeaseFactory.
    function initialize(address admin, address upgrader, address stablecoin, address leaseFactory_)
        public
        initializer
    {
        stable = IERC20(stablecoin);
        leaseFactory = LeaseFactory(leaseFactory_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(Roles.UPGRADER_ROLE, upgrader);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       Sale Functions                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Posts a sale for a given amount of an asset ERC-20.
    function postSale(address assetToken, uint256 amount, uint256 askPricePerUnit) external returns (uint256 saleId) {
        require(amount > 0, "amount=0");
        saleId = nextSaleId++;
        sales[saleId] = Sale(msg.sender, assetToken, amount, askPricePerUnit, true);
        emit SalePosted(saleId, msg.sender, assetToken, amount, askPricePerUnit);
    }

    /// @notice Places a fully-funded bid on a sale (escrows stablecoin in this contract).
    function placeSaleBid(uint256 saleId, uint256 amount, uint256 pricePerUnit) external returns (uint256 bidIndex) {
        Sale storage s = sales[saleId];
        require(s.active, "sale !active");
        require(amount > 0 && amount <= s.amount, "bad amount");

        // Calculate payment: (amount in token wei) * (price in stablecoin units per full token) / (1 full token in wei)
        // This gives us the payment in stablecoin base units
        uint256 total = (amount * pricePerUnit) / 1e18;
        require(stable.transferFrom(msg.sender, address(this), total), "fund xfer fail");

        SaleBid memory b = SaleBid(msg.sender, amount, pricePerUnit, total, true);
        saleBids[saleId].push(b);
        bidIndex = saleBids[saleId].length - 1;
        emit SaleBidPlaced(saleId, bidIndex, msg.sender, amount, pricePerUnit, total);
    }

    /// @notice Accepts a specific bid; transfers tokens and pays seller; refunds other active bids.
    function acceptSaleBid(uint256 saleId, uint256 bidIndex) external {
        Sale storage s = sales[saleId];
        require(s.active, "sale !active");
        require(msg.sender == s.seller, "not seller");

        SaleBid storage b = saleBids[saleId][bidIndex];
        require(b.active, "bid !active");
        require(b.amount <= s.amount, "exceeds sale amount");

        // pull asset tokens from seller to bidder
        require(IERC20(s.assetToken).transferFrom(s.seller, b.bidder, b.amount), "asset transfer fail");
        // pay seller
        require(stable.transfer(s.seller, b.funds), "pay seller fail");
        b.active = false;

        // reduce remaining or close
        s.amount -= b.amount;
        if (s.amount == 0) s.active = false;

        emit SaleBidAccepted(saleId, bidIndex, b.bidder);

        // refund all other bids
        SaleBid[] storage arr = saleBids[saleId];
        for (uint256 i = 0; i < arr.length; i++) {
            if (i == bidIndex) continue;
            if (arr[i].active) {
                uint256 refund = arr[i].funds;
                arr[i].active = false;
                require(stable.transfer(arr[i].bidder, refund), "refund fail");
                emit SaleBidRefunded(saleId, i, arr[i].bidder, refund);
            }
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       Lease Functions                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Posts a lease offer. In v1, payment token must be the configured stablecoin.
    function postLeaseOffer(LeaseFactory.LeaseIntent calldata L) external returns (uint256 offerId) {
        require(L.lease.lessor == msg.sender, "not lessor");
        require(L.lease.paymentToken == address(stable), "must pay in stable");
        LeaseOffer memory o = LeaseOffer(msg.sender, L, true);
        offerId = nextLeaseOfferId++;
        leaseOffers[offerId] = o;
        emit LeaseOfferPosted(offerId, msg.sender, L.lease.assetId);
    }

    /// @notice Places a funded lease bid with the lessee's signature.
    function placeLeaseBid(uint256 offerId, bytes calldata sigLessee, uint256 funds)
        external
        returns (uint256 bidIndex)
    {
        LeaseOffer storage o = leaseOffers[offerId];
        require(o.active, "offer !active");
        require(funds > 0, "funds=0");

        require(stable.transferFrom(msg.sender, address(this), funds), "fund xfer fail");
        LeaseBid memory b = LeaseBid(msg.sender, sigLessee, funds, true);
        leaseBids[offerId].push(b);
        bidIndex = leaseBids[offerId].length - 1;
        emit LeaseBidPlaced(offerId, bidIndex, msg.sender, funds);
    }

    /// @notice Accepts a lease bid, mints the Lease NFT via LeaseFactory
    /// @dev Non-winning bids on the same offer are refunded immediately.
    function acceptLeaseBid(uint256 offerId, uint256 bidIndex, bytes calldata sigLessor)
        external
        returns (uint256 leaseTokenId)
    {
        LeaseOffer storage o = leaseOffers[offerId];
        require(o.active, "offer !active");
        require(msg.sender == o.lessor, "not lessor");

        LeaseBid storage b = leaseBids[offerId][bidIndex];
        require(b.active, "bid !active");

        // Bind lessee to the bidder address for mint
        LeaseFactory.LeaseIntent memory L = o.terms;
        L.lease.lessee = b.bidder;

        // Mint lease
        leaseTokenId = leaseFactory.mintLease(L, sigLessor, b.sigLessee);

        address assetToken = _assetTokenAddressFromRegistry(L.lease.assetId);

        b.active = false;
        o.active = false;
        emit LeaseAccepted(offerId, bidIndex, b.bidder, leaseTokenId);

        // refund all other bids
        LeaseBid[] storage arr = leaseBids[offerId];
        for (uint256 i = 0; i < arr.length; i++) {
            if (i == bidIndex) continue;
            if (arr[i].active) {
                arr[i].active = false;
                require(stable.transfer(arr[i].bidder, arr[i].funds), "refund fail");
            }
        }

        AssetERC20 asset = AssetERC20(assetToken);
        (address[] memory holders, uint256[] memory balances) = asset.getHolders();
        uint256 totalSupply = asset.totalSupply();

        for (uint256 i = 0; i < holders.length; i++) {
            uint256 amount = (balances[i] * b.funds) / totalSupply;
            claims[holders[i]] += amount;
        }
    }

    /// @notice Resolve the ERC-20 asset token address for a given asset id via the registry.
    function _assetTokenAddressFromRegistry(uint256 assetId) internal view returns (address assetToken) {
        AssetRegistry.Asset memory a = leaseFactory.registry().getAsset(assetId);
        require(a.tokenAddress != address(0), "asset !exists");
        assetToken = a.tokenAddress;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       Revenue Functions                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when an account claims its share.
    event RevenueClaimed(address indexed account, uint256 share);

    /// @notice Claims the caller's earned revenue.
    function claimRevenue() external {
        uint256 amount = claims[msg.sender];
        require(amount > 0, "no claims");
        claims[msg.sender] = 0;
        require(stable.transfer(msg.sender, amount), "payout fail");
        emit RevenueClaimed(msg.sender, amount);
    }
}
