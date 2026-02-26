'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { AssetRegistryService } from '@/lib/contracts/assetRegistry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';

type AssetType = 'satellite' | 'orbital_compute' | 'orbital_relay';

export function AssetRegistrationForm() {
  const { signer } = useWallet();
  const [formData, setFormData] = useState({
    assetType: 'orbital_compute' as AssetType,
    name: '',
    description: '',
    tokenName: '',
    tokenSymbol: '',
    totalSupply: '1000000',
    // Specifications
    cpuCores: 64,
    ramGb: 512,
    storageTb: 100
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ assetId: string; tokenAddress: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer) return;

    setLoading(true);
    try {
      const service = new AssetRegistryService(
        process.env.NEXT_PUBLIC_ASSET_REGISTRY!,
        signer
      );

      // Create metadata object
      const metadata = {
        name: formData.name,
        description: formData.description,
        assetType: formData.assetType,
        specifications: {
          type: formData.assetType,
          compute: {
            cpu_cores: formData.cpuCores,
            ram_gb: formData.ramGb,
            storage_tb: formData.storageTb
          }
        },
        metadata: {
          createdAt: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      const { assetId, tokenAddress } = await service.registerAsset(
        formData.assetType,
        formData.tokenName,
        formData.tokenSymbol,
        formData.totalSupply,
        metadata
      );

      setResult({
        assetId: assetId.toString(),
        tokenAddress
      });
    } catch (error) {
      console.error('Asset registration failed:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-6 text-white">Register New Asset</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Asset Type</label>
          <select
            value={formData.assetType}
            onChange={(e) => setFormData({ ...formData, assetType: e.target.value as AssetType })}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-2 px-4 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50"
          >
            <option value="satellite">Satellite</option>
            <option value="orbital_compute">Orbital Compute Station</option>
            <option value="orbital_relay">Orbital Relay</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1 block">Asset Name</label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Orbital Compute Station Alpha"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Token Name</label>
              <Input
                type="text"
                value={formData.tokenName}
                onChange={(e) => setFormData({ ...formData, tokenName: e.target.value })}
                placeholder="OCS Alpha Token"
                required
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Token Symbol</label>
              <Input
                type="text"
                value={formData.tokenSymbol}
                onChange={(e) => setFormData({ ...formData, tokenSymbol: e.target.value })}
                placeholder="OCS-A"
                required
              />
            </div>
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1 block">Total Supply</label>
          <Input
            type="number"
            value={formData.totalSupply}
            onChange={(e) => setFormData({ ...formData, totalSupply: e.target.value })}
            required
          />
        </div>

        <div className="pt-4">
            <Button
                type="submit"
                disabled={loading || !signer}
                className="w-full"
            >
                {loading ? 'Registering...' : 'Register Asset'}
            </Button>
        </div>

        {result && (
          <div className="mt-4 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
            <p className="font-bold text-emerald-400">Asset Registered!</p>
            <p className="text-sm text-emerald-200/80">Asset ID: {result.assetId}</p>
            <p className="text-xs text-emerald-200/60 break-all">Token: {result.tokenAddress}</p>
          </div>
        )}
      </form>
    </Panel>
  );
}

