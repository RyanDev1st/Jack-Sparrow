'use client';

import { forwardRef, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

type BreathButtonProps = Omit<HTMLMotionProps<'button'>, 'children'> & {
  children?: ReactNode;
  glowClassName?: string;
};

const BreathButton = forwardRef<HTMLButtonElement, BreathButtonProps>(
  ({ className = '', glowClassName = '', children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ y: -1, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={{
          type: 'spring',
          stiffness: 340,
          damping: 22,
          mass: 0.45,
        }}
        className={[
          'relative isolate inline-flex items-center justify-center overflow-hidden',
          'rounded-xl px-5 py-3 text-sm font-semibold text-white',
          'bg-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/70',
          'shadow-[0_10px_30px_rgba(245,130,32,0.24)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        <motion.span
          aria-hidden="true"
          className={[
            'pointer-events-none absolute inset-0 -z-10 rounded-xl',
            'bg-orange-300/30 blur-md shadow-[0_0_36px_rgba(245,130,32,0.45)]',
            glowClassName,
          ]
            .filter(Boolean)
            .join(' ')}
          initial={{ opacity: 0.45, scale: 0.96 }}
          animate={{ opacity: [0.38, 0.68, 0.38], scale: [0.96, 1.04, 0.96] }}
          transition={{
            duration: 2.8,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
        />
        <span className="relative z-10">{children}</span>
      </motion.button>
    );
  },
);

BreathButton.displayName = 'BreathButton';

export default BreathButton;
