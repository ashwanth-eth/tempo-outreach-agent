'use client';

import { useState, useRef } from 'react';
import type { ProcessedProfile } from '../page';

interface ControlPanelProps {
  onRun: (files: File[], config: { maxPerProfile: number; maxTotal: number }) => void;
  isRunning: boolean;
  totalSpent: number;
  profiles: ProcessedProfile[];
}

export function ControlPanel({ onRun, isRunning, totalSpent, profiles }: ControlPanelProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [maxPerProfile, setMaxPerProfile] = useState(0.01);
  const [maxTotal, setMaxTotal] = useState(0.1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith('image/')
    );
    setFiles(droppedFiles);
  };

  const handleRun = () => {
    if (files.length > 0) {
      onRun(files, { maxPerProfile, maxTotal });
    }
  };

  const downloadEmails = () => {
    if (profiles.length === 0) return;

    let content = 'TEMPO OUTREACH AGENT - DRAFTED EMAILS\n';
    content += '='.repeat(50) + '\n\n';

    profiles.forEach((profile, i) => {
      content += `EMAIL ${i + 1}\n`;
      content += '-'.repeat(30) + '\n';
      content += `To: ${profile.name}\n`;
      content += `Role: ${profile.role} at ${profile.company}\n\n`;
      content += profile.email + '\n\n';
      content += `Parse TX: ${profile.transactions[0]?.hash}\n`;
      content += `Draft TX: ${profile.transactions[1]?.hash}\n`;
      content += '\n' + '='.repeat(50) + '\n\n';
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'outreach-emails.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-sm font-medium text-[#737373] mb-3">UPLOAD PROFILES</h2>
        <div
          className="border-2 border-dashed border-[#262626] rounded-lg p-6 text-center hover:border-[#22c55e] transition-colors cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          {files.length === 0 ? (
            <>
              <div className="text-2xl mb-2">📄</div>
              <p className="text-sm text-[#737373]">
                Drop LinkedIn screenshots here
              </p>
              <p className="text-xs text-[#737373] mt-1">or click to browse</p>
            </>
          ) : (
            <>
              <div className="text-2xl mb-2">✓</div>
              <p className="text-sm text-[#22c55e]">{files.length} file(s) selected</p>
              <p className="text-xs text-[#737373] mt-1">
                {files.map((f) => f.name).join(', ')}
              </p>
            </>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-[#737373] mb-3">SPEND CONTROLS</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Max per profile</span>
              <span className="text-[#22c55e]">${maxPerProfile.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="0.001"
              max="0.05"
              step="0.001"
              value={maxPerProfile}
              onChange={(e) => setMaxPerProfile(parseFloat(e.target.value))}
              className="w-full accent-[#22c55e]"
            />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Max total budget</span>
              <span className="text-[#22c55e]">${maxTotal.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="1.00"
              step="0.01"
              value={maxTotal}
              onChange={(e) => setMaxTotal(parseFloat(e.target.value))}
              className="w-full accent-[#22c55e]"
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-[#737373] mb-3">SESSION</h2>
        <div className="bg-[#171717] rounded-lg p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#737373]">Profiles processed</span>
            <span>{profiles.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#737373]">Total spent</span>
            <span className="text-[#22c55e]">${totalSpent.toFixed(4)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#737373]">Budget remaining</span>
            <span>${(maxTotal - totalSpent).toFixed(4)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleRun}
          disabled={isRunning || files.length === 0}
          className="w-full py-3 bg-[#22c55e] text-black font-medium rounded-lg hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isRunning ? 'Running...' : 'Run Agent'}
        </button>

        {profiles.length > 0 && (
          <button
            onClick={downloadEmails}
            className="w-full py-3 bg-[#262626] text-white font-medium rounded-lg hover:bg-[#333] transition-colors"
          >
            Download Emails
          </button>
        )}
      </div>
    </div>
  );
}
