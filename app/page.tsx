'use client';

import { useState, useCallback, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ActivityFeed } from './components/ActivityFeed';
import { AuditLog } from './components/AuditLog';
import { WalletDisplay } from './components/WalletDisplay';

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
  from: string;
  to: string;
  direction: 'outbound' | 'inbound';
}

export interface ProcessedProfile {
  name: string;
  role: string;
  company: string;
  email: string;
  transactions: Transaction[];
}

export interface WalletInfo {
  address: string;
  balance: number;
  label: string;
}

export default function Home() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profiles, setProfiles] = useState<ProcessedProfile[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);

  // Two-wallet system
  const [userWallet, setUserWallet] = useState<WalletInfo>({
    address: '',
    balance: 0,
    label: 'User Wallet',
  });
  const [agentWallet, setAgentWallet] = useState<WalletInfo>({
    address: '',
    balance: 0,
    label: 'Agent Wallet',
  });
  const [walletsLoaded, setWalletsLoaded] = useState(false);

  // Fetch wallet info on mount
  useEffect(() => {
    async function fetchWallets() {
      try {
        const response = await fetch('/api/process');
        if (response.ok) {
          const data = await response.json();
          setUserWallet({
            address: data.wallets.user,
            balance: data.balances.user,
            label: 'User Wallet',
          });
          setAgentWallet({
            address: data.wallets.agent,
            balance: data.balances.agent,
            label: 'Agent Wallet',
          });
          setWalletsLoaded(true);
        }
      } catch (error) {
        console.error('Failed to fetch wallets:', error);
      }
    }
    fetchWallets();
  }, []);

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
    addLog({ type: 'info', message: `User pays → Agent earns` });

    let currentSpent = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      addLog({ type: 'info', message: `━━━ Profile ${i + 1}/${files.length} ━━━` });

      try {
        // Upload and process
        const formData = new FormData();
        formData.append('image', file);
        formData.append('maxPerProfile', config.maxPerProfile.toString());
        formData.append('maxTotal', config.maxTotal.toString());
        formData.append('currentSpent', currentSpent.toString());

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

        // Update wallet balances in real-time
        setUserWallet((prev) => ({ ...prev, balance: result.balances.user }));
        setAgentWallet((prev) => ({ ...prev, balance: result.balances.agent }));

        // Log the successful extraction
        addLog({
          type: 'info',
          message: `   Found: ${result.profile.name} — ${result.profile.role} at ${result.profile.company}`,
        });

        // Log parse payment (user → agent)
        addLog({
          type: 'payment',
          message: `💸 User paid Agent $${result.transactions.parse.cost} for parse`,
          txHash: result.transactions.parse.hash,
          cost: result.transactions.parse.cost,
        });
        const parseTx: Transaction = {
          hash: result.transactions.parse.hash,
          memo: result.transactions.parse.memo,
          amount: result.transactions.parse.cost,
          timestamp: new Date(),
          action: 'parse',
          target: result.profile.name,
          from: result.transactions.parse.from,
          to: result.transactions.parse.to,
          direction: 'outbound',
        };
        addTransaction(parseTx);

        // Log draft
        addLog({ type: 'info', message: `✉️ Drafted email (${result.email.split(' ').length} words)` });

        // Log draft payment (user → agent)
        addLog({
          type: 'payment',
          message: `💸 User paid Agent $${result.transactions.draft.cost} for draft`,
          txHash: result.transactions.draft.hash,
          cost: result.transactions.draft.cost,
        });
        const draftTx: Transaction = {
          hash: result.transactions.draft.hash,
          memo: result.transactions.draft.memo,
          amount: result.transactions.draft.cost,
          timestamp: new Date(),
          action: 'draft',
          target: result.profile.name,
          from: result.transactions.draft.from,
          to: result.transactions.draft.to,
          direction: 'outbound',
        };
        addTransaction(draftTx);

        // Add to processed profiles
        setProfiles((prev) => [
          ...prev,
          {
            name: result.profile.name,
            role: result.profile.role,
            company: result.profile.company,
            email: result.email,
            transactions: [parseTx, draftTx],
          },
        ]);

        currentSpent += result.totalCost;
        addLog({ type: 'success', message: `✅ Complete — User spent: $${currentSpent.toFixed(4)}` });

      } catch (error) {
        addLog({
          type: 'error',
          message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    addLog({ type: 'success', message: `━━━ Done! Processed ${profiles.length + 1} profiles ━━━` });
    setIsRunning(false);
  };

  return (
    <main className="h-screen flex flex-col">
      {/* Header with dual wallet display */}
      <header className="border-b border-[#262626] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Tempo Outreach Agent</h1>
            <p className="text-sm text-[#737373]">Two-sided agentic commerce with TIP-20</p>
          </div>
          <div className="flex gap-6">
            <WalletDisplay
              wallet={userWallet}
              direction="outbound"
              isLoading={!walletsLoaded}
            />
            <div className="flex items-center text-[#737373]">→</div>
            <WalletDisplay
              wallet={agentWallet}
              direction="inbound"
              isLoading={!walletsLoaded}
            />
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
          <AuditLog
            transactions={transactions}
            totalSpent={totalSpent}
            userAddress={userWallet.address}
            agentAddress={agentWallet.address}
          />
        </div>
      </div>
    </main>
  );
}
