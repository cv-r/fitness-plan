import { CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { resolveExercises, sumProgress, useAppStore } from '../store/useAppStore';
import { buildMonthGrid, isSameMonthISO, shiftMonth, toISODate, todayISO } from '../utils/date';
import { cn } from '../utils/cn';
import { Modal } from './Modal';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export function CalendarModal() {
  const open = useAppStore((state) => state.ui.calendar);
  const closeCalendar = useAppStore((state) => state.closeCalendar);
  const currentDate = useAppStore((state) => state.currentDate);
  const setCurrentDate = useAppStore((state) => state.setCurrentDate);
  const dayRecords = useAppStore((state) => state.dayRecords);
  const dayTemplates = useAppStore((state) => state.dayTemplates);
  const weights = useAppStore((state) => state.weights);

  const [cursor, setCursor] = useState(currentDate);

  // 每次打开时对齐到当前查看的日期
  useEffect(() => {
    if (open) setCursor(currentDate);
  }, [open, currentDate]);

  const today = todayISO();
  const days = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const monthLabel = useMemo(() => {
    const [year, month] = cursor.split('-');
    return `${year} 年 ${Number(month)} 月`;
  }, [cursor]);

  /** 每一天要展示的角标 */
  const cellInfo = useMemo(() => {
    const map = new Map<string, { text: string; kind: 'workout' | 'rest' | 'empty'; hasWeight: boolean }>();
    for (const day of days) {
      const iso = toISODate(day);
      const record = dayRecords[iso];
      const hasWeight = weights[iso] != null;

      if (record?.isRest) {
        map.set(iso, { text: '休', kind: 'rest', hasWeight });
        continue;
      }
      if (record?.dayTemplateId) {
        const template = dayTemplates.find((item) => item.id === record.dayTemplateId);
        if (template) {
          const progress = sumProgress(resolveExercises(template, record));
          map.set(iso, { text: `${progress.done}/${progress.total}`, kind: 'workout', hasWeight });
          continue;
        }
      }
      map.set(iso, { text: '', kind: 'empty', hasWeight });
    }
    return map;
  }, [days, dayRecords, dayTemplates, weights]);

  const pick = (iso: string) => {
    setCurrentDate(iso);
    closeCalendar();
  };

  return (
    <Modal open={open} onClose={closeCalendar} title="训练日历" subtitle="点日期即可切换查看">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCursor((prev) => shiftMonth(prev, -1))}
          aria-label="上一个月"
          className="grid h-11 w-11 place-items-center rounded-xl border border-white/8 bg-night-850/70 text-slate-300 transition active:scale-90 hover:border-brand-400/30"
        >
          <ChevronLeft size={18} />
        </button>

        <p className="text-sm font-semibold text-slate-100">{monthLabel}</p>

        <button
          type="button"
          onClick={() => setCursor((prev) => shiftMonth(prev, 1))}
          aria-label="下一个月"
          className="grid h-11 w-11 place-items-center rounded-xl border border-white/8 bg-night-850/70 text-slate-300 transition active:scale-90 hover:border-brand-400/30"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((label) => (
          <div key={label} className="py-1 text-center text-[11px] font-medium text-slate-500">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const iso = toISODate(day);
          const inMonth = isSameMonthISO(iso, cursor);
          const info = cellInfo.get(iso) ?? { text: '', kind: 'empty' as const, hasWeight: false };
          const isToday = iso === today;
          const isSelected = iso === currentDate;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => pick(iso)}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center rounded-xl border transition active:scale-95',
                isSelected
                  ? 'border-transparent bg-gradient-to-br from-brand-500/35 to-aqua-500/25'
                  : 'border-transparent hover:border-brand-400/25 hover:bg-white/5',
                isToday && !isSelected && 'border-aqua-400/60',
                !inMonth && 'opacity-35',
              )}
            >
              <span
                className={cn(
                  'text-xs font-semibold',
                  isSelected ? 'text-slate-50' : isToday ? 'text-aqua-300' : 'text-slate-300',
                )}
              >
                {day.getDate()}
              </span>

              {info.kind === 'rest' && (
                <span className="mt-0.5 text-[10px] leading-none font-medium text-slate-400">休</span>
              )}
              {info.kind === 'workout' && (
                <span className="mt-0.5 text-[10px] leading-none font-medium text-brand-300">
                  {info.text}
                </span>
              )}

              {info.hasWeight && (
                <span className="absolute right-1 bottom-1 h-1.5 w-1.5 rounded-full bg-aqua-400" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-aqua-400" />
            有体重记录
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-brand-300">23/32</span>
            完成组数
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-400">休</span>
            休息日
          </span>
        </div>

        <button
          type="button"
          onClick={() => pick(today)}
          className="flex h-11 items-center gap-1.5 rounded-xl border border-brand-400/25 bg-brand-500/10 px-3 text-xs font-medium text-brand-300 transition active:scale-95"
        >
          <CalendarCheck size={14} />
          回到今天
        </button>
      </div>
    </Modal>
  );
}
