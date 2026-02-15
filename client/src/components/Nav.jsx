import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Nav() {
  const location = useLocation();

  const links = [
    { to: '/',         label: 'Home' },
    { to: '/register', label: 'Register' },
    { to: '/history',  label: 'History' },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-vault-border/50 bg-vault-black/80 backdrop-blur-xl"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-md bg-truth-green/10 border border-truth-green/30 flex items-center justify-center group-hover:bg-truth-green/20 transition-colors">
            <span className="text-truth-green text-xs font-bold font-mono">X</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            Xtap<span className="text-truth-green">X</span>
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1">
          {links.map(({ to, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  active
                    ? 'text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 bg-white/5 border border-vault-border rounded-md"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}
