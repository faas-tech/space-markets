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
import { ethers } from 'ethers';
import type {
  AssetMetadata,
  LeaseAgreement
} from '../types/index.js';
import type { ContractDeployer } from '../testing/contract-deployer.js';
import { getConfig } from '../config/index.js';
import { X402PaymentService } from '../x402/payment-service.js';
import { X402FacilitatorClient } from '../x402/facilitator-client.js';
import type { X402PaymentMode } from '../types/x402.js';
import { generateMetadataHash, generateLeaseTermsHash } from '../utils/crypto.js';

export interface ApiServerConfig {
  port: number;
  host: string;
  corsOrigins?: string[];
  enableSwagger?: boolean;
}

import type { Database, StoredAsset, StoredLease } from '../storage/database.js';
import { ValidationError } from '../errors.js';

type LeaseStatus = 'pending' | 'active' | 'completed' | 'terminated';

interface OffChainServicesLike {
  database: DatabaseLike;
  getSystemStatus?: () => Promise<SystemStatus>;
  reset?: () => Promise<void>;
}

interface SystemStatus {
  timestamp: string;
  database: { assets: number; leases: number };
}

/** Minimal database shape accepted by the API server */
interface DatabaseLike {
  getAllAssets?: () => Promise<StoredAsset[]>;
  getDatabaseAssets?: () => Promise<StoredAsset[]>;
  getAsset?: (assetId: string) => Promise<StoredAsset | null>;
  getAssetById?: (assetId: string) => Promise<StoredAsset | null>;
  getAllLeases?: () => Promise<StoredLease[]>;
  getDatabaseLeases?: () => Promise<StoredLease[]>;
  getLease?: (leaseId: string) => Promise<StoredLease | null>;
  getLeaseById?: (leaseId: string) => Promise<StoredLease | null>;
  saveAsset?: (record: AssetRecordInput) => Promise<StoredAsset>;
  createAsset?: (record: AssetRecordInput) => Promise<StoredAsset>;
  saveLease?: (record: LeaseRecordInput) => Promise<StoredLease>;
  createLease?: (record: LeaseRecordInput) => Promise<StoredLease>;
  saveX402Payment?: (payment: Omit<import('../types/x402.js').StoredX402Payment, 'id' | 'createdAt'>) => Promise<import('../types/x402.js').StoredX402Payment>;
  clear?: () => Promise<void>;
  cleanup?: () => Promise<void>;
}

export interface ApiRouterConfig {
  offChainServices: OffChainServicesLike;
  contractDeployer: ContractDeployer;
}

interface AssetRecordInput {
  assetId: string;
  chainId: number;
  contractAddress: string;
  tokenAddress: string;
  metadata: AssetMetadata;
  metadataHash: string;
  blockNumber: number;
  transactionHash: string;
}

interface LeaseRecordInput {
  leaseId: string;
  assetId: string;
  chainId: number;
  contractAddress: string;
  lessor: string;
  lessee: string;
  agreement: LeaseAgreement;
  status: LeaseStatus;
  blockNumber: number;
  transactionHash: string;
  offerId?: string;
}

/**
 * Express REST API server for offchain services
 */
export class AssetLeasingApiServer {
  private app: express.Application;
  private server?: ReturnType<typeof createServer>;
  private config: ApiServerConfig;
  private services: OffChainServicesLike;
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
    this.app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('[API Error]', err);
      res.status(500).json({
        error: 'Internal server error'
      });
    });
  }

  private setupAssetRoutes(): void {
    const router = express.Router();

    // Get all assets
    router.get('/', async (req, res) => {
      try {
        const assets = await this.listAssets();
        res.json({
          success: true,
          data: assets,
          count: assets.length
        });
      } catch (error) {
        console.error('[API]', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    // Get specific asset
    router.get('/:assetId', async (req, res) => {
      try {
        const asset = await this.findAssetById(req.params.assetId);
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
      } catch (error) {
        console.error('[API]', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    // Register new asset
    router.post('/', async (req, res) => {
      try {
        const { metadata, tokenName, tokenSymbol, totalSupply, dataURI } = req.body;

        if (!metadata) {
          throw new Error('metadata is required');
        }

        const assetTypeId = this.getAssetTypeId(metadata.assetType);
        const metadataHash = generateMetadataHash(metadata).hash;
        const uri = dataURI || `ipfs://mock/${metadata.assetId}`;
        const supply =
          typeof totalSupply === 'string' || typeof totalSupply === 'number'
            ? BigInt(totalSupply)
            : ethers.parseEther('100000');

        // Register on blockchain
        const result = await this.deployer.registerAsset(
          assetTypeId,
          metadataHash,
          uri,
          tokenName,
          tokenSymbol,
          supply
        );

        const provider = this.deployer.getProvider();
        const receipt = await provider.getTransactionReceipt(result.transactionHash);
        const blockNumber = receipt?.blockNumber ?? result.blockNumber ?? 0;

        // Store in database
        await this.saveAssetRecord({
          assetId: metadata.assetId,
          chainId: await this.deployer.getChainId(),
          contractAddress: result.registryAddress,
          tokenAddress: result.tokenAddress,
          metadata,
          metadataHash: result.metadataHash,
          blockNumber,
          transactionHash: result.transactionHash
        });

        res.status(201).json({
          success: true,
          data: {
            ...result,
            assetId: result.assetId.toString(),
            blockNumber
          }
        });
      } catch (error) {
        const message = error instanceof ValidationError
          ? error.message
          : error instanceof Error ? error.message : 'Bad request';
        res.status(400).json({
          success: false,
          error: message
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
        const leases = await this.listLeases();
        res.json({
          success: true,
          data: leases,
          count: leases.length
        });
      } catch (error) {
        console.error('[API]', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    // Get specific lease
    router.get('/:leaseId', async (req, res) => {
      try {
        const lease = await this.findLeaseById(req.params.leaseId);
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
      } catch (error) {
        console.error('[API]', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    // Create lease offer
    router.post('/', async (req, res) => {
      try {
        const { leaseAgreement } = req.body;
        if (!leaseAgreement) {
          throw new Error('leaseAgreement is required');
        }

        const assetIdInput = req.body.onChainAssetId ?? req.body.assetId ?? req.body.assetOnChainId;
        if (assetIdInput === undefined) {
          throw new Error('on-chain assetId is required (pass onChainAssetId)');
        }
        const assetId = typeof assetIdInput === 'string' ? BigInt(assetIdInput) : BigInt(assetIdInput);

        const parseUnixSeconds = (value?: string): number | undefined => {
          if (!value) return undefined;
          const ms = Number(new Date(value).getTime());
          if (Number.isFinite(ms)) {
            return Math.floor(ms / 1000);
          }
          return undefined;
        };

        const startTime = parseUnixSeconds(leaseAgreement.terms?.startDate) ?? Math.floor(Date.now() / 1000) + 600;
        const endTime = parseUnixSeconds(leaseAgreement.terms?.endDate) ?? startTime + (30 * 24 * 60 * 60);
        const paymentAmount = leaseAgreement.terms?.paymentAmount
          ? BigInt(leaseAgreement.terms.paymentAmount)
          : ethers.parseEther('1000');
        const termsHash = generateLeaseTermsHash(leaseAgreement.terms ?? {}).hash;

        // Create on blockchain
        const result = await this.deployer.postLeaseOffer({
          assetId,
          paymentAmount,
          startTime,
          endTime,
          termsHash,
          leaseAgreement
        });

        const provider = this.deployer.getProvider();
        const receipt = await provider.getTransactionReceipt(result.transactionHash);
        const blockNumber = receipt?.blockNumber ?? 0;
        const deployment = this.deployer.getDeployment();

        // Store in database
        await this.saveLeaseRecord({
          leaseId: leaseAgreement.leaseId,
          assetId: leaseAgreement.assetId,
          chainId: await this.deployer.getChainId(),
          contractAddress: deployment.marketplace.address,
          lessor: leaseAgreement.lessorAddress,
          lessee: leaseAgreement.lesseeAddress,
          agreement: leaseAgreement,
          status: 'pending',
          blockNumber,
          transactionHash: result.transactionHash,
          offerId: result.offerId.toString()
        });

        res.status(201).json({
          success: true,
          data: {
            offerId: result.offerId.toString(),
            transactionHash: result.transactionHash
          }
        });
      } catch (error) {
        const message = error instanceof ValidationError
          ? error.message
          : error instanceof Error ? error.message : 'Bad request';
        res.status(400).json({
          success: false,
          error: message
        });
      }
    });
    // Access endpoint protected by X402 streaming payments
    router.post('/:leaseId/access', async (req, res) => {
      try {
        const { leaseId } = req.params;

        // VALIDATION: Check if lease exists and is active
        const lease = await this.findLeaseById(leaseId);
        if (!lease) {
          res.status(404).json({
            success: false,
            error: 'Lease not found',
            leaseId
          });
          return;
        }

        if (lease.status !== 'active') {
          res.status(403).json({
            success: false,
            error: 'Lease is not active',
            status: lease.status,
            leaseId
          });
          return;
        }

        // Check if lease has started and not expired
        const now = Math.floor(Date.now() / 1000);
        const startTime = new Date(lease.agreement.startTime).getTime() / 1000;
        const endTime = new Date(lease.agreement.endTime).getTime() / 1000;

        if (now < startTime) {
          res.status(403).json({
            success: false,
            error: 'Lease has not started yet',
            startTime: lease.agreement.startTime,
            currentTime: new Date(now * 1000).toISOString()
          });
          return;
        }

        if (now > endTime) {
          res.status(403).json({
            success: false,
            error: 'Lease has expired',
            endTime: lease.agreement.endTime,
            currentTime: new Date(now * 1000).toISOString()
          });
          return;
        }

        const modeParam = (req.query.mode as X402PaymentMode) || 'second';
        const quota = await this.x402Service.buildQuote(
          leaseId,
          modeParam === 'batch-5s' ? 'batch-5s' : 'second',
          req.query.resource?.toString() || `/api/leases/${leaseId}/access`
        );

        // V2: Accept Payment-Signature header with X-PAYMENT fallback for backward compat
        const paymentHeader = req.header('Payment-Signature') || req.header('X-PAYMENT');
        if (!paymentHeader) {
          // V2: Set Payment-Required response header
          res.setHeader('Payment-Required', JSON.stringify(quota.requirements));
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

        // V2: Set Payment-Response header on success
        res.setHeader('Payment-Response', JSON.stringify({
          success: true,
          txHash: settlement.txHash,
          networkId: settlement.networkId
        }));
        res.json({
          success: true,
          txHash: settlement.txHash,
          networkId: settlement.networkId,
          payer: headerPayload.payer
        });
      } catch (error) {
        console.error('[API]', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
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
      } catch (error) {
        console.error('[API]', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
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
          data: {
            ...quote,
            amountMinorUnits: quote.amountMinorUnits.toString()
          }
        });
      } catch (error) {
        const message = error instanceof ValidationError
          ? error.message
          : error instanceof Error ? error.message : 'Bad request';
        res.status(400).json({
          success: false,
          error: message
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
      } catch (error) {
        console.error('[API]', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
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
      } catch (error) {
        console.error('[API]', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
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
      } catch (error) {
        console.error('[API]', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
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
        const status = this.services.getSystemStatus
          ? await this.services.getSystemStatus()
          : await this.defaultSystemStatus();
        res.json({
          success: true,
          data: status
        });
      } catch (error) {
        console.error('[API]', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    // Reset system (development only)
    router.post('/reset', async (req, res) => {
      try {
        if (this.services.reset) {
          await this.services.reset();
        } else if (typeof (this.services.database?.clear) === 'function') {
          await this.services.database.clear();
        } else if (typeof (this.services.database?.cleanup) === 'function') {
          await this.services.database.cleanup();
        }
        res.json({
          success: true,
          message: 'System reset complete'
        });
      } catch (error) {
        console.error('[API]', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    this.app.use('/api/system', router);
  }

  private async listAssets(): Promise<StoredAsset[]> {
    const db = this.services.database;
    if (db.getAllAssets) {
      return await db.getAllAssets();
    }
    if (db.getDatabaseAssets) {
      return await db.getDatabaseAssets();
    }
    return [];
  }

  private async findAssetById(assetId: string): Promise<StoredAsset | null> {
    const db = this.services.database;
    if (db.getAsset) {
      return await db.getAsset(assetId);
    }
    if (db.getAssetById) {
      return await db.getAssetById(assetId);
    }
    return null;
  }

  private async listLeases(): Promise<StoredLease[]> {
    const db = this.services.database;
    if (db.getAllLeases) {
      return await db.getAllLeases();
    }
    if (db.getDatabaseLeases) {
      return await db.getDatabaseLeases();
    }
    return [];
  }

  private async findLeaseById(leaseId: string): Promise<StoredLease | null> {
    const db = this.services.database;
    if (db.getLease) {
      return await db.getLease(leaseId);
    }
    if (db.getLeaseById) {
      return await db.getLeaseById(leaseId);
    }
    return null;
  }

  private async saveAssetRecord(record: AssetRecordInput): Promise<void> {
    const db = this.services.database;
    if (db.saveAsset) {
      await db.saveAsset(record);
      return;
    }
    if (db.createAsset) {
      await db.createAsset(record);
      return;
    }
    console.warn('[API] No asset persistence available on database adapter');
  }

  private async saveLeaseRecord(record: LeaseRecordInput): Promise<void> {
    const db = this.services.database;
    if (db.saveLease) {
      await db.saveLease(record);
      return;
    }
    if (db.createLease) {
      await db.createLease(record);
      return;
    }
    console.warn('[API] No lease persistence available on database adapter');
  }

  private async defaultSystemStatus(): Promise<SystemStatus> {
    const [assets, leases] = await Promise.all([this.listAssets(), this.listLeases()]);
    return {
      timestamp: new Date().toISOString(),
      database: {
        assets: assets.length,
        leases: leases.length
      }
    };
  }

  private getAssetTypeId(assetType: string): string {
    return ethers.id(`asset-type:${assetType}`);
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
  [key: string]: unknown;
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
    throw new Error('Invalid payment header payload (expected base64-encoded JSON via Payment-Signature or X-PAYMENT)');
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