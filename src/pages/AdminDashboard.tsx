import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Users,
  FileCheck,
  Coins,
  CloudRain,
  AlertTriangle,
  RefreshCw,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Radio,
  Clock,
  ExternalLink,
  Smartphone,
  Activity,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AdminStats, Policy, Claim, Payout, AuditLog, DeviceSyncStatus } from '../types';
import { ClaimStatusBadge } from './FarmerDashboard';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'policies' | 'claims' | 'weather' | 'payouts' | 'devices' | 'audit'>('overview');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [devices, setDevices] = useState<DeviceSyncStatus[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [weatherHistory, setWeatherHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Policy Modal state
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    crop: 'Paddy',
    location: 'Telangana Region',
    state: 'Telangana',
    district: 'Karimnagar',
    coverage_start: '2026-06-01',
    coverage_end: '2026-09-30',
    trigger_type: 'below' as 'below' | 'above',
    rainfall_threshold: 100,
    payout_amount: 10000,
    description: '',
  });

  // Weather simulator inputs
  const [simMode, setSimMode] = useState<'normal' | 'outlier' | 'excessive' | 'drought' | 'custom'>('normal');
  const [customSources, setCustomSources] = useState({ source1: 72, source2: 70, source3: 73 });
  const [simResult, setSimResult] = useState<any | null>(null);

  // Filter state for claims
  const [claimFilter, setClaimFilter] = useState<string>('all');

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, policiesData, claimsData, payoutsData, farmersData, devicesData, auditData, weatherData] =
        await Promise.all([
          api.getAdminStats().catch(() => null),
          api.getPolicies().catch(() => []),
          api.getClaims().catch(() => []),
          api.getPayouts().catch(() => []),
          api.getAdminFarmers().catch(() => []),
          api.getAdminDevices().catch(() => []),
          api.getAuditTrail(150).catch(() => []),
          api.getWeatherHistory().catch(() => []),
        ]);

      if (statsData) setStats(statsData);
      setPolicies(policiesData);
      setClaims(claimsData);
      setPayouts(payoutsData);
      setFarmers(farmersData);
      setDevices(devicesData);
      setAuditLogs(auditData);
      setWeatherHistory(weatherData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPolicy(newPolicy);
      setIsPolicyModalOpen(false);
      loadAllData();
    } catch (err: any) {
      alert(`Error creating policy: ${err.message}`);
    }
  };

  const handleTogglePolicy = async (id: string) => {
    try {
      await api.togglePolicyStatus(id);
      loadAllData();
    } catch (err: any) {
      alert(`Error toggling policy: ${err.message}`);
    }
  };

  const handleSettlePayout = async (id: string) => {
    try {
      await api.settlePayout(id);
      loadAllData();
    } catch (err: any) {
      alert(`Settlement failed: ${err.message}`);
    }
  };

  const handleRunWeatherSim = async () => {
    try {
      const res = await api.simulateWeather(
        simMode,
        simMode === 'custom' ? customSources : undefined
      );
      setSimResult(res);
      loadAllData();
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    }
  };

  const filteredClaims = claims.filter((c) => {
    if (claimFilter === 'all') return true;
    return c.status === claimFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Insurance Provider Console</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-900 text-white">
              AgriShield Ops
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated parametric underwriting, multi-oracle consensus audit, and zero-touch settlement controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPolicyModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Policy</span>
          </button>
          <button
            onClick={loadAllData}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            title="Refresh All Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            Farmers
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.totalFarmers || 0}</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            Active Policies
          </span>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{stats?.activePolicies || 0}</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            Total Claims
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.totalClaims || 0}</p>
          <span className="text-[10px] text-emerald-700 font-semibold">
            {stats?.approvedClaims || 0} Approved
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            Total Payouts
          </span>
          <p className="text-2xl font-bold text-emerald-900 mt-1">
            ₹{(stats?.totalPayoutAmount || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-amber-700 font-semibold">
            ₹{(stats?.pendingSettlementsAmount || 0).toLocaleString('en-IN')} Pending
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            Outliers Flagged
          </span>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats?.weatherOutliers || 0}</p>
          <span className="text-[10px] text-slate-500 font-medium">3-source median safe</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            Offline Synced
          </span>
          <p className="text-2xl font-bold text-indigo-700 mt-1">{stats?.offlineSyncedCount || 0}</p>
          <span className="text-[10px] text-slate-500 font-medium">Local queue reconnected</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl px-2 shadow-xs overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview & Farmers', icon: Users },
          { id: 'policies', label: 'Policy Catalog', icon: Shield },
          { id: 'claims', label: 'Claims & Evaluation', icon: FileCheck },
          { id: 'weather', label: 'Weather Oracles', icon: CloudRain },
          { id: 'payouts', label: 'Payout Settlements', icon: Coins },
          { id: 'devices', label: 'Offline Sync Monitoring', icon: Smartphone },
          { id: 'audit', label: 'Deterministic Audit Trail', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                isActive
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Farmers */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Registered Smallholder Farmers</h3>
              <span className="text-xs text-slate-500">{farmers.length} registered</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Farmer Name</th>
                    <th className="px-5 py-3">Mobile</th>
                    <th className="px-5 py-3">Location & District</th>
                    <th className="px-5 py-3">Crop</th>
                    <th className="px-5 py-3">Language</th>
                    <th className="px-5 py-3">Claims Filed</th>
                    <th className="px-5 py-3 text-right">Total Payouts Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {farmers.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{f.name}</td>
                      <td className="px-5 py-3.5 text-slate-600">{f.mobile}</td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {f.location}, {f.district} ({f.state})
                      </td>
                      <td className="px-5 py-3.5 font-medium text-emerald-800">{f.crop}</td>
                      <td className="px-5 py-3.5 uppercase font-bold text-slate-500 text-[10px]">
                        {f.preferred_language || 'EN'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 font-semibold">{f.claim_count}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-emerald-700">
                        ₹{Number(f.total_payouts_received).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Policy Catalog */}
      {activeTab === 'policies' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {policies.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {p.crop}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        p.is_active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{p.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{p.description}</p>

                  <div className="mt-4 space-y-2 pt-3 border-t border-slate-100 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Trigger Threshold:</span>
                      <span className="font-bold text-slate-900">
                        Rainfall {p.trigger_type === 'below' ? '<' : '>'} {p.rainfall_threshold} mm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Micro-Payout:</span>
                      <span className="font-bold text-emerald-700">
                        ₹{p.payout_amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Region:</span>
                      <span className="text-slate-700">{p.district || p.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Coverage:</span>
                      <span className="text-slate-700">
                        {p.coverage_start} to {p.coverage_end}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">ID: {p.id}</span>
                  <button
                    onClick={() => handleTogglePolicy(p.id)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    {p.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Claims & Evaluation */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          {/* Claim Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-medium text-slate-500">Filter:</span>
            {['all', 'approved', 'saved_offline', 'pending_verification', 'rejected', 'completed'].map(
              (st) => (
                <button
                  key={st}
                  onClick={() => setClaimFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition ${
                    claimFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              )
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Claim Number</th>
                    <th className="px-5 py-3">Farmer</th>
                    <th className="px-5 py-3">Policy & Crop</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Verified Rain</th>
                    <th className="px-5 py-3">Deterministic Reason</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClaims.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {c.claim_number}
                        {c.offline_id && (
                          <span className="block text-[9px] text-amber-700 font-mono">
                            Offline: {c.offline_id.substring(0, 10)}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-800">
                        <div className="font-semibold">{c.farmer_name || 'Farmer'}</div>
                        <span className="text-slate-400 text-[11px]">{c.farmer_mobile}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        <span className="font-medium text-slate-800">{c.policy_name}</span>
                        <span className="block text-[11px] text-slate-400">{c.crop} • {c.location}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <ClaimStatusBadge status={c.status} />
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        {c.verified_rainfall !== null && c.verified_rainfall !== undefined
                          ? `${c.verified_rainfall} mm`
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 max-w-xs text-[11px]">
                        {c.decision_reason || 'Pending oracle evaluation'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                        ₹{c.payout_amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Weather Oracles & Simulation Tester */}
      {activeTab === 'weather' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Weather Oracles Consensus Explainer */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Multi-Oracle Consensus Architecture
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                3 independent oracles feed raw sensor readings. The deterministic engine calculates the mathematical median to prevent oracle bribing or single-point failure.
              </p>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex justify-between font-bold text-slate-800 mb-1">
                    <span>1. IMD Regional Weather Station</span>
                    <span className="text-blue-600 font-mono">Ground Sensor</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Automatic weather station reporting precipitation, humidity, and atmospheric pressure.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex justify-between font-bold text-slate-800 mb-1">
                    <span>2. Skymet Agro-Meteorological Radar</span>
                    <span className="text-purple-600 font-mono">Doppler Radar</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Continuous precipitation reflectivity measurements covering district clusters.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex justify-between font-bold text-slate-800 mb-1">
                    <span>3. ECMWF / NASA Satellite Precipitation Mesh</span>
                    <span className="text-amber-600 font-mono">Earth Observation</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Calibrated satellite infrared and microwave precipitation estimates.
                  </p>
                </div>
              </div>

              {/* Formula notice */}
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                <span className="font-bold block">Consensus Function:</span>
                <code className="font-mono text-[11px] block mt-1 bg-emerald-100/70 p-1.5 rounded">
                  verified_rainfall = median([source_1, source_2, source_3])
                </code>
                <p className="text-[11px] text-emerald-800 mt-1">
                  If any single source deviates &gt; 35 mm or 50% from the median, it is flagged as an outlier in the audit trail.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Interactive Weather Simulator */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Interactive Oracle Simulator</h3>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-700 block">Select Scenario:</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'normal', label: 'Consensus Deficit (72, 70, 73 mm)', sub: 'Median 72 mm (<100 trigger)' },
                    { id: 'outlier', label: 'Manipulated Source (72, 71, 180 mm)', sub: 'Outlier flagged, median 72 mm' },
                    { id: 'excessive', label: 'Flood / Excess (210, 205, 215 mm)', sub: 'Median 210 mm (>200 trigger)' },
                    { id: 'drought', label: 'Severe Drought (45, 48, 42 mm)', sub: 'Median 45 mm' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSimMode(m.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        simMode === m.id
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{m.label}</span>
                      <span className="block text-[10px] text-slate-500 font-normal mt-0.5">{m.sub}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleRunWeatherSim}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition shadow-xs"
                >
                  Inject Simulated Oracle Readings
                </button>
              </div>

              {simResult && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 animate-in fade-in">
                  <div className="flex justify-between font-bold">
                    <span>Verified Consensus:</span>
                    <span className="text-emerald-700 text-sm">
                      {simResult.reading.verified_rainfall} mm
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Outlier Status:</span>
                    <span className={simResult.reading.outlier_detected ? 'text-rose-600 font-bold' : 'text-emerald-600'}>
                      {simResult.reading.outlier_detected ? `Flagged (${simResult.reading.outlier_source})` : 'None (Consistent)'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                    Sources: S1={simResult.reading.source_1}mm, S2={simResult.reading.source_2}mm, S3={simResult.reading.source_3}mm
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Payout Settlements */}
      {activeTab === 'payouts' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Parametric Micro-Payout Approvals</h3>
            <span className="text-xs text-slate-500">{payouts.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Payout ID</th>
                  <th className="px-5 py-3">Farmer</th>
                  <th className="px-5 py-3">Claim Reference</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Settlement Reference</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{p.payout_number}</td>
                    <td className="px-5 py-3.5 text-slate-800">
                      <div className="font-semibold">{p.farmer_name}</div>
                      <span className="text-slate-400 text-[11px]">{p.farmer_mobile}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-mono">{p.claim_number}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status === 'completed' ? 'Settled' : 'Awaiting Settlement'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-600 text-[11px]">
                      {p.settlement_reference || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-700 text-sm">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {p.status === 'completed' ? (
                        <span className="text-slate-400 text-[11px] italic">Completed</span>
                      ) : (
                        <button
                          onClick={() => handleSettlePayout(p.id)}
                          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold text-[11px] shadow-xs transition"
                        >
                          Settle Payout
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Offline Device Sync Monitoring */}
      {activeTab === 'devices' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Connected Farmer Devices & Offline Queues</h3>
              <p className="text-xs text-slate-500">Real-time monitoring of client sync status</p>
            </div>
            <span className="text-xs text-slate-500">{devices.length} devices logged</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Device ID</th>
                  <th className="px-5 py-3">Farmer</th>
                  <th className="px-5 py-3">Device State</th>
                  <th className="px-5 py-3">Pending Queue Count</th>
                  <th className="px-5 py-3">Last Sync Timestamp</th>
                  <th className="px-5 py-3">User Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {devices.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-mono text-slate-900 font-bold">{d.device_id}</td>
                    <td className="px-5 py-3.5 text-slate-800 font-medium">{d.farmer_name}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          d.device_mode === 'online'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {d.device_mode.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">
                      {d.pending_queue_count > 0 ? (
                        <span className="text-amber-600 font-bold">{d.pending_queue_count} queued</span>
                      ) : (
                        <span className="text-emerald-600">0 (Synced)</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(d.last_sync_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-[10px] max-w-xs truncate">
                      {d.user_agent || 'Chrome / Mobile'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 7: Deterministic Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Deterministic Audit Trail</h3>
              <p className="text-xs text-slate-500">Append-only log of every system decision, oracle reading, and claim evaluation</p>
            </div>
            <span className="text-xs text-slate-500">{auditLogs.length} events</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50 transition flex items-start gap-3">
                <div className="mt-1">
                  {log.result === 'SUCCESS' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{log.event}</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5">{log.action}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                    <span>Actor: <strong className="text-slate-600">{log.actor_user}</strong> ({log.actor_role})</span>
                    <span>Result: <strong className={log.result === 'SUCCESS' ? 'text-emerald-700' : 'text-amber-700'}>{log.result}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Policy Modal */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Create Parametric Policy</h3>
              <button
                onClick={() => setIsPolicyModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreatePolicy} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Policy Title</label>
                <input
                  type="text"
                  required
                  value={newPolicy.name}
                  onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                  placeholder="e.g. AgriShield Cotton Moisture Guard"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Crop</label>
                  <input
                    type="text"
                    required
                    value={newPolicy.crop}
                    onChange={(e) => setNewPolicy({ ...newPolicy, crop: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">District</label>
                  <input
                    type="text"
                    required
                    value={newPolicy.district}
                    onChange={(e) => setNewPolicy({ ...newPolicy, district: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Trigger Type</label>
                  <select
                    value={newPolicy.trigger_type}
                    onChange={(e) =>
                      setNewPolicy({ ...newPolicy, trigger_type: e.target.value as any })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                  >
                    <option value="below">Rainfall Below Threshold (Drought / Deficit)</option>
                    <option value="above">Rainfall Above Threshold (Flooding / Torrential)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Threshold (mm)</label>
                  <input
                    type="number"
                    required
                    value={newPolicy.rainfall_threshold}
                    onChange={(e) =>
                      setNewPolicy({ ...newPolicy, rainfall_threshold: Number(e.target.value) })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Micro-Payout Amount (INR)
                </label>
                <input
                  type="number"
                  required
                  value={newPolicy.payout_amount}
                  onChange={(e) =>
                    setNewPolicy({ ...newPolicy, payout_amount: Number(e.target.value) })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newPolicy.description}
                  onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
                  placeholder="Explain trigger logic..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold shadow-xs"
                >
                  Create Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
