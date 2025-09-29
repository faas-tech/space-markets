/**
 * Simple blockchain connection utility for Asset Leasing Protocol
 *
 * This module provides basic functions to:
 * - Start and manage an Anvil blockchain instance
 * - Deploy smart contracts to the blockchain
 * - Interact with deployed contracts
 * - Listen for blockchain events
 *
 * Why this approach: Instead of complex abstractions, we use simple functions
 * that are easy to understand, test, and debug.
 */

import { ethers } from 'ethers';
import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Global state to track the running Anvil instance
let anvilProcess = null;
let provider = null;
let signer = null;
let currentNonce = null;

/**
 * Simple logging utility
 * Why: Clear, timestamped logs help with debugging
 */
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

/**
 * Start Anvil blockchain for testing
 * Why: Anvil provides a local blockchain that's perfect for testing
 *
 * @param {Object} options - Configuration options
 * @param {number} options.port - Port to run Anvil on (default: 8545)
 * @param {number} options.chainId - Chain ID (default: 31337)
 * @returns {Promise<Object>} Connection info including accounts and RPC URL
 */
export async function startAnvil(options = {}) {
  const { port = 8545, chainId = 31337 } = options;

  log('Starting Anvil blockchain...');

  // Stop any existing Anvil instance
  await stopAnvil();

  return new Promise((resolve, reject) => {
    // Start Anvil with common test accounts
    anvilProcess = spawn('anvil', [
      '--port', port.toString(),
      '--chain-id', chainId.toString(),
      '--accounts', '10',
      '--balance', '1000000',
      '--block-time', '1'
    ]);

    let output = '';

    anvilProcess.stdout.on('data', (data) => {
      output += data.toString();

      // Wait for Anvil to be ready (look for "Listening on" message)
      if (output.includes('Listening on') && !provider) {
        log(`Anvil started on port ${port}`);

        // Use Anvil's default test accounts (these are deterministic)
        const accounts = getAnvilTestAccounts();
        const rpcUrl = `http://127.0.0.1:${port}`;

        // Setup ethers provider and signer
        provider = new ethers.JsonRpcProvider(rpcUrl);
        signer = new ethers.Wallet(accounts[0].privateKey, provider);
        currentNonce = null; // Reset nonce for fresh instance

        resolve({
          rpcUrl,
          chainId,
          accounts,
          provider,
          signer
        });
      }
    });

    anvilProcess.stderr.on('data', (data) => {
      console.error('Anvil error:', data.toString());
    });

    anvilProcess.on('error', (error) => {
      reject(new Error(`Failed to start Anvil: ${error.message}`));
    });

    anvilProcess.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Anvil exited with code ${code}`));
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (anvilProcess && !output.includes('Listening on')) {
        reject(new Error('Anvil failed to start within 10 seconds'));
      }
    }, 10000);
  });
}

/**
 * Stop the running Anvil instance
 * Why: Clean shutdown prevents port conflicts and resource leaks
 */
export async function stopAnvil() {
  if (anvilProcess) {
    log('Stopping Anvil...');
    anvilProcess.kill();
    anvilProcess = null;
    provider = null;
    signer = null;
    currentNonce = null; // Reset nonce
    log('Anvil stopped');
  }
}

/**
 * Get Anvil's default test accounts
 * Why: Anvil uses deterministic accounts by default, so we can hardcode them
 * This is more reliable than parsing stdout
 */
function getAnvilTestAccounts() {
  // These are Anvil's default test accounts (deterministic)
  const testKeys = [
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
    '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
    '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
    '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
    '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e',
    '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356',
    '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97',
    '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6'
  ];

  return testKeys.map(privateKey => {
    const wallet = new ethers.Wallet(privateKey);
    return {
      address: wallet.address,
      privateKey: privateKey
    };
  });
}

/**
 * Get the project root directory
 * Why: We need to find contract artifacts relative to the project root
 */
function getProjectRoot() {
  // Go up from test/offchain to find the project root
  return join(process.cwd(), '../../');
}

/**
 * Load a contract ABI from the compiled artifacts
 * Why: Smart contracts need their ABI to be callable from JavaScript
 *
 * @param {string} contractName - Name of the contract
 * @returns {Array} Contract ABI
 */
function loadContractAbi(contractName) {
  const projectRoot = getProjectRoot();
  const abiPath = join(projectRoot, 'out', `${contractName}.sol`, `${contractName}.json`);

  if (!existsSync(abiPath)) {
    throw new Error(`Contract ABI not found: ${abiPath}`);
  }

  const artifact = JSON.parse(readFileSync(abiPath, 'utf8'));
  return artifact.abi;
}

/**
 * Load contract bytecode from the compiled artifacts
 * Why: We need bytecode to deploy contracts to the blockchain
 *
 * @param {string} contractName - Name of the contract
 * @returns {string} Contract bytecode
 */
function loadContractBytecode(contractName) {
  const projectRoot = getProjectRoot();
  const abiPath = join(projectRoot, 'out', `${contractName}.sol`, `${contractName}.json`);

  if (!existsSync(abiPath)) {
    throw new Error(`Contract artifact not found: ${abiPath}`);
  }

  const artifact = JSON.parse(readFileSync(abiPath, 'utf8'));
  return artifact.bytecode.object;
}

/**
 * Deploy a smart contract to the blockchain
 * Why: This is the core function that puts our contracts on-chain
 *
 * @param {string} contractName - Name of the contract to deploy
 * @param {Array} constructorArgs - Arguments for the contract constructor
 * @returns {Promise<Object>} Deployed contract instance and deployment info
 */
export async function deployContract(contractName, constructorArgs = []) {
  if (!signer) {
    throw new Error('No signer available. Did you start Anvil first?');
  }

  log(`Deploying ${contractName}...`);

  const abi = loadContractAbi(contractName);
  const bytecode = loadContractBytecode(contractName);

  // Create contract factory
  const contractFactory = new ethers.ContractFactory(abi, bytecode, signer);

  // Get current nonce to avoid nonce issues
  if (currentNonce === null) {
    currentNonce = await provider.getTransactionCount(signer.address);
  }

  // Deploy the contract with explicit nonce
  const contract = await contractFactory.deploy(...constructorArgs, { nonce: currentNonce });
  currentNonce++; // Increment for next transaction
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const deploymentTx = contract.deploymentTransaction();

  log(`${contractName} deployed to ${address}`);

  return {
    contract,
    address,
    transactionHash: deploymentTx.hash,
    blockNumber: deploymentTx.blockNumber,
    abi
  };
}

/**
 * Deploy all core contracts for the Asset Leasing Protocol
 * Why: This sets up the complete system with all necessary contracts
 *
 * @returns {Promise<Object>} All deployed contracts and their addresses
 */
export async function deployAllContracts() {
  log('Deploying all Asset Leasing Protocol contracts...');

  // Create deployments directory
  const deploymentsDir = './deployments';
  if (!existsSync(deploymentsDir)) {
    mkdirSync(deploymentsDir, { recursive: true });
  }

  // Deploy MockStablecoin first (used as payment token)
  const stablecoin = await deployContract('MockStablecoin');

  // Deploy AssetRegistry (needs admin address)
  const assetRegistry = await deployContract('AssetRegistry', [
    signer.address  // admin address
  ]);

  // Deploy LeaseFactory (needs admin and assetRegistry address)
  const leaseFactory = await deployContract('LeaseFactory', [
    signer.address,         // admin address
    assetRegistry.address   // asset registry address
  ]);

  // Deploy Marketplace (needs admin, stablecoin, and leaseFactory address)
  const marketplace = await deployContract('Marketplace', [
    signer.address,         // admin address
    stablecoin.address,     // payment token address
    leaseFactory.address    // lease factory address
  ]);

  const deployment = {
    chainId: (await provider.getNetwork().then(n => n.chainId)).toString(), // Convert BigInt to string
    stablecoin: {
      address: stablecoin.address,
      abi: stablecoin.abi
    },
    assetRegistry: {
      address: assetRegistry.address,
      abi: assetRegistry.abi
    },
    leaseFactory: {
      address: leaseFactory.address,
      abi: leaseFactory.abi
    },
    marketplace: {
      address: marketplace.address,
      abi: marketplace.abi
    },
    deployedAt: new Date().toISOString()
  };

  // Save deployment info to file
  const deploymentFile = join(deploymentsDir, 'contracts.json');
  writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
  log(`Deployment info saved to ${deploymentFile}`);

  return deployment;
}

/**
 * Get a contract instance for interaction
 * Why: Once deployed, we need to interact with contracts
 *
 * @param {string} address - Contract address
 * @param {Array} abi - Contract ABI
 * @returns {ethers.Contract} Contract instance ready for method calls
 */
export function getContract(address, abi) {
  if (!signer) {
    throw new Error('No signer available. Did you start Anvil first?');
  }

  return new ethers.Contract(address, abi, signer);
}

/**
 * Get the current signer instance
 * Why: Allow API to access signer for address and transactions
 */
export function getSigner() {
  if (!signer) {
    throw new Error('No signer available. Did you start Anvil first?');
  }

  return signer;
}

/**
 * Get the current provider instance
 * Why: Allow API to access provider for blockchain queries
 */
export function getProvider() {
  if (!provider) {
    throw new Error('No provider available. Did you start Anvil first?');
  }

  return provider;
}

/**
 * Listen for events from a contract
 * Why: Events are how smart contracts communicate state changes
 *
 * @param {ethers.Contract} contract - Contract instance to listen to
 * @param {string} eventName - Name of the event to listen for
 * @param {Function} callback - Function to call when event is received
 * @returns {Function} Function to stop listening
 */
export function listenForEvents(contract, eventName, callback) {
  log(`Listening for ${eventName} events...`);

  // Listen for the specific event
  contract.on(eventName, (...args) => {
    const event = args[args.length - 1]; // Last argument is the event object
    log(`Received ${eventName} event`);
    callback(event, ...args.slice(0, -1));
  });

  // Return function to stop listening
  return () => {
    contract.removeAllListeners(eventName);
    log(`Stopped listening for ${eventName} events`);
  };
}

/**
 * Wait for a transaction to be mined
 * Why: Blockchain operations are asynchronous, we need to wait for confirmation
 *
 * @param {string} txHash - Transaction hash to wait for
 * @param {number} confirmations - Number of confirmations to wait for (default: 1)
 * @returns {Promise<Object>} Transaction receipt
 */
export async function waitForTransaction(txHash, confirmations = 1) {
  if (!provider) {
    throw new Error('No provider available. Did you start Anvil first?');
  }

  log(`Waiting for transaction ${txHash}...`);
  const receipt = await provider.waitForTransaction(txHash, confirmations);
  log(`Transaction ${txHash} confirmed`);
  return receipt;
}

/**
 * Get the current blockchain state
 * Why: Useful for debugging and testing
 *
 * @returns {Promise<Object>} Current blockchain info
 */
export async function getBlockchainInfo() {
  if (!provider) {
    throw new Error('No provider available. Did you start Anvil first?');
  }

  const network = await provider.getNetwork();
  const blockNumber = await provider.getBlockNumber();
  const block = await provider.getBlock(blockNumber);

  const feeData = await provider.getFeeData();

  return {
    chainId: network.chainId.toString(),
    blockNumber: Number(blockNumber),
    timestamp: Number(block.timestamp),
    gasPrice: feeData.gasPrice ? feeData.gasPrice.toString() : null
  };
}