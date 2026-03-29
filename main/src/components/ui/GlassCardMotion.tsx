'use client';

import { type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

type GlassCardProps = HTMLMotionProps<'div'> & {
  children: ReactNode;
};

export default function GlassCard({ children, className = '', ...props }: GlassCardProps) {
  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{
        type: 'spring',
        stiffness: 170,
        damping: 18,
        mass: 0.7,
      }}
      className={[
        'relative overflow-hidden rounded-2xl border border-white/22',
        'bg-[#07142B]/44 backdrop-blur-2xl',
        'shadow-[0_22px_60px_rgba(0,0,0,0.45),0_0_26px_rgba(255,255,255,0.05)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-white/6 to-white/0 opacity-90" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_90%_at_10%_0%,rgba(255,255,255,0.22),transparent_45%),radial-gradient(120%_100%_at_100%_100%,rgba(245,130,32,0.15),transparent_55%)]" />
      <div className="relative">{children}</div>
    </motion.div>
  );
}
