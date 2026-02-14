// ─────────────────────────────────────────────
// XtapX Common Frontend Utilities
// ─────────────────────────────────────────────

const API = window.location.origin;

// ── Fetch helper ────────────────────────────
async function api(path, options = {}) {
  const url = `${API}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }
  const res = await fetch(url, config);
  return res.json();
}

// ── Toast notification ──────────────────────
function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast ${type}`;
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Format date ─────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Format date short ───────────────────────
function formatDateShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Mask email ──────────────────────────────
function maskEmail(email) {
  if (!email) return '—';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user}@${domain}`;
  return `${user[0]}${'•'.repeat(user.length - 2)}${user[user.length - 1]}@${domain}`;
}

// ── Result badge ────────────────────────────
function resultBadge(result) {
  const map = {
    authentic:   '<span class="badge badge-green">Authentic</span>',
    counterfeit: '<span class="badge badge-red">Counterfeit</span>',
    suspicious:  '<span class="badge badge-yellow">Suspicious</span>',
  };
  return map[result] || '<span class="badge badge-neutral">Unknown</span>';
}

// ── URL params helper ───────────────────────
function getParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}

// ── Open modal ──────────────────────────────
function openModal(id) {
  document.getElementById(id)?.classList.add('active');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
}
