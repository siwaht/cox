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
          <div className="text-txt-faint text-xs text-center mt-4">
            Approval requests will appear here
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
