import { create } from 'zustand';
import { cloneDefaultPlan } from '../data/defaultPlan';
import { DEFAULT_PROFILE } from '../data/profile';
import * as repo from '../db/db';
import type {
  ChatMessage,
  DayProgress,
  DayRecord,
  DayTemplate,
  ExerciseRecord,
  ExerciseTemplate,
  UserProfile,
} from '../types';
import { applyTheme, loadTheme, type ThemeId } from '../theme/themes';
import { loadAiConfig, persistAiConfig, type AiConfig } from '../utils/aiConfig';
import { loadDailyTip as loadStoredDailyTip, type DailyTip } from '../utils/dailyTip';
import { todayISO } from '../utils/date';
import { readFormGuide, type FormGuideTarget } from '../utils/formGuide';
import { uid } from '../utils/encode';

/* ------------------------------------------------------------------ */
/* 纯函数：把模板 + 记录合成可直接渲染的结构                            */
/* ------------------------------------------------------------------ */

export interface ResolvedExercise {
  template: ExerciseTemplate;
  weight: number;
  done: number;
}

/**
 * 以模板为准，把这一天的记录展开成动作列表。
 * 记录里缺失的动作（刚新增的）用模板默认值补齐，
 * 记录里多余的动作（模板已删除的）自动忽略。
 */
export function resolveExercises(template: DayTemplate, record?: DayRecord): ResolvedExercise[] {
  const saved = new Map((record?.exercises ?? []).map((item) => [item.exerciseId, item]));
  return [...template.exercises]
    .sort((a, b) => a.order - b.order)
    .map((item) => {
      const found = saved.get(item.id);
      return {
        template: item,
        weight: found ? found.weight : item.weight,
        done: found ? Math.max(0, Math.min(found.done, item.sets)) : 0,
      };
    });
}

export function sumProgress(items: ResolvedExercise[]): DayProgress {
  return items.reduce<DayProgress>(
    (acc, item) => ({ done: acc.done + item.done, total: acc.total + item.template.sets }),
    { done: 0, total: 0 },
  );
}

/** 按模板顺序取默认排序值，用于新增动作时排在最后 */
function nextOrder(template: DayTemplate): number {
  return template.exercises.reduce((max, item) => Math.max(max, item.order), 0) + 1;
}

/** 数字兜底 + 保留一位小数，避免浮点误差累积（2.5 步进常见） */
export function roundWeight(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value * 10) / 10);
}

/* ------------------------------------------------------------------ */
/* UI 辅助状态                                                          */
/* ------------------------------------------------------------------ */

export interface ConfirmState {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}

export interface EditorState {
  dayTemplateId: string;
  /** null 表示新增动作，否则为编辑 */
  exercise: ExerciseTemplate | null;
}

export interface ToastItem {
  id: string;
  text: string;
  tone: 'info' | 'success' | 'error';
}

export interface ExerciseDraft {
  name: string;
  sets: number;
  reps: string;
  weight: number;
  step: number;
  tip: string;
  unit: 'kg' | 'bodyweight';
}

interface UiState {
  calendar: boolean;
  settings: boolean;
  ai: boolean;
  /** AI 每日激励弹窗 */
  dailyTip: boolean;
  confirm: ConfirmState | null;
  editor: EditorState | null;
}

/** 每日激励的生成状态：idle 未开始 / loading 请求中 / ready 已就绪 / error 失败 */
export type DailyTipStatus = 'idle' | 'loading' | 'ready' | 'error';

/** 动作指导的状态，语义同 DailyTipStatus */
export type FormGuideStatus = 'idle' | 'loading' | 'ready' | 'error';

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

interface AppState {
  ready: boolean;
  storageDegraded: boolean;
  error: string | null;

  profile: UserProfile;
  dayTemplates: DayTemplate[];
  dayRecords: Record<string, DayRecord>;
  weights: Record<string, number>;
  chatMessages: ChatMessage[];
  streaming: boolean;
  currentDate: string;
  /** AI 配置，存 localStorage */
  aiConfig: AiConfig;
  /** 界面主题，存 localStorage，切换后整站换肤 */
  theme: ThemeId;
  /** 当天的 AI 激励，存 localStorage */
  dailyTip: DailyTip | null;
  dailyTipStatus: DailyTipStatus;

  ui: UiState;
  toasts: ToastItem[];

  init: () => Promise<void>;

  updateAiConfig: (patch: Partial<AiConfig>) => void;
  setTheme: (theme: ThemeId) => void;

  /* AI 每日激励：状态在这里，请求流程在 hooks/useDailyTip */
  setDailyTip: (tip: DailyTip | null, status: DailyTipStatus) => void;
  openDailyTip: () => void;
  closeDailyTip: () => void;

  /* 动作指导：一次性的姿势问答，不写进聊天记录；请求流程在 hooks/useFormGuide */
  formGuideTarget: FormGuideTarget | null;
  formGuideStatus: FormGuideStatus;
  formGuideContent: string;
  /** 每次打开或重新生成都自增，用来触发 hook 重新请求 */
  formGuideNonce: number;
  openFormGuide: (target: FormGuideTarget) => void;
  retryFormGuide: () => void;
  setFormGuide: (patch: { status?: FormGuideStatus; content?: string }) => void;
  closeFormGuide: () => void;

  /* 日期与训练日 */
  setCurrentDate: (date: string) => void;
  selectDay: (dayTemplateId: string) => Promise<void>;
  markRest: () => Promise<void>;
  clearDay: () => Promise<void>;
  resetDay: () => Promise<void>;

  /* 动作记录 */
  toggleSet: (exerciseId: string, setIndex: number) => Promise<void>;
  setExerciseWeight: (exerciseId: string, weight: number) => Promise<void>;

  /* 体重与资料 */
  saveWeightFor: (date: string, weight: number | null) => Promise<void>;
  updateProfile: (patch: Partial<Omit<UserProfile, 'updatedAt'>>) => Promise<void>;

  /* 动作模板 */
  addExercise: (dayTemplateId: string, draft: ExerciseDraft) => Promise<void>;
  updateExercise: (dayTemplateId: string, exerciseId: string, draft: ExerciseDraft) => Promise<void>;
  deleteExercise: (dayTemplateId: string, exerciseId: string) => Promise<void>;
  resetPlan: () => Promise<void>;

  /* 聊天 */
  appendMessage: (message: ChatMessage) => Promise<void>;
  patchMessage: (id: string, patch: Partial<ChatMessage>) => void;
  clearChat: () => Promise<void>;
  setStreaming: (value: boolean) => void;

  /* UI */
  openCalendar: () => void;
  closeCalendar: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openAi: () => void;
  closeAi: () => void;
  openConfirm: (state: ConfirmState) => void;
  closeConfirm: () => void;
  openEditor: (state: EditorState) => void;
  closeEditor: () => void;

  /* Toast */
  pushToast: (text: string, tone?: ToastItem['tone']) => void;
  dismissToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => {
  /** 把一天的记录写回存储并同步到内存，写入前统一按模板归一化 */
  async function commitRecord(date: string, next: DayRecord): Promise<void> {
    await repo.saveRecord(next);
    set((state) => ({ dayRecords: { ...state.dayRecords, [date]: next } }));
  }

  /** 当前日期对应的模板与记录 */
  function currentContext(): { date: string; record: DayRecord | undefined; template: DayTemplate | undefined } {
    const { currentDate, dayRecords, dayTemplates } = get();
    const record = dayRecords[currentDate];
    const template = record?.dayTemplateId
      ? dayTemplates.find((item) => item.id === record.dayTemplateId)
      : undefined;
    return { date: currentDate, record, template };
  }

  /** 读改写：确保记录存在并且与模板对齐后再交给回调修改 */
  async function mutateCurrentRecord(
    mutate: (record: DayRecord, template: DayTemplate) => DayRecord,
  ): Promise<void> {
    const { date, record, template } = currentContext();
    if (!template) return;
    const aligned: DayRecord = {
      date,
      dayTemplateId: template.id,
      isRest: false,
      exercises: resolveExercises(template, record).map<ExerciseRecord>((item) => ({
        exerciseId: item.template.id,
        weight: item.weight,
        done: item.done,
      })),
      updatedAt: record?.updatedAt ?? new Date().toISOString(),
    };
    await commitRecord(date, mutate(aligned, template));
  }

  return {
    ready: false,
    storageDegraded: false,
    error: null,

    profile: DEFAULT_PROFILE,
    dayTemplates: [],
    dayRecords: {},
    weights: {},
    chatMessages: [],
    streaming: false,
    currentDate: todayISO(),
    aiConfig: loadAiConfig(),
    theme: loadTheme(),
    dailyTip: loadStoredDailyTip(),
    dailyTipStatus: 'idle',

    formGuideTarget: null,
    formGuideStatus: 'idle',
    formGuideContent: '',
    formGuideNonce: 0,

    ui: { calendar: false, settings: false, ai: false, dailyTip: false, confirm: null, editor: null },
    toasts: [],

    /* ---------------- 初始化 ---------------- */

    init: async () => {
      try {
        const data = await repo.loadAll();
        let templates = data.dayTemplates;
        // 首次进入（或被清库）时写入默认计划
        if (templates.length === 0) {
          templates = cloneDefaultPlan();
          await repo.saveTemplates(templates);
        }
        set({
          ready: true,
          storageDegraded: data.degraded,
          profile: data.profile ?? { ...DEFAULT_PROFILE, updatedAt: new Date().toISOString() },
          dayTemplates: templates,
          dayRecords: Object.fromEntries(data.dayRecords.map((item) => [item.date, item])),
          weights: Object.fromEntries(data.weights.map((item) => [item.date, item.weight])),
          chatMessages: data.chatMessages,
          currentDate: todayISO(),
        });
      } catch (error) {
        console.error('[store] 初始化失败', error);
        set({
          ready: true,
          error: error instanceof Error ? error.message : String(error),
          dayTemplates: cloneDefaultPlan(),
        });
      }
    },

    updateAiConfig: (patch) => {
      const next: AiConfig = { ...get().aiConfig, ...patch };
      persistAiConfig(next);
      set({ aiConfig: next });
    },

    // applyTheme 内部会一并落盘到 localStorage
    setTheme: (theme) => {
      applyTheme(theme);
      set({ theme });
    },

    /* ---------------- AI 每日激励 ---------------- */

    setDailyTip: (dailyTip, dailyTipStatus) => set({ dailyTip, dailyTipStatus }),

    openDailyTip: () => set((state) => ({ ui: { ...state.ui, dailyTip: true } })),
    closeDailyTip: () => set((state) => ({ ui: { ...state.ui, dailyTip: false } })),

    /* ---------------- 动作指导 ---------------- */

    // 命中缓存就直接显示，省掉一次请求，也不会先闪一下加载态
    openFormGuide: (target) => {
      const cached = readFormGuide(target.key, target.sig);
      set((state) => ({
        formGuideTarget: target,
        formGuideStatus: cached ? 'ready' : 'idle',
        formGuideContent: cached ?? '',
        formGuideNonce: state.formGuideNonce + 1,
      }));
    },

    retryFormGuide: () =>
      set((state) => ({
        formGuideStatus: 'idle',
        formGuideContent: '',
        formGuideNonce: state.formGuideNonce + 1,
      })),

    setFormGuide: (patch) =>
      set((state) => ({
        formGuideStatus: patch.status ?? state.formGuideStatus,
        formGuideContent: patch.content ?? state.formGuideContent,
      })),

    closeFormGuide: () =>
      set({ formGuideTarget: null, formGuideStatus: 'idle', formGuideContent: '' }),

    /* ---------------- 日期与训练日 ---------------- */

    setCurrentDate: (date) => set({ currentDate: date }),

    selectDay: async (dayTemplateId) => {
      const { currentDate, dayTemplates } = get();
      const template = dayTemplates.find((item) => item.id === dayTemplateId);
      if (!template) return;
      const next: DayRecord = {
        date: currentDate,
        dayTemplateId,
        isRest: false,
        exercises: resolveExercises(template, undefined).map<ExerciseRecord>((item) => ({
          exerciseId: item.template.id,
          weight: item.weight,
          done: 0,
        })),
        updatedAt: new Date().toISOString(),
      };
      await commitRecord(currentDate, next);
      get().pushToast(`已选择 ${template.label} · ${template.title}`, 'success');
    },

    markRest: async () => {
      const { currentDate } = get();
      const next: DayRecord = {
        date: currentDate,
        dayTemplateId: null,
        isRest: true,
        exercises: [],
        updatedAt: new Date().toISOString(),
      };
      await commitRecord(currentDate, next);
      get().pushToast('已标记为休息日', 'info');
    },

    clearDay: async () => {
      const { currentDate } = get();
      await repo.deleteRecord(currentDate);
      set((state) => {
        const dayRecords = { ...state.dayRecords };
        delete dayRecords[currentDate];
        return { dayRecords };
      });
      get().pushToast('已清空当天记录', 'info');
    },

    resetDay: async () => {
      const { template } = currentContext();
      if (!template) return;
      // 重量回到模板默认值，完成组数清零
      await mutateCurrentRecord((record) => ({
        ...record,
        exercises: resolveExercises(template, undefined).map<ExerciseRecord>((item) => ({
          exerciseId: item.template.id,
          weight: item.template.weight,
          done: 0,
        })),
        updatedAt: new Date().toISOString(),
      }));
      get().pushToast('已重置本日训练', 'success');
    },

    /* ---------------- 动作记录 ---------------- */

    toggleSet: async (exerciseId, setIndex) => {
      await mutateCurrentRecord((record) => ({
        ...record,
        exercises: record.exercises.map((item) =>
          item.exerciseId === exerciseId
            ? { ...item, done: item.done === setIndex ? Math.max(0, setIndex - 1) : setIndex }
            : item,
        ),
        updatedAt: new Date().toISOString(),
      }));
    },

    setExerciseWeight: async (exerciseId, weight) => {
      const safe = roundWeight(weight);
      await mutateCurrentRecord((record) => ({
        ...record,
        exercises: record.exercises.map((item) =>
          item.exerciseId === exerciseId ? { ...item, weight: safe } : item,
        ),
        updatedAt: new Date().toISOString(),
      }));
    },

    /* ---------------- 体重与资料 ---------------- */

    saveWeightFor: async (date, weight) => {
      if (weight === null) {
        await repo.saveWeight(null, date);
        set((state) => {
          const weights = { ...state.weights };
          delete weights[date];
          return { weights };
        });
        return;
      }
      const safe = roundWeight(weight);
      await repo.saveWeight({ date, weight: safe }, date);
      set((state) => ({ weights: { ...state.weights, [date]: safe } }));
    },

    updateProfile: async (patch) => {
      const next: UserProfile = { ...get().profile, ...patch, updatedAt: new Date().toISOString() };
      await repo.saveProfile(next);
      set({ profile: next });
    },

    /* ---------------- 动作模板 ---------------- */

    addExercise: async (dayTemplateId, draft) => {
      const { dayTemplates } = get();
      const target = dayTemplates.find((item) => item.id === dayTemplateId);
      if (!target) return;
      const exercise: ExerciseTemplate = {
        id: `custom-${uid()}`,
        name: draft.name.trim() || '新动作',
        sets: Math.max(1, Math.round(draft.sets)),
        reps: draft.reps.trim() || '10',
        weight: roundWeight(draft.weight),
        step: draft.step > 0 ? draft.step : 2.5,
        tip: draft.tip.trim(),
        unit: draft.unit,
        order: nextOrder(target),
        isCustom: true,
      };
      const nextTemplates = dayTemplates.map((item) =>
        item.id === dayTemplateId ? { ...item, exercises: [...item.exercises, exercise] } : item,
      );
      await repo.saveTemplates(nextTemplates);
      set({ dayTemplates: nextTemplates });
      get().pushToast(`已新增动作：${exercise.name}`, 'success');
    },

    updateExercise: async (dayTemplateId, exerciseId, draft) => {
      const { dayTemplates } = get();
      const nextTemplates = dayTemplates.map((item) =>
        item.id !== dayTemplateId
          ? item
          : {
              ...item,
              exercises: item.exercises.map((exercise) =>
                exercise.id !== exerciseId
                  ? exercise
                  : {
                      ...exercise,
                      name: draft.name.trim() || exercise.name,
                      sets: Math.max(1, Math.round(draft.sets)),
                      reps: draft.reps.trim() || exercise.reps,
                      weight: roundWeight(draft.weight),
                      step: draft.step > 0 ? draft.step : exercise.step,
                      tip: draft.tip.trim(),
                      unit: draft.unit,
                    },
              ),
            },
      );
      await repo.saveTemplates(nextTemplates);
      // 组数可能变小，同步裁剪已保存记录里的完成组数
      const pruned = pruneRecords(get().dayRecords, nextTemplates);
      set({ dayTemplates: nextTemplates, dayRecords: pruned.records });
      await repo.saveRecords(pruned.changed);
      get().pushToast('动作已更新', 'success');
    },

    deleteExercise: async (dayTemplateId, exerciseId) => {
      const { dayTemplates, dayRecords } = get();
      const nextTemplates = dayTemplates.map((item) =>
        item.id !== dayTemplateId
          ? item
          : { ...item, exercises: item.exercises.filter((exercise) => exercise.id !== exerciseId) },
      );
      await repo.saveTemplates(nextTemplates);

      // 同步清理当天记录里该动作的完成情况
      const touched: DayRecord[] = [];
      const nextRecords = { ...dayRecords };
      for (const [date, record] of Object.entries(dayRecords)) {
        if (!record.exercises.some((item) => item.exerciseId === exerciseId)) continue;
        const updated: DayRecord = {
          ...record,
          exercises: record.exercises.filter((item) => item.exerciseId !== exerciseId),
          updatedAt: new Date().toISOString(),
        };
        nextRecords[date] = updated;
        touched.push(updated);
      }
      if (touched.length > 0) await repo.saveRecords(touched);
      set({ dayTemplates: nextTemplates, dayRecords: nextRecords });
      get().pushToast('动作已删除', 'info');
    },

    resetPlan: async () => {
      const templates = cloneDefaultPlan();
      await repo.saveTemplates(templates);
      const pruned = pruneRecords(get().dayRecords, templates);
      await repo.saveRecords(pruned.changed);
      set({ dayTemplates: templates, dayRecords: pruned.records });
      get().pushToast('已恢复默认训练计划', 'success');
    },

    /* ---------------- 聊天 ---------------- */

    // upsert：同 id 覆盖（流式结束后把完整内容写回），否则追加
    appendMessage: async (message) => {
      await repo.saveMessage(message);
      set((state) => {
        const exists = state.chatMessages.some((item) => item.id === message.id);
        return {
          chatMessages: exists
            ? state.chatMessages.map((item) => (item.id === message.id ? message : item))
            : [...state.chatMessages, message],
        };
      });
    },

    // 流式输出期间高频更新，只改内存不落库，结束时再统一保存
    patchMessage: (id, patch) => {
      set((state) => ({
        chatMessages: state.chatMessages.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      }));
    },

    clearChat: async () => {
      await repo.clearMessages();
      set({ chatMessages: [] });
      get().pushToast('聊天记录已清空', 'info');
    },

    setStreaming: (value) => set({ streaming: value }),

    /* ---------------- UI ---------------- */

    openCalendar: () => set((state) => ({ ui: { ...state.ui, calendar: true } })),
    closeCalendar: () => set((state) => ({ ui: { ...state.ui, calendar: false } })),
    openSettings: () => set((state) => ({ ui: { ...state.ui, settings: true } })),
    closeSettings: () => set((state) => ({ ui: { ...state.ui, settings: false } })),
    openAi: () => set((state) => ({ ui: { ...state.ui, ai: true } })),
    closeAi: () => set((state) => ({ ui: { ...state.ui, ai: false } })),
    openConfirm: (confirm) => set((state) => ({ ui: { ...state.ui, confirm } })),
    closeConfirm: () => set((state) => ({ ui: { ...state.ui, confirm: null } })),
    openEditor: (editor) => set((state) => ({ ui: { ...state.ui, editor } })),
    closeEditor: () => set((state) => ({ ui: { ...state.ui, editor: null } })),

    /* ---------------- Toast ---------------- */

    pushToast: (text, tone = 'info') => {
      const id = uid('toast-');
      set((state) => ({ toasts: [...state.toasts, { id, text, tone }] }));
      setTimeout(() => get().dismissToast(id), 2400);
    },

    dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
  };
});

/** 模板变更后，把记录裁剪到与模板一致；返回新记录表和真正发生变化的那些 */
function pruneRecords(
  records: Record<string, DayRecord>,
  templates: DayTemplate[],
): { records: Record<string, DayRecord>; changed: DayRecord[] } {
  const next: Record<string, DayRecord> = {};
  const changed: DayRecord[] = [];
  for (const [date, record] of Object.entries(records)) {
    if (!record.dayTemplateId) {
      next[date] = record;
      continue;
    }
    const template = templates.find((item) => item.id === record.dayTemplateId);
    if (!template) {
      next[date] = record;
      continue;
    }
    const exercises = resolveExercises(template, record).map<ExerciseRecord>((item) => ({
      exerciseId: item.template.id,
      weight: item.weight,
      done: item.done,
    }));
    const sameLength = exercises.length === record.exercises.length;
    const sameContent =
      sameLength &&
      exercises.every((item, index) => {
        const before = record.exercises[index];
        return before && before.exerciseId === item.exerciseId && before.done === item.done;
      });
    if (sameContent) {
      next[date] = record;
      continue;
    }
    const updated: DayRecord = { ...record, exercises, updatedAt: new Date().toISOString() };
    next[date] = updated;
    changed.push(updated);
  }
  return { records: next, changed };
}
