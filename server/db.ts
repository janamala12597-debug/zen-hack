import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = process.env.VERCEL === '1' ? ':memory:' : path.join(process.cwd(), 'agrishield.db');
if (dbPath !== ':memory:') {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}
export const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');

export function initDatabase() {
  // Users table (Farmers & Admin)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'farmer', -- 'farmer' | 'admin'
      location TEXT NOT NULL,
      state TEXT NOT NULL,
      district TEXT NOT NULL,
      crop TEXT NOT NULL,
      preferred_language TEXT NOT NULL DEFAULT 'en', -- 'en' | 'te'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Policies table
  db.exec(`
    CREATE TABLE IF NOT EXISTS policies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      crop TEXT NOT NULL,
      location TEXT NOT NULL,
      state TEXT NOT NULL,
      district TEXT NOT NULL,
      coverage_start TEXT NOT NULL,
      coverage_end TEXT NOT NULL,
      trigger_type TEXT NOT NULL, -- 'below' | 'above'
      rainfall_threshold REAL NOT NULL, -- mm
      payout_amount REAL NOT NULL, -- in INR
      is_active INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Weather Readings / Oracles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS weather_readings (
      id TEXT PRIMARY KEY,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      source_1 REAL NOT NULL,
      source_2 REAL NOT NULL,
      source_3 REAL NOT NULL,
      verified_rainfall REAL NOT NULL, -- median
      outlier_detected INTEGER NOT NULL DEFAULT 0,
      outlier_source TEXT,
      consistency_status TEXT NOT NULL, -- 'consistent' | 'minor_variance' | 'potential_outlier'
      location TEXT NOT NULL DEFAULT 'Telangana, Karimnagar',
      note TEXT
    );
  `);

  // Claims table
  db.exec(`
    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      claim_number TEXT UNIQUE NOT NULL,
      farmer_id TEXT NOT NULL,
      policy_id TEXT NOT NULL,
      crop TEXT NOT NULL,
      location TEXT NOT NULL,
      claim_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL, -- 'draft' | 'saved_offline' | 'pending_verification' | 'processing' | 'approved' | 'rejected' | 'payout_initiated' | 'completed'
      verified_rainfall REAL,
      trigger_condition_met INTEGER DEFAULT 0,
      payout_amount REAL DEFAULT 0,
      decision_reason TEXT,
      offline_id TEXT UNIQUE,
      synced_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (farmer_id) REFERENCES users(id),
      FOREIGN KEY (policy_id) REFERENCES policies(id)
    );
  `);

  // Payouts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payouts (
      id TEXT PRIMARY KEY,
      payout_number TEXT UNIQUE NOT NULL,
      claim_id TEXT NOT NULL,
      farmer_id TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved_awaiting_settlement', -- 'approved_awaiting_settlement' | 'completed'
      settled_at DATETIME,
      settlement_reference TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (claim_id) REFERENCES claims(id),
      FOREIGN KEY (farmer_id) REFERENCES users(id)
    );
  `);

  // Audit Trail table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_trail (
      id TEXT PRIMARY KEY,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      event TEXT NOT NULL,
      actor_user TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      result TEXT NOT NULL,
      details TEXT
    );
  `);

  // Devices / Sync status table
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      farmer_id TEXT NOT NULL,
      farmer_name TEXT NOT NULL,
      device_id TEXT UNIQUE NOT NULL,
      last_sync_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      pending_queue_count INTEGER DEFAULT 0,
      device_mode TEXT DEFAULT 'online', -- 'online' | 'offline'
      user_agent TEXT,
      ip_address TEXT,
      FOREIGN KEY (farmer_id) REFERENCES users(id)
    );
  `);

  seedInitialData();
}

function seedInitialData() {
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount > 0) return;

  console.log('Seeding initial AgriShield data...');

  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('admin123', salt);
  const farmerHash = bcrypt.hashSync('farmer123', salt);

  // 1. Create Admin User
  db.prepare(`
    INSERT INTO users (id, name, mobile, email, password_hash, role, location, state, district, crop, preferred_language)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'user-admin-01',
    'AgriShield Operations Admin',
    '9000000000',
    'admin@agrishield.com',
    adminHash,
    'admin',
    'Hyderabad HQ',
    'Telangana',
    'Hyderabad',
    'General',
    'en'
  );

  // 2. Create Default Farmer: Ramesh Patel
  db.prepare(`
    INSERT INTO users (id, name, mobile, email, password_hash, role, location, state, district, crop, preferred_language)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'user-farmer-01',
    'Ramesh Patel',
    '9876543210',
    'ramesh@agrishield.demo',
    farmerHash,
    'farmer',
    'Jagtial Rural',
    'Telangana',
    'Karimnagar',
    'Paddy',
    'te'
  );

  // 2b. Create Second Demo Farmer: Sunita Devi
  db.prepare(`
    INSERT INTO users (id, name, mobile, email, password_hash, role, location, state, district, crop, preferred_language)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'user-farmer-02',
    'Sunita Devi',
    '9876543211',
    'sunita@agrishield.demo',
    farmerHash,
    'farmer',
    'Tenali Mandal',
    'Andhra Pradesh',
    'Guntur',
    'Cotton',
    'en'
  );

  // 3. Create Seed Policies
  // Policy A: AgriShield Rainfall Protection Plan (Deficit / Drought)
  db.prepare(`
    INSERT INTO policies (id, name, crop, location, state, district, coverage_start, coverage_end, trigger_type, rainfall_threshold, payout_amount, is_active, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'pol-rain-deficit-01',
    'AgriShield Rainfall Protection Plan',
    'Paddy',
    'Karimnagar District',
    'Telangana',
    'Karimnagar',
    '2026-06-01',
    '2026-09-30',
    'below',
    100.0,
    10000.0,
    1,
    'Automatic parametric micro-payout triggered when cumulative seasonal rainfall drops below 100 mm.'
  );

  // Policy B: Excessive Rainfall / Flood Guard
  db.prepare(`
    INSERT INTO policies (id, name, crop, location, state, district, coverage_start, coverage_end, trigger_type, rainfall_threshold, payout_amount, is_active, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'pol-excess-rain-02',
    'AgriShield Monsoon Flooding Guard',
    'Paddy',
    'Karimnagar District',
    'Telangana',
    'Karimnagar',
    '2026-06-01',
    '2026-09-30',
    'above',
    200.0,
    10000.0,
    1,
    'Automatic parametric micro-payout triggered when excessive torrential rainfall exceeds 200 mm.'
  );

  // Policy C: Cotton Crop Drought Shield
  db.prepare(`
    INSERT INTO policies (id, name, crop, location, state, district, coverage_start, coverage_end, trigger_type, rainfall_threshold, payout_amount, is_active, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'pol-cotton-shield-03',
    'AgriShield Cotton Moisture Guard',
    'Cotton',
    'Guntur District',
    'Andhra Pradesh',
    'Guntur',
    '2026-06-15',
    '2026-10-15',
    'below',
    120.0,
    12500.0,
    1,
    'Protects smallholder cotton growers against delayed monsoons with payout below 120 mm.'
  );

  // 4. Initial Weather Oracle Reading (72, 70, 73 -> Median 72)
  db.prepare(`
    INSERT INTO weather_readings (id, source_1, source_2, source_3, verified_rainfall, outlier_detected, outlier_source, consistency_status, location, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'weather-init-01',
    72.0,
    70.0,
    73.0,
    72.0,
    0,
    null,
    'consistent',
    'Telangana, Karimnagar',
    'All 3 weather oracle sources within 2 mm variance. High data consistency.'
  );

  // 5. Initial Audit Log
  db.prepare(`
    INSERT INTO audit_trail (id, event, actor_user, actor_role, action, result, details)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'audit-init-01',
    'System Initialization',
    'SYSTEM',
    'system',
    'Seed initial policies, oracles, and admin accounts',
    'SUCCESS',
    JSON.stringify({
      policies: 3,
      farmers: 2,
      weatherOracles: ['IMD Regional Station', 'Skymet AgTech Radar', 'ECMWF Sat-Grid'],
      verifiedRainfall: '72 mm',
    })
  );

  // 6. Registered Device for Ramesh
  db.prepare(`
    INSERT INTO devices (id, farmer_id, farmer_name, device_id, last_sync_at, pending_queue_count, device_mode, user_agent, ip_address)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 0, 'online', 'Android 14 Chrome / PWA Mobile', '192.168.1.42')
  `).run(
    'dev-ramesh-01',
    'user-farmer-01',
    'Ramesh Patel',
    'DEV-RP-TEL-8812'
  );

  console.log('AgriShield database initialized successfully!');
}
