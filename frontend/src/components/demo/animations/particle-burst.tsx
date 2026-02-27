'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  delay: number;
  color: string;
}

interface ParticleBurstProps {
  trigger: boolean;
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'cyan';
  particleCount?: number;
  className?: string;
}

const COLOR_MAP = {
  blue: ['#3B82F6', '#60A5FA', '#93C5FD'],
  emerald: ['#10B981', '#34D399', '#6EE7B7'],
  amber: ['#F59E0B', '#FBBF24', '#FCD34D'],
  purple: ['#A855F7', '#C084FC', '#D8B4FE'],
  cyan: ['#06B6D4', '#22D3EE', '#67E8F9'],
};

export function ParticleBurst({
  trigger,
  color = 'blue',
  particleCount = 12,
  className = '',
}: ParticleBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!trigger) {
      setParticles([]);
      return;
    }

    const colors = COLOR_MAP[color];
    const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      angle: (360 / particleCount) * i + (Math.random() - 0.5) * 20,
      distance: 40 + Math.random() * 60,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 0.15,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    setParticles(newParticles);

    // Auto-cleanup after animation
    const timer = setTimeout(() => setParticles([]), 1200);
    return () => clearTimeout(timer);
  }, [trigger, color, particleCount]);

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      <AnimatePresence>
        {particles.map((p) => {
          const rad = (p.angle * Math.PI) / 180;
          const x = Math.cos(rad) * p.distance;
          const y = Math.sin(rad) * p.distance;

          return (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                left: '50%',
                top: '50%',
                marginLeft: -p.size / 2,
                marginTop: -p.size / 2,
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x,
                y,
                opacity: 0,
                scale: 0.3,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.8,
                delay: p.delay,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
