'use client';
import { motion } from 'framer-motion';
import GlassCard from '../ui/GlassCard';

type AdminPinGateProps = {
  pin: string;
  pinError: string;
  onTap: (key: string) => void;
};

const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '<', '0', 'C'];

export default function AdminPinGate({ pin, pinError, onTap }: AdminPinGateProps) {
  return (
    <section className="mx-auto max-w-md">
      <GlassCard className="p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-orange-300/90">Admin Access</p>
        <h1 className="mt-3 text-2xl font-semibold">Enter 4-Digit PIN</h1>
        <div className="mt-4 rounded-lg border border-white/12 bg-[#020611]/80 p-3 text-center text-xl tracking-[0.3em]">
          {pin.padEnd(4, '*')}
        </div>
        {pinError && <p className="mt-2 text-sm text-orange-300">{pinError}</p>}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {keypad.map((key) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 24, mass: 0.45 }}
              className="rounded-lg border border-white/15 bg-[#07142B]/80 py-4 text-lg font-semibold"
              onClick={() => onTap(key)}
            >
              {key}
            </motion.button>
          ))}
        </div>
      </GlassCard>
    </section>
  );
}
