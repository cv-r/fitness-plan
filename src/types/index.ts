/* ------------------------------------------------------------------ */
/* 个人资料的可选项：常量数组是唯一事实来源，联合类型由它推导            */
/* （设置页的选项按钮也直接复用这些数组）                                */
/* ------------------------------------------------------------------ */

export const GENDERS = ['男', '女', '其他'] as const;
export type Gender = (typeof GENDERS)[number];

export const GOALS = ['增肌', '减脂', '塑形', '提升力量', '保持健康'] as const;
export type Goal = (typeof GOALS)[number];

export const EXPERIENCE_LEVELS = ['新手', '进阶', '高手'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

/**
 * 用户基础资料。
 * 除姓名外的字段都允许为空，但设置页会给出默认值，
 * 目的是让 AI 教练拿到尽可能完整的身体信息再给建议。
 */
export interface UserProfile {
  name: string;
  gender: Gender | null;
  age: number | null;
  defaultWeight: number | null;
  defaultHeight: number | null;
  /** 训练目标，影响 AI 给的组数/次数/饮食建议 */
  goal: Goal | null;
  /** 训练经验，影响 AI 给的强度建议 */
  experience: ExperienceLevel | null;
  updatedAt: string;
}

/** 训练动作模板（训练日的组成单元） */
export interface ExerciseTemplate {
  id: string;
  name: string;
  /** 目标组数 */
  sets: number;
  /** 次数描述，例如 "8" / "12" / "力竭" */
  reps: string;
  /** 默认重量，自重动作为 0 或负重 */
  weight: number;
  /** 加减步进 */
  step: number;
  /** 动作提示 */
  tip: string;
  unit: 'kg' | 'bodyweight';
  /** 排序，从 1 开始 */
  order: number;
  /** 是否用户自定义动作 */
  isCustom?: boolean;
}

/** 训练日模板 */
export interface DayTemplate {
  id: string;
  label: string;
  title: string;
  time: string;
  warmup: string;
  exercises: ExerciseTemplate[];
}

/** 单个动作在某一天的完成记录 */
export interface ExerciseRecord {
  exerciseId: string;
  weight: number;
  /** 已完成组数，0 表示未开始 */
  done: number;
}

/** 某一天的记录 */
export interface DayRecord {
  /** YYYY-MM-DD */
  date: string;
  /** null 表示当天还没有选择训练日 */
  dayTemplateId: string | null;
  isRest: boolean;
  exercises: ExerciseRecord[];
  updatedAt: string;
}

/** 体重记录 */
export interface WeightRecord {
  /** YYYY-MM-DD */
  date: string;
  weight: number;
}

/** AI 聊天消息 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

/** 单日进度 */
export interface DayProgress {
  done: number;
  total: number;
}
