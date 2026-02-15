/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        vault: {
          black:   '#000000',
          deep:    '#0A0A0A',
          surface: '#111111',
          card:    '#1A1A1A',
          border:  '#333333',
          muted:   '#555555',
        },
        truth: {
          green:  '#00FF41',
          red:    '#FF003C',
          blue:   '#00F0FF',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"Fira Code"', '"Space Mono"', 'monospace'],
      },
      animation: {
        'pulse-green': 'pulseGreen 2s ease-in-out infinite',
        'pulse-red':   'pulseRed 1s ease-in-out infinite',
        'scan-line':   'scanLine 2s linear infinite',
        'glitch':      'glitch 0.3s ease-in-out',
      },
      keyframes: {
        pulseGreen: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0,255,65,0.3), 0 0 60px rgba(0,255,65,0.1)' },
          '50%':      { boxShadow: '0 0 40px rgba(0,255,65,0.6), 0 0 120px rgba(0,255,65,0.2)' },
        },
        pulseRed: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255,0,60,0.4), 0 0 60px rgba(255,0,60,0.15)' },
          '50%':      { boxShadow: '0 0 50px rgba(255,0,60,0.8), 0 0 140px rgba(255,0,60,0.3)' },
        },
        scanLine: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        glitch: {
          '0%':   { transform: 'translate(0)' },
          '20%':  { transform: 'translate(-2px, 2px)' },
          '40%':  { transform: 'translate(-2px, -2px)' },
          '60%':  { transform: 'translate(2px, 2px)' },
          '80%':  { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
      },
    },
  },
  plugins: [],
};
