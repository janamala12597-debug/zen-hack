import React from 'react';
import { CheckCircle2, Clock, Loader2, AlertCircle, ArrowDown, ShieldCheck, X } from 'lucide-react';
import { useNetwork, SyncStep } from '../context/NetworkContext';

export const SyncProgressModal: React.FC = () => {
  const { syncModalOpen, closeSyncModal, syncSteps, syncResult, isSyncing } = useNetwork();

  if (!syncModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-200" />
            <h3 className="text-base font-bold tracking-tight">Offline Claim Synchronization</h3>
          </div>
          {!isSyncing && (
            <button
              onClick={closeSyncModal}
              className="text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-emerald-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content & Steps */}
        <div className="p-6">
          <p className="text-xs text-slate-500 mb-5">
            Connectivity restored. The system is re-authenticating pending local claims, retrieving fresh 3-source consensus rainfall, and evaluating parametric rules.
          </p>

          <div className="space-y-4">
            {syncSteps.map((step: SyncStep, idx: number) => {
              const isLast = idx === syncSteps.length - 1;
              return (
                <div key={step.id}>
                  <div className="flex items-start gap-3.5">
                    {/* Status Icon */}
                    <div className="mt-0.5">
                      {step.status === 'completed' && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 animate-in zoom-in duration-200" />
                      )}
                      {step.status === 'in_progress' && (
                        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                      )}
                      {step.status === 'waiting' && (
                        <Clock className="w-5 h-5 text-slate-300" />
                      )}
                      {step.status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-rose-600" />
                      )}
                    </div>

                    {/* Step description */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-semibold ${
                            step.status === 'completed'
                              ? 'text-emerald-900'
                              : step.status === 'in_progress'
                              ? 'text-indigo-900'
                              : step.status === 'error'
                              ? 'text-rose-900'
                              : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            step.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : step.status === 'in_progress'
                              ? 'bg-indigo-100 text-indigo-800'
                              : step.status === 'error'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {step.status === 'in_progress' ? 'Running' : step.status}
                        </span>
                      </div>
                      {step.detail && (
                        <p className="text-xs text-slate-600 mt-1">{step.detail}</p>
                      )}
                    </div>
                  </div>

                  {/* Flow Arrow */}
                  {!isLast && (
                    <div className="flex items-center justify-center my-1.5 text-slate-300">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sync Results Summary */}
          {syncResult && (
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span>Synchronization Report</span>
                <span className="text-emerald-600">
                  {syncResult.syncedCount} claim(s) processed
                </span>
              </div>
              {syncResult.results?.map((res: any, i: number) => (
                <div key={i} className="text-xs text-slate-600 border-t border-slate-200 pt-2 mt-1">
                  <div className="flex items-center justify-between font-medium">
                    <span>Claim: {res.claim_number}</span>
                    <span
                      className={`uppercase font-bold px-1.5 py-0.2 rounded text-[10px] ${
                        res.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {res.status}
                    </span>
                  </div>
                  {res.payout && (
                    <p className="text-emerald-700 font-bold mt-0.5">
                      ✓ Payout Decision: ₹{res.payout.amount.toLocaleString('en-IN')} (Awaiting settlement)
                    </p>
                  )}
                  {res.decision_reason && (
                    <p className="text-slate-500 text-[11px] mt-0.5 italic">
                      "{res.decision_reason}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={closeSyncModal}
              disabled={isSyncing}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 transition shadow-xs disabled:opacity-50"
            >
              {isSyncing ? 'Synchronizing with Weather Oracles...' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
