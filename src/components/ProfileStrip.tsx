import { Check, Ruler, Scale, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocalDate } from '../hooks/useLocalDate';
import { roundWeight, useAppStore } from '../store/useAppStore';
import { cn } from '../utils/cn';

/** 基础信息条：姓名 / 默认体重 / 默认身高（点击进设置）+ 今日体重（就地编辑） */
export function ProfileStrip() {
  const profile = useAppStore((state) => state.profile);
  const weights = useAppStore((state) => state.weights);
  const saveWeightFor = useAppStore((state) => state.saveWeightFor);
  const openSettings = useAppStore((state) => state.openSettings);
  const pushToast = useAppStore((state) => state.pushToast);
  const { date } = useLocalDate();

  const saved = weights[date];
  const [draft, setDraft] = useState(saved != null ? String(saved) : '');

  // 切换日期 / 外部写入后同步输入框
  useEffect(() => {
    setDraft(saved != null ? String(saved) : '');
  }, [saved, date]);

  const commit = async () => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      if (saved != null) {
        await saveWeightFor(date, null);
        pushToast('已清除今日体重', 'info');
      }
      return;
    }
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value <= 0 || value > 400) {
      pushToast('请输入 0-400 之间的体重', 'error');
      setDraft(saved != null ? String(saved) : '');
      return;
    }
    const next = roundWeight(value);
    if (next !== saved) {
      await saveWeightFor(date, next);
      pushToast(`今日体重已记录：${next} kg`, 'success');
    }
    setDraft(String(next));
  };

  const chips = [
    { icon: User, label: profile.name.trim() || '未设置', hint: '姓名' },
    {
      icon: Ruler,
      label: profile.defaultHeight != null ? `${profile.defaultHeight} cm` : '未设置',
      hint: '身高',
    },
    {
      icon: Scale,
      label: profile.defaultWeight != null ? `${profile.defaultWeight} kg` : '未设置',
      hint: '默认体重',
    },
  ];

  return (
    <section className="px-safe px-4">
      <div className="glass mx-auto w-full max-w-md rounded-card p-3.5">
        <div className="flex gap-2">
          {chips.map(({ icon: Icon, label, hint }) => (
            <button
              key={hint}
              type="button"
              onClick={openSettings}
              className="flex min-w-0 flex-1 items-center gap-1.5 rounded-chip border border-white/5 bg-night-850/60 px-2.5 py-2 text-left transition active:scale-[0.97]"
            >
              <Icon size={13} className="shrink-0 text-brand-400" />
              <span className="min-w-0">
                <span className="block text-[10px] leading-none text-slate-500">{hint}</span>
                <span className="mt-1 block truncate text-xs leading-none font-medium text-slate-200">
                  {label}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-chip bg-night-950/50 px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
            <Scale size={14} className="text-aqua-300" />
            今日体重
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => void commit()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
              inputMode="decimal"
              type="number"
              step="0.1"
              placeholder="--"
              aria-label="今日体重（kg）"
              className="h-11 w-20 rounded-xl border border-brand-400/20 bg-night-900/80 px-2 text-center text-base font-semibold text-aqua-300 outline-none transition placeholder:text-slate-600 focus:border-brand-400/60"
            />
            <span className="text-xs text-slate-500">kg</span>
            <span
              className={cn(
                'grid h-6 w-6 place-items-center rounded-full transition',
                saved != null ? 'bg-aqua-400/20 text-aqua-300' : 'bg-white/5 text-slate-600',
              )}
              aria-hidden
            >
              <Check size={13} />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
