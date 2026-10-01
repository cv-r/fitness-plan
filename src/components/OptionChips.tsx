import { cn } from '../utils/cn';

interface OptionChipsProps<T extends string> {
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  /** 无障碍分组名，同时用于 hover 提示 */
  label: string;
  /** 展示文案，默认就是选项本身；模型这类值是长 ID 时用它换成短标签 */
  renderLabel?: (option: T) => string;
  /** 选中项下方的补充说明，可选 */
  renderHint?: (option: T) => string | undefined;
}

/** 单选胶囊组：移动端比下拉框好点，选项少时一眼看全 */
export function OptionChips<T extends string>({
  options,
  value,
  onChange,
  label,
  renderLabel,
  renderHint,
}: OptionChipsProps<T>) {
  const hint = value != null && renderHint ? renderHint(value) : undefined;

  return (
    <div>
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
              {renderLabel ? renderLabel(option) : option}
            </button>
          );
        })}
      </div>

      {hint && <span className="mt-1.5 block text-[10px] text-slate-500">{hint}</span>}
    </div>
  );
}
