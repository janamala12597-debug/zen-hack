import { Router, Response } from 'express';
import { db } from '../db.js';
import {
  authenticateToken,
  requireAdmin,
  recordAuditLog,
  AuthenticatedRequest,
} from '../middleware.js';

export const payoutsRouter = Router();

// GET all payouts (Farmer gets own, Admin gets all)
payoutsRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    let query = `
      SELECT p.*, c.claim_number, c.crop, c.verified_rainfall, u.name as farmer_name, u.mobile as farmer_mobile, pol.name as policy_name
      FROM payouts p
      JOIN claims c ON p.claim_id = c.id
      JOIN users u ON p.farmer_id = u.id
      JOIN policies pol ON c.policy_id = pol.id
    `;
    const params: any[] = [];

    if (user.role === 'farmer') {
      query += ' WHERE p.farmer_id = ?';
      params.push(user.id);
    } else {
      const status = req.query.status as string;
      if (status) {
        query += ' WHERE p.status = ?';
        params.push(status);
      }
    }

    query += ' ORDER BY p.created_at DESC';

    const payouts = db.prepare(query).all(...params);
    return res.json({ payouts });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST mark payout as settled (Admin only)
payoutsRouter.post('/:id/settle', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const payout = db.prepare('SELECT * FROM payouts WHERE id = ?').get(id) as any;

    if (!payout) {
      return res.status(404).json({ error: 'Payout record not found' });
    }

    if (payout.status === 'completed') {
      return res.status(400).json({ error: 'Payout has already been marked as completed' });
    }

    const ref = 'SIM-BANK-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 9000 + 1000);

    db.prepare(`
      UPDATE payouts
      SET status = 'completed',
          settled_at = CURRENT_TIMESTAMP,
          settlement_reference = ?
      WHERE id = ?
    `).run(ref, id);

    // Also update claim status to completed
    db.prepare(`
      UPDATE claims
      SET status = 'completed'
      WHERE id = ?
    `).run(payout.claim_id);

    recordAuditLog(
      'Payout Settled',
      req.user!.name,
      'admin',
      `Settled simulated payout ${payout.payout_number} for ₹${payout.amount}`,
      'SUCCESS',
      {
        payoutId: id,
        amount: payout.amount,
        settlementReference: ref,
      }
    );

    const updated = db.prepare('SELECT * FROM payouts WHERE id = ?').get(id);
    return res.json({ payout: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
