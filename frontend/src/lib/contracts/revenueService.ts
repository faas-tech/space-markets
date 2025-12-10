import { ethers } from 'ethers';
import { MARKETPLACE_ABI } from './marketplace';

export class RevenueService {
  private contract: ethers.Contract;
  private signer: ethers.Signer;

  constructor(marketplaceAddress: string, signer: ethers.Signer) {
    this.contract = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, signer);
    this.signer = signer;
  }

  /**
   * Get claimable revenue for connected wallet
   */
  async getClaimableAmount(): Promise<string> {
    const address = await this.signer.getAddress();
    const amount = await this.contract.claims(address);
    return ethers.formatEther(amount);
  }

  /**
   * Claim all available revenue
   */
  async claimRevenue(): Promise<{ amount: string; receipt: ethers.ContractTransactionReceipt }> {
    const tx = await this.contract.claimRevenue();
    const receipt = await tx.wait();

    const event = receipt.logs
      .map((log: any) => {
        try {
          return this.contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === 'RevenueClaimed');

    return {
      amount: event ? ethers.formatEther(event.args.share) : '0',
      receipt
    };
  }
}

