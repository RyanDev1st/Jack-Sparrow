'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

export default function ScrollJumpButtons() {
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [docHeight, setDocHeight] = useState(0);

  useEffect(() => {
    const update = () => {
      setScrollY(window.scrollY || window.pageYOffset || 0);
      setViewportHeight(window.innerHeight || 0);
      setDocHeight(document.documentElement.scrollHeight || document.body.scrollHeight || 0);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const atTop = scrollY <= 10;
  const atBottom = useMemo(() => scrollY + viewportHeight >= docHeight - 10, [docHeight, scrollY, viewportHeight]);

  const goTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const goBottom = () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
      {!atTop && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 340, damping: 22, mass: 0.4 }}
          onClick={goTop}
          aria-label="Go to top"
          className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 bg-[#08132a]/90 text-white"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path d="M6 14l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      )}
      {!atBottom && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 340, damping: 22, mass: 0.4 }}
          onClick={goBottom}
          aria-label="Go to bottom"
          className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 bg-[#08132a]/90 text-white"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path d="M6 10l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      )}
    </div>
  );
}
