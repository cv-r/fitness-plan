import { cn } from '../utils/cn';

interface OptionChipsProps<T extends string> {
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  /** 无障碍分组名，同时用于 hover 提示 */
  label: string;
}

/** 单选胶囊组：移动端比下拉框好点，选项少时一眼看全 */
export function OptionChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: OptionChipsProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={cn(
              'h-9 rounded-full border px-3.5 text-xs font-medium transition active:scale-95',
              active
                ? 'border-brand-400/55 bg-brand-500/15 text-brand-200'
                : 'border-white/8 bg-night-850/70 text-slate-400 hover:border-brand-400/30 hover:text-slate-200',
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
