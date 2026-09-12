import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Send,
  CloudRain,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Coins,
  RefreshCw,
  FileText,
  User,
  ExternalLink,
  Info,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { translations } from '../i18n/translations';
import { Policy, WeatherRecord, Claim, Payout } from '../types';
import { api } from '../services/api';
import { WeatherWidget } from '../components/WeatherWidget';
import { VoiceExplainer } from '../components/VoiceExplainer';
import { RainfallChart } from '../components/RainfallChart';
import { SubmitClaimModal } from '../components/SubmitClaimModal';

interface FarmerDashboardProps {
  activeTab?: string;
}

export const FarmerDashboard: React.FC<FarmerDashboardProps> = ({ 
  activeTab = 'all'
}) => {
  const { user, language } = useAuth();
  const { isOnline, offlineQueueCount, triggerManualSync, isSyncing } = useNetwork();
  const t = translations[language];

  const [tab, setTab] = useState<string>(activeTab || 'all');
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [weather, setWeather] = useState<WeatherRecord | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [weatherHistory, setWeatherHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimModalOpen, setClaimModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch policies
      const policiesData = await api.getPolicies(user?.crop);
      if (policiesData && policiesData.length > 0) {
        setPolicy(policiesData[0]);
      }

      // 2. Fetch current weather
      try {
        const weatherData = await api.getCurrentWeather();
        setWeather(weatherData);
      } catch (e) {
        console.warn('Weather fetch error:', e);
      }

      // 3. Fetch weather history for chart
      try {
        const historyData = await api.getWeatherHistory();
        setWeatherHistory(historyData);
      } catch (e) {}

      // 4. Fetch farmer claims
      try {
        const claimsData = await api.getClaims();
        setClaims(claimsData);
      } catch (e) {}

      // 5. Fetch payouts
      if (isOnline) {
        try {
          const payoutsData = await api.getPayouts();
          setPayouts(payoutsData);
        } catch (e) {}
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.crop, isOnline]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Latest approved payout for highlight card
  const latestApprovedClaim = claims.find(
    (c) => c.status === 'approved' || c.status === 'completed' || c.status === 'payout_initiated'
  );
  const latestPayout = payouts.length > 0 ? payouts[0] : null;

  const isTabVisible = (tabName: string) => tab === 'all' || tab === tabName;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      {/* Welcome & Farmer Profile Header (Always visible or in policies tab) */}
      {(isTabVisible('policies') || tab === 'all') && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg border border-emerald-200 shrink-0">
              {user?.name?.charAt(0) || 'F'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">{user?.name}</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Verified Smallholder
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {user?.location || 'Karimnagar'}, {user?.district} ({user?.state})
                </span>
                <span>•</span>
                <span className="font-medium text-slate-700">Crop: {user?.crop || 'Paddy'}</span>
                <span>•</span>
                <span>Mobile: {user?.mobile}</span>
              </div>
            </div>
          </div>

          {/* Submit Claim Action Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setClaimModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-xs transition transform active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>{t.submitClaim}</span>
            </button>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200">
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            tab === 'all'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard Overview</span>
        </button>

        <button
          onClick={() => setTab('policies')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            tab === 'policies'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Active Policy</span>
        </button>

        <button
          onClick={() => setTab('weather')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            tab === 'weather'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CloudRain className="w-4 h-4" />
          <span>Weather Oracles</span>
          {weather?.verified_rainfall !== undefined && (
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
              tab === 'weather' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-700'
            }`}>
              {weather.verified_rainfall} mm
            </span>
          )}
        </button>

        <button
          onClick={() => setTab('claims')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            tab === 'claims'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Claims & Evidence</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            tab === 'claims' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-700'
          }`}>
            {claims.length}
          </span>
        </button>

        <button
          onClick={() => setTab('payouts')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            tab === 'payouts'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Disbursements (DBT)</span>
          {payouts.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              tab === 'payouts' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {payouts.length}
            </span>
          )}
        </button>
      </div>

      {/* When tab is 'weather' */}
      {tab === 'weather' && (
        <div className="space-y-6">
          <WeatherWidget weather={weather} isLoading={isLoading} onRefresh={loadData} />
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Precipitation & Threshold Tracker</h4>
                <p className="text-xs text-slate-500">Historical oracle consensus readings vs {policy?.rainfall_threshold || 100} mm trigger limit</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                2026 Monsoon
              </span>
            </div>
            <RainfallChart
              data={weatherHistory}
              threshold={policy?.rainfall_threshold || 100}
              triggerType={policy?.trigger_type || 'below'}
            />
          </div>
        </div>
      )}

      {/* When tab is 'claims' */}
      {tab === 'claims' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Crop Damage Claims</h3>
              <p className="text-xs text-slate-500">Submit new parametric weather claims with field photo evidence or check status</p>
            </div>
            <button
              onClick={() => setClaimModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-xs transition"
            >
              <Send className="w-4 h-4" />
              <span>+ New Claim</span>
            </button>
          </div>

          {offlineQueueCount > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    {offlineQueueCount} Claim(s) Stored Locally
                  </p>
                  <p className="text-[11px] text-amber-800">
                    {isOnline
                      ? 'Ready to synchronize with 3 weather oracles.'
                      : 'Will sync automatically when connection returns.'}
                  </p>
                </div>
              </div>
              <button
                onClick={triggerManualSync}
                disabled={isSyncing || !isOnline}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition disabled:opacity-50"
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          )}

          {/* Claims List Table / Card View */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">{t.recentClaims}</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">{claims.length} total</span>
            </div>

            {claims.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                {t.noClaims} Tap "+ New Claim" to file an instant claim.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-3">Claim ID</th>
                      <th className="px-5 py-3">Crop / Location</th>
                      <th className="px-5 py-3">Claim Date</th>
                      <th className="px-5 py-3">Verified Rainfall</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Potential Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {claims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          {claim.claim_number}
                          {claim.offline_id && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                              OFFLINE
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {claim.crop} • {claim.location}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {new Date(claim.claim_date || Date.now()).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5">
                          {claim.verified_rainfall !== null && claim.verified_rainfall !== undefined ? (
                            <span className="font-semibold text-slate-800">
                              {claim.verified_rainfall} mm
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Pending Reconnect</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <ClaimStatusBadge status={claim.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                          ₹{claim.payout_amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* When tab is 'payouts' */}
      {tab === 'payouts' && (
        <div className="space-y-6">
          {(latestApprovedClaim || latestPayout) ? (
            <div className="bg-white rounded-2xl border-2 border-emerald-500/80 shadow-md overflow-hidden">
              <div className="bg-emerald-700 px-5 py-3 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-200" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {t.payoutDecision}
                  </span>
                </div>
                <span className="text-[11px] bg-emerald-800 text-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                  Parametric Rule Met
                </span>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-500 block">Calculated Micro-Payout</span>
                    <p className="text-3xl font-extrabold text-emerald-900 tracking-tight">
                      ₹{(latestPayout?.amount || latestApprovedClaim?.payout_amount || 10000).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {latestPayout?.status === 'completed' ? 'DISBURSED' : 'APPROVED'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                  <div className="flex justify-between font-semibold">
                    <span>Settlement Mode:</span>
                    <span className="text-emerald-700 font-bold">Direct UPI / DBT Transfer</span>
                  </div>
                  {latestPayout?.settlement_reference && (
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Bank Reference:</span>
                      <span className="font-mono text-slate-800 font-medium">{latestPayout.settlement_reference}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                    Trigger Verification: Rainfall consensus ({weather?.verified_rainfall ?? 72} mm) vs threshold ({policy?.rainfall_threshold || 100} mm). Zero paperwork parametric execution.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500 text-xs">
              No active payouts triggered yet. Payouts execute automatically whenever rainfall crosses the parametric threshold.
            </div>
          )}

          {/* Payout History List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Direct Benefit Transfers (DBT)</h4>
            <div className="space-y-2">
              {payouts.map((p) => (
                <div key={p.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800">₹{p.amount.toLocaleString('en-IN')}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Ref: {p.settlement_reference}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {p.status.toUpperCase()}
                  </span>
                </div>
              ))}
              {payouts.length === 0 && (
                <p className="text-xs text-slate-400 italic">No disbursement history recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* When tab is 'policies' (or 'all' fallback) */}
      {(tab === 'policies' || tab === 'all') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Active Policy & Rainfall Status */}
          <div className="lg:col-span-7 space-y-6">
            {/* Active Policy Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {t.activePolicy}
                  </span>
                </div>
                <span className="text-xs text-emerald-300 font-semibold">
                  Status: Active
                </span>
              </div>

              <div className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {policy?.name || 'AgriShield Rainfall Protection Plan'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {policy?.description || 'Automated parametric micro-insurance with 3-source consensus.'}
                    </p>
                  </div>
                  {/* Voice Explainer Button */}
                  {policy && (
                    <VoiceExplainer
                      crop={policy.crop}
                      triggerType={policy.trigger_type}
                      threshold={policy.rainfall_threshold}
                      payout={policy.payout_amount}
                      verifiedRainfall={weather?.verified_rainfall}
                      status={latestApprovedClaim?.status}
                    />
                  )}
                </div>

                {/* Policy Parametric Conditions Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-medium text-slate-500 block">Trigger Condition</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                      Rainfall {policy?.trigger_type === 'below' ? '<' : '>'} {policy?.rainfall_threshold || 100} mm
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <span className="text-[11px] font-medium text-emerald-800 block">{t.payoutAmount}</span>
                    <p className="text-base font-bold text-emerald-900 mt-0.5">
                      ₹{(policy?.payout_amount || 10000).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
                    <span className="text-[11px] font-medium text-slate-500 block">{t.coveragePeriod}</span>
                    <p className="text-xs font-semibold text-slate-800 mt-1">
                      {policy?.coverage_start || 'Jun 01'} to {policy?.coverage_end || 'Sep 30, 2026'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rainfall Chart Widget (if 'all') */}
            {tab === 'all' && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Precipitation & Threshold Tracker</h4>
                    <p className="text-xs text-slate-500">Historical oracle consensus readings vs 100 mm trigger limit</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    2026 Monsoon
                  </span>
                </div>
                <RainfallChart
                  data={weatherHistory}
                  threshold={policy?.rainfall_threshold || 100}
                  triggerType={policy?.trigger_type || 'below'}
                />
              </div>
            )}
          </div>

          {/* Right Column: Weather Widget & Payout Decision Card */}
          <div className="lg:col-span-5 space-y-6">
            {tab === 'all' && (
              <WeatherWidget weather={weather} isLoading={isLoading} onRefresh={loadData} />
            )}

            {/* Section 15: PAYOUT CARD */}
            {(latestApprovedClaim || latestPayout) && (
              <div className="bg-white rounded-2xl border-2 border-emerald-500/80 shadow-md overflow-hidden">
                <div className="bg-emerald-700 px-5 py-3 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-emerald-200" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {t.payoutDecision}
                    </span>
                  </div>
                  <span className="text-[11px] bg-emerald-800 text-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                    Parametric Rule Met
                  </span>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs font-medium text-slate-500 block">Calculated Micro-Payout</span>
                      <p className="text-3xl font-extrabold text-emerald-900 tracking-tight">
                        ₹{(latestPayout?.amount || latestApprovedClaim?.payout_amount || 10000).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {latestPayout?.status === 'completed' ? 'DISBURSED' : 'APPROVED'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span>Payout Status:</span>
                      <span className={latestPayout?.status === 'completed' ? 'text-emerald-700 font-bold' : 'text-amber-800 font-bold'}>
                        {latestPayout?.status === 'completed'
                          ? t.payoutSettled
                          : t.approvedAwaitingSettlement}
                      </span>
                    </div>
                    {latestPayout?.settlement_reference && (
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>Ref ID:</span>
                        <span className="font-mono">{latestPayout.settlement_reference}</span>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                      Decision basis: Verified rainfall ({weather?.verified_rainfall ?? 72} mm) dropped below threshold (100 mm). Automatic zero-touch trigger executed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Offline Sync Banner if queued */}
            {offlineQueueCount > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-900">
                      {offlineQueueCount} Claim(s) Stored Locally
                    </p>
                    <p className="text-[11px] text-amber-800">
                      {isOnline
                        ? 'Ready to synchronize with 3 weather oracles.'
                        : 'Will sync automatically when connection returns.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={triggerManualSync}
                  disabled={isSyncing || !isOnline}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition disabled:opacity-50"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Claims Table in 'all' view */}
      {tab === 'all' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-slate-900">{t.recentClaims}</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">{claims.length} total</span>
          </div>

          {claims.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              {t.noClaims} Click "{t.submitClaim}" to simulate your first claim.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Claim ID</th>
                    <th className="px-5 py-3">Crop / Location</th>
                    <th className="px-5 py-3">Claim Date</th>
                    <th className="px-5 py-3">Verified Rainfall</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Potential Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {claims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3.5 font-medium text-slate-900">
                        {claim.claim_number}
                        {claim.offline_id && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                            OFFLINE QUEUED
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {claim.crop} • {claim.location}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {new Date(claim.claim_date || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5">
                        {claim.verified_rainfall !== null && claim.verified_rainfall !== undefined ? (
                          <span className="font-semibold text-slate-800">
                            {claim.verified_rainfall} mm
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Pending Reconnect</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <ClaimStatusBadge status={claim.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                        ₹{claim.payout_amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Claim Submission Modal */}
      <SubmitClaimModal
        isOpen={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        policy={policy}
        onClaimSubmitted={loadData}
      />
    </div>
  );
};

// Section 14: CLAIM STATUS BADGES
export function ClaimStatusBadge({ status }: { status: string }) {
  const badgeConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
    draft: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'Draft' },
    saved_offline: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', label: 'Saved Offline' },
    pending_verification: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', label: 'Pending Verification' },
    processing: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', label: 'Processing' },
    approved: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', label: 'Approved' },
    rejected: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200', label: 'Rejected' },
    payout_initiated: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200', label: 'Payout Initiated' },
    completed: { bg: 'bg-emerald-700', text: 'text-white', border: 'border-emerald-800', label: 'Completed' },
  };

  const c = badgeConfig[status] || badgeConfig['pending_verification'];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${c.bg} ${c.text} ${c.border}`}
    >
      {c.label}
    </span>
  );
}
