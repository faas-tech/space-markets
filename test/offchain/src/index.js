/**
 * Main entry point for Asset Leasing Protocol off-chain test suite
 *
 * This module exports the key functions for testing the complete
 * blockchain integration system.
 */

export * as blockchain from './blockchain.js';
export { startServer } from './api.js';
export { runAllTests, TestRunner } from './test.js';