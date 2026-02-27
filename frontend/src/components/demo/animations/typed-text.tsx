'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface TypedTextProps {
  text: string;
  speed?: number; // ms per character
  delay?: number; // ms before starting
  className?: string;
  cursor?: boolean;
  onComplete?: () => void;
}

export function TypedText({
  text,
  speed = 30,
  delay = 0,
  className = '',
  cursor = true,
  onComplete,
}: TypedTextProps) {
  const [displayedChars, setDisplayedChars] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const delayTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(delayTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;

    if (displayedChars >= text.length) {
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedChars((c) => c + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [started, displayedChars, text.length, speed, onComplete]);

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {text.slice(0, displayedChars)}
      {cursor && displayedChars < text.length && (
        <span className="inline-block w-[2px] h-[1em] bg-current ml-px animate-pulse" />
      )}
    </motion.span>
  );
}
