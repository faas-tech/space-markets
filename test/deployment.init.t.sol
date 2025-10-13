// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./helpers/TestHelpers.sol";

contract DeploymentInitTest is TestHelpers {
    function setUp() public override {
        super.setUp();
    }

    function test_stablecoin_initialized() public {
        assertEq(stablecoin.name(), "Mock USD");
        assertEq(stablecoin.symbol(), "mUSD");
        assertEq(stablecoin.decimals(), 6);
    }

    function test_assetErc20_implementation() public {
        assertNotEq(address(assetERC20Implementation), address(0));
    }

    function test_assetRegistry_initialized() public {
        assertEq(assetRegistryProxy.hasRole(0x00, admin), true);
        assertEq(assetRegistryProxy.hasRole(Roles.REGISTRAR_ROLE, registrar), true);
        assertEq(assetRegistryProxy.assetERC20Implementation(), address(assetERC20Implementation));
    }

    function test_leaseFactory_initialized() public {
        assertEq(leaseFactoryProxy.hasRole(0x00, admin), true);
        assertEq(address(leaseFactoryProxy.registry()), address(assetRegistryProxy));
    }

    function test_marketplace_initialized() public {
        assertEq(marketplaceProxy.hasRole(0x00, admin), true);
        assertEq(address(marketplaceProxy.stable()), address(stablecoin));
        assertEq(address(marketplaceProxy.leaseFactory()), address(leaseFactoryProxy));
    }
}
