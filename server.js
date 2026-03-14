// ─────────────────────────────────────────────
// XtapX Server — Entry Point
// ─────────────────────────────────────────────
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const verifyRoutes   = require('./server/routes/verify');
const registerRoutes = require('./server/routes/register');
const claimRoutes    = require('./server/routes/claim');
const transferRoutes = require('./server/routes/transfer');
const historyRoutes  = require('./server/routes/history');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ──────────────────────────────
app.use('/verify',   verifyRoutes);
app.use('/api',      registerRoutes);
app.use('/api',      claimRoutes);
app.use('/api',      transferRoutes);
app.use('/api',      historyRoutes);

// ── Health check ────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'XtapX', time: new Date().toISOString() }));

// ── SPA fallback — serve index.html for all non-API routes ──
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ───────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║   XtapX — Physical Misinformation        ║`);
  console.log(`  ║   Detection System                       ║`);
  console.log(`  ║   Cryptographic Verification             ║`);
  console.log(`  ╠══════════════════════════════════════════╣`);
  console.log(`  ║   Server running on port ${PORT}            ║`);
  console.log(`  ║   ${process.env.BASE_URL || `http://localhost:${PORT}`}                ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
});
