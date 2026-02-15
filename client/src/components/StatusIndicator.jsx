import { motion } from 'framer-motion';

export default function StatusIndicator({ status = 'authentic' }) {
  if (status === 'loading') {
    return (
      <div className="relative w-4 h-4">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-truth-blue border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  const isGreen = status === 'authentic' || status === 'verified';
  const color = isGreen ? 'bg-truth-green' : status === 'suspicious' ? 'bg-yellow-400' : 'bg-truth-red';
  const glow  = isGreen ? 'shadow-[0_0_12px_rgba(0,255,65,0.6)]' : status === 'suspicious' ? 'shadow-[0_0_12px_rgba(234,179,8,0.6)]' : 'shadow-[0_0_12px_rgba(255,0,60,0.6)]';

  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        className={`w-3 h-3 rounded-full ${color} ${glow}`}
        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
