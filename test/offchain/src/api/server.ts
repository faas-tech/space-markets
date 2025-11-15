/**
 * REST API server for Asset Leasing Protocol testing
 *
 * Provides HTTP endpoints to interact with blockchain contracts,
 * query offchain data, and manage the complete asset lifecycle.
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Buffer } from 'buffer';
import type {
  AssetMetadata,
  LeaseAgreement,
  RevenueDistribution
} from '../types/index.js';
import type { MockOffChainServices } from '../testing/mock-services.js';
import type { ContractDeployer } from '../testing/contract-deployer.js';
import { getConfig } from '../config/index.js';
import { X402PaymentService } from '../x402/payment-service.js';
import { X402FacilitatorClient } from '../x402/facilitator-client.js';
import type { X402PaymentMode } from '../types/x402.js';

export interface ApiServerConfig {
  port: number;
  host: string;
  corsOrigins?: string[];
  enableSwagger?: boolean;
}

export interface ApiRouterConfig {
  offChainServices: MockOffChainServices;
  contractDeployer: ContractDeployer;
}

/**
 * Express REST API server for offchain services
 */
export class AssetLeasingApiServer {
  private app: express.Application;
  private server?: ReturnType<typeof createServer>;
  private config: ApiServerConfig;
  private services: MockOffChainServices;
  private deployer: ContractDeployer;
  private x402Service: X402PaymentService;
  private x402Facilitator: X402FacilitatorClient;

  constructor(
    config: ApiServerConfig,
    routerConfig: ApiRouterConfig
  ) {
    this.config = config;
    this.services = routerConfig.offChainServices;
    this.deployer = routerConfig.contractDeployer;
    this.app = express();
    const appConfig = getConfig();
    this.x402Service = new X402PaymentService(this.services.database);
    this.x402Facilitator = new X402FacilitatorClient(appConfig.x402);
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(cors({
      origin: this.config.corsOrigins || ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`[API] ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // Asset management routes
    this.setupAssetRoutes();

    // Lease management routes
    this.setupLeaseRoutes();

    // Blockchain interaction routes
    this.setupBlockchainRoutes();

    // System management routes
    this.setupSystemRoutes();

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        method: req.method,
        path: req.originalUrl
      });
    });

    // Error handler
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('[API Error]', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message
      });
    });
  }

  private setupAssetRoutes(): void {
    const router = express.Router();

    // Get all assets
    router.get('/', async (req, res) => {
      try {
        const assets = await this.services.database.getAllAssets();
        res.json({
          success: true,
          data: assets,
          count: assets.length
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get specific asset
    router.get('/:assetId', async (req, res) => {
      try {
        const asset = await this.services.database.getAsset(req.params.assetId);
        if (!asset) {
          res.status(404).json({
            success: false,
            error: 'Asset not found'
          });
          return;
        }
        res.json({
          success: true,
          data: asset
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Register new asset
    router.post('/', async (req, res) => {
      try {
        const { metadata, tokenName, tokenSymbol, totalSupply } = req.body;

        // Register on blockchain
        const result = await this.deployer.registerAsset(
          metadata,
          this.getAssetTypeId(metadata.assetType),
          tokenName,
          tokenSymbol,
          totalSupply
        );

        // Store in database
        await this.services.database.saveAsset({
          assetId: metadata.assetId,
          chainId: await this.deployer.getChainId(),
          contractAddress: result.registryAddress,
          tokenAddress: result.tokenAddress,
          metadata,
          metadataHash: result.metadataHash,
          blockNumber: result.blockNumber,
          transactionHash: result.transactionHash
        });

        res.status(201).json({
          success: true,
          data: result
        });
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.use('/api/assets', router);
  }

  private setupLeaseRoutes(): void {
    const router = express.Router();

    // Get all leases
    router.get('/', async (req, res) => {
      try {
        const leases = await this.services.database.getAllLeases();
        res.json({
          success: true,
          data: leases,
          count: leases.length
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get specific lease
    router.get('/:leaseId', async (req, res) => {
      try {
        const lease = await this.services.database.getLease(req.params.leaseId);
        if (!lease) {
          res.status(404).json({
            success: false,
            error: 'Lease not found'
          });
          return;
        }
        res.json({
          success: true,
          data: lease
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Create lease offer
    router.post('/', async (req, res) => {
      try {
        const { leaseAgreement } = req.body;

        // Create on blockchain
        const result = await this.deployer.createLeaseOffer(leaseAgreement);

        // Store in database
        await this.services.database.saveLease({
          leaseId: leaseAgreement.leaseId,
          assetId: leaseAgreement.assetId,
          chainId: await this.deployer.getChainId(),
          contractAddress: result.marketplaceAddress,
          lessor: leaseAgreement.lessorAddress,
          lessee: leaseAgreement.lesseeAddress,
          agreement: leaseAgreement,
          status: 'pending',
          blockNumber: result.blockNumber,
          transactionHash: result.transactionHash
        });

        res.status(201).json({
          success: true,
          data: result
        });
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    });
    // Access endpoint protected by X402 streaming payments
    router.post('/:leaseId/access', async (req, res) => {
      try {
        const modeParam = (req.query.mode as X402PaymentMode) || 'second';
        const quota = await this.x402Service.buildQuote(
          req.params.leaseId,
          modeParam === 'batch-5s' ? 'batch-5s' : 'second',
          req.query.resource?.toString() || `/api/leases/${req.params.leaseId}/access`
        );

        const paymentHeader = req.header('X-PAYMENT');
        if (!paymentHeader) {
          res.status(402).json({
            success: false,
            error: 'Payment required',
            paymentRequirements: quota.requirements,
            mode: quota.mode,
            formattedAmount: `${quota.formattedAmount} USDC`,
            warning: quota.warning
          });
          return;
        }

        const headerPayload = parsePaymentHeader(paymentHeader);
        if (BigInt(headerPayload.amount) < quota.amountMinorUnits) {
          res.status(402).json({
            success: false,
            error: 'Insufficient payment amount',
            paymentRequirements: quota.requirements
          });
          return;
        }

        const verifyResult = await this.x402Facilitator.verify(paymentHeader, quota.requirements);
        if (!verifyResult.isValid) {
          res.status(402).json({
            success: false,
            error: verifyResult.invalidReason || 'Payment verification failed',
            paymentRequirements: quota.requirements
          });
          return;
        }

        const settlement = await this.x402Facilitator.settle(paymentHeader, quota.requirements);
        if (!settlement.success) {
          res.status(500).json({
            success: false,
            error: settlement.error || 'Payment settlement failed'
          });
          return;
        }

        const bucketSlot = getUtcHourBucket(new Date());
        const intervalSeconds = quota.mode === 'batch-5s' ? 5 : 1;
        await this.services.database.saveX402Payment({
          leaseId: req.params.leaseId,
          mode: quota.mode,
          intervalSeconds,
          amountMinorUnits: quota.amountMinorUnits,
          payer: headerPayload.payer,
          paymentTimestamp: new Date(),
          facilitatorTxHash: settlement.txHash || headerPayload.txHash || '0xmock',
          bucketSlot
        });

        res.json({
          success: true,
          txHash: settlement.txHash,
          networkId: settlement.networkId,
          payer: headerPayload.payer
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Prefund helper
    router.post('/:leaseId/prefund', async (req, res) => {
      try {
        const { recipient, amountMinorUnits } = req.body;
        if (!recipient) {
          res.status(400).json({ success: false, error: 'Recipient required' });
          return;
        }

        const amount = BigInt(amountMinorUnits || '100000000'); // 100 USDC default (6 decimals)
        await this.deployer.mintStablecoins(recipient, amount);

        console.log(`[X402] Prefunded ${recipient} with ${amountMinorUnits || '100000000'} USDC minor units`);

        res.json({
          success: true,
          recipient,
          amountMinorUnits: amount.toString()
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // X402 payment requirements (preview)
    router.get('/:leaseId/x402/requirements', async (req, res) => {
      try {
        const modeParam = (req.query.mode as X402PaymentMode) || 'second';
        const mode: X402PaymentMode = modeParam === 'batch-5s' ? 'batch-5s' : 'second';
        const resource = req.query.resource?.toString() || `/api/leases/${req.params.leaseId}/access`;
        const quote = await this.x402Service.buildQuote(
          req.params.leaseId,
          mode,
          resource,
          req.query.description?.toString()
        );

        res.json({
          success: true,
          data: quote
        });
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.use('/api/leases', router);
  }

  private setupBlockchainRoutes(): void {
    const router = express.Router();

    // Get blockchain network info
    router.get('/network', async (req, res) => {
      try {
        const networkInfo = await this.deployer.getNetworkInfo();
        res.json({
          success: true,
          data: networkInfo
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get deployed contracts
    router.get('/contracts', async (req, res) => {
      try {
        const contracts = this.deployer.getDeployedContracts();
        res.json({
          success: true,
          data: contracts
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Deploy contracts
    router.post('/deploy', async (req, res) => {
      try {
        const deploymentResult = await this.deployer.deployContracts();
        res.json({
          success: true,
          data: deploymentResult
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.use('/api/blockchain', router);
  }

  private setupSystemRoutes(): void {
    const router = express.Router();

    // Get system status
    router.get('/status', async (req, res) => {
      try {
        const status = await this.services.getSystemStatus();
        res.json({
          success: true,
          data: status
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Reset system (development only)
    router.post('/reset', async (req, res) => {
      try {
        await this.services.reset();
        res.json({
          success: true,
          message: 'System reset complete'
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.use('/api/system', router);
  }

  private getAssetTypeId(assetType: string): number {
    const typeMap: Record<string, number> = {
      'satellite': 1,
      'orbital_compute': 2,
      'orbital_relay': 3
    };
    return typeMap[assetType] || 1;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = createServer(this.app);
        this.server.listen(this.config.port, this.config.host, () => {
          console.log(`[API] Server started on http://${this.config.host}:${this.config.port}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('[API] Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getApp(): express.Application {
    return this.app;
  }
}

interface PaymentHeaderPayload {
  payer: string;
  amount: string;
  txHash?: string;
  [key: string]: any;
}

function parsePaymentHeader(header: string): PaymentHeaderPayload {
  try {
    const json = Buffer.from(header, 'base64').toString('utf-8');
    const parsed = JSON.parse(json);
    return {
      payer: parsed.payer || '0xLessee',
      amount: parsed.amount || '0',
      txHash: parsed.txHash
    };
  } catch (error) {
    throw new Error('Invalid X-PAYMENT header payload');
  }
}

function getUtcHourBucket(date: Date): string {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    0,
    0,
    0
  )).toISOString();
}