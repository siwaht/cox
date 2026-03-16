import React, { useState } from 'react';
import { useConnectionStore } from '@/store/connection-store';
import { useWorkspaceStore } from '@/store/workspace-store';
import type { ConnectionProfile } from '@/types/connections';
import { ConnectionForm } from './ConnectionForm';
import { DiagnosticsPanel } from '../diagnostics/DiagnosticsPanel';
import { X, Plus, Trash2, CheckCircle, AlertCircle, Loader2, Plug } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const ConnectionModal: React.FC<Props> = ({ onClose }) => {
  const {
    connections, activeConnectionId, validationResult,
    addConnection, removeConnection, setActive, validate,
    startHealthCheck, stopHealthCheck,
  } = useConnectionStore();
  const { setActiveConnection } = useWorkspaceStore();
  const [showForm, setShowForm] = useState(connections.length === 0);
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const handleAdd = (profile: Omit<ConnectionProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = addConnection(profile);
    setShowForm(false);
    handleValidateAndConnect(id);
  };

  const handleValidateAndConnect = async (id: string) => {
    setValidatingId(id);
    const result = await validate(id);
    setValidatingId(null);
    if (result.status === 'ok' || result.status === 'warning') {
      setActive(id);
      setActiveConnection(id);
      startHealthCheck();
    }
  };

  const handleDisconnect = () => {
    setActive(null);
    setActiveConnection(null);
    stopHealthCheck();
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface-raised border border-border rounded-t-2xl sm:rounded-2xl
                      w-full sm:w-[520px] max-h-[85vh] overflow-hidden flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Plug size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-zinc-200">Connect Your Agent</h2>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-surface-overlay">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {/* Empty state with prominent CTA */}
          {connections.length === 0 && !showForm && (
            <div className="text-center py-6 animate-fade-in">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <Plug size={22} className="text-accent" />
              </div>
              <p className="text-sm text-zinc-400 mb-1">No agents connected yet</p>
              <p className="text-xs text-zinc-600 mb-4">Add your agent's URL to get started</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2.5 text-xs bg-accent hover:bg-accent-hover text-white
                           rounded-lg transition-colors font-medium"
              >
                <Plus size={13} className="inline mr-1.5 -mt-0.5" />
                Add Your First Agent
              </button>
            </div>
          )}
          {/* Saved connections */}
          {connections.map((conn) => (
            <div
              key={conn.id}
              className={`border rounded-xl p-3.5 transition-all animate-fade-in ${
                activeConnectionId === conn.id
                  ? 'border-accent/50 bg-accent/5'
                  : 'border-border hover:border-zinc-600'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <StatusDot conn={conn} validatingId={validatingId} />
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-200 font-medium truncate">{conn.name}</div>
                    <div className="text-2xs text-zinc-500 font-mono mt-0.5 truncate">{conn.baseUrl}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-2xs text-zinc-600 bg-surface px-1.5 py-0.5 rounded">
                    {conn.runtime}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                {activeConnectionId === conn.id ? (
                  <button
                    onClick={handleDisconnect}
                    className="flex-1 text-xs px-3 py-2 rounded-lg bg-danger-soft text-danger
                               hover:bg-danger/20 transition-colors text-center"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleValidateAndConnect(conn.id)}
                    disabled={validatingId === conn.id}
                    className="flex-1 text-xs px-3 py-2 rounded-lg bg-accent-soft text-accent
                               hover:bg-accent/20 transition-colors disabled:opacity-50 text-center font-medium"
                  >
                    {validatingId === conn.id ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <Loader2 size={12} className="animate-spin" /> Validating...
                      </span>
                    ) : 'Connect'}
                  </button>
                )}
                <button
                  onClick={() => removeConnection(conn.id)}
                  className="p-2 text-zinc-600 hover:text-danger rounded-lg hover:bg-danger-soft transition-colors"
                  title="Delete connection"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Inline diagnostics */}
              {conn.lastValidation && (conn.lastValidation.errors.length > 0 || conn.lastValidation.warnings.length > 0) && (
                <div className="mt-3">
                  <DiagnosticsPanel
                    errors={conn.lastValidation.errors}
                    warnings={conn.lastValidation.warnings}
                    compact
                  />
                </div>
              )}
            </div>
          ))}
          {/* Add new connection */}
          {showForm ? (
            <ConnectionForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
          ) : connections.length > 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center justify-center gap-2 w-full px-3 py-3 border border-dashed
                         border-border rounded-xl text-xs text-zinc-400 hover:text-accent
                         hover:border-accent/50 hover:bg-accent-soft transition-all"
            >
              <Plus size={14} />
              Add New Agent Connection
            </button>
          )}

          {/* Global diagnostics */}
          {validationResult && (validationResult.warnings.length > 0 || validationResult.errors.length > 0) && (
            <DiagnosticsPanel errors={validationResult.errors} warnings={validationResult.warnings} />
          )}
        </div>
      </div>
    </div>
  );
};

const StatusDot: React.FC<{ conn: ConnectionProfile; validatingId: string | null }> = ({ conn, validatingId }) => {
  if (validatingId === conn.id) return <Loader2 size={14} className="text-warning animate-spin shrink-0" />;
  if (conn.lastValidation?.status === 'ok') return <CheckCircle size={14} className="text-success shrink-0" />;
  if (conn.lastValidation?.status === 'error') return <AlertCircle size={14} className="text-danger shrink-0" />;
  return <div className="w-3 h-3 rounded-full bg-zinc-700 shrink-0" />;
};
