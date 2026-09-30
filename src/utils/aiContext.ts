/**
 * 拼给 AI 的上下文。
 *
 * 聊天（useDeepSeek）和每日激励（useDailyTip）都要把「用户是谁 + 练了什么」
 * 交给 AI，所以统一放这里，避免两处各写一份、字段改了漏改一处。
 */
import { resolveExercises, sumProgress, useAppStore } from '../store/useAppStore';
import type { UserProfile } from '../types';
import { formatChineseDate, todayISO, yesterdayISO } from './date';

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
