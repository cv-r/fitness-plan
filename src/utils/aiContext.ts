/**
 * 拼给 AI 的上下文。
 *
 * 聊天（useAiChat）和每日激励（useDailyTip）都要把「用户是谁 + 练了什么」
 * 交给 AI，所以统一放这里，避免两处各写一份、字段改了漏改一处。
 */
import { resolveExercises, sumProgress, useAppStore } from '../store/useAppStore';
import type { UserProfile } from '../types';
import { formatChineseDate, todayISO, yesterdayISO } from './date';
import type { FormGuideTarget } from './formGuide';

/** 个人资料 -> 若干行文字，没填的字段直接跳过 */
export function profileLines(profile: UserProfile, todayWeight?: number): string[] {
  const lines: string[] = [];
  if (profile.name.trim()) lines.push(`姓名：${profile.name.trim()}`);
  if (profile.gender) lines.push(`性别：${profile.gender}`);
  if (profile.age != null) lines.push(`年龄：${profile.age} 岁`);
  if (profile.defaultHeight != null) lines.push(`身高：${profile.defaultHeight} cm`);
  if (todayWeight != null) lines.push(`今日体重：${todayWeight} kg`);
  if (profile.defaultWeight != null) lines.push(`默认体重：${profile.defaultWeight} kg`);
  if (profile.goal) lines.push(`训练目标：${profile.goal}`);
  if (profile.experience) lines.push(`训练经验：${profile.experience}`);
  return lines;
}

/** 某一天的训练摘要；没选训练日 / 休息日 / 无记录都会给出对应说明 */
export function describeDay(date: string): string[] {
  const { dayTemplates, dayRecords } = useAppStore.getState();
  const label = formatChineseDate(date);
  const record = dayRecords[date];

  if (!record) return [`${label}：没有训练记录`];
  if (record.isRest) return [`${label}：休息日`];

  const template = record.dayTemplateId
    ? dayTemplates.find((item) => item.id === record.dayTemplateId)
    : undefined;
  if (!template) return [`${label}：没有训练记录`];

  const items = resolveExercises(template, record);
  const progress = sumProgress(items);
  const lines = [
    `${label}：${template.label} · ${template.title}，完成 ${progress.done}/${progress.total} 组`,
  ];
  for (const item of items) {
    const unit = item.template.unit === 'bodyweight' ? '（自重/负重）' : 'kg';
    lines.push(
      `  - ${item.template.name} 目标 ${item.template.sets}×${item.template.reps}，` +
        `重量 ${item.weight}${unit}，完成 ${item.done} 组`,
    );
  }
  return lines;
}

/** 聊天用：用户资料 + 当前查看日期的安排 */
export function buildChatContext(): string {
  const { profile, currentDate, weights } = useAppStore.getState();
  return [
    `【当前上下文】日期：${formatChineseDate(currentDate)}`,
    ...profileLines(profile, weights[currentDate]),
    '',
    '【当天安排】',
    ...describeDay(currentDate),
  ].join('\n');
}

export const DAILY_TIP_SYSTEM_PROMPT =
  '你是一位私人健身教练，语气像并肩训练的伙伴：热血但不浮夸，具体而不空泛。';

export const FORM_GUIDE_SYSTEM_PROMPT =
  '你是一位严谨的健身教练，讲解动作要领时只讲可靠、可执行的内容，不编造数据。';

/**
 * 动作指导用：让模型针对某一个动作（或某个训练日的热身）讲清正确做法。
 * 内容会渲染成 Markdown，所以允许小标题和列表。
 */
export function buildFormGuidePrompt(target: FormGuideTarget): string {
  const { profile } = useAppStore.getState();

  return [
    `我马上要做这个项目，请给我动作指导：${target.title}`,
    '',
    '【项目信息】',
    ...target.details,
    '',
    '【我的资料】',
    ...profileLines(profile),
    '',
    '请按要求给出指导：',
    '1. 第一句说清这个项目主要练到什么，以及为什么值得练。',
    '2. 然后按「起始姿势 → 发力过程 → 呼吸节奏 → 常见错误」四段展开，每段 1~3 句，要具体到身体部位和角度。',
    '3. 结合我的训练目标和经验水平，提醒重量或强度上的注意事项。',
    '4. 如果这个项目有容易受伤的环节，单独用一句话点名风险。',
    '5. 用 Markdown 组织（可以用小标题和列表），总长度控制在 350 字以内，不要寒暄。',
  ].join('\n');
}

/**
 * 每日激励用：把「昨天的训练 + 今天的安排 + 用户资料」交给 AI，
 * 让它写一段开练前的动员。
 */
export function buildDailyTipPrompt(): string {
  const { profile, weights } = useAppStore.getState();
  const today = todayISO();
  const yesterday = yesterdayISO(today);

  return [
    `今天是 ${formatChineseDate(today)}，昨天是 ${formatChineseDate(yesterday)}。`,
    '',
    '【用户资料】',
    ...profileLines(profile, weights[today]),
    '',
    '【昨天的训练】',
    ...describeDay(yesterday),
    '',
    '【今天的安排】',
    ...describeDay(today),
    '',
    '请基于以上信息，用中文写一段开练前的动员，要求：',
    '1. 第一句点评昨天的训练：完成了就具体肯定，没练或没记录就平和带过，不要指责。',
    '2. 中间给今天 1~2 条具体可执行的建议，结合用户的训练目标和经验，',
    '   可以涉及重量、组数、节奏或恢复，但不要照抄动作清单。',
    '3. 最后一句打气，要有劲。',
    '4. 全文 60~120 字，口语化，像教练当面说话。',
    '5. 不要 Markdown、标题、列表、引号或 emoji，只输出这段话本身。',
  ].join('\n');
}
