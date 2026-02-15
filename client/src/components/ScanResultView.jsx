import { motion, AnimatePresence } from 'framer-motion';
import ScrambleText from './ScrambleText';
import StatusIndicator from './StatusIndicator';
import { maskEmail, formatDate, formatDateShort } from '../utils/api';

// ── Animation presets (mechanical, snappy) ──
const mechSpring = { type: 'spring', stiffness: 600, damping: 40 };
const stagger    = { staggerChildren: 0.06 };
const fadeSlide  = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: mechSpring },
};

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function ScanResultView({ scanStatus = 'LOADING', assetData = {} }) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-20 pb-16">
      <AnimatePresence mode="wait">
        {scanStatus === 'LOADING' && <LoadingState key="loading" />}
        {scanStatus === 'VERIFIED' && <VerifiedState key="verified" data={assetData} />}
        {scanStatus === 'ANOMALY' && <AnomalyState key="anomaly" data={assetData} />}
        {scanStatus === 'SUSPICIOUS' && <SuspiciousState key="suspicious" data={assetData} />}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════
// LOADING STATE — Matrix decode effect
// ═══════════════════════════════════════════
function LoadingState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Scanning banner */}
      <div className="relative overflow-hidden rounded-2xl border border-vault-border bg-vault-surface p-8 text-center scan-line-effect">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="space-y-3"
        >
          <StatusIndicator status="loading" />
          <p className="text-truth-blue text-xs font-mono tracking-[0.3em] uppercase mt-4">
            Decrypting Signature
          </p>
          <div className="text-zinc-600 font-mono text-xs space-y-1">
            <ScrambleText text="AES-128-CBC  ████████████████" speed={20} />
            <br />
            <ScrambleText text="CMAC VERIFY  ████████████████" delay={300} speed={20} />
            <br />
            <ScrambleText text="COUNTER CHK  ████████████████" delay={600} speed={20} />
          </div>
        </motion.div>
      </div>

      {/* Skeleton bento grid */}
      <div className="grid grid-cols-2 gap-3">
        {[0,1,2,3].map(i => (
          <motion.div
            key={i}
            className="h-28 rounded-xl bg-vault-surface border border-vault-border"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════
// VERIFIED STATE — The Digital Title Deed
// ═══════════════════════════════════════════
function VerifiedState({ data }) {
  const product    = data.product || {};
  const provenance = data.provenance || [];
  const recentScans = data.recent_scans || [];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
      variants={{ visible: stagger }}
      className="space-y-3"
    >
      {/* ── VERDICT BANNER ──────────────── */}
      <motion.div
        variants={fadeSlide}
        className="relative overflow-hidden rounded-2xl border border-truth-green/30 bg-truth-green/[0.04] animate-pulse-green"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-truth-green/5 to-transparent" />
        <div className="relative p-6 sm:p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...mechSpring, delay: 0.1 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-truth-green/10 border border-truth-green/30 mb-4"
          >
            <svg className="w-7 h-7 text-truth-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-glow-green">
            VERIFIED AUTHENTIC
          </h1>
          <p className="text-truth-green/60 text-sm mt-1 font-mono">
            Cryptographic proof validated
          </p>
        </div>
      </motion.div>

      {/* ── BENTO GRID ──────────────────── */}
      <div className="grid grid-cols-5 gap-3">

        {/* Product Image — 2 cols */}
        <motion.div
          variants={fadeSlide}
          className="col-span-2 rounded-xl border border-vault-border bg-vault-surface overflow-hidden"
        >
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover min-h-[180px]"
            />
          ) : (
            <div className="w-full h-full min-h-[180px] flex items-center justify-center text-5xl bg-vault-card">
              📦
            </div>
          )}
        </motion.div>

        {/* Product Info + Crypto Proof — 3 cols */}
        <motion.div
          variants={fadeSlide}
          className="col-span-3 rounded-xl border border-vault-border bg-vault-surface p-4 sm:p-5 flex flex-col justify-between"
        >
          <div>
            <p className="text-zinc-500 text-[10px] font-mono tracking-[0.2em] uppercase mb-1">Product</p>
            <h2 className="text-white text-lg sm:text-xl font-bold tracking-tight leading-snug">
              {product.name || 'Unknown Product'}
            </h2>
            <p className="text-truth-blue text-sm font-medium mt-0.5">{product.brand || 'Unknown'}</p>
            {product.sku && (
              <p className="text-zinc-600 text-xs font-mono mt-1">SKU: {product.sku}</p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-vault-border/50 space-y-2">
            <CryptoRow label="UID" value={data.uid || '—'} status="valid" />
            <CryptoRow label="CTR" value={String(data.last_counter ?? '—')} status="valid" />
            <CryptoRow label="SIG" value="MATCH" status="valid" />
          </div>
        </motion.div>

        {/* Owner Card — 3 cols */}
        <motion.div
          variants={fadeSlide}
          className="col-span-3 rounded-xl border border-vault-border bg-vault-surface p-4 sm:p-5"
        >
          <p className="text-zinc-500 text-[10px] font-mono tracking-[0.2em] uppercase mb-2">Current Owner</p>
          <p className="text-white font-mono text-sm">
            {data.current_owner ? (
              <ScrambleText text={maskEmail(data.current_owner)} delay={400} speed={25} />
            ) : (
              <span className="text-zinc-600">Unclaimed</span>
            )}
          </p>
          <p className="text-zinc-600 text-xs font-mono mt-2">
            Registered {formatDateShort(data.registered_at)}
          </p>
        </motion.div>

        {/* Scan Info — 2 cols */}
        <motion.div
          variants={fadeSlide}
          className="col-span-2 rounded-xl border border-vault-border bg-vault-surface p-4 sm:p-5 flex flex-col justify-between"
        >
          <div>
            <p className="text-zinc-500 text-[10px] font-mono tracking-[0.2em] uppercase mb-2">Scan</p>
            <p className="text-3xl font-bold text-white">
              #{data.total_scans || 0}
            </p>
          </div>
          <p className="text-zinc-600 text-xs font-mono mt-2">
            {formatDate(new Date().toISOString())}
          </p>
        </motion.div>
      </div>

      {/* ── PROVENANCE CHAIN (Guestbook) ── */}
      <motion.div
        variants={fadeSlide}
        className="rounded-xl border border-vault-border bg-vault-surface p-4 sm:p-5"
      >
        <p className="text-zinc-500 text-[10px] font-mono tracking-[0.2em] uppercase mb-4">
          Provenance Chain · Guestbook
        </p>

        {provenance.length === 0 ? (
          <p className="text-zinc-600 text-sm font-mono">No provenance data yet.</p>
        ) : (
          <div className="relative pl-5 space-y-0">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-vault-border" />

            {provenance.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...mechSpring, delay: 0.5 + i * 0.08 }}
                className="relative py-2.5"
              >
                {/* Dot */}
                <div className={`absolute -left-5 top-3.5 w-[11px] h-[11px] rounded-full border-2 border-vault-black ${
                  i === provenance.length - 1
                    ? 'bg-truth-green shadow-[0_0_8px_rgba(0,255,65,0.5)]'
                    : 'bg-vault-muted'
                }`} />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {formatAction(p.action || p.type)} {maskEmail(p.owner || p.actor)}
                    </p>
                    <p className="text-zinc-600 text-xs font-mono mt-0.5">
                      counter: {p.counter}
                    </p>
                  </div>
                  <p className="text-zinc-600 text-xs font-mono shrink-0">
                    {formatDateShort(p.date)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── TRUST FOOTER ────────────────── */}
      <motion.div
        variants={fadeSlide}
        className="rounded-xl border border-truth-green/10 bg-truth-green/[0.02] px-5 py-4"
      >
        <p className="text-zinc-400 text-xs leading-relaxed">
          You are viewing <span className="text-truth-green font-semibold">mathematically verified</span> information
          about this product. The AES-128 cryptographic signature has been validated against a hardware-secured key
          that never leaves the chip. Make your decision with confidence.
        </p>
      </motion.div>

      {/* ── ACTION BUTTONS ──────────────── */}
      <motion.div variants={fadeSlide} className="flex gap-3">
        {!data.current_owner ? (
          <button
            onClick={() => data.onClaim?.()}
            className="flex-1 py-3 rounded-xl bg-truth-green text-vault-black font-bold text-sm tracking-tight hover:bg-truth-green/90 transition-colors"
          >
            Claim Ownership
          </button>
        ) : (
          <button
            onClick={() => data.onTransfer?.()}
            className="flex-1 py-3 rounded-xl bg-white/5 border border-vault-border text-white font-semibold text-sm hover:bg-white/10 transition-colors"
          >
            Transfer Ownership
          </button>
        )}
        <a
          href={`/history?uid=${data.uid || ''}`}
          className="flex-1 py-3 rounded-xl bg-white/5 border border-vault-border text-white font-semibold text-sm text-center hover:bg-white/10 transition-colors"
        >
          Full History
        </a>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════
// ANOMALY STATE — Counterfeit Detected
// ═══════════════════════════════════════════
function AnomalyState({ data }) {
  const reason = data.reason || 'unknown';
  const explanations = {
    unknown_tag:        'This tag is not registered in the XtapX system. It may be a counterfeit.',
    invalid_signature:  'The AES-128 CMAC signature does not match. The cryptographic proof is forged.',
    stale_counter:      'The counter value has been seen before. This is a replay of a captured URL.',
    clone_detected:     'Counter regression detected. This is impossible on genuine hardware. Clone confirmed.',
    missing_parameters: 'The URL is missing required cryptographic parameters.',
    counter_regression_clone_detected: 'Counter went backwards. Impossible on genuine silicon. This is a hardware clone.',
    replay_attempt_stale_counter: 'This exact scan data was already used. Replay attack detected.',
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0 }}
      variants={{ visible: stagger }}
      className="space-y-3"
    >
      {/* Red alert banner */}
      <motion.div
        variants={fadeSlide}
        className="relative overflow-hidden rounded-2xl border-2 border-truth-red/40 bg-truth-red/[0.04] animate-pulse-red"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-truth-red/10 to-transparent" />
        <div className="relative p-6 sm:p-8 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ ...mechSpring, delay: 0.1 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-truth-red/10 border border-truth-red/30 mb-4"
          >
            <svg className="w-8 h-8 text-truth-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl sm:text-3xl font-bold tracking-tight text-truth-red text-glow-red"
          >
            VERIFICATION FAILED
          </motion.h1>
          <p className="text-truth-red/50 text-sm font-mono mt-1">
            Cryptographic proof invalid
          </p>
        </div>
      </motion.div>

      {/* Rejection details */}
      <motion.div
        variants={fadeSlide}
        className="rounded-xl border border-vault-border bg-vault-surface p-5"
      >
        <p className="text-zinc-500 text-[10px] font-mono tracking-[0.2em] uppercase mb-3">
          Rejection Analysis
        </p>
        <CryptoRow label="REASON" value={reason.replace(/_/g, ' ').toUpperCase()} status="invalid" />
        <div className="mt-3 pt-3 border-t border-vault-border/50">
          <p className="text-zinc-400 text-sm leading-relaxed">
            {explanations[reason] || 'The verification data is invalid. This product cannot be authenticated.'}
          </p>
        </div>
      </motion.div>

      {/* Warning box */}
      <motion.div
        variants={fadeSlide}
        className="rounded-xl border border-truth-red/20 bg-truth-red/[0.04] p-5"
      >
        <div className="flex items-start gap-3">
          <span className="text-lg mt-0.5">⚠️</span>
          <div>
            <h4 className="text-white font-bold text-sm mb-1">Physical Misinformation Detected</h4>
            <p className="text-zinc-400 text-xs leading-relaxed">
              The object you are holding does not carry valid proof of authenticity. This may be a
              counterfeit product — physical misinformation engineered to deceive.{' '}
              <span className="text-truth-red font-semibold">DO NOT</span> complete a transaction
              based on unverified information.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.a
        variants={fadeSlide}
        href="/"
        className="block w-full py-3 rounded-xl bg-white/5 border border-vault-border text-white font-semibold text-sm text-center hover:bg-white/10 transition-colors"
      >
        Back to Home
      </motion.a>
    </motion.div>
  );
}

// ═══════════════════════════════════════════
// SUSPICIOUS STATE — Valid sig but anomalies
// ═══════════════════════════════════════════
function SuspiciousState({ data }) {
  const product    = data.product || {};
  const provenance = data.provenance || [];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0 }}
      variants={{ visible: stagger }}
      className="space-y-3"
    >
      {/* Amber banner */}
      <motion.div
        variants={fadeSlide}
        className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-yellow-500/[0.04]"
      >
        <div className="relative p-6 sm:p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...mechSpring, delay: 0.1 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/30 mb-4"
          >
            <span className="text-2xl">⚠️</span>
          </motion.div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-yellow-400">
            SIGNATURE VALID — ANOMALIES
          </h1>
          <p className="text-yellow-500/50 text-sm font-mono mt-1">
            Review before making a decision
          </p>
        </div>
      </motion.div>

      {/* Product + Crypto bento */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div variants={fadeSlide} className="rounded-xl border border-vault-border bg-vault-surface p-4">
          <p className="text-zinc-500 text-[10px] font-mono tracking-[0.2em] uppercase mb-1">Product</p>
          <h2 className="text-white font-bold text-base">{product.name || 'Unknown'}</h2>
          <p className="text-truth-blue text-sm">{product.brand}</p>
        </motion.div>

        <motion.div variants={fadeSlide} className="rounded-xl border border-vault-border bg-vault-surface p-4">
          <p className="text-zinc-500 text-[10px] font-mono tracking-[0.2em] uppercase mb-2">Crypto</p>
          <CryptoRow label="SIG" value="VALID" status="valid" />
          <CryptoRow label="FLAGS" value={data.reason || 'Anomaly'} status="warning" />
        </motion.div>
      </div>

      {/* Warning */}
      <motion.div
        variants={fadeSlide}
        className="rounded-xl border border-yellow-500/20 bg-yellow-500/[0.03] p-5"
      >
        <p className="text-zinc-400 text-xs leading-relaxed">
          This product's cryptographic signature is <span className="text-truth-green font-semibold">valid</span>,
          but its scan pattern shows <span className="text-yellow-400 font-semibold">anomalies</span>.
          Review the provenance chain and scan history before making a decision.
        </p>
      </motion.div>

      {/* Provenance */}
      {provenance.length > 0 && (
        <motion.div variants={fadeSlide} className="rounded-xl border border-vault-border bg-vault-surface p-5">
          <p className="text-zinc-500 text-[10px] font-mono tracking-[0.2em] uppercase mb-3">Provenance</p>
          <div className="relative pl-5 space-y-0">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-vault-border" />
            {provenance.map((p, i) => (
              <div key={i} className="relative py-2">
                <div className={`absolute -left-5 top-3 w-[9px] h-[9px] rounded-full border-2 border-vault-black ${
                  i === provenance.length - 1 ? 'bg-yellow-400' : 'bg-vault-muted'
                }`} />
                <p className="text-white text-sm">
                  {formatAction(p.action || p.type)} {maskEmail(p.owner || p.actor)}
                </p>
                <p className="text-zinc-600 text-xs font-mono">counter: {p.counter} · {formatDateShort(p.date)}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div variants={fadeSlide} className="flex gap-3">
        <a href={`/history?uid=${data.uid}`} className="flex-1 py-3 rounded-xl bg-white/5 border border-vault-border text-white font-semibold text-sm text-center hover:bg-white/10 transition-colors">
          Full History
        </a>
        <a href="/" className="flex-1 py-3 rounded-xl bg-white/5 border border-vault-border text-white font-semibold text-sm text-center hover:bg-white/10 transition-colors">
          Home
        </a>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════
// HELPER: Crypto data row
// ═══════════════════════════════════════════
function CryptoRow({ label, value, status = 'neutral' }) {
  const statusColors = {
    valid:   'text-truth-green',
    invalid: 'text-truth-red',
    warning: 'text-yellow-400',
    neutral: 'text-zinc-300',
  };

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-zinc-500 text-xs font-mono tracking-wider">{label}</span>
      <span className={`text-xs font-mono font-bold ${statusColors[status]}`}>
        <ScrambleText text={value} delay={200} speed={25} />
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════
// HELPER: Format action label
// ═══════════════════════════════════════════
function formatAction(action) {
  const map = {
    registered:  '◈',
    claimed:     '⬡',
    transferred: '↗',
    released:    '↘',
  };
  return map[action] || '·';
}
