import { Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { pickMotivation } from '../data/motivations';
import { useLocalDate } from '../hooks/useLocalDate';

export function MotivationBar() {
  const { date } = useLocalDate();
  // 按日期固定，同一天刷新不会变
  const text = useMemo(() => pickMotivation(date), [date]);

  return (
    <div className="px-safe px-4 pt-3">
      <div className="mx-auto flex w-full max-w-md items-center gap-2.5 rounded-chip border border-brand-400/20 bg-gradient-to-r from-brand-500/20 via-brand-400/10 to-aqua-400/20 px-4 py-2.5">
        <Sparkles size={16} className="shrink-0 text-aqua-300" />
        <p className="truncate text-sm font-medium text-slate-100">{text}</p>
      </div>
    </div>
  );
}
