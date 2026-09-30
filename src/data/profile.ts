/**
 * 个人资料的默认值与归一化。
 *
 * 放在 data 层而不是 store，是因为 db 层读取旧数据时也要用，
 * 而 store 依赖 db —— 反向导入会形成循环。
 */
import {
  EXPERIENCE_LEVELS,
  GENDERS,
  GOALS,
  type ExperienceLevel,
  type Gender,
  type Goal,
  type UserProfile,
} from '../types';

/**
 * 首次进入时的默认资料。
 * 性别 / 年龄 / 目标 / 经验都给了默认值（而不是留空），
 * 这样即使用户不填，AI 也能拿到完整的身体画像再给建议；随时可在设置里改。
 */
export const DEFAULT_PROFILE: UserProfile = {
  name: '战士',
  gender: '男',
  age: 28,
  defaultWeight: null,
  defaultHeight: null,
  goal: '增肌',
  experience: '进阶',
  updatedAt: new Date(0).toISOString(),
};

/** 值在选项数组内才采用，否则回落到兜底值 */
function pickOption<T extends string>(
  options: readonly T[],
  value: unknown,
  fallback: T | null,
): T | null {
  return typeof value === 'string' && (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function toOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.round(value * 10) / 10
    : null;
}

function toOptionalAge(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 130
    ? Math.round(value)
    : null;
}

/**
 * 把任意来源的资料补齐成完整的 UserProfile。
 * 老版本存下来的记录没有新增字段，这里统一兜底，避免读到 undefined。
 */
export function normalizeProfile(row: Partial<UserProfile> | null | undefined): UserProfile {
  if (!row) return { ...DEFAULT_PROFILE, updatedAt: new Date().toISOString() };
  return {
    name: typeof row.name === 'string' ? row.name : DEFAULT_PROFILE.name,
    gender: pickOption<Gender>(GENDERS, row.gender, DEFAULT_PROFILE.gender),
    age: toOptionalAge(row.age),
    defaultWeight: toOptionalNumber(row.defaultWeight),
    defaultHeight: toOptionalNumber(row.defaultHeight),
    goal: pickOption<Goal>(GOALS, row.goal, DEFAULT_PROFILE.goal),
    experience: pickOption<ExperienceLevel>(
      EXPERIENCE_LEVELS,
      row.experience,
      DEFAULT_PROFILE.experience,
    ),
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date().toISOString(),
  };
}
