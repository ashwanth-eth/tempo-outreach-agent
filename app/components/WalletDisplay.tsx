'use client';

import type { WalletInfo } from '../page';

interface WalletDisplayProps {
  wallet: WalletInfo;
  direction: 'outbound' | 'inbound';
  isLoading: boolean;
}

export function WalletDisplay({ wallet, direction, isLoading }: WalletDisplayProps) {
  const isOutbound = direction === 'outbound';

  return (
    <div className={`text-right ${isOutbound ? 'text-red-400' : 'text-[#22c55e]'}`}>
      <div className="text-xs text-[#737373] mb-0.5">
        {wallet.label} {isOutbound ? '(pays)' : '(earns)'}
      </div>
      {isLoading ? (
        <div className="text-sm text-[#737373]">Loading...</div>
      ) : (
        <>
          <div className="font-mono text-xs text-[#737373]">
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </div>
          <div className="text-lg font-semibold">
            ${wallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </>
      )}
    </div>
  );
}
