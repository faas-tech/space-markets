// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// protocol imports
import {AssetERC20} from "../../src/AssetERC20.sol";
import {AssetRegistry} from "../../src/AssetRegistry.sol";
import {LeaseFactory} from "../../src/LeaseFactory.sol";
import {Marketplace} from "../../src/Marketplace.sol";

// openzeppelin imports
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// test helper imports
import "./Accounts.sol";
import {MockStablecoin} from "../mocks/MockStablecoin.sol";

contract Setup is Accounts {
    MockStablecoin public stablecoin;
    AssetERC20 public assetERC20Implementation;
    AssetRegistry public assetRegistryProxy;
    LeaseFactory public leaseFactoryProxy;
    Marketplace public marketplaceProxy;

    function setUp() public virtual override {
        super.setUp();
        _deployContracts();
        _logContracts();
    }

    function _deployContracts() public virtual {
        stablecoin = new MockStablecoin();
        assetERC20Implementation = new AssetERC20();
        _deployAssetRegistry();
        _deployLeaseFactory();
        _deployMarketplace();
    }

    function _deployAssetRegistry() public virtual {
        AssetRegistry registryImpl = new AssetRegistry();
        bytes memory initData = abi.encodeWithSelector(
            AssetRegistry.initialize.selector, admin, upgrader, registrar, assetERC20Implementation
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(registryImpl), initData);
        assetRegistryProxy = AssetRegistry(address(proxy));
    }

    function _deployLeaseFactory() public virtual {
        LeaseFactory leaseImpl = new LeaseFactory();
        bytes memory initData =
            abi.encodeWithSelector(LeaseFactory.initialize.selector, admin, upgrader, assetRegistryProxy);
        ERC1967Proxy proxy = new ERC1967Proxy(address(leaseImpl), initData);
        leaseFactoryProxy = LeaseFactory(address(proxy));
    }

    function _deployMarketplace() public virtual {
        Marketplace marketplaceImpl = new Marketplace();
        bytes memory initData = abi.encodeWithSelector(
            Marketplace.initialize.selector, admin, upgrader, address(stablecoin), leaseFactoryProxy
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(marketplaceImpl), initData);
        marketplaceProxy = Marketplace(address(proxy));
    }

    function _logContracts() public virtual {
        console.log("\n------\n Contracts \n------\n");
        console.log("stablecoin", address(stablecoin));
        console.log("assetERC20Implementation", address(assetERC20Implementation));
        console.log("assetRegistryProxy", address(assetRegistryProxy));
        console.log("leaseFactoryProxy", address(leaseFactoryProxy));
        console.log("marketplaceProxy", address(marketplaceProxy));
    }
}
