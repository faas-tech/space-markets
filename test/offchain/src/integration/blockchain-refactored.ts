/**
 * Blockchain Service - REFACTORED PROTOCOL
 *
 * High-level interface for interacting with the refactored Asset Leasing Protocol.
 * Uses the new two-step asset creation, metadata storage, and direct holder enumeration.
 */

import { ethers, Contract, TransactionReceipt } from 'ethers';
import type { ContractAddresses } from '../types/index.js';
import type { MetadataEntry } from '../utils/metadata-converter.js';

// Import ABIs
import AssetRegistryABI from '../abi/AssetRegistry.json' assert { type: 'json' };
import AssetERC20ABI from '../abi/AssetERC20.json' assert { type: 'json' };
import MarketplaceABI from '../abi/Marketplace.json' assert { type: 'json' };
import LeaseFactoryABI from '../abi/LeaseFactory.json' assert { type: 'json' };

export interface BlockchainConfig {
  rpcUrl: string;
  privateKey: string;
  contracts: ContractAddresses;
}

export interface TokenHolder {
  address: string;
  balance: bigint;
}

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contracts: {
    assetRegistry: Contract;
    marketplace: Contract;
    leaseFactory: Contract;
  };

  constructor(config: BlockchainConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);

    this.contracts = {
      assetRegistry: new ethers.Contract(config.contracts.assetRegistry, AssetRegistryABI, this.wallet),
      marketplace: new ethers.Contract(config.contracts.marketplace, MarketplaceABI, this.wallet),
      leaseFactory: new ethers.Contract(config.contracts.leaseFactory, LeaseFactoryABI, this.wallet)
    };
  }

  async createAssetType(
    name: string,
    schemaHash: string,
    requiredLeaseKeys: string[],
    metadata: MetadataEntry[]
  ): Promise<{ txHash: string; schemaHash: string }> {
    const tx = await this.contracts.assetRegistry.createAsset(name, schemaHash, requiredLeaseKeys, metadata);
    await tx.wait();
    return { txHash: tx.hash, schemaHash };
  }

  async registerAsset(
    schemaHash: string,
    tokenName: string,
    tokenSymbol: string,
    totalSupply: bigint,
    admin: string,
    tokenRecipient: string,
    metadata: MetadataEntry[]
  ): Promise<{ assetId: bigint; tokenAddress: string; txHash: string }> {
    const tx = await this.contracts.assetRegistry.registerAsset(
      schemaHash, tokenName, tokenSymbol, totalSupply, admin, tokenRecipient, metadata
    );

    const receipt: TransactionReceipt = await tx.wait();
    const iface = this.contracts.assetRegistry.interface;

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed && parsed.name === 'AssetRegistered') {
          return {
            assetId: parsed.args.assetId,
            tokenAddress: parsed.args.tokenAddress,
            txHash: tx.hash
          };
        }
      } catch { continue; }
    }

    throw new Error('AssetRegistered event not found');
  }

  async getAsset(assetId: bigint): Promise<{ schemaHash: string; issuer: string; tokenAddress: string }> {
    const asset = await this.contracts.assetRegistry.getAsset(assetId);
    return { schemaHash: asset.schemaHash, issuer: asset.issuer, tokenAddress: asset.tokenAddress };
  }

  async getAssetHolders(tokenAddress: string): Promise<TokenHolder[]> {
    const token = new ethers.Contract(tokenAddress, AssetERC20ABI, this.provider);
    const result = await token.getHolders();
    const holders: string[] = result[0];
    const balances: bigint[] = result[1];
    return holders.map((address, index) => ({ address, balance: balances[index] }));
  }

  async getAssetMetadata(tokenAddress: string, keys: string[]): Promise<Record<string, string>> {
    const token = new ethers.Contract(tokenAddress, AssetERC20ABI, this.provider);
    const metadata: Record<string, string> = {};
    for (const key of keys) {
      metadata[key] = await token.getMetadata(key);
    }
    return metadata;
  }

  async getAllMetadataKeys(tokenAddress: string): Promise<string[]> {
    const token = new ethers.Contract(tokenAddress, AssetERC20ABI, this.provider);
    return await token.getAllMetadataKeys();
  }

  getSignerAddress(): string {
    return this.wallet.address;
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }
}