// ─────────────────────────────────────────────
// XtapX Admin Auth Middleware
// ─────────────────────────────────────────────
// Checks x-admin-key header against ADMIN_KEY env var.
// Apply to routes that expose cryptographic keys
// or privileged tag management operations.
// ─────────────────────────────────────────────

function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'unauthorized', message: 'Valid x-admin-key header required' });
  }
  next();
}

module.exports = adminAuth;
