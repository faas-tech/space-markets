import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Protocol Demo | Space Markets',
  description: 'Interactive 12-step demonstration of the Asset Leasing Protocol',
};

export default function ProtocolDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-slate-200 font-sans">
      {children}
    </div>
  );
}
