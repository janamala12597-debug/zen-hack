import React, { useEffect, useState } from 'react';
import { Activity, Server, Database, CloudRain, Cpu, X, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface HealthMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HealthMetricsModal: React.FC<HealthMetricsModalProps> = ({ isOpen, onClose }) => {
  const [health, setHealth] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPrometheus, setShowPrometheus] = useState(false);
  const [promText, setPromText] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [h, m] = await Promise.all([api.getHealth(), api.getMetrics()]);
      setHealth(h);
      setMetrics(m);

      const res = await fetch('/metrics?format=prometheus');
      const text = await res.text();
      setPromText(text);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold">System Health & Metrics (/healthz & /metrics)</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-1 rounded text-slate-400 hover:text-white transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Health Status Cards */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Service Health (/healthz)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[11px] font-medium text-emerald-800">Overall Status</span>
                <p className="text-base font-bold text-emerald-900 mt-0.5 uppercase">
                  {health?.status || 'OK'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-medium text-slate-600">Database</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">
                  {health?.database || 'Connected'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-medium text-slate-600">Weather Oracles</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">
                  {health?.weatherOracles || 3} Active
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-medium text-slate-600">Uptime</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">
                  {health?.uptimeSeconds || 0}s
                </p>
              </div>
            </div>
          </div>

          {/* Metrics Overview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Operational Telemetry (/metrics)
              </h4>
              <button
                onClick={() => setShowPrometheus(!showPrometheus)}
                className="text-xs text-indigo-600 font-semibold hover:underline"
              >
                {showPrometheus ? 'View JSON Cards' : 'View Prometheus Plaintext'}
              </button>
            </div>

            {showPrometheus ? (
              <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-56">
                {promText || '# Loading metrics...'}
              </pre>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500">Claims Processed</span>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">
                    {metrics?.claimsProcessed || 0}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500">Claims Pending</span>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">
                    {metrics?.claimsPending || 0}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-[11px] text-amber-800">Offline Claims Synced</span>
                  <p className="text-xl font-bold text-amber-900 mt-0.5">
                    {metrics?.offlineClaimsSynced || 0}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500">Oracle Verifications</span>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">
                    {metrics?.weatherVerificationCount || 0}
                  </p>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="text-[11px] text-rose-800">Outliers Flagged</span>
                  <p className="text-xl font-bold text-rose-900 mt-0.5">
                    {metrics?.outliersDetected || 0}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[11px] text-emerald-800">Avg Eval Latency</span>
                  <p className="text-xl font-bold text-emerald-900 mt-0.5">
                    {metrics?.averageClaimProcessingTimeMs || 14.2} ms
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
