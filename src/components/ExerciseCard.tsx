import { Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { roundWeight } from '../store/useAppStore';
import type { ExerciseTemplate } from '../types';
import { cn } from '../utils/cn';

interface ExerciseCardProps {
  index: number;
  exercise: ExerciseTemplate;
  weight: number;
  done: number;
  onToggleSet: (setIndex: number) => void;
  onWeightChange: (weight: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** 重量展示：保留一位有效小数，2.50 显示成 2.5 */
function formatWeight(value: number): string {
  return String(Math.round(value * 10) / 10);
}

export function ExerciseCard({
  index,
  exercise,
  weight,
  done,
  onToggleSet,
  onWeightChange,
  onEdit,
  onDelete,
}: ExerciseCardProps) {
  const [draft, setDraft] = useState(formatWeight(weight));

  // 外部（重置 / 恢复默认 / 切换日期）改动后同步输入框
  useEffect(() => {
    setDraft(formatWeight(weight));
  }, [weight]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      setDraft(formatWeight(weight));
      return;
    }
    const value = Number(trimmed);
    if (!Number.isFinite(value)) {
      setDraft(formatWeight(weight));
      return;
    }
    const next = roundWeight(value);
    setDraft(formatWeight(next));
    if (next !== weight) onWeightChange(next);
  };

  const step = (delta: number) => {
    const next = roundWeight(weight + delta * exercise.step);
    setDraft(formatWeight(next));
    onWeightChange(next);
  };

  const isBodyweight = exercise.unit === 'bodyweight' && weight === 0;
  const finished = done >= exercise.sets;

  return (
    <article
      className={cn(
        'glass rounded-card p-3.5 transition-colors',
        finished && 'border-aqua-400/35 bg-aqua-500/5',
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] font-bold',
            finished ? 'bg-aqua-400/20 text-aqua-300' : 'bg-white/5 text-slate-400',
          )}
        >
          {index}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm leading-snug font-semibold text-slate-100">{exercise.name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
            <span className="rounded bg-brand-400/12 px-1.5 py-0.5 font-medium text-brand-300">
              {exercise.sets}×{exercise.reps}
            </span>
            {exercise.tip && <span className="truncate">{exercise.tip}</span>}
            {exercise.isCustom && (
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-slate-500">自定义</span>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`编辑 ${exercise.name}`}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition active:scale-90 hover:bg-white/5 hover:text-brand-300"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`删除 ${exercise.name}`}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition active:scale-90 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* 组数圆点：点亮到第几组，再点最后一个已点亮的圆点则取消该组 */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-[34px]">
        {Array.from({ length: exercise.sets }, (_, i) => i + 1).map((setIndex) => {
          const active = setIndex <= done;
          return (
            <button
              key={setIndex}
              type="button"
              onClick={() => onToggleSet(setIndex)}
              aria-label={`第 ${setIndex} 组`}
              aria-pressed={active}
              className={cn(
                'grid h-11 w-11 place-items-center rounded-xl border text-sm font-semibold transition active:scale-90',
                active
                  ? 'border-transparent bg-gradient-to-br from-brand-400 to-aqua-400 text-night-950 shadow-md shadow-brand-500/25'
                  : 'border-white/8 bg-night-850/70 text-slate-500 hover:border-brand-400/30 hover:text-slate-300',
              )}
            >
              {setIndex}
            </button>
          );
        })}
        <span className="ml-1 text-[11px] text-slate-500">
          {done}/{exercise.sets}
        </span>
      </div>

      {/* 重量控制 */}
      <div className="mt-3 flex items-center gap-2 pl-[34px]">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="减少重量"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/8 bg-night-850/70 text-slate-300 transition active:scale-90 hover:border-brand-400/30 hover:text-brand-200"
        >
          <Minus size={18} />
        </button>

        <div className="relative flex-1">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            inputMode="decimal"
            type="number"
            step={exercise.step}
            aria-label={`${exercise.name} 重量`}
            className="h-11 w-full rounded-xl border border-brand-400/20 bg-night-900/80 px-3 pr-14 text-center text-base font-semibold text-slate-100 outline-none transition focus:border-brand-400/60"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-slate-500">
            {isBodyweight ? '自重' : 'kg'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => step(1)}
          aria-label="增加重量"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/8 bg-night-850/70 text-slate-300 transition active:scale-90 hover:border-brand-400/30 hover:text-brand-200"
        >
          <Plus size={18} />
        </button>
      </div>
    </article>
  );
}
