import { motion } from 'framer-motion';
import { Flame, Plus, RefreshCw, RotateCcw, Sparkles } from 'lucide-react';
import { resolveExercises, sumProgress, useAppStore } from '../store/useAppStore';
import type { DayRecord, DayTemplate } from '../types';
import { cn } from '../utils/cn';
import { exerciseTarget, warmupTarget } from '../utils/formGuide';
import { ExerciseCard } from './ExerciseCard';

interface TrainingDayProps {
  template: DayTemplate;
  record: DayRecord | undefined;
  onReselect: () => void;
  onReset: () => void;
}

export function TrainingDay({ template, record, onReselect, onReset }: TrainingDayProps) {
  const toggleSet = useAppStore((state) => state.toggleSet);
  const setExerciseWeight = useAppStore((state) => state.setExerciseWeight);
  const openEditor = useAppStore((state) => state.openEditor);
  const openConfirm = useAppStore((state) => state.openConfirm);
  const deleteExercise = useAppStore((state) => state.deleteExercise);
  const openFormGuide = useAppStore((state) => state.openFormGuide);

  const items = resolveExercises(template, record);
  const progress = sumProgress(items);
  const percent = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100);

  const handleDelete = (exerciseId: string, name: string) => {
    openConfirm({
      title: '删除动作',
      message: `确定要从「${template.label} · ${template.title}」中删除「${name}」吗？已有的完成记录也会一并清除。`,
      confirmText: '删除',
      danger: true,
      onConfirm: () => deleteExercise(template.id, exerciseId),
    });
  };

  return (
    <section className="px-safe px-4">
      <div className="mx-auto w-full max-w-md space-y-3">
        {/* 训练日头部 */}
        <div className="glass rounded-card p-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold tracking-wide text-brand-400 uppercase">
                {template.label}
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-50">{template.title}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                <Flame size={12} className="text-aqua-300" />
                {template.time} · {template.exercises.length} 个动作 · {progress.total} 组
              </p>
            </div>

            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={onReselect}
                className="flex h-10 items-center gap-1 rounded-xl border border-white/8 bg-night-850/70 px-2.5 text-[11px] font-medium text-slate-300 transition active:scale-95 hover:border-brand-400/30"
              >
                <RefreshCw size={13} />
                重选
              </button>
              <button
                type="button"
                onClick={onReset}
                className="flex h-10 items-center gap-1 rounded-xl border border-white/8 bg-night-850/70 px-2.5 text-[11px] font-medium text-slate-300 transition active:scale-95 hover:border-aqua-400/30"
              >
                <RotateCcw size={13} />
                重置
              </button>
            </div>
          </div>

          {/* 热身 */}
          {template.warmup && (
            <div className="mt-3 rounded-chip border border-brand-400/12 bg-brand-500/6 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold tracking-wide text-brand-300/80 uppercase">
                  热身
                </p>
                <button
                  type="button"
                  onClick={() => openFormGuide(warmupTarget(template))}
                  aria-label={`AI 指导：${template.label} 热身`}
                  className="-my-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-brand-300 transition active:scale-90 hover:bg-brand-500/12 hover:text-brand-200"
                >
                  <Sparkles size={14} />
                </button>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{template.warmup}</p>
            </div>
          )}

          {/* 进度 */}
          <div className="mt-3.5">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[11px] text-slate-400">
                完成进度{' '}
                <span className="font-semibold text-brand-300">
                  {progress.done}/{progress.total}
                </span>{' '}
                组
              </span>
              <span
                className={cn(
                  'text-[11px] font-semibold',
                  percent === 100 ? 'text-aqua-300' : 'text-slate-400',
                )}
              >
                {percent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-night-950/70">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-aqua-400"
                initial={false}
                animate={{ width: `${percent}%` }}
                transition={{ type: 'spring', stiffness: 220, damping: 30 }}
              />
            </div>
            {percent === 100 && progress.total > 0 && (
              <p className="mt-2 text-center text-[11px] font-medium text-aqua-300">
                🎉 今天的训练全部完成，收工！
              </p>
            )}
          </div>
        </div>

        {/* 动作列表 */}
        {items.map((item, index) => (
          <ExerciseCard
            key={item.template.id}
            index={index + 1}
            exercise={item.template}
            weight={item.weight}
            done={item.done}
            onToggleSet={(setIndex) => void toggleSet(item.template.id, setIndex)}
            onWeightChange={(weight) => void setExerciseWeight(item.template.id, weight)}
            onEdit={() => openEditor({ dayTemplateId: template.id, exercise: item.template })}
            onDelete={() => handleDelete(item.template.id, item.template.name)}
            onAiGuide={() => openFormGuide(exerciseTarget(item.template, item.weight))}
          />
        ))}

        <button
          type="button"
          onClick={() => openEditor({ dayTemplateId: template.id, exercise: null })}
          className="flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-white/12 bg-night-900/40 px-4 py-3.5 text-sm font-medium text-slate-400 transition active:scale-[0.98] hover:border-brand-400/35 hover:text-brand-300"
        >
          <Plus size={16} />
          新增动作
        </button>
      </div>
    </section>
  );
}
