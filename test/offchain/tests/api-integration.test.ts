import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';
import { ethers } from 'ethers';
import { AssetLeasingApiServer } from '../src/api/server.js';
import { MockDatabase } from '../src/storage/database.js';
import { createSatelliteAsset, createSatelliteLease } from '../src/utils/test-data-factory.js';

describe('Asset Leasing API Integration', () => {
  let deployer: ReturnType<typeof createFakeDeployer>;
  let apiServer: AssetLeasingApiServer;
  let database: MockDatabase;
  let baseUrl: string;

  let registeredAssetOnChainId: bigint;
  let registeredAssetMetadataId: string;
  const lessorAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  const lesseeAddress = '0xdD11751cdD3f6EFf01B1f6151B640685bfa5dB4a';

  beforeAll(async () => {
    deployer = createFakeDeployer();
    database = new MockDatabase();
    await database.connect();

    const services = {
      database,
      getSystemStatus: async () => ({
        timestamp: new Date().toISOString(),
        database: {
          connected: database.isConnected(),
          assets: (await database.getAllAssets()).length,
          leases: (await database.getAllLeases()).length
        }
      }),
      reset: async () => {
        await database.clear();
      }
    };

    apiServer = new AssetLeasingApiServer(
      {
        port: 4005,
        host: '127.0.0.1'
      },
      {
        offChainServices: services,
        contractDeployer: deployer
      }
    );

    await apiServer.start();
    baseUrl = 'http://127.0.0.1:4005';
  }, 120000);

  afterAll(async () => {
    await apiServer?.stop();
    await database?.disconnect();
  }, 60000);

  it('registers assets via REST and persists them', async () => {
    const healthResponse = await fetch(`${baseUrl}/health`);
    expect(healthResponse.status).toBe(200);

    const metadata = createSatelliteAsset({
      name: 'API Flow Satellite',
      altitude: 561
    });

    const assetResponse = await fetch(`${baseUrl}/api/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metadata,
        tokenName: 'API Flow Token',
        tokenSymbol: 'APIFLOW',
        totalSupply: ethers.parseEther('100000').toString(),
        dataURI: `ipfs://api-demo/${metadata.assetId}`
      })
    });

    const assetBody = await assetResponse.json();
    if (assetResponse.status !== 201) {
      console.error('asset creation error', assetBody);
    }
    expect(assetResponse.status).toBe(201);
    expect(assetBody.success).toBe(true);
    expect(assetBody.data.assetId).toBeDefined();

    registeredAssetOnChainId = BigInt(assetBody.data.assetId);
    registeredAssetMetadataId = metadata.assetId;

    const storedAssets = await database.getAllAssets();
    expect(storedAssets).toHaveLength(1);
    expect(storedAssets[0].metadata.name).toBe('API Flow Satellite');
  });

  it('creates lease offers and authorizes X402 access flow', async () => {
    expect(registeredAssetOnChainId).toBeDefined();
    expect(registeredAssetMetadataId).toBeDefined();

    const leaseAgreement = createSatelliteLease({
      assetId: registeredAssetMetadataId,
      lessorAddress,
      lesseeAddress,
      paymentAmount: ethers.parseEther('3600').toString(),
      durationDays: 45
    });

    const leaseResponse = await fetch(`${baseUrl}/api/leases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leaseAgreement,
        onChainAssetId: registeredAssetOnChainId.toString()
      })
    });

    const leaseBody = await leaseResponse.json();
    expect(leaseResponse.status).toBe(201);
    expect(leaseBody.success).toBe(true);
    expect(leaseBody.data.offerId).toBeDefined();

    // Activate the lease so the access endpoint allows X402 flow
    await database.updateLease(leaseAgreement.leaseId, { status: 'active' });

    const requirementsResponse = await fetch(
      `${baseUrl}/api/leases/${leaseAgreement.leaseId}/x402/requirements?mode=batch-5s`
    );
    const requirementsBody = await requirementsResponse.json();
    if (requirementsResponse.status !== 200) {
      console.error('requirements error', requirementsBody);
    }
    expect(requirementsResponse.status).toBe(200);
    expect(requirementsBody.success).toBe(true);

    const quote = requirementsBody.data;

    const unauthorizedAccess = await fetch(
      `${baseUrl}/api/leases/${leaseAgreement.leaseId}/access?mode=batch-5s`,
      {
        method: 'POST'
      }
    );
    expect(unauthorizedAccess.status).toBe(402);

    const paymentHeader = encodePaymentHeader({
      payer: lesseeAddress,
      amount: (BigInt(quote.amountMinorUnits) + 1000n).toString()
    });

    const authorizedAccess = await fetch(
      `${baseUrl}/api/leases/${leaseAgreement.leaseId}/access?mode=batch-5s`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Payment-Signature': paymentHeader
        }
      }
    );

    const accessBody = await authorizedAccess.json();
    expect(authorizedAccess.status).toBe(200);
    expect(accessBody.success).toBe(true);

    const storedPayments = await database.getX402PaymentsByLease(leaseAgreement.leaseId);
    expect(storedPayments).toHaveLength(1);
    expect(storedPayments[0].mode).toBe('batch-5s');
  });
});

function encodePaymentHeader(params: { payer: string; amount: string }): string {
  const payload = {
    payer: params.payer,
    amount: params.amount,
    issuedAt: new Date().toISOString(),
    txHash: `0xmock${Date.now().toString(16)}`
  };
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64');
}

function createFakeDeployer() {
  let assetCounter = 0n;
  let offerCounter = 0n;
  const provider = {
    async getTransactionReceipt() {
      return { blockNumber: 123 };
    }
  };

  return {
    async registerAssetType() {
      return { typeId: '0x' + '1'.repeat(64), transactionHash: '0xseed' };
    },
    async registerAsset(
      _schemaIdentifier: string,
      metadataHash: string,
      dataURI: string
    ) {
      assetCounter += 1n;
      return {
        assetId: assetCounter,
        tokenAddress: '0x0000000000000000000000000000000000000a11',
        transactionHash: '0xasset',
        registryAddress: '0x0000000000000000000000000000000000000b22',
        blockNumber: 50,
        metadataHash,
        dataURI
      };
    },
    async postLeaseOffer() {
      offerCounter += 1n;
      return {
        offerId: offerCounter,
        transactionHash: '0xoffer'
      };
    },
    async mintStablecoins() {
      return;
    },
    async getChainId() {
      return 31337;
    },
    getProvider() {
      return provider;
    },
    getDeployment() {
      return {
        marketplace: { address: '0x0000000000000000000000000000000000000c33', contract: {} },
        mockStablecoin: { contract: { address: '0x0000000000000000000000000000000000000d44' } }
      };
    },
    async syncNonce() {
      return;
    }
  };
}

