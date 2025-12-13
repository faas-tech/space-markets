'use client';

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Search, Bell, Wallet } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { TickerStrip } from './ticker-strip';
import { useAccount } from 'wagmi';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { address, isConnected } = useAccount();
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Marketplace' },
    { href: '/assets', label: 'Assets' },
    { href: '/dashboard', label: 'My Dashboard' },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="border-b border-slate-800 bg-slate-950 sticky top-0 z-50">
      <TickerStrip />
      <div className="h-16 px-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-white font-bold text-lg tracking-tight">
            Space Markets
          </div>
          <div className="hidden md:flex gap-6 text-base font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "transition-colors",
                  isActive(link.href)
                    ? "text-blue-400"
                    : "text-slate-400 hover:text-blue-400"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Input placeholder="Search assets..." icon={Search} className="w-64 hidden lg:block" />
          <Button variant="ghost" size="sm" className="w-12 px-0"><Bell className="w-5 h-5" /></Button>
          <div className="h-6 w-px bg-slate-800"></div>
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              const ready = mounted && authenticationStatus !== 'loading';
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus ||
                  authenticationStatus === 'authenticated');

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    'style': {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <Button
                          onClick={openConnectModal}
                          variant="ghost"
                          size="sm"
                          className="w-12 px-0 hover:bg-blue-500/10"
                          title="Connect Wallet"
                        >
                          <Wallet className="w-5 h-5 text-blue-400" />
                        </Button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <Button
                          onClick={openChainModal}
                          variant="ghost"
                          size="sm"
                          className="w-12 px-0 hover:bg-blue-500/10"
                          title="Wrong Network"
                        >
                          <Wallet className="w-5 h-5 text-blue-400" />
                        </Button>
                      );
                    }

                    return (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={openAccountModal}
                          variant="ghost"
                          size="sm"
                          className="w-12 px-0 hover:bg-blue-500/10"
                          title={account.displayName || account.address}
                        >
                          <Wallet className="w-5 h-5 text-blue-400" />
                        </Button>
                        {account.displayBalance && (
                          <span className="text-xs text-slate-400 font-mono hidden sm:block">
                            {account.displayBalance}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </nav>
  );
}
