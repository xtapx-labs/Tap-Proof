// ─────────────────────────────────────────────
// XtapX Privacy Utilities
// ─────────────────────────────────────────────
// Mask PII before it leaves the server.
// ─────────────────────────────────────────────

/**
 * Masks an email address: "pranav@xtapx-labs.com" → "p***@xtapx-labs.com"
 * Non-email strings are returned with first char + asterisks.
 */
function maskEmail(email) {
  if (!email) return email;
  const parts = email.split('@');
  if (parts.length !== 2) {
    // Not a real email — mask most of it anyway
    return email.charAt(0) + '***';
  }
  const local = parts[0];
  const masked = local.charAt(0) + '***';
  return `${masked}@${parts[1]}`;
}

/**
 * Strips ip_address / ip fields from a scan object.
 * Returns a new object without mutating the original.
 */
function stripIP(obj) {
  if (!obj) return obj;
  const { ip_address, ip, ...clean } = obj;
  return clean;
}

module.exports = { maskEmail, stripIP };
