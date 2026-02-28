'use client';

import React from 'react';
import Link from 'next/link';
import { DemoProvider } from '@/components/demo/demo-provider';
import { DemoController } from '@/components/demo/demo-controller';
import { ProgressBar } from '@/components/demo/progress-bar';
import { PresetSelector } from '@/components/demo/preset-selector';
import { ShareButton } from '@/components/demo/share-button';
import { ThemeToggle } from '@/components/demo/theme-toggle';
import { Starfield } from '@/components/demo/animations/starfield';
import { Step01Deploy } from '@/components/demo/steps/step-01-deploy';
import { Step02CreateType } from '@/components/demo/steps/step-02-create-type';
import { Step03RegisterAsset } from '@/components/demo/steps/step-03-register-asset';
import { Step04VerifyMetadata } from '@/components/demo/steps/step-04-verify-metadata';
import { Step05LeaseOffer } from '@/components/demo/steps/step-05-lease-offer';
import { Step06LesseeBid } from '@/components/demo/steps/step-06-lessee-bid';
import { Step07LessorAccept } from '@/components/demo/steps/step-07-lessor-accept';
import { Step08NftMint } from '@/components/demo/steps/step-08-nft-mint';
import { Step09X402Requirements } from '@/components/demo/steps/step-09-x402-requirements';
import { Step10X402Streaming } from '@/components/demo/steps/step-10-x402-streaming';
import { Step11Revenue } from '@/components/demo/steps/step-11-revenue';
import { Step12Summary } from '@/components/demo/steps/step-12-summary';

export default function ProtocolDemoPage() {
  return (
    <DemoProvider>
      {/* Animated starfield background */}
      <Starfield starCount={180} />

      <div className="flex flex-col min-h-screen relative z-10">
        {/* Topbar */}
        <header className="border-b border-slate-800/60 bg-black/70 backdrop-blur-xl sticky top-0 z-50">
          <div className="flex items-center justify-between px-4 sm:px-6 h-14">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-white font-bold text-sm tracking-tight hover:text-blue-400 transition-colors"
              >
                Space Markets
              </Link>
              <div className="h-4 w-px bg-slate-800" />
              <h1 className="text-xs sm:text-sm text-slate-400 font-medium">
                Protocol Demo
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <DemoController />
              <ShareButton />
            </div>
          </div>

          {/* Progress bar */}
          <div className="border-t border-slate-800/40 bg-slate-950/40 backdrop-blur-sm">
            <ProgressBar />
          </div>
        </header>

        {/* Preset selector */}
        <div className="border-b border-slate-800/40 bg-slate-950/30 backdrop-blur-sm px-4 sm:px-6 lg:px-10 py-3">
          <div className="max-w-[1400px] mx-auto">
            <PresetSelector />
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-[1400px] mx-auto w-full">
          <Step01Deploy />
          <Step02CreateType />
          <Step03RegisterAsset />
          <Step04VerifyMetadata />
          <Step05LeaseOffer />
          <Step06LesseeBid />
          <Step07LessorAccept />
          <Step08NftMint />
          <Step09X402Requirements />
          <Step10X402Streaming />
          <Step11Revenue />
          <Step12Summary />
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/40 bg-black/50 backdrop-blur-sm px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between text-[10px] text-slate-600 max-w-[1400px] mx-auto">
            <span>Space Markets Protocol -- Base Sepolia</span>
            <div className="flex items-center gap-4">
              <span>Keyboard: Space (play/pause), Arrows (navigate), R (reset)</span>
              <Link
                href="/"
                className="text-blue-500 hover:text-blue-400 transition-colors"
              >
                Back to Marketplace
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </DemoProvider>
  );
}
