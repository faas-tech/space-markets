/**
 * API Integration Tests
 *
 * Tests the REST API endpoints against mock blockchain and services
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AssetLeasingApiServer } from './server.js';
import { MockOffChainServices } from '../testing/mock-services.js';
import { ContractDeployer } from '../testing/contract-deployer.js';
import type { AssetMetadata, LeaseAgreement } from '../types/index.js';

describe('Asset Leasing API', () => {
  let apiServer: AssetLeasingApiServer;
  let services: MockOffChainServices;
  let baseUrl: string;

  beforeAll(async () => {
    // Setup mock services
    services = new MockOffChainServices({
      enableApi: true,
      enableDatabase: true
    });
    await services.initialize();
    await services.loadSampleData();

    // Setup mock contract deployer
    const deployer = new ContractDeployer({
      rpcUrl: 'http://localhost:8545',
      privateKey: '0x' + '0'.repeat(64),
      contracts: {}
    });

    // Start API server on test port
    apiServer = new AssetLeasingApiServer(
      {
        port: 3002,
        host: 'localhost'
      },
      {
        offChainServices: services,
        contractDeployer: deployer
      }
    );

    await apiServer.start();
    baseUrl = 'http://localhost:3002';
  });

  afterAll(async () => {
    await apiServer?.stop();
    await services?.shutdown();
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await fetch(`${baseUrl}/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.version).toBe('1.0.0');
    });
  });

  describe('Assets API', () => {
    it('should list all assets', async () => {
      const response = await fetch(`${baseUrl}/api/assets`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.count).toBeGreaterThan(0);
    });

    it('should get specific asset', async () => {
      const response = await fetch(`${baseUrl}/api/assets/SAT-ALPHA-1`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.assetId).toBe('SAT-ALPHA-1');
      expect(data.data.metadata.name).toContain('Satellite');
    });

    it('should return 404 for non-existent asset', async () => {
      const response = await fetch(`${baseUrl}/api/assets/NON-EXISTENT`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Asset not found');
    });

    it('should validate asset metadata structure', async () => {
      const response = await fetch(`${baseUrl}/api/assets/SAT-ALPHA-1`);
      const data = await response.json();

      const asset = data.data;
      expect(asset).toMatchObject({
        assetId: expect.any(String),
        metadata: {
          assetId: expect.any(String),
          name: expect.any(String),
          assetType: expect.stringMatching(/^(satellite|orbital_compute|orbital_relay)$/),
          specifications: expect.any(Object),
          metadata: {
            createdAt: expect.any(String),
            version: expect.any(String)
          }
        }
      });
    });
  });

  describe('Leases API', () => {
    it('should list all leases', async () => {
      const response = await fetch(`${baseUrl}/api/leases`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should get specific lease', async () => {
      // First get a lease ID from the list
      const listResponse = await fetch(`${baseUrl}/api/leases`);
      const listData = await listResponse.json();

      if (listData.data.length > 0) {
        const leaseId = listData.data[0].leaseId;
        const response = await fetch(`${baseUrl}/api/leases/${leaseId}`);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.leaseId).toBe(leaseId);
      }
    });

    it('should validate lease agreement structure', async () => {
      const response = await fetch(`${baseUrl}/api/leases`);
      const data = await response.json();

      if (data.data.length > 0) {
        const lease = data.data[0];
        expect(lease).toMatchObject({
          leaseId: expect.any(String),
          assetId: expect.any(String),
          agreement: {
            terms: {
              paymentAmount: expect.any(String),
              paymentSchedule: expect.any(String)
            },
            metadata: {
              createdAt: expect.any(String),
              version: expect.any(String)
            }
          },
          status: expect.stringMatching(/^(pending|active|completed|terminated)$/)
        });
      }
    });
  });

  describe('Blockchain API', () => {
    it('should get network information', async () => {
      const response = await fetch(`${baseUrl}/api/blockchain/network`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        chainId: expect.any(Number),
        rpcUrl: expect.any(String)
      });
    });

    it('should get deployed contracts', async () => {
      const response = await fetch(`${baseUrl}/api/blockchain/contracts`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(typeof data.data).toBe('object');
    });
  });

  describe('System API', () => {
    it('should get system status', async () => {
      const response = await fetch(`${baseUrl}/api/system/status`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        database: expect.objectContaining({
          connected: expect.any(Boolean)
        }),
        eventListener: expect.objectContaining({
          active: expect.any(Boolean)
        })
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await fetch(`${baseUrl}/api/unknown/endpoint`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Endpoint not found');
    });

    it('should handle malformed JSON', async () => {
      const response = await fetch(`${baseUrl}/api/assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: '{"invalid": json}'
      });

      expect(response.status).toBe(400);
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers', async () => {
      const response = await fetch(`${baseUrl}/health`);

      expect(response.headers.get('access-control-allow-origin')).toBeTruthy();
    });

    it('should handle OPTIONS requests', async () => {
      const response = await fetch(`${baseUrl}/api/assets`, {
        method: 'OPTIONS'
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-methods')).toBeTruthy();
    });
  });
});