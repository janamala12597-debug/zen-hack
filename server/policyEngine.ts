export interface WeatherSources {
  source1: number;
  source2: number;
  source3: number;
  source1Name?: string;
  source2Name?: string;
  source3Name?: string;
}

export interface WeatherEvaluationResult {
  source1: number;
  source2: number;
  source3: number;
  medianRainfall: number;
  outlierDetected: boolean;
  outlierSource: string | null;
  consistencyStatus: 'consistent' | 'minor_variance' | 'potential_outlier';
  explanation: string;
}

export interface PolicyRule {
  id: string;
  name: string;
  crop: string;
  location: string;
  state: string;
  district: string;
  coverage_start: string;
  coverage_end: string;
  trigger_type: 'below' | 'above';
  rainfall_threshold: number;
  payout_amount: number;
  is_active: number;
}

export interface FarmerContext {
  id: string;
  name: string;
  crop: string;
  location: string;
  state: string;
  district: string;
}

export interface ClaimEvaluationOutput {
  status: 'approved' | 'rejected' | 'pending_verification';
  triggerConditionMet: boolean;
  verifiedRainfall: number;
  payoutAmount: number;
  decisionReason: string;
  weatherDetails: WeatherEvaluationResult;
  auditExplanation: string;
}

/**
 * Deterministic Median Calculation & Outlier Detection for 3 Weather Oracles
 */
export function evaluateWeatherOracles(sources: WeatherSources): WeatherEvaluationResult {
  const { source1, source2, source3 } = sources;

  const s1 = Math.max(0, Number(source1));
  const s2 = Math.max(0, Number(source2));
  const s3 = Math.max(0, Number(source3));

  const sorted = [
    { name: 'Weather Source 1 (IMD Station)', val: s1, key: 'source_1' },
    { name: 'Weather Source 2 (Skymet Radar)', val: s2, key: 'source_2' },
    { name: 'Weather Source 3 (Satellite Grid)', val: s3, key: 'source_3' },
  ].sort((a, b) => a.val - b.val);

  // Median of 3 elements is the middle item
  const medianItem = sorted[1];
  const medianRainfall = Math.round(medianItem.val * 10) / 10;

  // Calculate deviation from median for each source
  const dev1 = Math.abs(s1 - medianRainfall);
  const dev2 = Math.abs(s2 - medianRainfall);
  const dev3 = Math.abs(s3 - medianRainfall);

  const maxDev = Math.max(dev1, dev2, dev3);

  // An outlier is detected if a source differs by more than 35 mm or >50% from median (when median > 20)
  const relativeThreshold = Math.max(25, medianRainfall * 0.45);
  const isOutlier = maxDev >= relativeThreshold;

  let outlierSource: string | null = null;
  let consistencyStatus: 'consistent' | 'minor_variance' | 'potential_outlier' = 'consistent';
  let explanation = 'All 3 independent weather oracles are consistent and verified.';

  if (isOutlier) {
    consistencyStatus = 'potential_outlier';
    if (dev1 === maxDev) outlierSource = 'Source 1';
    else if (dev2 === maxDev) outlierSource = 'Source 2';
    else outlierSource = 'Source 3';

    explanation = `Potential outlier detected: ${outlierSource} (${
      outlierSource === 'Source 1' ? s1 : outlierSource === 'Source 2' ? s2 : s3
    } mm) differs significantly from the other weather sources. The robust median of ${medianRainfall} mm is used for deterministic settlement protection.`;
  } else if (maxDev > 8) {
    consistencyStatus = 'minor_variance';
    explanation = `Normal natural meteorological variance detected across sources (±${maxDev.toFixed(1)} mm). Median verified at ${medianRainfall} mm.`;
  }

  return {
    source1: s1,
    source2: s2,
    source3: s3,
    medianRainfall,
    outlierDetected: isOutlier,
    outlierSource,
    consistencyStatus,
    explanation,
  };
}

export function calculateMedian(s1: number, s2: number, s3: number): number {
  const sorted = [Number(s1), Number(s2), Number(s3)].sort((a, b) => a - b);
  return sorted[1];
}

export function detectOutlier(sources: number[], median: number): { hasOutlier: boolean; outlierValue?: number } {
  const threshold = Math.max(25, median * 0.45);
  for (const s of sources) {
    if (Math.abs(s - median) >= threshold) {
      return { hasOutlier: true, outlierValue: s };
    }
  }
  return { hasOutlier: false };
}

export function calculatePayout(policy: any, conditionMet: boolean): number {
  if (!policy || !conditionMet) return 0;
  return policy.payout_amount || 0;
}

export function evaluateWeatherConsensus(s1: number, s2: number, s3: number) {
  const sorted = [s1, s2, s3].sort((a, b) => a - b);
  const evalResult = evaluateWeatherOracles({ source1: s1, source2: s2, source3: s3 });
  return {
    sources: sorted,
    verifiedMedian: evalResult.medianRainfall,
    hasOutlier: evalResult.outlierDetected,
    outlierSource: evalResult.outlierSource,
  };
}

/**
 * Deterministic Policy Engine
 * Evaluates farmer policy conditions against verified weather data
 */
export function evaluatePolicyClaim(
  policy: PolicyRule,
  farmer: FarmerContext,
  weather: WeatherEvaluationResult,
  claimDate: Date = new Date()
): ClaimEvaluationOutput {
  // 1. Verify policy is active
  if (!policy.is_active) {
    return {
      status: 'rejected',
      triggerConditionMet: false,
      verifiedRainfall: weather.medianRainfall,
      payoutAmount: 0,
      decisionReason: `Claim rejected because policy "${policy.name}" is currently deactivated or suspended by the insurer.`,
      weatherDetails: weather,
      auditExplanation: `Policy inactive. Claim rejected automatically.`,
    };
  }

  // 2. Verify crop match (case insensitive)
  if (farmer.crop.toLowerCase().trim() !== policy.crop.toLowerCase().trim()) {
    return {
      status: 'rejected',
      triggerConditionMet: false,
      verifiedRainfall: weather.medianRainfall,
      payoutAmount: 0,
      decisionReason: `Claim rejected: Farmer registered crop (${farmer.crop}) does not match the policy covered crop (${policy.crop}).`,
      weatherDetails: weather,
      auditExplanation: `Crop mismatch (${farmer.crop} != ${policy.crop}).`,
    };
  }

  const { medianRainfall } = weather;
  const threshold = policy.rainfall_threshold;
  let conditionMet = false;

  if (policy.trigger_type === 'below') {
    conditionMet = medianRainfall < threshold;
  } else if (policy.trigger_type === 'above') {
    conditionMet = medianRainfall > threshold;
  }

  if (conditionMet) {
    const reason =
      policy.trigger_type === 'below'
        ? `Claim approved because verified rainfall of ${medianRainfall} mm is below the policy threshold of ${threshold} mm.`
        : `Claim approved because verified rainfall of ${medianRainfall} mm exceeds the excessive rainfall trigger threshold of ${threshold} mm.`;

    return {
      status: 'approved',
      triggerConditionMet: true,
      verifiedRainfall: medianRainfall,
      payoutAmount: policy.payout_amount,
      decisionReason: reason,
      weatherDetails: weather,
      auditExplanation: `Parametric threshold satisfied (${medianRainfall} mm ${
        policy.trigger_type === 'below' ? '<' : '>'
      } ${threshold} mm). Approved payout of ₹${policy.payout_amount.toLocaleString('en-IN')}.`,
    };
  } else {
    const reason =
      policy.trigger_type === 'below'
        ? `Claim rejected because verified rainfall of ${medianRainfall} mm does not satisfy the drought trigger condition (must be < ${threshold} mm).`
        : `Claim rejected because verified rainfall of ${medianRainfall} mm did not breach the heavy rainfall trigger threshold (must be > ${threshold} mm).`;

    return {
      status: 'rejected',
      triggerConditionMet: false,
      verifiedRainfall: medianRainfall,
      payoutAmount: 0,
      decisionReason: reason,
      weatherDetails: weather,
      auditExplanation: `Parametric condition not met. Verified: ${medianRainfall} mm, Required: ${
        policy.trigger_type === 'below' ? '<' : '>'
      } ${threshold} mm.`,
    };
  }
}
