import { Router } from 'express';
import { db } from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware.js';

export const auditRouter = Router();

// GET audit trail (Admin)
auditRouter.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const event = req.query.event as string;

    let query = 'SELECT * FROM audit_trail';
    const params: any[] = [];

    if (event) {
      query += ' WHERE event LIKE ?';
      params.push(`%${event}%`);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const logs = db.prepare(query).all(...params);
    return res.json({ logs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
