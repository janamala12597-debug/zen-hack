import { Router, Response } from 'express';
import { db } from '../db.js';
import {
  authenticateToken,
  requireAdmin,
  optionalAuth,
  recordAuditLog,
  AuthenticatedRequest,
} from '../middleware.js';

export const adminRouter = Router();

// GET Admin Dashboard Stats
adminRouter.get('/stats', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const totalFarmers = (
      db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'farmer'").get() as any
    ).count;

    const activePolicies = (
      db.prepare('SELECT COUNT(*) as count FROM policies WHERE is_active = 1').get() as any
    ).count;

    const totalClaims = (db.prepare('SELECT COUNT(*) as count FROM claims').get() as any).count;

    const approvedClaims = (
      db.prepare("SELECT COUNT(*) as count FROM claims WHERE status = 'approved' OR status = 'completed'").get() as any
    ).count;

    const pendingClaims = (
      db.prepare("SELECT COUNT(*) as count FROM claims WHERE status = 'pending_verification' OR status = 'saved_offline' OR status = 'processing'").get() as any
    ).count;

    const rejectedClaims = (
      db.prepare("SELECT COUNT(*) as count FROM claims WHERE status = 'rejected'").get() as any
    ).count;

    const payoutTotals = db
      .prepare(`
        SELECT 
          COALESCE(SUM(amount), 0) as totalAmount,
          COALESCE(SUM(CASE WHEN status = 'approved_awaiting_settlement' THEN amount ELSE 0 END), 0) as pendingAmount,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as settledAmount,
          COUNT(*) as totalPayoutsCount,
          SUM(CASE WHEN status = 'approved_awaiting_settlement' THEN 1 ELSE 0 END) as pendingCount,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as settledCount
        FROM payouts
      `)
      .get() as any;

    const weatherOutliers = (
      db.prepare('SELECT COUNT(*) as count FROM weather_readings WHERE outlier_detected = 1').get() as any
    ).count;

    const offlineSyncedCount = (
      db.prepare('SELECT COUNT(*) as count FROM claims WHERE offline_id IS NOT NULL').get() as any
    ).count;

    return res.json({
      stats: {
        totalFarmers,
        activePolicies,
        totalClaims,
        approvedClaims,
        pendingClaims,
        rejectedClaims,
        totalPayoutAmount: payoutTotals.totalAmount,
        pendingSettlementsAmount: payoutTotals.pendingAmount,
        settledAmount: payoutTotals.settledAmount,
        pendingSettlementsCount: payoutTotals.pendingCount || 0,
        completedSettlementsCount: payoutTotals.settledCount || 0,
        weatherOutliers,
        offlineSyncedCount,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET all farmers with their claim count & summary
adminRouter.get('/farmers', authenticateToken, requireAdmin, (req, res) => {
  try {
    const farmers = db
      .prepare(`
        SELECT u.id, u.name, u.mobile, u.location, u.state, u.district, u.crop, u.preferred_language, u.created_at,
               COUNT(c.id) as claim_count,
               COALESCE(SUM(CASE WHEN c.status = 'approved' OR c.status = 'completed' THEN c.payout_amount ELSE 0 END), 0) as total_payouts_received
        FROM users u
        LEFT JOIN claims c ON u.id = c.farmer_id
        WHERE u.role = 'farmer'
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `)
      .all();

    return res.json({ farmers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET offline devices & sync monitoring
adminRouter.get('/devices', authenticateToken, requireAdmin, (req, res) => {
  try {
    const devices = db.prepare('SELECT * FROM devices ORDER BY last_sync_at DESC').all();
    return res.json({ devices });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST device heartbeat / status ping (from client)
adminRouter.post('/devices/ping', optionalAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { device_id, pending_queue_count = 0, device_mode = 'online' } = req.body;
    const user = req.user;

    if (!device_id) {
      return res.status(400).json({ error: 'Device ID required' });
    }

    db.prepare(`
      INSERT INTO devices (id, farmer_id, farmer_name, device_id, last_sync_at, pending_queue_count, device_mode, user_agent, ip_address)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?)
      ON CONFLICT(device_id) DO UPDATE SET
        last_sync_at = CURRENT_TIMESTAMP,
        pending_queue_count = excluded.pending_queue_count,
        device_mode = excluded.device_mode
    `).run(
      'dev-' + (user?.id || 'anon') + '-' + device_id.substring(0, 8),
      user?.id || 'unknown',
      user?.name || 'Unregistered Device',
      device_id,
      pending_queue_count,
      device_mode,
      req.headers['user-agent'] || 'Browser',
      req.ip || '127.0.0.1'
    );

    return res.json({ status: 'pong', timestamp: new Date().toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

