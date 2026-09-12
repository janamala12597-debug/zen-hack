export type UserRole = 'farmer' | 'admin';

export type Language = 'en' | 'te';

export type ClaimStatus =
  | 'draft'
  | 'saved_offline'
  | 'pending_verification'
  | 'processing'
  | 'approved'
  | 'rejected'
  | 'payout_initiated'
  | 'completed';

export type TriggerType = 'below' | 'above';

export interface User {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  role: UserRole;
  location: string;
  state: string;
  district: string;
  crop: string;
  preferred_language: Language;
  created_at?: string;
}

export interface Policy {
  id: string;
  name: string;
  crop: string;
  location: string;
  state: string;
  district: string;
  coverage_start: string;
  coverage_end: string;
  trigger_type: TriggerType;
  rainfall_threshold: number; // in mm
  payout_amount: number; // in INR
  is_active: number;
  description?: string;
  created_at?: string;
}

export interface WeatherRecord {
  id: string;
  timestamp: string;
  source_1: number;
  source_2: number;
  source_3: number;
  verified_rainfall: number;
  outlier_detected: number;
  outlier_source: string | null;
  consistency_status: 'consistent' | 'minor_variance' | 'potential_outlier';
  location: string;
  sources_verified_label?: string;
  note?: string;
  isCached?: boolean;
  cachedAt?: string;
}

export interface Claim {
  id: string;
  claim_number: string;
  farmer_id: string;
  farmer_name?: string;
  farmer_mobile?: string;
  policy_id: string;
  policy_name?: string;
  crop: string;
  location: string;
  claim_date: string;
  status: ClaimStatus;
  verified_rainfall?: number | null;
  trigger_condition_met?: number;
  payout_amount: number;
  decision_reason?: string;
  offline_id?: string | null;
  synced_at?: string | null;
  created_at?: string;
  trigger_type?: TriggerType;
  rainfall_threshold?: number;
  isOfflineQueued?: boolean;
}

export interface Payout {
  id: string;
  payout_number: string;
  claim_id: string;
  claim_number?: string;
  farmer_id: string;
  farmer_name?: string;
  farmer_mobile?: string;
  policy_name?: string;
  crop?: string;
  verified_rainfall?: number;
  amount: number;
  status: 'approved_awaiting_settlement' | 'completed';
  settled_at?: string | null;
  settlement_reference?: string | null;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  event: string;
  actor_user: string;
  actor_role: string;
  action: string;
  result: string;
  details?: string;
}

export interface DeviceSyncStatus {
  id: string;
  farmer_id: string;
  farmer_name: string;
  device_id: string;
  last_sync_at: string;
  pending_queue_count: number;
  device_mode: 'online' | 'offline';
  user_agent?: string;
  ip_address?: string;
}

export interface AdminStats {
  totalFarmers: number;
  activePolicies: number;
  totalClaims: number;
  approvedClaims: number;
  pendingClaims: number;
  rejectedClaims: number;
  totalPayoutAmount: number;
  pendingSettlementsAmount: number;
  settledAmount: number;
  pendingSettlementsCount: number;
  completedSettlementsCount: number;
  weatherOutliers: number;
  offlineSyncedCount: number;
}
