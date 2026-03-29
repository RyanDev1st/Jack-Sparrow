import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';

type ZoneCircleProps = {
  color: string;
  style?: CSSProperties;
  className?: string;
  selected?: boolean;
  label?: string;
};

export default function ZoneCircle({ color, style, className = '', selected = false, label }: ZoneCircleProps) {
  return (
    <div
      style={{
        ...style,
        minWidth: style?.minWidth ?? 28,
        minHeight: style?.minHeight ?? 28,
        borderColor: `${color}d0`,
        background: `radial-gradient(circle at 50% 50%, ${color}3a 0%, rgba(3, 9, 24, 0.42) 62%, rgba(3, 9, 24, 0.1) 100%)`,
        boxShadow: selected
          ? `0 0 0 2px ${color}cc, 0 0 42px ${color}88, inset 0 0 24px ${color}66`
          : `0 0 18px ${color}66, inset 0 0 18px ${color}4a`,
      }}
      className={`relative aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-2 backdrop-blur-[1px] ${className}`}
    >
      <motion.span
        aria-hidden="true"
        style={{ borderColor: `${color}cc` }}
        className="pointer-events-none absolute inset-[14%] rounded-full border"
        animate={{ scale: [0.95, 1.06, 0.95], opacity: [0.45, 0.95, 0.45] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        aria-hidden="true"
        style={{ borderColor: `${color}90` }}
        className="pointer-events-none absolute inset-[32%] rounded-full border"
        animate={{ scale: [1, 0.92, 1], opacity: [0.35, 0.75, 0.35] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span
        aria-hidden="true"
        style={{ backgroundColor: `${color}dd`, boxShadow: `0 0 12px ${color}aa` }}
        className="pointer-events-none absolute left-1/2 top-1/2 h-[22%] w-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full"
      />
      {label && (
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#020611]/82 px-1 text-[10px] font-semibold leading-4 text-white"
          style={{ boxShadow: `0 0 10px ${color}99` }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
