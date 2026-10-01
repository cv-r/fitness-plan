/**
 * 动作指导：一次性的姿势问答。
 *
 * 与教练聊天完全分开——不写进 chatMessages，只按「项目」缓存最后一次结果。
 * 每条缓存带一个输入签名：动作定义（组数/次数/重量/备注）或热身文案改了，
 * 签名就变，下次点开自动重新生成；没变就直接读缓存，不再花 token。
 */
import type { DayTemplate, ExerciseTemplate } from '../types';

export interface FormGuideTarget {
  /** 缓存键：动作按 id，热身按训练日 id */
  key: string;
  /** 面板标题 */
  title: string;
  /** 面板副标题 */
  subtitle: string;
  /** 发给模型的「项目信息」行 */
  details: string[];
  /** 输入签名，变了就重新生成 */
  sig: string;
}

interface FormGuideEntry {
  sig: string;
  content: string;
}

const LS_KEY = 'zr-fitness-plan::form-guide';

/**
 * 拼输入签名。用 U+0001 当分隔符——它不可能出现在动作名或备注里，
 * 否则 ['ab','c'] 和 ['a','bc'] 会算出同一个签名。
 */
export function signatureOf(parts: Array<string | number | null | undefined>): string {
  return parts.map((part) => String(part ?? '')).join('\u0001');
}

type FormGuideStore = Record<string, FormGuideEntry>;

function readAll(): FormGuideStore {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    // 逐个校验，坏掉的条目直接丢掉，不要让整份缓存失效
    const out: FormGuideStore = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const { sig, content } = value as Partial<FormGuideEntry>;
      if (typeof sig !== 'string' || typeof content !== 'string' || !content.trim()) continue;
      out[key] = { sig, content };
    }
    return out;
  } catch {
    // 存的东西坏了或隐私模式读不到，当作没有缓存
    return {};
  }
}

/** 读取某个项目在给定签名下的缓存；签名不匹配视为未命中 */
export function readFormGuide(key: string, sig: string): string | null {
  const entry = readAll()[key];
  return entry && entry.sig === sig ? entry.content : null;
}

export function writeFormGuide(key: string, entry: FormGuideEntry): void {
  try {
    const all = readAll();
    all[key] = entry;
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch {
    // 写不进去只影响下次还要重新生成，忽略
  }
}

export function clearFormGuides(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // 同上
  }
}

/* ------------------------------------------------------------------ */
/* 由动作 / 热身构造目标                                                */
/* ------------------------------------------------------------------ */

/** 自重的 0kg 显示成「自重」，其余原样带单位 */
function weightText(exercise: ExerciseTemplate, weight: number): string {
  if (exercise.unit === 'bodyweight' && weight === 0) return '自重';
  return `${Math.round(weight * 10) / 10} kg`;
}

export function exerciseTarget(exercise: ExerciseTemplate, weight: number): FormGuideTarget {
  const weightLabel = weightText(exercise, weight);
  return {
    key: `exercise:${exercise.id}`,
    title: exercise.name,
    subtitle: `${exercise.sets}×${exercise.reps} · ${weightLabel}`,
    details: [
      `动作名称：${exercise.name}`,
      `组数 × 次数：${exercise.sets} × ${exercise.reps}`,
      `当前重量：${weightLabel}`,
      exercise.tip ? `计划里的备注：${exercise.tip}` : '',
    ].filter((line) => line !== ''),
    sig: signatureOf([
      exercise.name,
      exercise.sets,
      exercise.reps,
      exercise.unit,
      exercise.tip,
      weight,
    ]),
  };
}

export function warmupTarget(template: DayTemplate): FormGuideTarget {
  return {
    key: `warmup:${template.id}`,
    title: `${template.label} 热身`,
    subtitle: `${template.title} · ${template.time}`,
    details: [
      `训练日：${template.label} · ${template.title}`,
      `热身安排：${template.warmup}`,
    ],
    sig: signatureOf([template.warmup]),
  };
}
