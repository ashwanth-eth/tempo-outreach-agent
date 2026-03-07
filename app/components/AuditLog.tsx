'use client';

import type { Transaction } from '../page';

interface AuditLogProps {
  transactions: Transaction[];
  totalSpent: number;
  userAddress: string;
  agentAddress: string;
}

export function AuditLog({ transactions, totalSpent, userAddress, agentAddress }: AuditLogProps) {
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-medium text-[#737373]">AUDIT LOG</h2>
        <span className="text-sm text-[#22c55e]">${totalSpent.toFixed(4)} transferred</span>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-12 text-[#737373]">
          <div className="text-4xl mb-3">📜</div>
          <p>No transactions yet</p>
          <p className="text-sm mt-1">User → Agent payments will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.hash}
              className="bg-[#171717] rounded-lg p-3 border border-[#262626]"
            >
              {/* Direction and Action */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    tx.direction === 'outbound'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-[#22c55e]/20 text-[#22c55e]'
                  }`}>
                    {tx.direction === 'outbound' ? '↑ OUT' : '↓ IN'}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-[#262626] text-[#ededed] rounded">
                    {tx.action.toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-[#22c55e]">${tx.amount.toFixed(4)}</span>
              </div>

              {/* Target */}
              <div className="text-sm mb-2">{tx.target}</div>

              {/* From → To */}
              <div className="text-xs text-[#737373] mb-2 flex items-center gap-1">
                <span className="font-mono bg-[#0a0a0a] px-1 rounded">
                  {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                </span>
                <span>→</span>
                <span className="font-mono bg-[#0a0a0a] px-1 rounded">
                  {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                </span>
              </div>

              {/* Memo */}
              <div className="text-xs text-[#737373] space-y-1">
                <div className="font-mono bg-[#0a0a0a] p-2 rounded overflow-x-auto">
                  {tx.memo}
                </div>
                <div className="flex justify-between">
                  <span>{tx.timestamp.toLocaleTimeString()}</span>
                  <a
                    href={`https://explore.tempo.xyz/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#22c55e] hover:underline"
                  >
                    View on Explorer ↗
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
