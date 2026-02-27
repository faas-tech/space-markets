'use client';

import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  z: number; // depth layer (0-1, higher = closer/brighter)
  size: number;
  baseOpacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface StarfieldProps {
  starCount?: number;
  className?: string;
}

export function Starfield({ starCount = 200, className = '' }: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check reduced motion preference
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    resize();
    window.addEventListener('resize', resize);

    // Initialize stars across 3 depth layers
    starsRef.current = Array.from({ length: starCount }, () => {
      const z = Math.random();
      return {
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        z,
        size: 0.5 + z * 1.5,
        baseOpacity: 0.2 + z * 0.6,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2,
      };
    });

    let time = 0;

    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      ctx.clearRect(0, 0, w, h);
      time += 0.016; // ~60fps

      for (const star of starsRef.current) {
        // Subtle drift based on depth
        if (!reducedMotion) {
          star.x -= star.z * 0.08;
          star.y -= star.z * 0.02;

          // Wrap around
          if (star.x < -2) star.x = w + 2;
          if (star.y < -2) star.y = h + 2;
        }

        // Twinkle
        const twinkle = reducedMotion
          ? 1
          : 0.6 + 0.4 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
        const opacity = star.baseOpacity * twinkle;

        // Draw star with glow
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${opacity})`;
        ctx.fill();

        // Add subtle glow for bright stars
        if (star.z > 0.7) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(150, 180, 255, ${opacity * 0.15})`;
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [starCount]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
