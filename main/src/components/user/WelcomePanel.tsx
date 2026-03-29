import BreathButton from '../ui/BreathButton';
import GlassCard from '../ui/GlassCard';
import { motion } from 'framer-motion';

type WelcomePanelProps = {
  crestSrc: string;
  message: string;
  isGenerating: boolean;
  onStart: () => void;
};

export default function WelcomePanel({
  crestSrc,
  message,
  isGenerating,
  onStart,
}: WelcomePanelProps) {
  return (
    <GlassCard className="relative w-full max-w-2xl overflow-hidden p-8 text-center">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-10 opacity-45"
        style={{ background: 'radial-gradient(45% 45% at 50% 50%, rgba(245,130,32,0.34) 0%, rgba(245,130,32,0) 72%)' }}
        animate={{ scale: [0.96, 1.05, 0.96], opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 grid items-center gap-6 md:grid-cols-[220px_1fr] md:text-left">
        <motion.img
          src={crestSrc}
          alt="Castlevania Crest"
          className="mx-auto h-44 w-44 rounded-full border border-white/20 object-cover shadow-[0_0_30px_rgba(245,130,32,0.35)]"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-orange-200">Treasure Hunt</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight">Castlevania Treasure Hunt</h1>
          <p className="mt-3 text-sm text-white/75">Solve the riddles, find the treasures, then scan the QR codes.</p>
        </div>
      </div>

      <BreathButton onClick={onStart} className="relative z-10 mx-auto mt-6 w-full max-w-xs justify-center" disabled={isGenerating}>
        {isGenerating ? 'GENERATING MANTRA...' : 'START NOW'}
      </BreathButton>
      <p className="relative z-10 mt-3 text-xs text-white/60">{message}</p>
    </GlassCard>
  );
}
