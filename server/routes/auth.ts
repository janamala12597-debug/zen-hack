import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import {
  generateToken,
  recordAuditLog,
  authenticateToken,
  AuthenticatedRequest,
  AuthUser,
} from '../middleware.js';

export const authRouter = Router();

// 1. Farmer Registration
authRouter.post('/register', (req, res) => {
  try {
    const {
      name,
      mobile,
      location,
      state,
      district,
      crop,
      preferred_language = 'en',
      password,
    } = req.body;

    if (!name || !mobile || !password || !crop) {
      return res.status(400).json({
        error: 'Missing required fields: name, mobile, crop, and password are required',
      });
    }

    // Check if mobile exists
    const existing = db.prepare('SELECT id FROM users WHERE mobile = ?').get(mobile);
    if (existing) {
      return res.status(409).json({ error: 'A farmer with this mobile number is already registered' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const id = 'farmer-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);

    db.prepare(`
      INSERT INTO users (id, name, mobile, email, password_hash, role, location, state, district, crop, preferred_language)
      VALUES (?, ?, ?, ?, ?, 'farmer', ?, ?, ?, ?, ?)
    `).run(
      id,
      name.trim(),
      mobile.trim(),
      `${mobile.trim()}@agrishield.demo`,
      passwordHash,
      location || 'Rural Village',
      state || 'Telangana',
      district || 'Karimnagar',
      crop || 'Paddy',
      preferred_language || 'en'
    );

    const user: AuthUser = {
      id,
      name: name.trim(),
      mobile: mobile.trim(),
      role: 'farmer',
      crop: crop || 'Paddy',
      location: location || 'Rural Village',
      state: state || 'Telangana',
      district: district || 'Karimnagar',
      preferred_language: (preferred_language as 'en' | 'te') || 'en',
    };

    const token = generateToken(user);

    recordAuditLog('Farmer Registered', user.name, 'farmer', 'Registered new micro-insurance account', 'SUCCESS', {
      farmerId: id,
      crop: user.crop,
      state: user.state,
      district: user.district,
    });

    return res.status(201).json({
      message: 'Farmer registered successfully',
      token,
      user,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// 2. Login (Both Farmer and Admin)
authRouter.post('/login', (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be mobile or email

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please provide mobile number (or email) and password' });
    }

    const cleanId = String(identifier).trim();
    const userRecord = db
      .prepare('SELECT * FROM users WHERE mobile = ? OR email = ?')
      .get(cleanId, cleanId) as any;

    if (!userRecord) {
      return res.status(401).json({ error: 'User not found with this mobile or email' });
    }

    const isValid = bcrypt.compareSync(password, userRecord.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const user: AuthUser = {
      id: userRecord.id,
      name: userRecord.name,
      mobile: userRecord.mobile,
      role: userRecord.role as 'farmer' | 'admin',
      crop: userRecord.crop,
      location: userRecord.location,
      state: userRecord.state,
      district: userRecord.district,
      preferred_language: userRecord.preferred_language,
    };

    const token = generateToken(user);

    recordAuditLog('User Login', user.name, user.role, 'Authenticated into portal', 'SUCCESS', {
      role: user.role,
    });

    return res.json({
      message: 'Login successful',
      token,
      user,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// 3. Current User Profile
authRouter.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRecord = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
    if (!userRecord) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user: AuthUser = {
      id: userRecord.id,
      name: userRecord.name,
      mobile: userRecord.mobile,
      role: userRecord.role,
      crop: userRecord.crop,
      location: userRecord.location,
      state: userRecord.state,
      district: userRecord.district,
      preferred_language: userRecord.preferred_language,
    };

    return res.json({ user });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
