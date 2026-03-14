// ─────────────────────────────────────────────
// XtapX Server — Entry Point
// ─────────────────────────────────────────────
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const verifyRoutes   = require('./src/routes/verify');
const registerRoutes = require('./src/routes/register');
const claimRoutes    = require('./src/routes/claim');
const transferRoutes = require('./src/routes/transfer');
const historyRoutes  = require('./src/routes/history');

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

// ── SPA fallback for frontend pages ─────────
app.get('/scan',     (_req, res) => res.sendFile(path.join(__dirname, 'public', 'verify.html')));
app.get('/history',  (_req, res) => res.sendFile(path.join(__dirname, 'public', 'history.html')));
app.get('/register', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));

// ── Health check ────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'XtapX', time: new Date().toISOString() }));

// ── Start ───────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║   XtapX — Physical Misinformation        ║`);
  console.log(`  ║   Detection System                       ║`);
  console.log(`  ║   CalgaryHacks 2026                      ║`);
  console.log(`  ╠══════════════════════════════════════════╣`);
  console.log(`  ║   Server running on port ${PORT}            ║`);
  console.log(`  ║   ${process.env.BASE_URL || `http://localhost:${PORT}`}                ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
});
