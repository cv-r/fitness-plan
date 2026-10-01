import { CalendarDays, Dumbbell, Settings } from 'lucide-react';
import { useLocalDate } from '../hooks/useLocalDate';
import { useAppStore } from '../store/useAppStore';

export function Header() {
  const name = useAppStore((state) => state.profile.name);
  const openCalendar = useAppStore((state) => state.openCalendar);
  const openSettings = useAppStore((state) => state.openSettings);
  const { label, isToday } = useLocalDate();

  const title = name.trim() ? `${name.trim()}，努力冲冲冲！` : '每日训练计划';

  return (
    <header className="pt-safe px-safe sticky top-0 z-30 border-b border-brand-400/10 bg-night-950/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4 py-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-aqua-500 text-night-950 shadow-lg shadow-brand-500/25">
          <Dumbbell size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base leading-tight font-semibold text-slate-50">{title}</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
            <span>{label}</span>
            {isToday && (
              <span className="rounded-full bg-aqua-400/15 px-1.5 py-0.5 text-[10px] font-medium text-aqua-300">
                今天
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={openCalendar}
          aria-label="打开日历"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-brand-400/15 bg-night-800/70 text-brand-300 transition active:scale-90 hover:border-brand-400/35 hover:text-brand-200"
        >
          <CalendarDays size={20} />
        </button>

        <button
          type="button"
          onClick={openSettings}
          aria-label="打开设置"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-brand-400/15 bg-night-800/70 text-slate-300 transition active:scale-90 hover:border-brand-400/35 hover:text-slate-100"
        >
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
}
