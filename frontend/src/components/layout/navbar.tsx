'use client';

import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Search, Bell, Wallet, Menu, X } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Marketplace' },
    { href: '/assets', label: 'Assets' },
    { href: '/dashboard', label: 'My Dashboard' },
    { href: '/protocol-demo', label: 'Protocol Demo' },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--background)] sticky top-0 z-50 relative">
      {/* Gradient bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent" />
      <TickerStrip />
      <div className="h-16 px-4 md:px-6 flex items-center justify-between">
        {/* Logo - slightly larger and bolder */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-[var(--foreground)] font-bold text-xl tracking-tight">
            Space Markets
          </div>
          
          {/* Desktop nav links */}
          <div className="hidden md:flex gap-6 text-base font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative py-1 transition-all duration-200 ease-out",
                  isActive(link.href)
                    ? "text-[var(--primary)]"
                    : "text-[var(--foreground-secondary)] hover:text-[var(--primary)]"
                )}
              >
                {link.label}
                {isActive(link.href) && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-full" />
                )}
              </Link>
            ))}
          </div>
        </div>
        
        {/* Right side actions */}
        <div className="flex items-center gap-2 md:gap-4">
          <Input 
            placeholder="Search assets..." 
            icon={Search} 
            className="w-48 md:w-64 hidden lg:block" 
          />
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-10 px-0 transition-colors duration-200 hover:bg-[var(--background-hover)]" 
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </Button>
          <div className="h-6 w-px bg-[var(--border)] hidden md:block"></div>
          
          {/* Wallet connect - with glow when connected */}
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
                          className="w-12 px-0 hover:bg-[var(--primary-soft)] transition-colors duration-200"
                          title="Connect Wallet"
                        >
                          <Wallet className="w-5 h-5 text-[var(--primary)]" />
                        </Button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <Button
                          onClick={openChainModal}
                          variant="ghost"
                          size="sm"
                          className="w-12 px-0 hover:bg-[var(--primary-soft)] transition-colors duration-200"
                          title="Wrong Network"
                        >
                          <Wallet className="w-5 h-5 text-[var(--primary)]" />
                        </Button>
                      );
                    }

                    return (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={openAccountModal}
                          variant="ghost"
                          size="sm"
                          className="w-12 px-0 transition-colors duration-200 hover:bg-[var(--primary-soft)]"
                          title={account.displayName || account.address}
                        >
                          {/* Glow ring when connected */}
                          <span className="relative">
                            <span className="absolute inset-0 rounded-full bg-[var(--primary-glow)] blur-sm" />
                            <Wallet className="w-5 h-5 text-[var(--primary)] relative" />
                          </span>
                        </Button>
                        {account.displayBalance && (
                          <span className="text-xs text-[var(--foreground-muted)] font-mono hidden sm:block">
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
          
          {/* Mobile hamburger menu */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden w-10 px-0 transition-colors duration-200 hover:bg-[var(--background-hover)]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--background)] px-4 py-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "block py-2 px-3 rounded-md transition-colors duration-200",
                isActive(link.href)
                  ? "text-[var(--primary)] bg-[var(--primary-soft)]"
                  : "text-[var(--foreground-secondary)] hover:text-[var(--primary)] hover:bg-[var(--background-hover)]"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}