'use client';

import { Panel } from '../ui/panel';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { DataText } from '../ui/data-text';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

interface Trade {
  id: string;
  price: number;
  amount: number;
  time: string;
  side: 'buy' | 'sell';
}

interface SpotMarketProps {
  assets: Array<{
    id: string;
    name: string;
    type: string;
    icon: React.ReactNode;
  }>;
}

// Generate realistic order book data
const generateOrderBook = (basePrice: number): { bids: OrderBookEntry[], asks: OrderBookEntry[] } => {
  const bids: OrderBookEntry[] = [];
  const asks: OrderBookEntry[] = [];
  
  let bidTotal = 0;
  let askTotal = 0;
  
  // Generate bids (below market price)
  for (let i = 0; i < 10; i++) {
    const price = basePrice * (1 - (i + 1) * 0.01 - Math.random() * 0.005);
    const amount = Math.random() * 50 + 10;
    bidTotal += amount;
    bids.push({ price, amount, total: bidTotal });
  }
  
  // Generate asks (above market price)
  for (let i = 0; i < 10; i++) {
    const price = basePrice * (1 + (i + 1) * 0.01 + Math.random() * 0.005);
    const amount = Math.random() * 50 + 10;
    askTotal += amount;
    asks.push({ price, amount, total: askTotal });
  }
  
  return { bids: bids.reverse(), asks };
};

// Generate recent trades
const generateTrades = (basePrice: number): Trade[] => {
  const trades: Trade[] = [];
  const now = new Date();
  
  for (let i = 0; i < 15; i++) {
    const price = basePrice * (1 + (Math.random() - 0.5) * 0.02);
    const amount = Math.random() * 100 + 5;
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    const time = new Date(now.getTime() - i * 60000 - Math.random() * 60000);
    
    trades.push({
      id: `trade-${i}`,
      price,
      amount,
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      side,
    });
  }
  
  return trades;
};

export const SpotMarket = ({ assets }: SpotMarketProps) => {
  const [selectedAsset, setSelectedAsset] = useState(assets[0]);
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [orderAmount, setOrderAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  
  // Base price varies by asset type
  const basePrices: Record<string, number> = {
    'Spectrum': 15.4,
    'Storage': 4.2,
    'Compute': 18.5,
  };
  
  const basePrice = basePrices[selectedAsset.type] || 10.0;
  const [currentPrice, setCurrentPrice] = useState(basePrice);
  const [priceChange24h, setPriceChange24h] = useState(0);
  const [orderBook, setOrderBook] = useState(generateOrderBook(basePrice));
  const [trades, setTrades] = useState(generateTrades(basePrice));
  
  // Simulate price updates
  useEffect(() => {
    const interval = setInterval(() => {
      const change = (Math.random() - 0.5) * 0.02; // ±1% change
      const newPrice = currentPrice * (1 + change);
      setCurrentPrice(newPrice);
      setPriceChange24h((newPrice - basePrice) / basePrice * 100);
      setOrderBook(generateOrderBook(newPrice));
      
      // Add new trade
      const newTrade: Trade = {
        id: `trade-${Date.now()}`,
        price: newPrice * (1 + (Math.random() - 0.5) * 0.01),
        amount: Math.random() * 100 + 5,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        side: Math.random() > 0.5 ? 'buy' : 'sell',
      };
      setTrades(prev => [newTrade, ...prev.slice(0, 14)]);
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, [currentPrice, basePrice]);
  
  const bestBid = orderBook.bids[orderBook.bids.length - 1];
  const bestAsk = orderBook.asks[0];
  const spread = bestAsk ? bestAsk.price - bestBid.price : 0;
  const spreadPercent = bestBid ? (spread / bestBid.price) * 100 : 0;
  
  return (
    <div className="space-y-4">
      {/* Asset Selector */}
      <Panel className="p-4">
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
      {/* Left Column: Order Book */}
      <div className="lg:col-span-2 space-y-4">
        {/* Market Price Header */}
        <Panel className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg border border-blue-500/20 text-blue-400 bg-slate-900">
                {selectedAsset.icon}
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{selectedAsset.name}</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedAsset.id}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono font-light text-white mb-1">
                ${currentPrice.toFixed(2)}
              </div>
              <div className={cn(
                "text-sm font-medium flex items-center gap-1",
                priceChange24h >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {priceChange24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(priceChange24h).toFixed(2)}% (24h)
              </div>
            </div>
          </div>
          
          {/* Market Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800">
            <div>
              <div className="text-xs text-slate-500 mb-1">Best Bid</div>
              <div className="text-green-400 font-mono font-semibold">
                ${bestBid?.price.toFixed(2) || '0.00'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Best Ask</div>
              <div className="text-red-400 font-mono font-semibold">
                ${bestAsk?.price.toFixed(2) || '0.00'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Spread</div>
              <div className="text-slate-300 font-mono font-semibold">
                ${spread.toFixed(2)} ({spreadPercent.toFixed(2)}%)
              </div>
            </div>
          </div>
        </Panel>
        
        {/* Order Book */}
        <Panel className="p-4">
          <h4 className="text-sm font-bold text-white mb-4">Order Book</h4>
          <div className="grid grid-cols-2 gap-4">
            {/* Bids */}
            <div>
              <div className="text-xs text-slate-500 mb-2 flex justify-between">
                <span>Price (USDC)</span>
                <span>Amount</span>
              </div>
              <div className="space-y-0.5">
                {orderBook.bids.slice(-8).reverse().map((bid, i) => (
                  <div
                    key={`bid-${i}`}
                    className="flex justify-between text-xs font-mono hover:bg-slate-900/50 px-2 py-1 rounded"
                    style={{
                      background: `linear-gradient(to right, rgba(34, 197, 94, ${bid.amount / 100}), transparent)`,
                    }}
                  >
                    <span className="text-green-400">{bid.price.toFixed(2)}</span>
                    <span className="text-slate-300">{bid.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Asks */}
            <div>
              <div className="text-xs text-slate-500 mb-2 flex justify-between">
                <span>Price (USDC)</span>
                <span>Amount</span>
              </div>
              <div className="space-y-0.5">
                {orderBook.asks.slice(0, 8).map((ask, i) => (
                  <div
                    key={`ask-${i}`}
                    className="flex justify-between text-xs font-mono hover:bg-slate-900/50 px-2 py-1 rounded"
                    style={{
                      background: `linear-gradient(to right, rgba(239, 68, 68, ${ask.amount / 100}), transparent)`,
                    }}
                  >
                    <span className="text-red-400">{ask.price.toFixed(2)}</span>
                    <span className="text-slate-300">{ask.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
        
        {/* Recent Trades */}
        <Panel className="p-4">
          <h4 className="text-sm font-bold text-white mb-4">Recent Trades</h4>
          <div className="space-y-1">
            {trades.slice(0, 10).map((trade) => (
              <div
                key={trade.id}
                className="flex justify-between text-xs font-mono py-1 px-2 hover:bg-slate-900/50 rounded"
              >
                <span className={cn(
                  trade.side === 'buy' ? 'text-green-400' : 'text-red-400'
                )}>
                  ${trade.price.toFixed(2)}
                </span>
                <span className="text-slate-400">{trade.amount.toFixed(2)}</span>
                <span className="text-slate-500">{trade.time}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      
      {/* Right Column: Buy/Sell Panel */}
      <div className="space-y-4">
        <Panel className="p-4">
          <h4 className="text-sm font-bold text-white mb-4">Place Order</h4>
          
          {/* Buy/Sell Toggle Switch */}
          <div className="mb-3">
            <div className="relative inline-flex rounded-lg bg-slate-900 p-1 border border-slate-800">
              <button
                onClick={() => setOrderSide('buy')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                  orderSide === 'buy'
                    ? "bg-green-500/20 text-green-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-300"
                )}
              >
                Buy
              </button>
              <button
                onClick={() => setOrderSide('sell')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                  orderSide === 'sell'
                    ? "bg-red-500/20 text-red-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-300"
                )}
              >
                Sell
              </button>
            </div>
          </div>
          
          {/* Order Type Toggle */}
          <div className="mb-4">
            <div className="relative inline-flex rounded-lg bg-slate-900 p-1 border border-slate-800 w-full">
              <button
                onClick={() => {
                  setOrderType('market');
                  setLimitPrice('');
                }}
                className={cn(
                  "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  orderType === 'market'
                    ? "bg-blue-500/20 text-blue-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-300"
                )}
              >
                Market
              </button>
              <button
                onClick={() => setOrderType('limit')}
                className={cn(
                  "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  orderType === 'limit'
                    ? "bg-blue-500/20 text-blue-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-300"
                )}
              >
                Limit
              </button>
            </div>
          </div>
          
          {/* Order Form */}
          <div className="space-y-3">
            {/* Price Input (Limit Orders) or Market Price Display (Market Orders) */}
            {orderType === 'limit' ? (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Limit Price</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  step="0.01"
                  className={cn(
                    "w-full bg-slate-900 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 transition-all",
                    orderSide === 'buy'
                      ? "border-slate-700 focus:border-green-500 focus:ring-green-500/20"
                      : "border-slate-700 focus:border-red-500 focus:ring-red-500/20"
                  )}
                />
                <div className="mt-1 text-xs text-slate-500">
                  Market: ${orderSide === 'buy' 
                    ? (bestAsk?.price.toFixed(2) || currentPrice.toFixed(2))
                    : (bestBid?.price.toFixed(2) || currentPrice.toFixed(2))
                  }
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400">Market Price</span>
                <span className={cn(
                  "text-sm font-mono font-semibold",
                  orderSide === 'buy' ? "text-green-400" : "text-red-400"
                )}>
                  ${orderSide === 'buy' 
                    ? (bestAsk?.price.toFixed(2) || currentPrice.toFixed(2))
                    : (bestBid?.price.toFixed(2) || currentPrice.toFixed(2))
                  }
                </span>
              </div>
            )}
            
            {/* Amount Input */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Amount</label>
              <input
                type="number"
                placeholder="0.00"
                value={orderAmount}
                onChange={(e) => setOrderAmount(e.target.value)}
                step="0.01"
                className={cn(
                  "w-full bg-slate-900 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 transition-all",
                  orderSide === 'buy'
                    ? "border-slate-700 focus:border-green-500 focus:ring-green-500/20"
                    : "border-slate-700 focus:border-red-500 focus:ring-red-500/20"
                )}
              />
            </div>
            
            {/* Order Summary (for Limit Orders) */}
            {orderType === 'limit' && limitPrice && orderAmount && (
              <div className="p-2 bg-slate-900/50 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Order Total</div>
                <div className="text-sm font-mono text-white font-semibold">
                  ${(parseFloat(limitPrice) * parseFloat(orderAmount)).toFixed(2)}
                </div>
              </div>
            )}
            
            {/* Submit Button */}
            <Button
              variant={orderSide === 'buy' ? 'primary' : 'outline'}
              className={cn(
                "w-full",
                orderSide === 'sell' && "border-red-500/50 text-red-400 hover:bg-red-500/10"
              )}
              onClick={() => {
                // Handle order placement
                const orderData = {
                  side: orderSide,
                  type: orderType,
                  amount: orderAmount,
                  price: orderType === 'limit' ? limitPrice : (orderSide === 'buy' 
                    ? (bestAsk?.price.toFixed(2) || currentPrice.toFixed(2))
                    : (bestBid?.price.toFixed(2) || currentPrice.toFixed(2))
                  ),
                };
                console.log('Placing order:', orderData);
                setOrderAmount('');
                setLimitPrice('');
              }}
              disabled={!orderAmount || (orderType === 'limit' && !limitPrice)}
            >
              {orderType === 'market' 
                ? (orderSide === 'buy' ? 'Buy at Market' : 'Sell at Market')
                : (orderSide === 'buy' ? 'Place Buy Limit' : 'Place Sell Limit')
              }
            </Button>
          </div>
        </Panel>
        
        {/* Market Info */}
        <Panel className="p-4">
          <h4 className="text-sm font-bold text-white mb-4">Market Info</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">24h Volume</span>
              <span className="text-white font-mono">{(Math.random() * 1000000 + 500000).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">24h High</span>
              <span className="text-white font-mono">${(currentPrice * 1.05).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">24h Low</span>
              <span className="text-white font-mono">${(currentPrice * 0.95).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Supply</span>
              <span className="text-white font-mono">1,000</span>
            </div>
          </div>
        </Panel>
      </div>
      </div>
    </div>
  );
};

