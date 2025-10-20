/**
 * Simple Express.js API for Asset Leasing Protocol
 *
 * This API provides HTTP endpoints to interact with the blockchain contracts.
 * It's designed to be:
 * - Easy to understand and modify
 * - Simple to test locally
 * - Clear about what each endpoint does
 *
 * Why this approach: Instead of complex routing and middleware layers,
 * we use simple Express.js with clear, documented endpoints.
 */

import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { ethers } from 'ethers';
import * as blockchain from './blockchain.js';

const app = express();
const port = process.env.PORT || 3001;

// In-memory storage for demo purposes
// Why: Simple storage that's easy to understand and debug
let deploymentInfo = null;
let contracts = {};
let assetTypes = new Map(); // Track registered asset types: name -> typeId

/**
 * Simple logging middleware
 * Why: See all API requests for debugging
 */
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Parse JSON bodies
app.use(express.json());

/**
 * Error handling utility
 * Why: Consistent error responses across all endpoints
 */
function handleError(res, error, message = 'Internal server error') {
  console.error('[API Error]', error);
  res.status(500).json({
    success: false,
    error: message,
    details: error.message
  });
}

/**
 * Health check endpoint
 * Why: Verify the API is running
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Asset Leasing Protocol API is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * Get blockchain network information
 * Why: Verify which blockchain we're connected to
 */
app.get('/api/network', async (req, res) => {
  try {
    const info = await blockchain.getBlockchainInfo();
    // Convert BigInt values to strings for JSON serialization
    const serializableInfo = {
      chainId: info.chainId.toString(),
      blockNumber: info.blockNumber,
      timestamp: info.timestamp,
      gasPrice: info.gasPrice ? info.gasPrice.toString() : null
    };
    res.json({
      success: true,
      data: serializableInfo
    });
  } catch (error) {
    handleError(res, error, 'Failed to get network info');
  }
});

/**
 * Get deployed contract addresses
 * Why: Frontend needs to know where contracts are deployed
 */
app.get('/api/contracts', (req, res) => {
  if (!deploymentInfo) {
    return res.status(404).json({
      success: false,
      error: 'No contracts deployed yet'
    });
  }

  res.json({
    success: true,
    data: deploymentInfo
  });
});

/**
 * Reset deployment state
 * Why: Allow resetting the deployment state for testing
 */
app.post('/api/reset', (req, res) => {
  console.log('[API] Resetting deployment state...');
  deploymentInfo = null;
  contracts = {};
  assetTypes.clear();

  res.json({
    success: true,
    message: 'Deployment state reset successfully'
  });
});

/**
 * Deploy all contracts to the blockchain
 * Why: Set up the complete system from scratch
 */
app.post('/api/deploy', async (req, res) => {
  try {
    console.log('[API] Starting contract deployment...');

    // Start Anvil if not already running
    try {
      await blockchain.getBlockchainInfo();
    } catch (error) {
      console.log('[API] Starting Anvil blockchain...');
      await blockchain.startAnvil({ port: 8546, chainId: 31337 });
    }

    // Check if contracts are already deployed
    if (deploymentInfo) {
      console.log('[API] Contracts already deployed, using existing deployment');
      res.json({
        success: true,
        message: 'Contracts already deployed (using existing deployment)',
        data: deploymentInfo
      });
      return;
    }

    // Deploy all contracts
    deploymentInfo = await blockchain.deployAllContracts();

    // Clear asset types since we have new contracts
    assetTypes.clear();

    // Create contract instances for easy access
    contracts = {
      stablecoin: blockchain.getContract(
        deploymentInfo.stablecoin.address,
        deploymentInfo.stablecoin.abi
      ),
      assetRegistry: blockchain.getContract(
        deploymentInfo.assetRegistry.address,
        deploymentInfo.assetRegistry.abi
      ),
      leaseFactory: blockchain.getContract(
        deploymentInfo.leaseFactory.address,
        deploymentInfo.leaseFactory.abi
      ),
      marketplace: blockchain.getContract(
        deploymentInfo.marketplace.address,
        deploymentInfo.marketplace.abi
      )
    };

    console.log('[API] Contract deployment completed');

    res.json({
      success: true,
      message: 'All contracts deployed successfully',
      data: deploymentInfo
    });
  } catch (error) {
    handleError(res, error, 'Contract deployment failed');
  }
});

/**
 * Register a new asset type in the AssetRegistry
 * Why: Assets need to be registered before they can be leased
 *
 * Expected body: {
 *   "name": "Orbital Satellite Alpha",
 *   "assetType": "satellite",
 *   "schemaUrl": "https://example.com/schema.json"
 * }
 */
app.post('/api/assets/register-type', async (req, res) => {
  try {
    const { name, assetType, schemaUrl } = req.body;

    if (!name || !assetType || !schemaUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, assetType, schemaUrl'
      });
    }

    if (!contracts.assetRegistry) {
      return res.status(400).json({
        success: false,
        error: 'Contracts not deployed yet. Call /api/deploy first.'
      });
    }

    console.log(`[API] Registering asset type: ${name}`);

    // Convert schema to hash for blockchain storage
    const schemaHash = ethers.keccak256(ethers.toUtf8Bytes(assetType));
    const requiredLeaseKeys = []; // Empty for simple demo

    // Call the smart contract
    const tx = await contracts.assetRegistry.createAssetType(name, schemaHash, requiredLeaseKeys, schemaUrl);
    const receipt = await tx.wait();

    // Extract the typeId from the transaction logs
    const typeId = receipt.logs[0].args[0]; // First event should be AssetTypeCreated
    assetTypes.set(name, typeId);

    console.log(`[API] Asset type registered: ${name} (typeId: ${typeId})`);

    res.json({
      success: true,
      message: 'Asset type registered successfully',
      data: {
        name,
        assetType,
        schemaUrl,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to register asset type');
  }
});

/**
 * Create an asset token (ERC-20 representing ownership shares)
 * Why: Each asset needs a token that represents fractional ownership
 *
 * Expected body: {
 *   "assetId": "satellite-001",
 *   "name": "Satellite Alpha Token",
 *   "symbol": "SAT001",
 *   "totalSupply": "1000"
 * }
 */
app.post('/api/assets/create-token', async (req, res) => {
  try {
    const { assetId, name, symbol, totalSupply } = req.body;

    if (!assetId || !name || !symbol || !totalSupply) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: assetId, name, symbol, totalSupply'
      });
    }

    if (!contracts.assetRegistry) {
      return res.status(400).json({
        success: false,
        error: 'Contracts not deployed yet. Call /api/deploy first.'
      });
    }

    console.log(`[API] Creating asset token: ${name} (${symbol})`);

    // Convert total supply to proper format
    const supply = ethers.parseEther(totalSupply.toString());

    // Use the first registered asset type for demo purposes
    if (assetTypes.size === 0) {
      return res.status(400).json({
        success: false,
        error: 'No asset types registered. Register an asset type first.'
      });
    }

    // Get the first asset type (for demo purposes)
    const typeId = assetTypes.values().next().value;
    const signer = blockchain.getSigner();
    const owner = await signer.getAddress();
    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(assetId));
    const dataURI = `https://api.example.com/assets/${assetId}`;

    // Call the smart contract
    const tx = await contracts.assetRegistry.registerAsset(
      typeId,
      owner,
      metadataHash,
      dataURI,
      name,
      symbol,
      supply
    );
    const receipt = await tx.wait();

    console.log(`[API] Asset token created: ${name} (${symbol})`);

    res.json({
      success: true,
      message: 'Asset token created successfully',
      data: {
        assetId,
        name,
        symbol,
        totalSupply,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to create asset token');
  }
});

/**
 * Create a lease offer on the marketplace
 * Why: Asset owners need to list their assets for lease
 *
 * Expected body: {
 *   "assetId": "satellite-001",
 *   "pricePerDay": "100",
 *   "maxLeaseDuration": "365",
 *   "terms": "Standard satellite lease terms"
 * }
 */
app.post('/api/leases/create-offer', async (req, res) => {
  try {
    const { assetId, pricePerDay, maxLeaseDuration, terms } = req.body;

    if (!assetId || !pricePerDay || !maxLeaseDuration || !terms) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: assetId, pricePerDay, maxLeaseDuration, terms'
      });
    }

    if (!contracts.marketplace) {
      return res.status(400).json({
        success: false,
        error: 'Contracts not deployed yet. Call /api/deploy first.'
      });
    }

    console.log(`[API] Creating lease offer for asset: ${assetId}`);

    // Convert price to proper format (assuming USDC with 18 decimals)
    const rentAmount = ethers.parseEther(pricePerDay.toString());

    // Create LeaseIntent struct for the smart contract
    const signer = blockchain.getSigner();
    const lessorAddress = await signer.getAddress();
    const stablecoinAddress = deploymentInfo.stablecoin.address;

    const leaseIntent = {
      lessor: lessorAddress,
      lessee: ethers.ZeroAddress, // Will be set by marketplace for bidding
      assetId: parseInt(assetId.replace(/\D/g, '')) || 1, // Extract number from assetId or default to 1
      paymentToken: stablecoinAddress,
      rentAmount: rentAmount,
      rentPeriod: 86400, // 1 day in seconds
      securityDeposit: rentAmount, // Same as rent for demo
      startTime: Math.floor(Date.now() / 1000), // Current timestamp
      endTime: Math.floor(Date.now() / 1000) + maxLeaseDuration, // End time based on max duration
      metadataHash: ethers.keccak256(ethers.toUtf8Bytes(terms)),
      legalDocHash: ethers.keccak256(ethers.toUtf8Bytes("demo-legal-doc")),
      nonce: Math.floor(Math.random() * 1000000),
      deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      termsVersion: 1,
      assetTypeSchemaHash: ethers.keccak256(ethers.toUtf8Bytes("satellite"))
    };

    // Call the smart contract
    const tx = await contracts.marketplace.postLeaseOffer(leaseIntent);
    const receipt = await tx.wait();

    console.log(`[API] Lease offer created for asset: ${assetId}`);

    res.json({
      success: true,
      message: 'Lease offer created successfully',
      data: {
        assetId,
        pricePerDay,
        maxLeaseDuration,
        terms,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to create lease offer');
  }
});

/**
 * Get all events from a specific contract
 * Why: Track what's happening on the blockchain
 */
app.get('/api/events/:contractName', async (req, res) => {
  try {
    const { contractName } = req.params;

    if (!contracts[contractName]) {
      return res.status(404).json({
        success: false,
        error: `Contract '${contractName}' not found or not deployed`
      });
    }

    console.log(`[API] Fetching events for contract: ${contractName}`);

    // Get all events from the last 1000 blocks
    const contract = contracts[contractName];
    const provider = blockchain.getProvider();
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000);

    // Query all events
    const events = await contract.queryFilter('*', fromBlock, currentBlock);

    // Format events for easy reading (convert BigInt to string)
    const formattedEvents = events.map(event => ({
      eventName: event.event,
      blockNumber: Number(event.blockNumber),
      transactionHash: event.transactionHash,
      args: event.args ? Array.from(event.args).map(arg =>
        typeof arg === 'bigint' ? arg.toString() : arg
      ) : [],
      topics: event.topics
    }));

    res.json({
      success: true,
      data: {
        contractName,
        eventsCount: formattedEvents.length,
        fromBlock,
        toBlock: currentBlock,
        events: formattedEvents
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch events');
  }
});

/**
 * Get system status
 * Why: Monitor the health of the entire system
 */
app.get('/api/status', async (req, res) => {
  try {
    const networkInfo = await blockchain.getBlockchainInfo();
    const contractsDeployed = deploymentInfo !== null;

    res.json({
      success: true,
      data: {
        api: {
          status: 'running',
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        },
        blockchain: {
          connected: true,
          ...networkInfo
        },
        contracts: {
          deployed: contractsDeployed,
          count: contractsDeployed ? Object.keys(deploymentInfo).length - 2 : 0 // -2 for chainId and deployedAt
        }
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to get system status');
  }
});

/**
 * 404 handler for non-existent routes
 * Why: Return proper JSON error for unknown endpoints
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    details: `${req.method} ${req.path} is not a valid endpoint`
  });
});

/**
 * Start the API server
 * Why: Initialize and run the Express.js server
 */
export function startServer(preferredPort = port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(preferredPort, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`[API] Server running on http://localhost:${preferredPort}`);
        console.log('[API] Available endpoints:');
        console.log('[API]   GET  /health                    - Health check');
        console.log('[API]   GET  /api/network               - Network info');
        console.log('[API]   GET  /api/contracts             - Deployed contracts');
        console.log('[API]   POST /api/deploy                - Deploy all contracts');
        console.log('[API]   POST /api/assets/register-type  - Register asset type');
        console.log('[API]   POST /api/assets/create-token   - Create asset token');
        console.log('[API]   POST /api/leases/create-offer   - Create lease offer');
        console.log('[API]   GET  /api/events/:contractName  - Get contract events');
        console.log('[API]   GET  /api/status                - System status');
        resolve(server);
      }
    });

    // Handle port already in use error
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[API] Port ${preferredPort} is already in use`);
        // Try next port
        server.close();
        const nextPort = preferredPort + 1;
        console.log(`[API] Trying port ${nextPort}...`);
        startServer(nextPort).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });

    // Handle shutdown gracefully
    process.on('SIGTERM', () => {
      console.log('[API] Shutting down...');
      server.close(() => {
        console.log('[API] Server stopped');
        process.exit(0);
      });
    });
  });
}

// If this file is run directly, start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(console.error);
}

export { app };