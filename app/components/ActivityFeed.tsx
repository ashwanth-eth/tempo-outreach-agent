'use client';

import { useEffect, useRef } from 'react';
import type { LogEntry } from '../page';

interface ActivityFeedProps {
  logs: LogEntry[];
}

export function ActivityFeed({ logs }: ActivityFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'payment':
        return 'text-[#22c55e]';
      case 'success':
        return 'text-[#22c55e]';
      case 'error':
        return 'text-red-500';
      case 'skip':
        return 'text-yellow-500';
      default:
        return 'text-[#ededed]';
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-sm font-medium text-[#737373] mb-3">LIVE ACTIVITY</h2>

      {logs.length === 0 ? (
        <div className="text-center py-12 text-[#737373]">
          <div className="text-4xl mb-3">🤖</div>
          <p>Agent is idle</p>
          <p className="text-sm mt-1">Upload profiles and click Run to start</p>
        </div>
      ) : (
        <div className="space-y-2 font-mono text-sm">
          {logs.map((log) => (
            <div key={log.id} className={`${getLogColor(log.type)}`}>
              <span className="text-[#737373] mr-2">
                {log.timestamp.toLocaleTimeString()}
              </span>
              <span>{log.message}</span>
              {log.txHash && (
                <a
                  href={`https://explore.tempo.xyz/tx/${log.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-[#22c55e] hover:underline"
                >
                  ↗
                </a>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
