const API = '';

export async function api(path, options = {}) {
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

/**
 * API call with admin key header for gated endpoints
 * (register, simulate-scan, tags).
 */
export async function adminApi(path, options = {}) {
  const adminKey = localStorage.getItem('xtapx_admin_key') || '';
  return api(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': adminKey,
      ...(options.headers || {}),
    },
  });
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDateShort(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function maskEmail(email) {
  if (!email) return '—';
  const [user, domain] = email.split('@');
  if (!domain) return email;
  if (user.length <= 2) return email;
  return `${user[0]}${'•'.repeat(Math.min(user.length - 2, 6))}${user[user.length - 1]}@${domain}`;
}
