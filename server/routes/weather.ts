import { Router } from 'express';
import { db } from '../db.js';
import { evaluateWeatherOracles } from '../policyEngine.js';
import { recordAuditLog, optionalAuth, AuthenticatedRequest } from '../middleware.js';

export const weatherRouter = Router();

// GET current verified weather
weatherRouter.get('/current', (req, res) => {
  try {
    const latest = db
      .prepare('SELECT * FROM weather_readings ORDER BY timestamp DESC LIMIT 1')
      .get() as any;

    if (!latest) {
      // Return default
      const evaluated = evaluateWeatherOracles({ source1: 72, source2: 70, source3: 73 });
      return res.json({
        reading: {
          id: 'weather-default',
          timestamp: new Date().toISOString(),
          source_1: 72,
          source_2: 70,
          source_3: 73,
          verified_rainfall: 72,
          outlier_detected: 0,
          outlier_source: null,
          consistency_status: 'consistent',
          location: 'Telangana, Karimnagar',
          sources_verified_label: '3 Weather Sources Verified',
          note: 'All 3 sources consistent.',
        },
      });
    }

    return res.json({
      reading: {
        ...latest,
        sources_verified_label: '3 Weather Sources Verified',
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST simulate weather reading (for demo and admin testing)
weatherRouter.post('/simulate', optionalAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { mode, source1, source2, source3, location = 'Telangana, Karimnagar' } = req.body;

    let s1 = 72;
    let s2 = 70;
    let s3 = 73;
    let scenarioName = 'Standard Normal Monsoons';

    if (mode === 'normal') {
      s1 = 72;
      s2 = 70;
      s3 = 73;
      scenarioName = 'Normal Monsoons (72, 70, 73 mm -> Median: 72 mm)';
    } else if (mode === 'outlier') {
      s1 = 72;
      s2 = 71;
      s3 = 180;
      scenarioName = 'Manipulated Outlier (72, 71, 180 mm -> Median: 72 mm, Source 3 flagged)';
    } else if (mode === 'excessive') {
      s1 = 210;
      s2 = 205;
      s3 = 215;
      scenarioName = 'Excessive Torrential Monsoons (210, 205, 215 mm -> Median: 210 mm)';
    } else if (mode === 'drought') {
      s1 = 38;
      s2 = 42;
      s3 = 40;
      scenarioName = 'Severe Drought Deficit (38, 42, 40 mm -> Median: 40 mm)';
    } else if (source1 !== undefined && source2 !== undefined && source3 !== undefined) {
      s1 = Number(source1);
      s2 = Number(source2);
      s3 = Number(source3);
      scenarioName = `Custom Readings (${s1}, ${s2}, ${s3} mm)`;
    }

    const evalResult = evaluateWeatherOracles({ source1: s1, source2: s2, source3: s3 });
    const id = 'weather-' + Date.now().toString(36);

    db.prepare(`
      INSERT INTO weather_readings (id, timestamp, source_1, source_2, source_3, verified_rainfall, outlier_detected, outlier_source, consistency_status, location, note)
      VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      evalResult.source1,
      evalResult.source2,
      evalResult.source3,
      evalResult.medianRainfall,
      evalResult.outlierDetected ? 1 : 0,
      evalResult.outlierSource,
      evalResult.consistencyStatus,
      location,
      evalResult.explanation
    );

    const latest = db.prepare('SELECT * FROM weather_readings WHERE id = ?').get(id) as any;

    recordAuditLog(
      evalResult.outlierDetected ? 'Weather Outlier Detected' : 'Weather Received & Verified',
      req.user?.name || 'Simulation Operator',
      req.user?.role || 'operator',
      `Injected weather scenario: ${scenarioName}`,
      evalResult.outlierDetected ? 'FLAGGED_OUTLIER' : 'VERIFIED',
      {
        scenario: scenarioName,
        source1: s1,
        source2: s2,
        source3: s3,
        median: evalResult.medianRainfall,
        outlier: evalResult.outlierDetected ? evalResult.outlierSource : null,
      }
    );

    return res.json({
      reading: {
        ...latest,
        sources_verified_label: '3 Weather Sources Verified',
        explanation: evalResult.explanation,
      },
      evaluation: evalResult,
    });
  } catch (err: any) {
    console.error('Weather simulation error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET weather rainfall history for charts
weatherRouter.get('/history', (req, res) => {
  try {
    const readings = db
      .prepare('SELECT * FROM weather_readings ORDER BY timestamp ASC LIMIT 25')
      .all();

    // If few readings, generate rich realistic time-series points
    if (readings.length < 5) {
      const dates = ['Jun 05', 'Jun 15', 'Jun 25', 'Jul 05', 'Jul 15', 'Jul 25', 'Aug 05', 'Aug 15', 'Aug 25', 'Sep 05'];
      const mockHistory = dates.map((date, idx) => {
        const base = 40 + idx * 4;
        return {
          date,
          source_1: base + Math.floor(Math.random() * 6 - 3),
          source_2: base + Math.floor(Math.random() * 6 - 3),
          source_3: base + Math.floor(Math.random() * 6 - 3),
          verified_rainfall: base,
          threshold: 100,
        };
      });
      return res.json({ history: mockHistory });
    }

    const history = readings.map((r: any) => ({
      date: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source_1: r.source_1,
      source_2: r.source_2,
      source_3: r.source_3,
      verified_rainfall: r.verified_rainfall,
      threshold: 100,
    }));

    return res.json({ history });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
