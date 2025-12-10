import { ethers } from 'ethers';

export const ASSET_REGISTRY_ABI = [
  "function createAssetType(string memory name, bytes32 assetType, bytes32[] memory requiredLeaseKeys, tuple(bytes32 key, bytes value)[] memory metadata) external",
  "function registerAsset(bytes32 assetType, string memory tokenName, string memory tokenSymbol, uint256 totalSupply, address admin, address upgrader, address tokenRecipient, tuple(bytes32 key, bytes value)[] memory metadata) external returns (uint256 assetId, address tokenAddress)",
  "function getAsset(uint256 assetId) external view returns (tuple(uint256 assetId, bytes32 assetType, address tokenAddress, address creator, uint256 createdAt, tuple(bytes32 key, bytes value)[] metadata))",
  "event AssetRegistered(uint256 indexed assetId, bytes32 indexed assetType, address indexed tokenAddress, address creator)"
];

export interface AssetMetadata {
  key: string;
  value: string;
}

export class AssetRegistryService {
  private contract: ethers.Contract;
  private signer: ethers.Signer;

  constructor(contractAddress: string, signer: ethers.Signer) {
    this.contract = new ethers.Contract(contractAddress, ASSET_REGISTRY_ABI, signer);
    this.signer = signer;
  }

  /**
   * Step 1: Create Asset Type (one-time setup)
   */
  async createAssetType(
    name: string,
    assetType: 'satellite' | 'orbital_compute' | 'orbital_relay',
    requiredLeaseKeys: string[] = []
  ): Promise<ethers.ContractTransactionReceipt> {
    const assetTypeHash = ethers.keccak256(ethers.toUtf8Bytes(assetType));
    const keyHashes = requiredLeaseKeys.map(key => ethers.keccak256(ethers.toUtf8Bytes(key)));

    const metadata: [string, string][] = [
      [ethers.keccak256(ethers.toUtf8Bytes('name')), ethers.hexlify(ethers.toUtf8Bytes(name))],
      [ethers.keccak256(ethers.toUtf8Bytes('created')), ethers.hexlify(ethers.toUtf8Bytes(new Date().toISOString()))]
    ];

    const tx = await this.contract.createAssetType(name, assetTypeHash, keyHashes, metadata);
    return await tx.wait();
  }

  /**
   * Step 2: Register Asset
   */
  async registerAsset(
    assetType: 'satellite' | 'orbital_compute' | 'orbital_relay',
    tokenName: string,
    tokenSymbol: string,
    totalSupply: string, // e.g., "1000000"
    metadata: Record<string, any>,
    admin?: string,
    upgrader?: string,
    tokenRecipient?: string
  ): Promise<{ assetId: bigint; tokenAddress: string; receipt: ethers.ContractTransactionReceipt }> {
    const assetTypeHash = ethers.keccak256(ethers.toUtf8Bytes(assetType));
    const supply = ethers.parseEther(totalSupply);

    // Convert metadata to onchain format
    const metadataArray = this.convertMetadataToOnchain(metadata);

    // Default addresses to caller if not provided
    const caller = await this.signer.getAddress();
    const adminAddress = admin || caller;
    const upgraderAddress = upgrader || caller;
    const recipientAddress = tokenRecipient || caller;

    const tx = await this.contract.registerAsset(
      assetTypeHash,
      tokenName,
      tokenSymbol,
      supply,
      adminAddress,
      upgraderAddress,
      recipientAddress,
      metadataArray
    );

    const receipt = await tx.wait();

    // Parse AssetRegistered event
    const event = receipt.logs
      .map((log: any) => {
        try {
          return this.contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === 'AssetRegistered');

    if (!event) {
      throw new Error('AssetRegistered event not found');
    }

    return {
      assetId: event.args.assetId,
      tokenAddress: event.args.tokenAddress,
      receipt
    };
  }

  /**
   * Convert JavaScript metadata to onchain format
   */
  private convertMetadataToOnchain(metadata: Record<string, any>): [string, string][] {
    const result: [string, string][] = [];

    const flatten = (obj: any, prefix = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}_${key}` : key;

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          flatten(value, fullKey);
        } else {
          const keyHash = ethers.keccak256(ethers.toUtf8Bytes(fullKey));
          const valueBytes = ethers.hexlify(ethers.toUtf8Bytes(JSON.stringify(value)));
          result.push([keyHash, valueBytes]);
        }
      }
    };

    flatten(metadata);
    return result;
  }

  /**
   * Get asset details
   */
  async getAsset(assetId: bigint) {
    return await this.contract.getAsset(assetId);
  }
}

