'use client';

import { Panel } from '../ui/panel';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface FuturesContract {
  symbol: string;
  expiryDate: string;
  expiryDays: number;
  lastPrice: number;
  change24h: number;
  volume24h: number;
  openInterest: number;
  contractSize: string;
  marginRequirement: number;
}

interface Position {
  contract: string;
  side: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  margin: number;
}

interface FuturesMarketProps {
  assets: Array<{
    id: string;
    name: string;
    type: string;
    icon: React.ReactNode;
  }>;
}

// Generate futures contracts for an asset
const generateContracts = (assetName: string, basePrice: number): FuturesContract[] => {
  const contracts: FuturesContract[] = [];
  const now = new Date();
  
  // Generate contracts for next 3, 6, 9, and 12 months
  for (let months = 3; months <= 12; months += 3) {
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + months);
    const expiryDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Futures price typically trades at a premium/discount to spot
    const premium = (Math.random() - 0.5) * 0.05; // -2.5% to +2.5%
    const lastPrice = basePrice * (1 + premium);
    const change24h = (Math.random() - 0.5) * 0.04; // -2% to +2%
    
    contracts.push({
      symbol: `${assetName.substring(0, 3).toUpperCase()}-${expiryDate.getFullYear()}${String(expiryDate.getMonth() + 1).padStart(2, '0')}`,
      expiryDate: expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      expiryDays,
      lastPrice,
      change24h,
      volume24h: Math.random() * 50000 + 10000,
      openInterest: Math.random() * 1000000 + 200000,
      contractSize: '1 unit',
      marginRequirement: 0.1, // 10% margin
    });
  }
  
  return contracts;
};

export const FuturesMarket = ({ assets }: FuturesMarketProps) => {
  const [selectedAsset, setSelectedAsset] = useState(assets[0]);
  const [selectedContract, setSelectedContract] = useState<FuturesContract | null>(null);
  const [orderSide, setOrderSide] = useState<'long' | 'short'>('long');
  const [orderQuantity, setOrderQuantity] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [leverage, setLeverage] = useState(5);
  
  // Base prices for different asset types
  const basePrices: Record<string, number> = {
    'Spectrum': 15.4,
    'Storage': 4.2,
    'Compute': 18.5,
  };
  
  const basePrice = basePrices[selectedAsset.type] || 10.0;
  const [contracts, setContracts] = useState(generateContracts(selectedAsset.name, basePrice));
  const [positions, setPositions] = useState<Position[]>([]);
  
  // Update contracts when asset changes
  useEffect(() => {
    const newBasePrice = basePrices[selectedAsset.type] || 10.0;
    setContracts(generateContracts(selectedAsset.name, newBasePrice));
    setSelectedContract(null);
  }, [selectedAsset]);
  
  // Simulate price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setContracts(prev => {
        const updated = prev.map(contract => ({
          ...contract,
          lastPrice: contract.lastPrice * (1 + (Math.random() - 0.5) * 0.01),
          change24h: (Math.random() - 0.5) * 0.04,
        }));
        
        // Update position P/L
        setPositions(prevPos => prevPos.map(pos => {
          const contract = updated.find(c => c.symbol === pos.contract);
          if (contract) {
            const priceDiff = contract.lastPrice - pos.entryPrice;
            const pnl = pos.side === 'long' 
              ? priceDiff * pos.quantity 
              : -priceDiff * pos.quantity;
            return { ...pos, currentPrice: contract.lastPrice, unrealizedPnl: pnl };
          }
          return pos;
        }));
        
        return updated;
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handlePlaceOrder = () => {
    if (!selectedContract || !orderQuantity) return;
    
    const price = orderPrice ? parseFloat(orderPrice) : selectedContract.lastPrice;
    const quantity = parseFloat(orderQuantity);
    const margin = (price * quantity) / leverage;
    
    const newPosition: Position = {
      contract: selectedContract.symbol,
      side: orderSide,
      quantity,
      entryPrice: price,
      currentPrice: selectedContract.lastPrice,
      unrealizedPnl: 0,
      margin,
    };
    
    setPositions(prev => [...prev, newPosition]);
    setOrderQuantity('');
    setOrderPrice('');
  };
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-2">Futures Trading</h3>
        <p className="text-sm text-slate-400">Trade futures contracts with leverage</p>
      </div>
      
      {/* Asset Selector */}
      <Panel className="p-4 mb-4">
        <label className="text-xs text-slate-400 mb-2 block">Select Asset</label>
        <select
          value={selectedAsset.id}
          onChange={(e) => {
            const asset = assets.find(a => a.id === e.target.value);
            if (asset) setSelectedAsset(asset);
          }}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          {assets.map(asset => (
            <option key={asset.id} value={asset.id}>
              {asset.name} ({asset.id})
            </option>
          ))}
        </select>
      </Panel>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Contracts List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contracts Table */}
          <Panel className="p-4">
            <h4 className="text-sm font-bold text-white mb-4">Available Contracts</h4>
            <div className="space-y-2">
              {contracts.map((contract) => (
                <div
                  key={contract.symbol}
                  onClick={() => setSelectedContract(contract)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedContract?.symbol === contract.symbol
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded border border-blue-500/20 text-blue-400 bg-slate-900">
                        {selectedAsset.icon}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{contract.symbol}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {contract.expiryDate} ({contract.expiryDays}d)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-semibold text-white">
                        ${contract.lastPrice.toFixed(2)}
                      </div>
                      <div className={cn(
                        "text-xs flex items-center gap-1",
                        contract.change24h >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {contract.change24h >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {Math.abs(contract.change24h).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mt-2 pt-2 border-t border-slate-800">
                    <div>
                      <div className="text-slate-500">Volume</div>
                      <div className="text-slate-300 font-mono">{contract.volume24h.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Open Interest</div>
                      <div className="text-slate-300 font-mono">{contract.openInterest.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Margin</div>
                      <div className="text-slate-300 font-mono">{(contract.marginRequirement * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          
          {/* Positions */}
          {positions.length > 0 && (
            <Panel className="p-4">
              <h4 className="text-sm font-bold text-white mb-4">Open Positions</h4>
              <div className="space-y-2">
                {positions.map((position) => (
                  <div
                    key={`${position.contract}-${position.side}-${position.entryPrice}`}
                    className="p-3 rounded-lg border border-slate-800 bg-slate-900/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge color={position.side === 'long' ? 'green' : 'red'}>
                          {position.side.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-mono text-white">{position.contract}</span>
                      </div>
                      <div className={cn(
                        "text-sm font-mono font-semibold",
                        position.unrealizedPnl >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {position.unrealizedPnl >= 0 ? '+' : ''}${position.unrealizedPnl.toFixed(2)}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <div className="text-slate-500">Quantity</div>
                        <div className="text-slate-300 font-mono">{position.quantity}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Entry</div>
                        <div className="text-slate-300 font-mono">${position.entryPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Current</div>
                        <div className="text-slate-300 font-mono">${position.currentPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Margin</div>
                        <div className="text-slate-300 font-mono">${position.margin.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
        
        {/* Right: Order Entry */}
        <div className="space-y-4">
          <Panel className="p-4">
            <h4 className="text-sm font-bold text-white mb-4">Place Order</h4>
            
            {selectedContract ? (
              <>
                <div className="mb-4 p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                  <div className="text-xs text-slate-500 mb-1">Selected Contract</div>
                  <div className="font-bold text-white">{selectedContract.symbol}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Expires: {selectedContract.expiryDate}
                  </div>
                </div>
                
                {/* Side Selection */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    onClick={() => setOrderSide('long')}
                    className={cn(
                      "px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                      orderSide === 'long'
                        ? "border-green-500 bg-green-500/20 text-green-400"
                        : "border-slate-700 text-slate-400 hover:border-slate-600"
                    )}
                  >
                    Long
                  </button>
                  <button
                    onClick={() => setOrderSide('short')}
                    className={cn(
                      "px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                      orderSide === 'short'
                        ? "border-red-500 bg-red-500/20 text-red-400"
                        : "border-slate-700 text-slate-400 hover:border-slate-600"
                    )}
                  >
                    Short
                  </button>
                </div>
                
                {/* Leverage */}
                <div className="mb-4">
                  <label className="text-xs text-slate-400 mb-2 block">Leverage</label>
                  <select
                    value={leverage}
                    onChange={(e) => setLeverage(parseInt(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    {[1, 2, 3, 5, 10, 20].map(lev => (
                      <option key={lev} value={lev}>{lev}x</option>
                    ))}
                  </select>
                </div>
                
                {/* Quantity */}
                <div className="mb-4">
                  <label className="text-xs text-slate-400 mb-2 block">Quantity</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                {/* Price (optional, defaults to market) */}
                <div className="mb-4">
                  <label className="text-xs text-slate-400 mb-2 block">Price (Market: ${selectedContract.lastPrice.toFixed(2)})</label>
                  <input
                    type="number"
                    placeholder="Market"
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                {/* Order Summary */}
                {orderQuantity && (
                  <div className="mb-4 p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                    <div className="text-xs text-slate-500 mb-2">Order Summary</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Notional Value</span>
                        <span className="text-white font-mono">
                          ${((orderPrice ? parseFloat(orderPrice) : selectedContract.lastPrice) * parseFloat(orderQuantity)).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Required Margin</span>
                        <span className="text-white font-mono">
                          ${((orderPrice ? parseFloat(orderPrice) : selectedContract.lastPrice) * parseFloat(orderQuantity) / leverage).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                <Button
                  variant={orderSide === 'long' ? 'primary' : 'outline'}
                  className={cn(
                    "w-full",
                    orderSide === 'short' && "border-red-500/50 text-red-400 hover:bg-red-500/10"
                  )}
                  onClick={handlePlaceOrder}
                  disabled={!orderQuantity}
                >
                  {orderSide === 'long' ? 'Open Long' : 'Open Short'}
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">
                Select a contract to place an order
              </div>
            )}
          </Panel>
          
          {/* Contract Info */}
          {selectedContract && (
            <Panel className="p-4">
              <h4 className="text-sm font-bold text-white mb-4">Contract Details</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Contract Size</span>
                  <span className="text-white">{selectedContract.contractSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expiry Date</span>
                  <span className="text-white">{selectedContract.expiryDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Days to Expiry</span>
                  <span className="text-white">{selectedContract.expiryDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Margin Requirement</span>
                  <span className="text-white">{(selectedContract.marginRequirement * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">24h Volume</span>
                  <span className="text-white font-mono">{selectedContract.volume24h.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Open Interest</span>
                  <span className="text-white font-mono">{selectedContract.openInterest.toLocaleString()}</span>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
};

