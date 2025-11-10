// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test, console} from "forge-std/Test.sol";

contract Accounts is Test {
    address public admin;
    address public registrar;
    address public upgrader;

    function setUp() public virtual {
        admin = makeAddr("admin");
        registrar = makeAddr("registrar");
        upgrader = makeAddr("upgrader");

        _logAccounts();
    }

    function _logAccounts() public virtual {
        console.log("\n------\n Accounts \n------\n");
        console.log("admin", admin);
        console.log("registrar", registrar);
        console.log("upgrader", upgrader);
    }
}
