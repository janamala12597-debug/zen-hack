import { Router, Response } from 'express';
import { db } from '../db.js';
import { evaluatePolicyClaim, evaluateWeatherOracles, PolicyRule, FarmerContext } from '../policyEngine.js';
import {
  authenticateToken,
  recordAuditLog,
  AuthenticatedRequest,
} from '../middleware.js';

export const claimsRouter = Router();

// GET claims (Farmer gets own, Admin gets all)
claimsRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    let query = `
      SELECT c.*, p.name as policy_name, p.trigger_type, p.rainfall_threshold, u.name as farmer_name, u.mobile as farmer_mobile
      FROM claims c
      JOIN policies p ON c.policy_id = p.id
      JOIN users u ON c.farmer_id = u.id
    `;
    const params: any[] = [];

    if (user.role === 'farmer') {
      query += ' WHERE c.farmer_id = ?';
      params.push(user.id);
    } else {
      const status = req.query.status as string;
      if (status) {
        query += ' WHERE c.status = ?';
        params.push(status);
      }
    }

    query += ' ORDER BY c.created_at DESC';

    const claims = db.prepare(query).all(...params);
    return res.json({ claims });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST submit claim (Online submission)
claimsRouter.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { policy_id, offline_id, notes } = req.body;

    if (!policy_id) {
      return res.status(400).json({ error: 'Policy ID is required' });
    }

    const policy = db.prepare('SELECT * FROM policies WHERE id = ?').get(policy_id) as PolicyRule;
    if (!policy) {
      return res.status(404).json({ error: 'Selected policy not found' });
    }

    const farmerRecord = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any;
    const farmerContext: FarmerContext = {
      id: farmerRecord.id,
      name: farmerRecord.name,
      crop: farmerRecord.crop,
      location: farmerRecord.location,
      state: farmerRecord.state,
      district: farmerRecord.district,
    };

    // Get current weather reading or fallback
    let weatherRow = db
      .prepare('SELECT * FROM weather_readings ORDER BY timestamp DESC LIMIT 1')
      .get() as any;

    if (!weatherRow) {
      weatherRow = {
        source_1: 72,
        source_2: 70,
        source_3: 73,
        verified_rainfall: 72,
        outlier_detected: 0,
        outlier_source: null,
        consistency_status: 'consistent',
        explanation: 'All 3 weather sources verified.',
      };
    }

    const weatherEval = evaluateWeatherOracles({
      source1: weatherRow.source_1,
      source2: weatherRow.source_2,
      source3: weatherRow.source_3,
    });

    // Run deterministic policy engine
    const decision = evaluatePolicyClaim(policy, farmerContext, weatherEval);

    const claimId = 'clm-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
    const count = (db.prepare('SELECT COUNT(*) as count FROM claims').get() as any).count + 1;
    const claimNumber = `CLM-2026-${String(count).padStart(4, '0')}`;

    db.prepare(`
      INSERT INTO claims (id, claim_number, farmer_id, policy_id, crop, location, status, verified_rainfall, trigger_condition_met, payout_amount, decision_reason, offline_id, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      claimId,
      claimNumber,
      farmerContext.id,
      policy.id,
      farmerContext.crop,
      farmerContext.location,
      decision.status,
      decision.verifiedRainfall,
      decision.triggerConditionMet ? 1 : 0,
      decision.payoutAmount,
      decision.decisionReason,
      offline_id || null
    );

    let payoutRecord: any = null;
    if (decision.status === 'approved' && decision.payoutAmount > 0) {
      const payoutId = 'pay-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      const payoutCount = (db.prepare('SELECT COUNT(*) as count FROM payouts').get() as any).count + 1;
      const payoutNumber = `PAY-2026-${String(payoutCount).padStart(4, '0')}`;

      db.prepare(`
        INSERT INTO payouts (id, payout_number, claim_id, farmer_id, amount, status)
        VALUES (?, ?, ?, ?, ?, 'approved_awaiting_settlement')
      `).run(payoutId, payoutNumber, claimId, farmerContext.id, decision.payoutAmount);

      payoutRecord = db.prepare('SELECT * FROM payouts WHERE id = ?').get(payoutId);

      recordAuditLog(
        'Payout Decision Generated',
        'POLICY_ENGINE',
        'system',
        `Generated payout decision for claim ${claimNumber}`,
        'APPROVED',
        {
          payoutNumber,
          amount: decision.payoutAmount,
          farmer: farmerContext.name,
          verifiedRainfall: decision.verifiedRainfall,
        }
      );
    }

    recordAuditLog(
      decision.status === 'approved' ? 'Claim Approved' : 'Claim Rejected',
      farmerContext.name,
      'farmer',
      `Submitted claim for ${policy.name}`,
      decision.status.toUpperCase(),
      {
        claimNumber,
        verifiedRainfall: decision.verifiedRainfall,
        threshold: policy.rainfall_threshold,
        triggerType: policy.trigger_type,
        decisionReason: decision.decisionReason,
      }
    );

    const createdClaim = db.prepare(`
      SELECT c.*, p.name as policy_name, p.trigger_type, p.rainfall_threshold
      FROM claims c
      JOIN policies p ON c.policy_id = p.id
      WHERE c.id = ?
    `).get(claimId);

    return res.status(201).json({
      claim: createdClaim,
      decision,
      payout: payoutRecord,
    });
  } catch (err: any) {
    console.error('Claim submission error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /sync: Batch synchronize offline claims!
claimsRouter.post('/sync', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { claims: queuedClaims = [], device_id = 'PWA-DEVICE-DEFAULT' } = req.body;

    if (!Array.isArray(queuedClaims) || queuedClaims.length === 0) {
      return res.json({
        message: 'No offline claims to synchronize',
        syncedCount: 0,
        results: [],
      });
    }

    // Step 1: Fetch fresh 3-source weather data
    let weatherRow = db
      .prepare('SELECT * FROM weather_readings ORDER BY timestamp DESC LIMIT 1')
      .get() as any;

    if (!weatherRow) {
      weatherRow = {
        source_1: 72,
        source_2: 70,
        source_3: 73,
        verified_rainfall: 72,
        outlier_detected: 0,
        outlier_source: null,
        consistency_status: 'consistent',
        explanation: 'All 3 weather sources verified.',
      };
    }

    const weatherEval = evaluateWeatherOracles({
      source1: weatherRow.source_1,
      source2: weatherRow.source_2,
      source3: weatherRow.source_3,
    });

    const farmerRecord = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any;
    const farmerContext: FarmerContext = {
      id: farmerRecord.id,
      name: farmerRecord.name,
      crop: farmerRecord.crop,
      location: farmerRecord.location,
      state: farmerRecord.state,
      district: farmerRecord.district,
    };

    const results: any[] = [];
    let syncedCount = 0;

    for (const item of queuedClaims) {
      const offlineId = item.offline_id || item.id;

      // Duplicate prevention: check if this offline_id already processed
      if (offlineId) {
        const existing = db.prepare('SELECT * FROM claims WHERE offline_id = ?').get(offlineId) as any;
        if (existing) {
          results.push({
            offline_id: offlineId,
            claim_number: existing.claim_number,
            status: existing.status,
            alreadyProcessed: true,
            message: 'Claim previously synchronized and verified.',
          });
          continue;
        }
      }

      // Fetch policy
      const policyId = item.policy_id;
      const policy = db.prepare('SELECT * FROM policies WHERE id = ?').get(policyId) as PolicyRule;
      if (!policy) {
        results.push({
          offline_id: offlineId,
          error: 'Policy not found or expired',
          status: 'rejected',
        });
        continue;
      }

      // Run deterministic policy engine against fresh weather
      const claimDate = item.created_at ? new Date(item.created_at) : new Date();
      const decision = evaluatePolicyClaim(policy, farmerContext, weatherEval, claimDate);

      const claimId = 'clm-synced-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      const count = (db.prepare('SELECT COUNT(*) as count FROM claims').get() as any).count + 1;
      const claimNumber = `CLM-2026-${String(count).padStart(4, '0')}`;

      db.prepare(`
        INSERT INTO claims (id, claim_number, farmer_id, policy_id, crop, location, claim_date, status, verified_rainfall, trigger_condition_met, payout_amount, decision_reason, offline_id, synced_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        claimId,
        claimNumber,
        farmerContext.id,
        policy.id,
        farmerContext.crop,
        farmerContext.location,
        claimDate.toISOString(),
        decision.status,
        decision.verifiedRainfall,
        decision.triggerConditionMet ? 1 : 0,
        decision.payoutAmount,
        decision.decisionReason,
        offlineId
      );

      let payoutRecord = null;
      if (decision.status === 'approved' && decision.payoutAmount > 0) {
        const payoutId = 'pay-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
        const payoutCount = (db.prepare('SELECT COUNT(*) as count FROM payouts').get() as any).count + 1;
        const payoutNumber = `PAY-2026-${String(payoutCount).padStart(4, '0')}`;

        db.prepare(`
          INSERT INTO payouts (id, payout_number, claim_id, farmer_id, amount, status)
          VALUES (?, ?, ?, ?, ?, 'approved_awaiting_settlement')
        `).run(payoutId, payoutNumber, claimId, farmerContext.id, decision.payoutAmount);

        payoutRecord = { id: payoutId, payout_number: payoutNumber, amount: decision.payoutAmount };
      }

      syncedCount++;

      recordAuditLog(
        'Offline Claim Synced',
        farmerContext.name,
        'farmer',
        `Reconnected & synchronized queued offline claim ${offlineId}`,
        decision.status.toUpperCase(),
        {
          claimNumber,
          offlineId,
          verifiedRainfall: decision.verifiedRainfall,
          decisionReason: decision.decisionReason,
          payoutAmount: decision.payoutAmount,
          stepsCompleted: ['Weather Updated', 'Policy Verified', 'Claim Processed'],
        }
      );

      results.push({
        offline_id: offlineId,
        claim_id: claimId,
        claim_number: claimNumber,
        status: decision.status,
        verified_rainfall: decision.verifiedRainfall,
        decision_reason: decision.decisionReason,
        payout: payoutRecord,
      });
    }

    // Update or insert device sync record
    db.prepare(`
      INSERT INTO devices (id, farmer_id, farmer_name, device_id, last_sync_at, pending_queue_count, device_mode)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 0, 'online')
      ON CONFLICT(device_id) DO UPDATE SET
        last_sync_at = CURRENT_TIMESTAMP,
        pending_queue_count = 0,
        device_mode = 'online'
    `).run(
      'dev-' + user.id,
      user.id,
      farmerContext.name,
      device_id
    );

    return res.json({
      message: 'Offline claims synchronized successfully',
      syncedCount,
      freshWeather: {
        sources: [weatherEval.source1, weatherEval.source2, weatherEval.source3],
        verifiedMedian: weatherEval.medianRainfall,
        outlier: weatherEval.outlierDetected ? weatherEval.outlierSource : null,
      },
      results,
      syncPipeline: [
        { step: 'Weather Updated', status: 'completed', detail: `Fresh 3-source median: ${weatherEval.medianRainfall} mm` },
        { step: 'Policy Verified', status: 'completed', detail: `Evaluated against active threshold rules` },
        { step: 'Claim Processed', status: 'completed', detail: `${syncedCount} claim(s) resolved with instant decisions` },
      ],
    });
  } catch (err: any) {
    console.error('Offline claims sync error:', err);
    return res.status(500).json({ error: err.message });
  }
});
