'use client';

import { useState, useCallback } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ActivityFeed } from './components/ActivityFeed';
import { AuditLog } from './components/AuditLog';

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'payment' | 'success' | 'error' | 'skip';
  message: string;
  txHash?: string;
  cost?: number;
}

export interface Transaction {
  hash: string;
  memo: string;
  amount: number;
  timestamp: Date;
  action: 'parse' | 'draft';
  target: string;
}

export interface ProcessedProfile {
  name: string;
  role: string;
  company: string;
  email: string;
  transactions: Transaction[];
}

export default function Home() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profiles, setProfiles] = useState<ProcessedProfile[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [walletAddress] = useState('0xA8C74E47a871B1849601870d1437e39b45280536');
  const [balance] = useState(999999.99);

  const addLog = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    setLogs((prev) => [
      ...prev,
      { ...entry, id: crypto.randomUUID(), timestamp: new Date() },
    ]);
  }, []);

  const addTransaction = useCallback((tx: Transaction) => {
    setTransactions((prev) => [...prev, tx]);
    setTotalSpent((prev) => prev + tx.amount);
  }, []);

  const handleRun = async (files: File[], config: { maxPerProfile: number; maxTotal: number }) => {
    setIsRunning(true);
    setLogs([]);
    setTransactions([]);
    setProfiles([]);
    setTotalSpent(0);

    addLog({ type: 'info', message: `Starting agent with ${files.length} profile(s)...` });
    addLog({ type: 'info', message: `Budget: $${config.maxPerProfile}/profile, $${config.maxTotal} total` });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      addLog({ type: 'info', message: `━━━ Profile ${i + 1}/${files.length} ━━━` });

      try {
        // Upload and process
        const formData = new FormData();
        formData.append('image', file);
        formData.append('maxPerProfile', config.maxPerProfile.toString());
        formData.append('maxTotal', config.maxTotal.toString());
        formData.append('currentSpent', totalSpent.toString());

        addLog({ type: 'info', message: `📄 Extracting profile from ${file.name}...` });

        const response = await fetch('/api/process', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to process profile');
        }

        const result = await response.json();

        if (result.skipped) {
          addLog({ type: 'skip', message: `⚠️ Skipped — ${result.reason}` });
          continue;
        }

        // Log the successful extraction
        addLog({
          type: 'info',
          message: `   Found: ${result.profile.name} — ${result.profile.role} at ${result.profile.company}`,
        });

        // Log parse payment
        addLog({
          type: 'payment',
          message: `💰 Paid for profile parse ($${result.transactions.parse.cost})`,
          txHash: result.transactions.parse.hash,
          cost: result.transactions.parse.cost,
        });
        addTransaction({
          hash: result.transactions.parse.hash,
          memo: result.transactions.parse.memo,
          amount: result.transactions.parse.cost,
          timestamp: new Date(),
          action: 'parse',
          target: result.profile.name,
        });

        // Log draft
        addLog({ type: 'info', message: `✉️ Drafted email (${result.email.split(' ').length} words)` });

        // Log draft payment
        addLog({
          type: 'payment',
          message: `💰 Paid for email draft ($${result.transactions.draft.cost})`,
          txHash: result.transactions.draft.hash,
          cost: result.transactions.draft.cost,
        });
        addTransaction({
          hash: result.transactions.draft.hash,
          memo: result.transactions.draft.memo,
          amount: result.transactions.draft.cost,
          timestamp: new Date(),
          action: 'draft',
          target: result.profile.name,
        });

        // Add to processed profiles
        setProfiles((prev) => [
          ...prev,
          {
            name: result.profile.name,
            role: result.profile.role,
            company: result.profile.company,
            email: result.email,
            transactions: [
              {
                hash: result.transactions.parse.hash,
                memo: result.transactions.parse.memo,
                amount: result.transactions.parse.cost,
                timestamp: new Date(),
                action: 'parse',
                target: result.profile.name,
              },
              {
                hash: result.transactions.draft.hash,
                memo: result.transactions.draft.memo,
                amount: result.transactions.draft.cost,
                timestamp: new Date(),
                action: 'draft',
                target: result.profile.name,
              },
            ],
          },
        ]);

        addLog({ type: 'success', message: `✅ Complete — Total spent: $${(totalSpent + result.totalCost).toFixed(4)}` });
        setTotalSpent((prev) => prev + result.totalCost);

      } catch (error) {
        addLog({
          type: 'error',
          message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    addLog({ type: 'success', message: `━━━ Done! Processed ${profiles.length} profiles ━━━` });
    setIsRunning(false);
  };

  return (
    <main className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[#262626] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Tempo Outreach Agent</h1>
            <p className="text-sm text-[#737373]">AI agent with autonomous TIP-20 payments</p>
          </div>
          <div className="text-right text-sm">
            <div className="text-[#737373]">Wallet</div>
            <div className="font-mono text-xs">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</div>
            <div className="text-[#22c55e]">${balance.toLocaleString()} AlphaUSD</div>
          </div>
        </div>
      </header>

      {/* Three-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Controls */}
        <div className="w-80 border-r border-[#262626] overflow-y-auto">
          <ControlPanel
            onRun={handleRun}
            isRunning={isRunning}
            totalSpent={totalSpent}
            profiles={profiles}
          />
        </div>

        {/* Middle Panel - Activity Feed */}
        <div className="flex-1 border-r border-[#262626] overflow-y-auto">
          <ActivityFeed logs={logs} />
        </div>

        {/* Right Panel - Audit Log */}
        <div className="w-96 overflow-y-auto">
          <AuditLog transactions={transactions} totalSpent={totalSpent} />
        </div>
      </div>
    </main>
  );
}
