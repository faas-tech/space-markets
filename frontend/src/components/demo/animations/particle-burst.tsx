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
  shape: string;
  initialRotation: number;
  targetRotation: number;
  duration: number;
}

interface ParticleBurstProps {
  trigger: boolean;
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'indigo' | 'cyan';
  particleCount?: number;
  className?: string;
}

const COLOR_MAP = {
  blue: ['#3B82F6', '#60A5FA', '#93C5FD'],
  emerald: ['#10B981', '#34D399', '#6EE7B7'],
  amber: ['#F59E0B', '#FBBF24', '#FCD34D'],
  purple: ['#A855F7', '#C084FC', '#D8B4FE'],
  indigo: ['#6366F1', '#818CF8', '#A5B4FC'],
  cyan: ['#06B6D4', '#22D3EE', '#67E8F9'],
};

const SHAPES = ['+', 'O', '<', '>', '/', '\\', '×', '≈', '1', '0'];

export function ParticleBurst({
  trigger,
  color = 'blue',
  particleCount = 20,
  className = '',
}: ParticleBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!trigger) {
      setParticles([]);
      return;
    }

    const colors = COLOR_MAP[color];
    const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => {
      const initialRotation = Math.random() * 360;
      return {
        id: i,
        angle: (360 / particleCount) * i + (Math.random() - 0.5) * 30,
        distance: 60 + Math.random() * 120, // Spread further
        size: 12 + Math.random() * 10,
        delay: Math.random() * 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        initialRotation,
        targetRotation: initialRotation + (Math.random() > 0.5 ? 90 : -90) + (Math.random() * 45),
        duration: 0.5 + Math.random() * 0.4, // Snappier
      };
    });

    setParticles(newParticles);

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
              className="absolute flex items-center justify-center font-mono font-bold leading-none"
              style={{
                color: p.color,
                fontSize: p.size,
                left: '50%',
                top: '50%',
                marginLeft: -p.size / 2,
                marginTop: -p.size / 2,
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0, rotate: p.initialRotation }}
              animate={{
                x,
                y,
                opacity: [1, 1, 0],
                scale: [0, 1.2, 0.4],
                rotate: p.targetRotation,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {p.shape}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
