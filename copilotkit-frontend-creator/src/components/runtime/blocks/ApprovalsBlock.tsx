import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';
import { useAgentState } from '@/hooks/useAgentState';
import { ShieldCheck, Check, X } from 'lucide-react';

export const ApprovalsBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const { approvals, respondToApproval } = useAgentState();

  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={block.label} />
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {approvals.length === 0 ? (
          <div className="opacity-60 space-y-2">
            <div className="bg-surface rounded-lg p-3 border border-warning/40">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={12} className="text-warning" />
                <span className="text-xs font-medium text-txt-secondary">Send report via email</span>
              </div>
              <div className="text-[10px] text-txt-secondary mb-2">Send the Q4 analysis report to the sales team (12 recipients).</div>
              <div className="flex gap-2">
                <span className="flex items-center gap-1 px-2 py-1 text-[10px] bg-success/20 text-success rounded">
                  <Check size={10} /> Approve
                </span>
                <span className="flex items-center gap-1 px-2 py-1 text-[10px] bg-danger/20 text-danger rounded">
                  <X size={10} /> Reject
                </span>
              </div>
            </div>
            <div className="bg-surface rounded-lg p-3 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={12} className="text-warning" />
                <span className="text-xs font-medium text-txt-secondary">Update dashboard</span>
              </div>
              <div className="text-[10px] text-txt-secondary mb-1">Push updated metrics to the shared analytics dashboard.</div>
              <span className="text-[10px] text-success">✓ Approved</span>
            </div>
            <p className="text-[10px] text-txt-ghost text-center">Approval requests appear here</p>
          </div>
        ) : (
          approvals.map((a, i) => (
            <div key={i} className={`bg-surface rounded-lg p-3 border ${
              a.status === 'pending' ? 'border-warning/40' : 'border-border/50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={12} className="text-warning" />
                <span className="text-xs font-medium text-txt-secondary">{a.title}</span>
              </div>
              <div className="text-[10px] text-txt-secondary mb-2">{a.description}</div>
              {a.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => respondToApproval(a.id, true)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] bg-success/20 text-success rounded hover:bg-success/30"
                  >
                    <Check size={10} /> Approve
                  </button>
                  <button
                    onClick={() => respondToApproval(a.id, false)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] bg-danger/20 text-danger rounded hover:bg-danger/30"
                  >
                    <X size={10} /> Reject
                  </button>
                </div>
              )}
              {a.status !== 'pending' && (
                <span className={`text-[10px] ${a.status === 'approved' ? 'text-success' : 'text-danger'}`}>
                  {a.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
