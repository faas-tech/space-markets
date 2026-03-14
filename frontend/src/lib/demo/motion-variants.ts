// Shared Framer Motion variant definitions for the protocol demo

import type { Variants, Transition } from 'framer-motion';

// ---- Transitions ----

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 24,
};

export const gentleSpring: Transition = {
  type: 'spring',
  stiffness: 120,
  damping: 20,
};

export const slowSpring: Transition = {
  type: 'spring',
  stiffness: 80,
  damping: 18,
};

// ---- Step container ----

export const stepContainer: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: { duration: 0.3, ease: [0.65, 0, 0.35, 1] },
  },
};

// ---- Stagger children ----

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

export const staggerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

// ---- Individual element animations ----

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

export const scaleInBounce: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 15 },
  },
};

// ---- Glow pulse ----

export const glowPulse: Variants = {
  idle: { boxShadow: '0 0 0px rgba(59, 130, 246, 0)' },
  active: {
    boxShadow: [
      '0 0 20px rgba(59, 130, 246, 0.3)',
      '0 0 40px rgba(59, 130, 246, 0.15)',
      '0 0 20px rgba(59, 130, 246, 0.3)',
    ],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

// ---- SVG path draw ----

export const drawPath: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.5, ease: [0.22, 1, 0.36, 1] },
  },
};

// ---- Card flip (3D) ----

export const cardFlip: Variants = {
  front: { rotateY: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  back: { rotateY: 180, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

// ---- Hero entrance for step centerpieces ----

export const heroEntrance: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 40 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.12,
    },
  },
};

// ---- Float animation (for orbiting elements) ----

export const float: Variants = {
  animate: {
    y: [0, -8, 0],
    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
  },
};

// Dramatic block drop
export const blockDrop: Variants = {
  hidden: { y: -50, opacity: 0, scale: 0.9 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 15,
      mass: 1.5,
    },
  },
};

// Signal pulse for timeline nodes
export const signalPulse: Variants = {
  idle: {
    scale: 1,
    opacity: 0,
  },
  active: {
    scale: [1, 2.5, 3],
    opacity: [0.8, 0, 0],
    borderWidth: ["2px", "1px", "0px"],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeOut",
    }
  }
};

// ---- Checkmark ----

export const checkmark: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.4, ease: "easeInOut" },
  },
};
