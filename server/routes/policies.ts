import { Router, Response } from 'express';
import { db } from '../db.js';
import {
  authenticateToken,
  requireAdmin,
  recordAuditLog,
  AuthenticatedRequest,
} from '../middleware.js';

export const policiesRouter = Router();

// GET all policies (Public / Farmer view active, Admin view all)
policiesRouter.get('/', (req, res) => {
  try {
    const crop = req.query.crop as string;
    const includeInactive = req.query.all === 'true';

    let query = 'SELECT * FROM policies';
    const params: any[] = [];

    const conditions: string[] = [];
    if (!includeInactive) {
      conditions.push('is_active = 1');
    }
    if (crop) {
      conditions.push('LOWER(crop) = LOWER(?)');
      params.push(crop);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const policies = db.prepare(query).all(...params);
    return res.json({ policies });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET single policy
policiesRouter.get('/:id', (req, res) => {
  try {
    const policy = db.prepare('SELECT * FROM policies WHERE id = ?').get(req.params.id);
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    return res.json({ policy });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST Create new policy (Admin)
policiesRouter.post('/', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      crop,
      location,
      state = 'Telangana',
      district = 'Karimnagar',
      coverage_start = '2026-06-01',
      coverage_end = '2026-09-30',
      trigger_type = 'below',
      rainfall_threshold,
      payout_amount,
      description,
    } = req.body;

    if (!name || !crop || rainfall_threshold === undefined || payout_amount === undefined) {
      return res.status(400).json({
        error: 'Name, crop, rainfall_threshold (mm), and payout_amount (₹) are required',
      });
    }

    const id = 'pol-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    db.prepare(`
      INSERT INTO policies (id, name, crop, location, state, district, coverage_start, coverage_end, trigger_type, rainfall_threshold, payout_amount, is_active, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      id,
      name.trim(),
      crop.trim(),
      location || 'Regional Zone',
      state,
      district,
      coverage_start,
      coverage_end,
      trigger_type,
      Number(rainfall_threshold),
      Number(payout_amount),
      description || `Parametric coverage for ${crop} when rainfall is ${trigger_type} ${rainfall_threshold} mm.`
    );

    const created = db.prepare('SELECT * FROM policies WHERE id = ?').get(id);

    recordAuditLog('Policy Created', req.user!.name, 'admin', `Configured new policy "${name}"`, 'SUCCESS', {
      policyId: id,
      crop,
      trigger: `${trigger_type} ${rainfall_threshold} mm`,
      payout: payout_amount,
    });

    return res.status(201).json({ policy: created });
  } catch (err: any) {
    console.error('Create policy error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// PUT Edit policy (Admin)
policiesRouter.put('/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      crop,
      location,
      state,
      district,
      coverage_start,
      coverage_end,
      trigger_type,
      rainfall_threshold,
      payout_amount,
      description,
      is_active,
    } = req.body;

    const existing = db.prepare('SELECT * FROM policies WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    db.prepare(`
      UPDATE policies
      SET name = COALESCE(?, name),
          crop = COALESCE(?, crop),
          location = COALESCE(?, location),
          state = COALESCE(?, state),
          district = COALESCE(?, district),
          coverage_start = COALESCE(?, coverage_start),
          coverage_end = COALESCE(?, coverage_end),
          trigger_type = COALESCE(?, trigger_type),
          rainfall_threshold = COALESCE(?, rainfall_threshold),
          payout_amount = COALESCE(?, payout_amount),
          description = COALESCE(?, description),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      name,
      crop,
      location,
      state,
      district,
      coverage_start,
      coverage_end,
      trigger_type,
      rainfall_threshold !== undefined ? Number(rainfall_threshold) : null,
      payout_amount !== undefined ? Number(payout_amount) : null,
      description,
      is_active !== undefined ? Number(is_active) : null,
      id
    );

    const updated = db.prepare('SELECT * FROM policies WHERE id = ?').get(id);

    recordAuditLog('Policy Updated', req.user!.name, 'admin', `Updated policy rule configuration for ID ${id}`, 'SUCCESS', {
      policyId: id,
      changes: req.body,
    });

    return res.json({ policy: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH Toggle Policy status
policiesRouter.patch('/:id/toggle', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const policy = db.prepare('SELECT * FROM policies WHERE id = ?').get(id) as any;
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    const newStatus = policy.is_active ? 0 : 1;
    db.prepare('UPDATE policies SET is_active = ? WHERE id = ?').run(newStatus, id);

    recordAuditLog('Policy Status Changed', req.user!.name, 'admin', `${newStatus ? 'Activated' : 'Disabled'} policy ${policy.name}`, 'SUCCESS', {
      policyId: id,
      newStatus: newStatus ? 'active' : 'disabled',
    });

    return res.json({ id, is_active: newStatus });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
