import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, formatDate, formatDateShort, maskEmail } from '../utils/api';
import ScrambleText from '../components/ScrambleText';

const mechSpring = { type: 'spring', stiffness: 600, damping: 40 };
const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: mechSpring },
};
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

export default function History() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchUid, setSearchUid] = useState('');

  useEffect(() => {
    if (uid) {
      setLoading(true);
      api(`/api/history/${uid}`).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [uid]);

  if (!uid) {
    return (
      <div className="min-h-screen pt-14">
        <div className="max-w-lg mx-auto px-4 pt-24 text-center">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Product History</h1>
          <p className="text-zinc-500 text-sm mb-6">Enter a product UID to view its full scan ledger and provenance chain.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchUid}
              onChange={e => setSearchUid(e.target.value)}
              placeholder="e.g. 04A23B1C2D3E4F"
              className="flex-1 px-4 py-3 rounded-xl bg-vault-surface border border-vault-border text-white font-mono text-sm placeholder:text-zinc-600 focus:outline-none focus:border-truth-blue"
              onKeyDown={e => e.key === 'Enter' && searchUid && (window.location.href = `/history?uid=${searchUid}`)}
            />
            <button
              onClick={() => searchUid && (window.location.href = `/history?uid=${searchUid}`)}
              className="px-5 py-3 rounded-xl bg-truth-green text-vault-black font-bold text-sm"
            >
              Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-14 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-6 h-6 border-2 border-vault-border border-t-truth-blue rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm font-mono mt-3">Loading history...</p>
        </div>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="min-h-screen pt-14">
        <div className="max-w-lg mx-auto px-4 pt-24 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-bold mb-2">Product Not Found</h1>
          <p className="text-zinc-500 text-sm mb-4">No product with UID "{uid}" exists.</p>
          <a href="/history" className="px-5 py-2 rounded-lg bg-white/5 border border-vault-border text-white text-sm font-semibold">Search Again</a>
        </div>
      </div>
    );
  }

  const p = data.product || {};
  const prov = data.provenance || [];
  const scans = data.scan_ledger || [];
  const stats = data.stats || {};

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="min-h-screen pt-14"
    >
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-16 space-y-3">

        {/* Product header */}
        <motion.div
          variants={fadeUp}
          className="rounded-xl border border-vault-border bg-vault-surface overflow-hidden"
        >
          <div className="flex gap-4 p-5">
            <div className="w-20 h-20 rounded-lg bg-vault-card border border-vault-border flex items-center justify-center shrink-0 overflow-hidden">
              {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-3xl">📦</span>}
            </div>
            <div>
              <h1 className="text-white text-lg font-bold tracking-tight">{p.name || 'Unknown'}</h1>
              <p className="text-truth-blue text-sm font-medium">{p.brand}</p>
              {p.sku && <p className="text-zinc-600 text-xs font-mono mt-1">SKU: {p.sku}</p>}
              <p className="text-zinc-600 text-xs font-mono mt-0.5">UID: <ScrambleText text={uid} speed={20} /></p>
            </div>
          </div>
        </motion.div>

        {/* Stats bento */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Scans" value={data.total_scans || 0} variants={fadeUp} />
          <StatCard label="Authentic" value={stats.authentic || 0} color="text-truth-green" variants={fadeUp} />
          <StatCard label="Suspicious" value={stats.suspicious || 0} color="text-yellow-400" variants={fadeUp} />
          <StatCard label="Failed" value={stats.counterfeit || 0} color="text-truth-red" variants={fadeUp} />
        </div>

        {/* Info row */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-vault-border bg-vault-surface p-4">
            <p className="text-zinc-500 text-[10px] font-mono tracking-[0.2em] uppercase mb-1">Current Owner</p>
            <p className="text-white font-mono text-sm">{data.current_owner ? maskEmail(data.current_owner) : <span className="text-zinc-600">Unclaimed</span>}</p>
          </div>
          <div className="rounded-xl border border-vault-border bg-vault-surface p-4">
            <p className="text-zinc-500 text-[10px] font-mono tracking-[0.2em] uppercase mb-1">Last Counter</p>
            <p className="text-white font-mono text-sm">{data.last_counter || 0}</p>
            <p className="text-zinc-600 text-[10px] font-mono mt-1">{formatDateShort(data.registered_at)}</p>
          </div>
        </motion.div>

        {/* Provenance */}
        <motion.div variants={fadeUp} className="rounded-xl border border-vault-border bg-vault-surface p-5">
          <p className="text-zinc-500 text-[10px] font-mono tracking-[0.2em] uppercase mb-4">Provenance Chain</p>

          {prov.length === 0 ? (
            <p className="text-zinc-600 text-sm font-mono">No provenance data.</p>
          ) : (
            <div className="relative pl-5 space-y-0">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-vault-border" />
              {prov.map((e, i) => (
                <div key={i} className="relative py-2.5">
                  <div className={`absolute -left-5 top-3.5 w-[11px] h-[11px] rounded-full border-2 border-vault-black ${
                    i === prov.length - 1 ? 'bg-truth-green shadow-[0_0_8px_rgba(0,255,65,0.5)]' : 'bg-vault-muted'
                  }`} />
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white text-sm font-medium">
                        {actionIcon(e.type)} {maskEmail(e.actor)}
                      </p>
                      <p className="text-zinc-600 text-xs font-mono mt-0.5">counter: {e.counter}</p>
                    </div>
                    <p className="text-zinc-600 text-xs font-mono shrink-0">{formatDateShort(e.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Scan Ledger */}
        <motion.div variants={fadeUp} className="rounded-xl border border-vault-border bg-vault-surface p-5 overflow-x-auto">
          <p className="text-zinc-500 text-[10px] font-mono tracking-[0.2em] uppercase mb-4">Scan Ledger</p>

          {scans.length === 0 ? (
            <p className="text-zinc-600 text-sm font-mono">No scans recorded.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500 font-mono text-[10px] tracking-wider uppercase">
                  <th className="text-left pb-2">Time</th>
                  <th className="text-left pb-2">CTR</th>
                  <th className="text-left pb-2">Result</th>
                  <th className="text-left pb-2">Detail</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s, i) => (
                  <tr key={i} className="border-t border-vault-border/30 hover:bg-white/[0.02]">
                    <td className="py-2 pr-3 text-zinc-400 font-mono">{formatDate(s.time)}</td>
                    <td className="py-2 pr-3 text-white font-mono">{s.counter}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        s.result === 'authentic' ? 'bg-truth-green/10 text-truth-green' :
                        s.result === 'suspicious' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-truth-red/10 text-truth-red'
                      }`}>{s.result}</span>
                    </td>
                    <td className="py-2 text-zinc-600 font-mono truncate max-w-[200px]">{s.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>

        <motion.a
          variants={fadeUp}
          href="/"
          className="block w-full py-3 rounded-xl bg-white/5 border border-vault-border text-white font-semibold text-sm text-center hover:bg-white/10 transition-colors"
        >
          Back to Home
        </motion.a>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, color = 'text-white', variants }) {
  return (
    <motion.div variants={variants} className="rounded-xl border border-vault-border bg-vault-surface p-4 text-center">
      <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
      <p className="text-zinc-600 text-[10px] font-mono tracking-wider uppercase mt-1">{label}</p>
    </motion.div>
  );
}

function actionIcon(type) {
  const m = { registered: '◈', claimed: '⬡', transferred: '↗', released: '↘' };
  return m[type] || '·';
}
