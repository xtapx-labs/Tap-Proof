import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { adminApi } from '../utils/api';
import ScrambleText from '../components/ScrambleText';

const mechSpring = { type: 'spring', stiffness: 600, damping: 40 };
const stagger    = { visible: { transition: { staggerChildren: 0.07 } } };
const fadeUp     = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: mechSpring },
};

export default function Landing() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi('/api/tags').then(d => { setTags(d.tags || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function simulateScan(uid) {
    const data = await adminApi('/api/simulate-scan', { method: 'POST', body: { uid } });
    if (data.verify_url) window.location.href = data.verify_url;
  }

  function simulateCounterfeit() {
    window.location.href = `/verify?d=DEADBEEFDEADBEEFDEADBEEFDEADBEEF&m=BADC0FFEE0DDF00D`;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="min-h-screen pt-14"
    >
      {/* ── HERO ─────────────────────────── */}
      <section className="relative overflow-hidden grid-bg">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-vault-black/50 to-vault-black" />

        <div className="relative max-w-3xl mx-auto px-4 pt-24 pb-20 text-center">
          <motion.div
            variants={fadeUp}
            className="inline-block px-4 py-1.5 rounded-full bg-truth-green/5 border border-truth-green/20 mb-6"
          >
            <span className="text-truth-green text-xs font-mono tracking-[0.2em] uppercase">
              Topic 1
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]"
          >
            One tap.
            <br />
            The <span className="text-truth-green text-glow-green">truth</span> about
            <br />
            what you're holding.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-zinc-500 text-base sm:text-lg mt-6 max-w-lg mx-auto leading-relaxed"
          >
            Cryptographic NFC verification in under two seconds.
            No app. No account. Just mathematically proven authenticity.
          </motion.p>

          <motion.div variants={fadeUp} className="flex gap-3 justify-center mt-8">
            <a
              href="#demo"
              className="px-6 py-3 rounded-xl bg-truth-green text-vault-black font-bold text-sm hover:bg-truth-green/90 transition-colors"
            >
              Try the Demo
            </a>
            <a
              href="/register"
              className="px-6 py-3 rounded-xl bg-white/5 border border-vault-border text-white font-semibold text-sm hover:bg-white/10 transition-colors"
            >
              Register Product
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES BENTO ───────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <motion.div variants={fadeUp} className="text-center mb-10">
          <p className="text-zinc-500 text-[10px] font-mono tracking-[0.3em] uppercase mb-2">System Capabilities</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Asset Literacy Engine</h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: '🔐', title: 'Cryptographic Proof', desc: 'Every scan generates a unique AES-128 signature. Mathematically impossible to forge without the hardware key.' },
            { icon: '📱', title: 'Zero Friction', desc: 'No app. No account. Tap and verify. Works on Android and iOS via browser.' },
            { icon: '🔗', title: 'Provenance Chain', desc: 'Counter-anchored ownership history. Every transfer cryptographically verified.' },
            { icon: '🛡️', title: 'Clone Detection', desc: 'Counter regression, geographic impossibility, velocity anomalies — detected automatically.' },
            { icon: '📜', title: 'Digital Title Deed', desc: 'Binary pass/fail. Not a probability score. Real or counterfeit. No ambiguity.' },
            { icon: '🧠', title: 'Asset Literacy', desc: 'Forces a critical thinking moment before every transaction. Analyze data, not claims.' },
          ].map((f, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="group rounded-xl border border-vault-border bg-vault-surface p-5 hover:border-truth-green/30 transition-colors"
            >
              <span className="text-2xl">{f.icon}</span>
              <h3 className="text-white font-bold text-sm mt-3 mb-1">{f.title}</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────── */}
      <section className="max-w-2xl mx-auto px-4 py-16">
        <motion.div variants={fadeUp} className="text-center mb-10">
          <p className="text-zinc-500 text-[10px] font-mono tracking-[0.3em] uppercase mb-2">Protocol</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">How It Works</h2>
        </motion.div>

        <div className="space-y-0">
          {[
            { n: '01', title: 'Tap the Product', desc: 'The NFC tag powers up, increments its monotonic counter, and generates a one-time encrypted signature.' },
            { n: '02', title: 'Automatic Verification', desc: 'Your phone opens the URL. Server decrypts AES-128-CBC, validates CMAC, runs anomaly detection.' },
            { n: '03', title: 'Think. Decide. Confidence.', desc: 'See the verdict with full provenance chain. Make your decision on math, not trust.' },
          ].map((s, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="flex gap-5 py-5 border-b border-vault-border/50 last:border-0"
            >
              <span className="text-truth-green font-mono font-bold text-lg shrink-0">{s.n}</span>
              <div>
                <h4 className="text-white font-bold text-sm mb-1">{s.title}</h4>
                <p className="text-zinc-500 text-xs leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── DEMO ─────────────────────────── */}
      <section id="demo" className="max-w-2xl mx-auto px-4 py-16">
        <motion.div variants={fadeUp} className="text-center mb-8">
          <p className="text-zinc-500 text-[10px] font-mono tracking-[0.3em] uppercase mb-2">Live Demo</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Simulate an NFC Tap</h2>
          <p className="text-zinc-500 text-sm mt-2">Two tags. One real. One fake. See the difference.</p>
        </motion.div>

        <motion.div variants={fadeUp} className="rounded-xl border border-vault-border bg-vault-surface p-5">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block w-5 h-5 border-2 border-vault-border border-t-truth-blue rounded-full animate-spin" />
              <p className="text-zinc-500 text-sm mt-3 font-mono">Loading tags...</p>
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-500 text-sm mb-3">No tags registered yet.</p>
              <a href="/register" className="px-5 py-2 rounded-lg bg-truth-green text-vault-black font-bold text-sm">
                Register a Product
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tags.map(tag => (
                  <button
                    key={tag.uid}
                    onClick={() => simulateScan(tag.uid)}
                    className="group text-left p-4 rounded-xl border-2 border-truth-green/20 bg-truth-green/[0.03] hover:bg-truth-green/[0.08] hover:border-truth-green/40 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-truth-green shadow-[0_0_6px_rgba(0,255,65,0.5)]" />
                      <span className="text-truth-green text-[10px] font-mono tracking-[0.2em] uppercase">Genuine</span>
                    </div>
                    <p className="text-white text-sm font-bold truncate">{tag.product_name}</p>
                    <p className="text-zinc-500 text-xs">{tag.product_brand} · {tag.total_scans} scans</p>
                  </button>
                ))}
              </div>

              <button
                onClick={simulateCounterfeit}
                className="w-full p-4 rounded-xl border-2 border-truth-red/20 bg-truth-red/[0.03] hover:bg-truth-red/[0.08] hover:border-truth-red/40 transition-all text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-truth-red shadow-[0_0_6px_rgba(255,0,60,0.5)]" />
                  <span className="text-truth-red text-[10px] font-mono tracking-[0.2em] uppercase">Counterfeit</span>
                </div>
                <p className="text-white text-sm font-bold">Fake Tag (Static URL Clone)</p>
                <p className="text-zinc-500 text-xs">Copied URL with no valid crypto — instant detection</p>
              </button>
            </div>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="mt-3 rounded-xl border border-truth-blue/10 bg-truth-blue/[0.02] px-5 py-4">
          <p className="text-zinc-500 text-xs leading-relaxed">
            <span className="text-truth-blue font-semibold">How it works:</span> The genuine tag generates a fresh
            AES-128 encrypted signature on every tap. The fake uses a static URL — the server catches it because the
            counter is stale and the CMAC doesn't match a fresh computation.
          </p>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────── */}
      <footer className="border-t border-vault-border/50 py-8 text-center">
        <p className="text-zinc-600 text-xs font-mono">
          <span className="text-zinc-400 font-bold">XtapX Labs</span> · Combating Physical Misinformation
        </p>
      </footer>
    </motion.div>
  );
}
