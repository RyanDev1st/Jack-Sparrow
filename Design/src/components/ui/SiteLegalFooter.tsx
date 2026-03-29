type SiteLegalFooterProps = {
  compact?: boolean;
};

export default function SiteLegalFooter({ compact = false }: SiteLegalFooterProps) {
  return (
    <footer className={`mx-auto w-full rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(8,11,22,0.6)_0%,rgba(4,8,18,0.54)_100%)] ${compact ? 'p-3' : 'p-4'} shadow-[0_14px_34px_rgba(0,0,0,0.14)]`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/64">
          <span className="uppercase tracking-[0.18em] text-orange-200/64">Links</span>
          <a href="https://www.instagram.com" target="_blank" rel="noreferrer" className="rounded-full border border-white/8 bg-white/[0.025] px-3 py-1.5 transition-colors hover:border-orange-300/24 hover:text-white">Instagram</a>
          <a href="https://www.facebook.com" target="_blank" rel="noreferrer" className="rounded-full border border-white/8 bg-white/[0.025] px-3 py-1.5 transition-colors hover:border-orange-300/24 hover:text-white">Facebook</a>
          <a href="https://x.com" target="_blank" rel="noreferrer" className="rounded-full border border-white/8 bg-white/[0.025] px-3 py-1.5 transition-colors hover:border-orange-300/24 hover:text-white">X</a>
        </div>
        <div className="text-[10px] uppercase tracking-[0.24em] text-white/28">
          Castlevania Treasure Hunt
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] leading-relaxed text-white/44">
        <div className="rounded-full border border-white/8 bg-white/[0.02] px-3 py-1.5">
          <span className="font-semibold uppercase tracking-[0.16em] text-orange-100/76">Use</span>
          <span className="ml-2">Fair use only.</span>
        </div>
        <div className="rounded-full border border-white/8 bg-white/[0.02] px-3 py-1.5">
          <span className="font-semibold uppercase tracking-[0.16em] text-orange-100/76">Privacy</span>
          <span className="ml-2">Session data is used for integrity and claim audit.</span>
        </div>
      </div>
    </footer>
  );
}
