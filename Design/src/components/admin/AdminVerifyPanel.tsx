import BreathButton from '../ui/BreathButton';
import GlassCard from '../ui/GlassCard';

type AdminVerifyPanelProps = {
  mantra: string;
  onChangeMantra: (value: string) => void;
  onLookup: (event: React.FormEvent) => void;
};

export default function AdminVerifyPanel({
  mantra,
  onChangeMantra,
  onLookup,
}: AdminVerifyPanelProps) {
  return (
    <GlassCard className="p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-orange-300/90">Lookup</p>
      <form onSubmit={onLookup} className="space-y-3">
        <input
          autoFocus
          value={mantra}
          onChange={(e) => onChangeMantra(e.target.value)}
          placeholder="MANTRA / CODE / SESSION"
          className="w-full rounded-xl border border-white/15 bg-[#020611]/85 px-5 py-4 text-2xl font-semibold uppercase tracking-wide outline-none focus:border-orange-300"
        />
        <BreathButton type="submit" className="w-full justify-center text-sm">CHECK</BreathButton>
      </form>
    </GlassCard>
  );
}
