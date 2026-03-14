'use client';

import React, { useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

export interface CountUpProps {
  value: number;
  initialValue?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
  delay?: number;
  as?: any; // e.g. motion.span, motion.text
  [key: string]: any; // Allow SVG props like x, y, textAnchor
}

export function CountUp({
  value,
  initialValue = 0,
  decimals = 2,
  prefix = '',
  suffix = '',
  duration = 1.5,
  className = '',
  delay = 0,
  as: Component = motion.span,
  ...rest
}: CountUpProps) {
  const [displayValue, setDisplayValue] = useState(initialValue);
  const spring = useSpring(initialValue, {
    stiffness: 50,
    damping: 20,
    duration: duration * 1000,
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      spring.set(value);
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [value, spring, delay]);

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => {
      if (value >= 0 && latest < 0) {
        setDisplayValue(0);
      } else {
        setDisplayValue(latest);
      }
    });
    return unsubscribe;
  }, [spring, value]);

  const formatted = displayValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <Component
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
      {...rest}
    >
      {prefix}{formatted}{suffix}
    </Component>
  );
}
