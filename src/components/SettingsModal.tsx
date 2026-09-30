import { Bot, Check, Eye, EyeOff, KeyRound, Palette, RotateCcw, Trash2, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { THEMES } from '../theme/themes';
import {
  EXPERIENCE_LEVELS,
  GENDERS,
  GOALS,
  type ExperienceLevel,
  type Gender,
  type Goal,
} from '../types';
import { clearStoredAiConfig, DEFAULT_BASE_URL, DEFAULT_MODEL, hasEnvApiKey } from '../utils/aiConfig';
import { cn } from '../utils/cn';
import { Modal } from './Modal';
import { OptionChips } from './OptionChips';

const LABEL_CLASS = 'mb-1.5 block text-[11px] text-slate-400';
const FIELD_CLASS =
  'h-12 w-full rounded-chip border border-brand-400/15 bg-night-950/60 px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-brand-400/55';

/** 空串 -> null；非法 -> undefined（表示保留原值） */
function parseOptionalNumber(input: string): number | null | undefined {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return undefined;
  return Math.round(value * 10) / 10;
}

/** 年龄按整数处理，上限用于挡住明显的误输入 */
function parseOptionalAge(input: string): number | null | undefined {
  const parsed = parseOptionalNumber(input);
  if (parsed == null) return parsed;
  return parsed > 0 && parsed < 130 ? Math.round(parsed) : undefined;
}

export function SettingsModal() {
  const open = useAppStore((state) => state.ui.settings);
  const closeSettings = useAppStore((state) => state.closeSettings);
  const profile = useAppStore((state) => state.profile);
  const aiConfig = useAppStore((state) => state.aiConfig);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const updateAiConfig = useAppStore((state) => state.updateAiConfig);
  const pushToast = useAppStore((state) => state.pushToast);
  const openConfirm = useAppStore((state) => state.openConfirm);
  const resetPlan = useAppStore((state) => state.resetPlan);
  const clearChat = useAppStore((state) => state.clearChat);

  const [name, setName] = useState(profile.name);
  const [gender, setGender] = useState<Gender | null>(profile.gender);
  const [age, setAge] = useState(profile.age != null ? String(profile.age) : '');
  const [goal, setGoal] = useState<Goal | null>(profile.goal);
  const [experience, setExperience] = useState<ExperienceLevel | null>(profile.experience);
  const [weight, setWeight] = useState(profile.defaultWeight != null ? String(profile.defaultWeight) : '');
  const [height, setHeight] = useState(profile.defaultHeight != null ? String(profile.defaultHeight) : '');
  const [apiKey, setApiKey] = useState(aiConfig.apiKey);
  const [baseUrl, setBaseUrl] = useState(aiConfig.baseUrl);
  const [model, setModel] = useState(aiConfig.model);
  const [revealKey, setRevealKey] = useState(false);

  // 每次打开都从 store 同步一次，避免上次未保存的草稿残留
  useEffect(() => {
    if (!open) return;
    setName(profile.name);
    setGender(profile.gender);
    setAge(profile.age != null ? String(profile.age) : '');
    setGoal(profile.goal);
    setExperience(profile.experience);
    setWeight(profile.defaultWeight != null ? String(profile.defaultWeight) : '');
    setHeight(profile.defaultHeight != null ? String(profile.defaultHeight) : '');
    setApiKey(aiConfig.apiKey);
    setBaseUrl(aiConfig.baseUrl);
    setModel(aiConfig.model);
    setRevealKey(false);
  }, [open, profile, aiConfig]);

  const handleSave = async () => {
    const nextAge = parseOptionalAge(age);
    const nextWeight = parseOptionalNumber(weight);
    const nextHeight = parseOptionalNumber(height);
    if (nextAge === undefined) {
      pushToast('年龄请填写 1~129 之间的数字', 'error');
      return;
    }
    if (nextWeight === undefined || nextHeight === undefined) {
      pushToast('体重 / 身高请填写非负数字', 'error');
      return;
    }

    await updateProfile({
      name: name.trim(),
      gender,
      age: nextAge,
      goal,
      experience,
      defaultWeight: nextWeight,
      defaultHeight: nextHeight,
    });
    updateAiConfig({
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim() || DEFAULT_BASE_URL,
      model: model.trim() || DEFAULT_MODEL,
    });

    pushToast('设置已保存', 'success');
    closeSettings();
  };

  const handleClearKey = () => {
    setApiKey('');
    clearStoredAiConfig();
    updateAiConfig({ apiKey: '' });
    pushToast('已清除本地 Key', 'info');
  };

  return (
    <Modal
      open={open}
      onClose={closeSettings}
      title="设置"
      subtitle="资料存在本机数据库，Key 存在 localStorage"
      footer={
        <button
          type="button"
          onClick={() => void handleSave()}
          className="h-12 w-full rounded-chip bg-gradient-to-r from-brand-400 to-aqua-400 text-sm font-semibold text-night-950 shadow-lg shadow-brand-500/20 transition active:scale-[0.98]"
        >
          保存
        </button>
      }
    >
      <div className="space-y-5">
        {/* 主题 */}
        <section>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-brand-300">
            <Palette size={13} />
            主题
          </h3>

          <div className="mt-2.5 space-y-2">
            {THEMES.map((item) => {
              const active = item.id === theme;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTheme(item.id)}
                  aria-pressed={active}
                  className={cn(
                    'flex h-14 w-full items-center gap-3 rounded-chip border px-3.5 text-left transition active:scale-[0.98]',
                    active
                      ? 'border-brand-400/55 bg-brand-500/10'
                      : 'border-white/8 bg-night-850/70 hover:border-brand-400/30',
                  )}
                >
                  {/* 色板预览：背景 / 主色 / 辅色 */}
                  <span className="flex shrink-0 -space-x-2">
                    {item.swatch.map((color) => (
                      <span
                        key={color}
                        style={{ backgroundColor: color }}
                        className="h-6 w-6 rounded-full border border-white/15"
                      />
                    ))}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block truncate text-sm font-medium',
                        active ? 'text-brand-200' : 'text-slate-200',
                      )}
                    >
                      {item.label}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                      {item.hint}
                    </span>
                  </span>

                  {active && <Check size={16} className="shrink-0 text-brand-300" />}
                </button>
              );
            })}
          </div>

          <span className="mt-2 block text-[10px] leading-relaxed text-slate-500">
            主题保存在本机，切换后立即生效。保存按钮不影响主题。
          </span>
        </section>

        {/* 基础资料 */}
        <section>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-brand-300">
            <User size={13} />
            基础资料
          </h3>

          <div className="mt-2.5 space-y-3.5">
            <label className="block">
              <span className={LABEL_CLASS}>姓名</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="战士"
                className={FIELD_CLASS}
              />
            </label>

            <div>
              <span className={LABEL_CLASS}>性别</span>
              <OptionChips label="性别" options={GENDERS} value={gender} onChange={setGender} />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <label className="block">
                <span className={LABEL_CLASS}>年龄</span>
                <input
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  inputMode="numeric"
                  type="number"
                  step="1"
                  placeholder="--"
                  className={FIELD_CLASS}
                />
              </label>

              <label className="block">
                <span className={LABEL_CLASS}>身高 cm</span>
                <input
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                  inputMode="decimal"
                  type="number"
                  step="0.5"
                  placeholder="--"
                  className={FIELD_CLASS}
                />
              </label>

              <label className="block">
                <span className={LABEL_CLASS}>体重 kg</span>
                <input
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  inputMode="decimal"
                  type="number"
                  step="0.1"
                  placeholder="--"
                  className={FIELD_CLASS}
                />
              </label>
            </div>

            <div>
              <span className={LABEL_CLASS}>训练目标</span>
              <OptionChips label="训练目标" options={GOALS} value={goal} onChange={setGoal} />
            </div>

            <div>
              <span className={LABEL_CLASS}>训练经验</span>
              <OptionChips
                label="训练经验"
                options={EXPERIENCE_LEVELS}
                value={experience}
                onChange={setExperience}
              />
            </div>

            <p className="text-[10px] leading-relaxed text-slate-500">
              这些信息会和每日训练内容一起发给 AI 教练，用来给更贴合你身体状况的建议。
              只存在本机数据库，不会上传到除所配置的模型服务之外的任何地方。
            </p>
          </div>
        </section>

        {/* AI */}
        <section>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-brand-300">
            <Bot size={13} />
            AI 模型
          </h3>

          <div className="mt-2.5 space-y-3">
            <label className="block">
              <span className={cn(LABEL_CLASS, "flex items-center justify-between")}>
                <span className="flex items-center gap-1">
                  <KeyRound size={11} />
                  API Key
                </span>
                {hasEnvApiKey() && <span className="text-aqua-300">已从环境变量读取</span>}
              </span>

              <div className="relative">
                <input
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  type={revealKey ? 'text' : 'password'}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="sk-..."
                  className={cn(FIELD_CLASS, 'pr-12')}
                />
                <button
                  type="button"
                  onClick={() => setRevealKey((prev) => !prev)}
                  aria-label={revealKey ? '隐藏 Key' : '显示 Key'}
                  className="absolute top-1/2 right-1 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-slate-500 transition active:scale-90 hover:text-slate-300"
                >
                  {revealKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <span className="mt-1.5 block text-[10px] leading-relaxed text-slate-500">
                只保存在本机浏览器 localStorage，不会上传。请求由浏览器直连下面配置的服务。
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={LABEL_CLASS}>Base URL</span>
                <input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder={DEFAULT_BASE_URL}
                  spellCheck={false}
                  className={cn(FIELD_CLASS, "text-xs")}
                />
              </label>

              <label className="block">
                <span className={LABEL_CLASS}>模型</span>
                <input
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  placeholder={DEFAULT_MODEL}
                  spellCheck={false}
                  className={cn(FIELD_CLASS, "text-xs")}
                />
              </label>
            </div>

            {apiKey.trim() !== '' && (
              <button
                type="button"
                onClick={handleClearKey}
                className="text-[11px] font-medium text-slate-500 underline-offset-2 transition hover:text-rose-300 hover:underline"
              >
                清除本地 Key
              </button>
            )}
          </div>
        </section>

        {/* 危险操作 */}
        <section>
          <h3 className="text-xs font-semibold text-slate-400">其他</h3>

          <div className="mt-2.5 space-y-2">
            <button
              type="button"
              onClick={() =>
                openConfirm({
                  title: '恢复默认训练计划',
                  message:
                    '会把 4 个训练日恢复成默认动作（含默认重量和组数），自定义动作将被移除，已记录的完成情况会同步清理。此操作不可撤销。',
                  confirmText: '恢复默认',
                  danger: true,
                  onConfirm: resetPlan,
                })
              }
              className="flex h-12 w-full items-center gap-2 rounded-chip border border-white/8 bg-night-850/70 px-3.5 text-sm font-medium text-slate-300 transition active:scale-[0.98] hover:border-brand-400/30"
            >
              <RotateCcw size={15} />
              恢复默认训练计划
            </button>

            <button
              type="button"
              onClick={() =>
                openConfirm({
                  title: '清空聊天记录',
                  message: '会删除与 AI 教练的全部历史对话，设置和训练数据不受影响。',
                  confirmText: '清空',
                  danger: true,
                  onConfirm: clearChat,
                })
              }
              className="flex h-12 w-full items-center gap-2 rounded-chip border border-white/8 bg-night-850/70 px-3.5 text-sm font-medium text-slate-300 transition active:scale-[0.98] hover:border-rose-400/30 hover:text-rose-200"
            >
              <Trash2 size={15} />
              清空聊天记录
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
