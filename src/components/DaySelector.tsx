import { motion } from 'framer-motion';
import { BedDouble, ChevronRight, Dumbbell } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface DaySelectorProps {
  /** 从训练日视图点「重选」进来时，先弹确认 */
  onPick: (dayTemplateId: string) => void;
  onRest: () => void;
}

export function DaySelector({ onPick, onRest }: DaySelectorProps) {
  const dayTemplates = useAppStore((state) => state.dayTemplates);

  return (
    <section className="px-safe px-4">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-3 flex items-center gap-2 px-1">
          <Dumbbell size={16} className="text-brand-400" />
          <h2 className="text-sm font-semibold text-slate-200">今天练什么？</h2>
        </div>

        <div className="space-y-2.5">
          {dayTemplates.map((template, index) => {
            const totalSets = template.exercises.reduce((sum, item) => sum + item.sets, 0);
            return (
              <motion.button
                key={template.id}
                type="button"
                onClick={() => onPick(template.id)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.22 }}
                className="glass flex w-full items-center gap-3 rounded-card p-4 text-left transition active:scale-[0.98] hover:border-brand-400/35"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500/25 to-aqua-500/20 text-xs font-bold text-brand-300">
                  {template.label.replace('Day ', 'D')}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-100">{template.title}</span>
                  <span className="mt-1 block truncate text-[11px] text-slate-400">
                    {template.exercises.length} 个动作 · {totalSets} 组 · {template.time}
                  </span>
                </span>

                <ChevronRight size={18} className="shrink-0 text-slate-500" />
              </motion.button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onRest}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-white/12 bg-night-900/40 px-4 py-3.5 text-sm font-medium text-slate-400 transition active:scale-[0.98] hover:border-aqua-400/35 hover:text-aqua-300"
        >
          <BedDouble size={16} />
          标记为休息日
        </button>
      </div>
    </section>
  );
}
