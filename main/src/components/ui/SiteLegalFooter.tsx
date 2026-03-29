import { motion } from 'framer-motion';

type SiteLegalFooterProps = {
  compact?: boolean;
};

export default function SiteLegalFooter({ compact = false }: SiteLegalFooterProps) {
  return (
    <footer className={`mx-auto w-full rounded-xl border border-white/12 bg-[#020611]/70 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-white/75">
        <span className="uppercase tracking-[0.16em] text-orange-200">Fanpages</span>
        <a href="https://www.instagram.com" target="_blank" rel="noreferrer" className="rounded border border-white/15 bg-[#09142a]/60 px-2 py-1 transition-transform hover:scale-[1.02]">Instagram</a>
        <a href="https://www.facebook.com" target="_blank" rel="noreferrer" className="rounded border border-white/15 bg-[#09142a]/60 px-2 py-1 transition-transform hover:scale-[1.02]">Facebook</a>
        <a href="https://x.com" target="_blank" rel="noreferrer" className="rounded border border-white/15 bg-[#09142a]/60 px-2 py-1 transition-transform hover:scale-[1.02]">X</a>
      </div>

      <motion.div
        initial={{ opacity: 0.86 }}
        animate={{ opacity: [0.86, 1, 0.86] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        className="mt-3 space-y-2 text-[11px] leading-relaxed text-white/65"
      >
        <p><span className="font-semibold text-orange-100">Terms of Service:</span> No compromise attempts, no copyright infringement, no unauthorized copying, no cyber attacks, no abuse of scanners, APIs, or admin tools.</p>
        <p><span className="font-semibold text-orange-100">Privacy:</span> Device/browser/session identifiers are used for anti-fraud, claim audit, and event security only. Data is retained only for operational and integrity checks.</p>
      </motion.div>
    </footer>
  );
}
