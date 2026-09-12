import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'agrishield-secret-key-2026';

export interface AuthUser {
  id: string;
  name: string;
  mobile: string;
  role: 'farmer' | 'admin';
  crop: string;
  location: string;
  state: string;
  district: string;
  preferred_language: 'en' | 'te';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      req.user = decoded;
    } catch {
      // ignore
    }
  }
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function recordAuditLog(
  event: string,
  actorUser: string,
  actorRole: string,
  action: string,
  result: string,
  details: Record<string, any> = {}
) {
  try {
    const id = 'audit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    db.prepare(`
      INSERT INTO audit_trail (id, timestamp, event, actor_user, actor_role, action, result, details)
      VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)
    `).run(id, event, actorUser, actorRole, action, result, JSON.stringify(details));
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
