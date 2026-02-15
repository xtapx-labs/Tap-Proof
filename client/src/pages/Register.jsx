import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi } from '../utils/api';
import ScrambleText from '../components/ScrambleText';

const mechSpring = { type: 'spring', stiffness: 600, damping: 40 };
const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: mechSpring },
};
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

export default function Register() {
  const [tags, setTags] = useState([]);
  const [form, setForm] = useState({ name: '', brand: '', sku: '', image: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(null);
  const [simResult, setSimResult] = useState(null);
  const [step, setStep] = useState('form'); // form | keys
  const [adminKey, setAdminKey] = useState(localStorage.getItem('xtapx_admin_key') || '');
  const [authed, setAuthed] = useState(!!localStorage.getItem('xtapx_admin_key'));

  useEffect(() => { if (authed) loadTags(); }, [authed]);

  function handleAdminLogin(e) {
    e.preventDefault();
    localStorage.setItem('xtapx_admin_key', adminKey);
    setAuthed(true);
  }

  function loadTags() {
    adminApi('/api/tags').then(d => setTags(d.tags || [])).catch(() => {});
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!form.name || !form.brand) return;
    setLoading(true);
    try {
      const res = await adminApi('/api/register', {
        method: 'POST',
        body: JSON.stringify({
          product_name: form.name,
          brand: form.brand,
          sku: form.sku || undefined,
          image_url: form.image || undefined,
        }),
      });
      if (res.error === 'unauthorized') {
        alert('Invalid admin key');
        return;
      }
      setResult(res);
      setStep('keys');
      loadTags();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSimulate(uid) {
    setSimulating(uid);
    setSimResult(null);
    try {
      const res = await adminApi('/api/simulate-scan', {
        method: 'POST',
        body: JSON.stringify({ uid }),
      });
      setSimResult(res);
    } catch (err) {
      alert(err.message);
    } finally {
      setSimulating(null);
    }
  }

  function resetForm() {
    setForm({ name: '', brand: '', sku: '', image: '' });
    setResult(null);
    setStep('form');
  }

  // ── Admin gate ─────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen pt-14 flex items-center justify-center">
        <form onSubmit={handleAdminLogin} className="w-full max-w-sm mx-auto px-4 space-y-4 text-center">
          <div className="text-4xl mb-2">🔒</div>
          <h1 className="text-xl font-bold tracking-tight">Admin Access</h1>
          <p className="text-zinc-500 text-sm">Enter your admin key to register products and manage tags.</p>
          <input
            type="password"
            value={adminKey}
            onChange={e => setAdminKey(e.target.value)}
            placeholder="Admin key"
            className="w-full px-4 py-3 rounded-xl bg-vault-surface border border-vault-border text-white font-mono text-sm placeholder:text-zinc-600 focus:outline-none focus:border-truth-blue"
          />
          <button
            type="submit"
            disabled={!adminKey}
            className="w-full py-3 rounded-xl bg-truth-green text-vault-black font-bold text-sm disabled:opacity-40"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="min-h-screen pt-14"
    >
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-16 space-y-3">

        {/* Page header */}
        <motion.div variants={fadeUp} className="mb-2">
          <h1 className="text-2xl font-bold tracking-tight">Register Product</h1>
          <p className="text-zinc-500 text-sm mt-1">Bind a cryptographic identity to a physical product via NTAG 424 DNA.</p>
        </motion.div>

        {/* Form / Key display */}
        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.form
              key="form"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -12 }}
              onSubmit={handleRegister}
              className="rounded-xl border border-vault-border bg-vault-surface p-5 space-y-4"
            >
              <p className="text-zinc-500 text-[10px] font-mono tracking-[0.2em] uppercase">New Product</p>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Product Name *" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Air Jordan 1 Retro High" />
                <Field label="Brand *" value={form.brand} onChange={v => setForm({ ...form, brand: v })} placeholder="Nike" />
                <Field label="SKU" value={form.sku} onChange={v => setForm({ ...form, sku: v })} placeholder="AJ1-2025-RED" />
                <Field label="Image URL" value={form.image} onChange={v => setForm({ ...form, image: v })} placeholder="https://..." />
              </div>

              <button
                type="submit"
                disabled={loading || !form.name || !form.brand}
                className="w-full py-3 rounded-xl bg-truth-green text-vault-black font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {loading ? 'Generating keys...' : 'Register & Generate Keys'}
              </button>
            </motion.form>
          ) : (
            <motion.div
              key="keys"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -12 }}
              className="rounded-xl border border-truth-green/30 bg-vault-surface overflow-hidden"
            >
              <div className="bg-truth-green/5 border-b border-truth-green/20 px-5 py-3 flex items-center gap-2">
                <span className="text-truth-green text-lg">✓</span>
                <span className="text-white font-bold text-sm">Product Registered</span>
              </div>

              <div className="p-5 space-y-3">
                <div className="p-3 rounded-lg bg-vault-black border border-vault-border">
                  <p className="text-zinc-500 text-[10px] font-mono tracking-widest uppercase mb-1">Tag UID</p>
                  <p className="text-truth-blue font-mono text-sm"><ScrambleText text={result?.uid || ''} speed={20} /></p>
                </div>

                <div className="p-4 rounded-lg bg-truth-red/5 border border-truth-red/20">
                  <p className="text-truth-red text-xs font-bold mb-2">⚠ SAVE THESE KEYS — SHOWN ONCE</p>
                  <p className="text-zinc-500 text-[10px] font-mono tracking-widest uppercase mb-1 mt-3">SDM File Read Key</p>
                  <p className="text-white font-mono text-xs break-all select-all">{result?.keys?.sdm_file_read_key}</p>
                  <p className="text-zinc-500 text-[10px] font-mono tracking-widest uppercase mb-1 mt-3">SDM Meta Read Key</p>
                  <p className="text-white font-mono text-xs break-all select-all">{result?.keys?.sdm_meta_read_key}</p>
                  <p className="text-zinc-500 text-[10px] font-mono tracking-widest uppercase mb-1 mt-3">Master Key</p>
                  <p className="text-white font-mono text-xs break-all select-all">{result?.keys?.master_key}</p>
                </div>

                <p className="text-zinc-500 text-xs leading-relaxed">
                  Program these keys into your NTAG 424 DNA tag using NXP TagWriter or the NTAG SDK. 
                  Enable SDM / SUN with PICCData + CMAC mirroring.
                </p>

                <button
                  onClick={resetForm}
                  className="w-full py-3 rounded-xl bg-white/5 border border-vault-border text-white font-semibold text-sm hover:bg-white/10 transition-colors"
                >
                  Register Another
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Existing tags */}
        <motion.div variants={fadeUp} className="rounded-xl border border-vault-border bg-vault-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-zinc-500 text-[10px] font-mono tracking-[0.2em] uppercase">Registered Tags</p>
            <span className="text-zinc-600 text-xs font-mono">{tags.length}</span>
          </div>

          {tags.length === 0 ? (
            <p className="text-zinc-600 text-sm font-mono">No tags registered yet.</p>
          ) : (
            <div className="space-y-2">
              {tags.map(t => (
                <div
                  key={t.uid}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-vault-black border border-vault-border hover:border-vault-muted transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{t.product_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-truth-blue text-xs">{t.brand}</span>
                      <span className="text-zinc-700 text-xs">·</span>
                      <span className="text-zinc-600 text-[10px] font-mono">{t.uid}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleSimulate(t.uid)}
                      disabled={simulating === t.uid}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-vault-border text-xs font-semibold text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      {simulating === t.uid ? '...' : 'Sim Tap'}
                    </button>
                    <a
                      href={`/history?uid=${t.uid}`}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-vault-border text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      History
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Simulated tap result */}
        <AnimatePresence>
          {simResult && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: mechSpring }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl border border-truth-blue/30 bg-vault-surface p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-zinc-500 text-[10px] font-mono tracking-[0.2em] uppercase">Simulated NFC Output</p>
                <button onClick={() => setSimResult(null)} className="text-zinc-600 hover:text-zinc-400 text-xs">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-vault-black border border-vault-border">
                  <p className="text-zinc-600 text-[10px] font-mono uppercase">PICCData (enc)</p>
                  <p className="text-truth-green font-mono text-[10px] break-all mt-1">{simResult.piccData}</p>
                </div>
                <div className="p-3 rounded-lg bg-vault-black border border-vault-border">
                  <p className="text-zinc-600 text-[10px] font-mono uppercase">CMAC</p>
                  <p className="text-truth-green font-mono text-[10px] break-all mt-1">{simResult.cmac}</p>
                </div>
              </div>

              <a
                href={simResult.url}
                className="block w-full py-3 rounded-xl bg-truth-blue/10 border border-truth-blue/30 text-truth-blue font-bold text-sm text-center hover:bg-truth-blue/20 transition-colors"
              >
                Verify This Tap →
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-zinc-500 text-[10px] font-mono tracking-widest uppercase mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg bg-vault-black border border-vault-border text-white text-sm font-mono placeholder:text-zinc-700 focus:outline-none focus:border-truth-blue transition-colors"
      />
    </div>
  );
}
