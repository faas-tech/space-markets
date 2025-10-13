// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// protocol imports
import {AssetERC20} from "../../src/AssetERC20.sol";
import {AssetRegistry} from "../../src/AssetRegistry.sol";
import {LeaseFactory} from "../../src/LeaseFactory.sol";
import {Marketplace} from "../../src/Marketplace.sol";

// openzeppelin imports
import {Upgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";

// test helper imports
import "./Accounts.t.sol";
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
        bytes memory initData =
            abi.encodeWithSelector(AssetRegistry.initialize.selector, admin, registrar, assetERC20Implementation);
        assetRegistryProxy = AssetRegistry(Upgrades.deployUUPSProxy("AssetRegistry.sol:AssetRegistry", initData));
    }

    function _deployLeaseFactory() public virtual {
        bytes memory initData = abi.encodeWithSelector(LeaseFactory.initialize.selector, admin, assetRegistryProxy);
        leaseFactoryProxy = LeaseFactory(Upgrades.deployUUPSProxy("LeaseFactory.sol:LeaseFactory", initData));
    }

    function _deployMarketplace() public virtual {
        bytes memory initData =
            abi.encodeWithSelector(Marketplace.initialize.selector, admin, address(stablecoin), leaseFactoryProxy);
        marketplaceProxy = Marketplace(Upgrades.deployUUPSProxy("Marketplace.sol:Marketplace", initData));
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
