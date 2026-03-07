import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tempo Outreach Agent',
  description: 'AI agent that pays for its own research using TIP-20 stablecoins',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
        {children}
      </body>
    </html>
  );
}
