'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { X402StreamingClient } from '@/lib/x402/streamingPayment';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';

interface PaymentLog {
  timestamp: string;
  amount: string;
  txHash: string;
}

export function StreamingPaymentPanel({ leaseId }: { leaseId: string }) {
  const { address } = useWallet();
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<'second' | 'batch-5s'>('second');
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<X402StreamingClient | null>(null);

  useEffect(() => {
    if (!address) return;

    clientRef.current = new X402StreamingClient(
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', // Should point to Next.js API route
      address
    );

    return () => {
      if (clientRef.current) {
        clientRef.current.stopStream();
      }
    };
  }, [address]);

  const handleStart = async () => {
    if (!clientRef.current || !address) return;

    setError(null);
    setActive(true);

    try {
      await clientRef.current.startStream(
        leaseId,
        mode,
        (amount, txHash) => {
          // On successful payment
          const log: PaymentLog = {
            timestamp: new Date().toISOString(),
            amount,
            txHash
          };
          setPaymentLogs((prev) => [log, ...prev].slice(0, 100)); // Keep last 100
          setTotalPaid((prev) => prev + parseFloat(amount));
        },
        (err) => {
          // On error
          setError(err.message);
          setActive(false);
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start stream');
      setActive(false);
    }
  };

  const handleStop = () => {
    if (clientRef.current) {
      clientRef.current.stopStream();
      setActive(false);
    }
  };

  return (
    <Panel className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">X402 Streaming Payments</h3>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${active ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
          <span className="text-sm text-slate-400">
            {active ? 'Streaming' : 'Inactive'}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-rose-900/20 border border-rose-500/30 rounded p-3 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-900/20 rounded p-4 border border-blue-500/10">
          <div className="text-sm text-slate-400">Total Paid</div>
          <div className="text-2xl font-bold text-blue-400">{totalPaid.toFixed(6)} USDC</div>
        </div>
        <div className="bg-purple-900/20 rounded p-4 border border-purple-500/10">
          <div className="text-sm text-slate-400">Payments Made</div>
          <div className="text-2xl font-bold text-purple-400">{paymentLogs.length}</div>
        </div>
      </div>

      <div className="flex gap-4">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as 'second' | 'batch-5s')}
          disabled={active}
          className="px-4 py-2 border border-slate-700 bg-slate-900 rounded text-slate-200"
        >
          <option value="second">Per-Second (1Hz)</option>
          <option value="batch-5s">Batch 5-Second (0.2Hz)</option>
        </select>

        <Button
          onClick={active ? handleStop : handleStart}
          disabled={!address}
          className={active ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}
        >
          {active ? 'Stop Stream' : 'Start Stream'}
        </Button>
      </div>

      <div className="border-t border-slate-800 pt-4">
        <h4 className="font-medium mb-2 text-slate-300">Recent Payments</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {paymentLogs.length === 0 ? (
            <div className="text-center text-slate-600 py-8">
              No payments yet
            </div>
          ) : (
            paymentLogs.map((log) => (
              <div
                key={log.timestamp}
                className="flex items-center justify-between text-sm bg-slate-900/50 rounded p-2 border border-slate-800"
              >
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span>
                  <span className="text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="font-mono font-medium text-slate-300">{log.amount} USDC</div>
              </div>
            ))
          )}
        </div>
      </div>
    </Panel>
  );
}

