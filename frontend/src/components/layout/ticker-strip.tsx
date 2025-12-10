'use client';

import { useEffect, useState, useRef } from 'react';

// Generate normal distribution random number (Box-Muller transform)
function normalRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * stdDev + mean;
}

// Generate ticker symbol names
function generateTickerSymbols(count: number): string[] {
  const prefixes = ['SPEC', 'H2O', 'LEO', 'SAR', 'GEO', 'LUN', 'AST', 'COM', 'REL', 'PWR', 'PROP', 'DATA', 'SIG', 'IMG', 'RAD'];
  const suffixes = ['L1', 'L2', 'ICE', 'STO', 'IMG', 'BW', 'DEP', 'X1', 'X2', 'A1', 'B1', 'C1', 'D1', 'E1', 'F1'];
  
  const symbols: string[] = [];
  const used = new Set<string>();
  
  while (symbols.length < count) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const symbol = `${prefix}-${suffix}`;
    
    if (!used.has(symbol)) {
      used.add(symbol);
      symbols.push(symbol);
    }
  }
  
  return symbols;
}

interface TickerData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export const TickerStrip = () => {
  const [tickers, setTickers] = useState<TickerData[]>([]);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationDuration = 120; // seconds for full scroll cycle

  useEffect(() => {
    // Helper function to calculate price change using Brownian motion
    const calculatePriceChange = (currentPrice: number) => {
      // Generate change between 2-10% using normal distribution (Brownian motion)
      // Mean of 0% (no drift), std dev of 3% to get variation in 2-10% range
      let changePercent = normalRandom(0, 0.03);
      
      // Clamp to 2-10% range
      changePercent = Math.max(0.02, Math.min(0.10, Math.abs(changePercent)));
      
      // Randomly make positive or negative (50/50 chance)
      const sign = Math.random() > 0.5 ? 1 : -1;
      changePercent = changePercent * sign;
      
      // Calculate new price based on current price (Brownian motion)
      const newPrice = currentPrice * (1 + changePercent);
      const priceChange = newPrice - currentPrice;
      
      return {
        price: Math.max(0.01, newPrice),
        change: priceChange,
        changePercent: changePercent * 100,
      };
    };

    // Initialize 50 tickers with random starting prices and initial changes
    const symbols = generateTickerSymbols(50);
    const initialTickers: TickerData[] = symbols.map(symbol => {
      const basePrice = Math.random() * 100 + 0.1; // Random price between 0.1 and 100.1
      const { price, change, changePercent } = calculatePriceChange(basePrice);
      return {
        symbol,
        price,
        change,
        changePercent,
      };
    });
    setTickers(initialTickers);

    // Update prices using Brownian motion - each price drifts from its current value
    // Prices update right before each scroll cycle completes
    const updatePrices = () => {
      setTickers(prev => prev.map(ticker => {
        const { price, change, changePercent } = calculatePriceChange(ticker.price);
        return {
          ...ticker,
          price,
          change,
          changePercent,
        };
      }));
    };

    // Update prices right before each scroll cycle completes
    // This ensures prices are stable during the scroll animation
    updateIntervalRef.current = setInterval(updatePrices, animationDuration * 1000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  // Duplicate tickers for seamless scrolling
  const duplicatedTickers = [...tickers, ...tickers];

  return (
    <div className="w-full bg-slate-950 border-b border-slate-800 h-8 flex items-center overflow-hidden whitespace-nowrap relative">
      <div className="flex items-center gap-8 animate-ticker-scroll">
        {duplicatedTickers.map((t, i) => (
          <div key={`${t.symbol}-${i}`} className="flex items-center gap-2 text-xs font-mono flex-shrink-0">
            <span className="text-slate-400">{t.symbol}</span>
            <span className="text-slate-200">${t.price.toFixed(2)}</span>
            <span className={t.changePercent >= 0 ? "text-emerald-500" : "text-rose-500"}>
              {t.changePercent >= 0 ? '+' : ''}{t.changePercent.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
