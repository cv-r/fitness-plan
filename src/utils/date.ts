import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

const ISO = 'yyyy-MM-dd';

/** 本地时区的今天，格式 YYYY-MM-DD（不要用 toISOString，那是 UTC） */
export function todayISO(): string {
  return format(new Date(), ISO);
}

/** Date -> YYYY-MM-DD */
export function toISODate(date: Date): string {
  return format(date, ISO);
}

/** YYYY-MM-DD -> Date（本地零点） */
export function fromISODate(iso: string): Date {
  return parseISO(iso);
}

/** 2026年9月30日 周三 */
export function formatChineseDate(iso: string): string {
  return format(parseISO(iso), 'yyyy年M月d日 EEEE', { locale: zhCN });
}

/** 9月30日 */
export function formatShortDate(iso: string): string {
  return format(parseISO(iso), 'M月d日');
}

/** 2026-09 */
export function monthKey(iso: string): string {
  return format(parseISO(iso), 'yyyy-MM');
}

export function isTodayISO(iso: string): boolean {
  return isSameDay(parseISO(iso), new Date());
}

/** 上一个月 / 下一个月，输入输出都是 YYYY-MM-DD */
export function shiftMonth(iso: string, delta: number): string {
  const base = parseISO(iso);
  return toISODate(delta >= 0 ? addMonths(base, delta) : subMonths(base, -delta));
}

/** 前后偏移若干天，输入输出都是 YYYY-MM-DD */
export function shiftDays(iso: string, delta: number): string {
  const base = parseISO(iso);
  return toISODate(delta >= 0 ? addDays(base, delta) : subDays(base, -delta));
}

/** 昨天，YYYY-MM-DD */
export function yesterdayISO(from: string = todayISO()): string {
  return shiftDays(from, -1);
}

/** 日历网格：以周一为一周起点，补齐整月视图所需的 42（或 35）格 */
export function buildMonthGrid(iso: string): Date[] {
  const base = parseISO(iso);
  const start = startOfWeek(startOfMonth(base), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(base), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function isSameMonthISO(iso: string, monthIso: string): boolean {
  return isSameMonth(parseISO(iso), parseISO(monthIso));
}

export { isSameDay };
