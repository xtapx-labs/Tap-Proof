import { useState, useEffect, useRef } from 'react';

const CHARS = 'ABCDEF0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~`';

export default function ScrambleText({ text, className = '', delay = 0, speed = 30, mono = true }) {
  const [display, setDisplay] = useState('');
  const [started, setStarted] = useState(false);
  const frameRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started || !text) return;

    let iteration = 0;
    const target = text;
    const totalFrames = target.length * 3;

    const interval = setInterval(() => {
      const revealed = Math.floor(iteration / 3);
      let result = '';

      for (let i = 0; i < target.length; i++) {
        if (i < revealed) {
          result += target[i];
        } else if (target[i] === ' ') {
          result += ' ';
        } else {
          result += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }

      setDisplay(result);
      iteration++;

      if (iteration > totalFrames) {
        setDisplay(target);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [started, text, speed]);

  if (!started) {
    return (
      <span className={`${mono ? 'font-mono' : ''} ${className} opacity-30`}>
        {text ? text.replace(/[^ ]/g, '·') : ''}
      </span>
    );
  }

  return <span className={`${mono ? 'font-mono' : ''} ${className}`}>{display}</span>;
}
