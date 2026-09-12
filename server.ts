import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './server/db.js';
import { authRouter } from './server/routes/auth.js';
import { policiesRouter } from './server/routes/policies.js';
import { weatherRouter } from './server/routes/weather.js';
import { claimsRouter } from './server/routes/claims.js';
import { payoutsRouter } from './server/routes/payouts.js';
import { auditRouter } from './server/routes/audit.js';
import { adminRouter } from './server/routes/admin.js';
import { systemRouter } from './server/routes/system.js';

export async function createApp() {
  // 1. Initialize SQLite Database
  initDatabase();

  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // Section 26: Health and Monitoring endpoints
  app.use(systemRouter);
  app.use('/api', systemRouter);

  // REST API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/policies', policiesRouter);
  app.use('/api/weather', weatherRouter);
  app.use('/api/claims', claimsRouter);
  app.use('/api/payouts', payoutsRouter);
  app.use('/api/audit-trail', auditRouter);
  app.use('/api/admin', adminRouter);

  // Vite middleware for development vs static build in production
  if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

if (process.env.VERCEL !== '1') {
  createApp().then((app) => {
    app.listen(3000, '0.0.0.0', () => {
      console.log('[AgriShield Server] running on http://0.0.0.0:3000');
    });
  }).catch((err) => {
    console.error('[AgriShield Server] Startup Error:', err);
    process.exit(1);
  });
}
