import React, { useState } from 'react';
import { X, Send, WifiOff, Wifi, AlertCircle, CheckCircle2, Shield, Camera } from 'lucide-react';
import confetti from 'canvas-confetti';
import { showAndroidToast } from './AndroidSnackbar';
import { Policy } from '../types';
import { useNetwork } from '../context/NetworkContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface SubmitClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: Policy | null;
  onClaimSubmitted: () => void;
}

export const SubmitClaimModal: React.FC<SubmitClaimModalProps> = ({
  isOpen,
  onClose,
  policy,
  onClaimSubmitted,
}) => {
  const { isOnline, refreshQueueCount } = useNetwork();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policy || !user) return;

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.submitClaim({
        policy_id: policy.id,
        policy_name: policy.name,
        crop: user.crop || policy.crop,
        location: user.location || policy.location,
        farmer_id: user.id,
      });

      setResult(res);
      await refreshQueueCount();

      if (!res.isOffline && res.claim?.status === 'approved') {
        try {
          confetti({ particleCount: 70, spread: 60 });
        } catch {}
        showAndroidToast(`Instant claim approved: ₹${res.payout?.amount || 10000} Payout Triggered!`, 'success');
      } else if (res.isOffline) {
        showAndroidToast('Claim saved to offline SQLite queue', 'warning');
      } else {
        showAndroidToast(`Claim evaluated: ${res.claim?.status}`, 'info');
      }

      onClaimSubmitted();
    } catch (err: any) {
      setError(err.message || 'Claim submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-emerald-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-200" />
            <h3 className="text-base font-bold">Submit Parametric Crop Claim</h3>
          </div>
          <button onClick={onClose} className="text-emerald-100 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {result ? (
            <div className="text-center py-4">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${
                  result.isOffline
                    ? 'bg-amber-100 text-amber-600'
                    : result.claim?.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-blue-100 text-blue-600'
                }`}
              >
                {result.isOffline ? (
                  <WifiOff className="w-7 h-7" />
                ) : (
                  <CheckCircle2 className="w-7 h-7" />
                )}
              </div>

              <h4 className="text-lg font-bold text-slate-900 mb-1">
                {result.isOffline ? 'Claim Saved Offline' : 'Claim Evaluated'}
              </h4>

              <p className="text-sm text-slate-600 max-w-sm mx-auto mb-4">
                {result.isOffline
                  ? 'Claim saved offline. It will be verified when connectivity returns.'
                  : result.claim?.decision_reason || 'Claim processed.'}
              </p>

              {!result.isOffline && result.payout && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 text-left">
                  <p className="text-xs font-semibold text-emerald-800 uppercase">Payout Decision</p>
                  <p className="text-xl font-bold text-emerald-900">
                    ₹{result.payout.amount.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Status: Approved – Awaiting Insurance Provider Settlement
                  </p>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Online / Offline alert */}
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  isOnline
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <WifiOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold">
                    {isOnline ? 'Online Real-Time Mode: ' : 'Offline Local Mode: '}
                  </span>
                  <span>
                    {isOnline
                      ? 'Your claim will be verified immediately against live 3-oracle consensus weather data.'
                      : 'You are currently offline. Claim will be saved in your browser storage and verified automatically once internet reconnects.'}
                  </span>
                </div>
              </div>

              {/* Policy details */}
              {policy && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Policy Name</span>
                    <span className="font-semibold text-slate-800">{policy.name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Covered Crop</span>
                    <span className="font-semibold text-slate-800">{user?.crop || policy.crop}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Location</span>
                    <span className="font-semibold text-slate-800">{user?.location || policy.location}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Parametric Trigger</span>
                    <span className="font-bold text-slate-900">
                      Rainfall {policy.trigger_type === 'below' ? '<' : '>'} {policy.rainfall_threshold} mm
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
                    <span className="text-slate-500 font-medium">Potential Micro-Payout</span>
                    <span className="font-bold text-emerald-700">
                      ₹{policy.payout_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}

              {/* Field Crop Photo Attachment (Camera / Gallery on Mobile) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    Field Crop Photo (Android Camera / Gallery)
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional verification</span>
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 border border-slate-300 transition shadow-xs">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>{photoPreview ? 'Change Photo' : 'Take / Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                  {photoPreview && (
                    <div className="flex items-center gap-2">
                      <img
                        src={photoPreview}
                        alt="Crop Damage Preview"
                        className="w-10 h-10 rounded-lg object-cover border border-emerald-500 shadow-xs"
                      />
                      <span className="text-[11px] text-emerald-700 font-medium">Photo attached!</span>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-xs transition disabled:opacity-50 ${
                    isOnline ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Processing...'
                      : isOnline
                      ? 'Submit Claim (Online)'
                      : 'Save Claim Offline'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
