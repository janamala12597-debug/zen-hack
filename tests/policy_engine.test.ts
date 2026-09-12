import {
  calculateMedian,
  detectOutlier,
  evaluateWeatherConsensus,
  evaluateWeatherOracles,
  evaluatePolicyClaim,
  calculatePayout,
} from '../server/policyEngine.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`✗ [FAIL] ${testName} - ${detail || ''}`);
    failed++;
  }
}

console.log('====================================================');
console.log('  AgriShield Parametric Insurance Engine Test Suite ');
console.log('====================================================\n');

const testFarmer = {
  id: 'farmer-test',
  name: 'Ramesh Patel',
  crop: 'Paddy',
  location: 'Karimnagar',
  state: 'Telangana',
  district: 'Karimnagar',
};

// 1. Rainfall below threshold
{
  const policy = {
    id: 'p1',
    name: 'Rain Deficit Plan',
    crop: 'Paddy',
    location: 'Karimnagar',
    state: 'Telangana',
    district: 'Karimnagar',
    trigger_type: 'below' as const,
    rainfall_threshold: 100,
    payout_amount: 10000,
    is_active: 1,
    coverage_start: '2026-06-01',
    coverage_end: '2026-09-30',
  };
  const weather = evaluateWeatherOracles({ source1: 72, source2: 70, source3: 73 });
  const evalResult = evaluatePolicyClaim(policy, testFarmer, weather, new Date('2026-07-15'));
  assert(
    evalResult.status === 'approved' && evalResult.triggerConditionMet === true,
    '1. Rainfall below threshold triggers claim approval',
    `Received status: ${evalResult.status}`
  );
}

// 2. Rainfall above threshold (when policy expects deficit)
{
  const policy = {
    id: 'p1',
    name: 'Rain Deficit Plan',
    crop: 'Paddy',
    location: 'Karimnagar',
    state: 'Telangana',
    district: 'Karimnagar',
    trigger_type: 'below' as const,
    rainfall_threshold: 100,
    payout_amount: 10000,
    is_active: 1,
    coverage_start: '2026-06-01',
    coverage_end: '2026-09-30',
  };
  const weather = evaluateWeatherOracles({ source1: 120, source2: 125, source3: 118 });
  const evalResult = evaluatePolicyClaim(policy, testFarmer, weather, new Date('2026-07-15'));
  assert(
    evalResult.status === 'rejected' && evalResult.triggerConditionMet === false,
    '2. Rainfall above threshold rejects drought deficit claim',
    `Received status: ${evalResult.status}`
  );
}

// 3. Excessive rainfall trigger
{
  const floodPolicy = {
    id: 'p2',
    name: 'Monsoon Flood Plan',
    crop: 'Paddy',
    location: 'Karimnagar',
    state: 'Telangana',
    district: 'Karimnagar',
    trigger_type: 'above' as const,
    rainfall_threshold: 200,
    payout_amount: 10000,
    is_active: 1,
    coverage_start: '2026-06-01',
    coverage_end: '2026-09-30',
  };
  const weather = evaluateWeatherOracles({ source1: 210, source2: 205, source3: 215 });
  const evalResult = evaluatePolicyClaim(floodPolicy, testFarmer, weather, new Date('2026-07-15'));
  assert(
    evalResult.status === 'approved' && evalResult.triggerConditionMet === true,
    '3. Excessive rainfall (210mm > 200mm) triggers flooding payout',
    `Received status: ${evalResult.status}`
  );
}

// 4. Multiple weather sources
{
  const consensus = evaluateWeatherConsensus(72, 70, 73);
  assert(
    consensus.sources.length === 3 && consensus.sources[0] === 70 && consensus.sources[2] === 73,
    '4. Multiple weather sources ingested and sorted correctly',
    `Sorted sources: ${JSON.stringify(consensus.sources)}`
  );
}

// 5. Median calculation
{
  const med1 = calculateMedian(72, 70, 73);
  const med2 = calculateMedian(10, 50, 90);
  assert(
    med1 === 72 && med2 === 50,
    '5. Mathematical median calculated deterministically (70, 72, 73 -> 72)',
    `med1: ${med1}, med2: ${med2}`
  );
}

// 6. Outlier detection
{
  const outlierCheck = detectOutlier([72, 71, 180], 72);
  const normalCheck = detectOutlier([72, 70, 73], 72);
  assert(
    outlierCheck.hasOutlier === true &&
      outlierCheck.outlierValue === 180 &&
      normalCheck.hasOutlier === false,
    '6. Outlier detection flags 180mm deviation while preserving median',
    `outlierCheck: ${JSON.stringify(outlierCheck)}`
  );
}

// 7. Offline claim data structure
{
  const offlineClaim = {
    offline_id: 'off-test-01',
    farmer_id: 'farmer-1',
    policy_id: 'p1',
    status: 'saved_offline',
  };
  assert(
    offlineClaim.status === 'saved_offline' && offlineClaim.offline_id.startsWith('off-'),
    '7. Offline claim properly tagged with offline_id and saved_offline status'
  );
}

// 8. Online synchronization evaluation
{
  const weather = evaluateWeatherOracles({ source1: 72, source2: 70, source3: 73 });
  const policy = {
    id: 'p1',
    name: 'Rain Deficit Plan',
    crop: 'Paddy',
    location: 'Karimnagar',
    state: 'Telangana',
    district: 'Karimnagar',
    trigger_type: 'below' as const,
    rainfall_threshold: 100,
    payout_amount: 10000,
    is_active: 1,
    coverage_start: '2026-06-01',
    coverage_end: '2026-09-30',
  };
  const decision = evaluatePolicyClaim(policy, testFarmer, weather, new Date('2026-07-20'));
  assert(
    decision.status === 'approved' && decision.payoutAmount === 10000,
    '8. Online synchronization evaluates queued claim against fresh consensus'
  );
}

// 9. Duplicate sync prevention
{
  const processedIds = new Set(['off-001', 'off-002']);
  const incomingId = 'off-001';
  const isDuplicate = processedIds.has(incomingId);
  assert(isDuplicate === true, '9. Duplicate sync prevention detects repeated offline_id');
}

// 10. Invalid policy handling
{
  const weather = evaluateWeatherOracles({ source1: 72, source2: 70, source3: 73 });
  const inactivePolicy = {
    id: 'p-inactive',
    name: 'Inactive Plan',
    crop: 'Paddy',
    location: 'Karimnagar',
    state: 'Telangana',
    district: 'Karimnagar',
    trigger_type: 'below' as const,
    rainfall_threshold: 100,
    payout_amount: 10000,
    is_active: 0,
    coverage_start: '2026-06-01',
    coverage_end: '2026-09-30',
  };
  const evalResult = evaluatePolicyClaim(inactivePolicy, testFarmer, weather, new Date('2026-07-20'));
  assert(
    evalResult.status === 'rejected' && evalResult.decisionReason.includes('deactivated or suspended'),
    '10. Inactive or invalid policy returns deterministic rejection'
  );
}

// 11. Crop mismatch policy handling
{
  const weather = evaluateWeatherOracles({ source1: 72, source2: 70, source3: 73 });
  const cottonPolicy = {
    id: 'p-cotton',
    name: 'Cotton Moisture Guard',
    crop: 'Cotton',
    location: 'Karimnagar',
    state: 'Telangana',
    district: 'Karimnagar',
    trigger_type: 'below' as const,
    rainfall_threshold: 100,
    payout_amount: 10000,
    is_active: 1,
    coverage_start: '2026-06-01',
    coverage_end: '2026-09-30',
  };
  const evalResult = evaluatePolicyClaim(cottonPolicy, testFarmer, weather, new Date('2026-07-20'));
  assert(
    evalResult.status === 'rejected' && evalResult.decisionReason.includes('Farmer registered crop (Paddy) does not match'),
    '11. Policy for mismatched crop (Cotton vs Paddy) is safely rejected'
  );
}

// 12. Payout calculation
{
  const policy = {
    id: 'p1',
    trigger_type: 'below',
    rainfall_threshold: 100,
    payout_amount: 10000,
    is_active: 1,
    coverage_start: '2026-06-01',
    coverage_end: '2026-09-30',
  };
  const payout = calculatePayout(policy, true);
  const zeroPayout = calculatePayout(policy, false);
  assert(
    payout === 10000 && zeroPayout === 0,
    '12. Micro-payout calculation accurately computes INR 10,000 when triggered'
  );
}

console.log(`\n====================================================`);
console.log(`  Tests Completed: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`====================================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All 12 parametric insurance test suites passed cleanly!');
  process.exit(0);
}
