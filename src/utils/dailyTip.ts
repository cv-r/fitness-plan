/**
 * AI 每日激励的本地存储。
 *
 * 只保留「今天」这一条：读到 date 不是今天的就当作没有，
 * 于是每天最多生成一次、最多弹一次。
 */

export interface DailyTip {
  /** 该条激励对应的日期 YYYY-MM-DD */
  date: string;
  content: string;
}

const LS_KEY = 'zr-fitness-plan::daily-tip';

export function loadDailyTip(): DailyTip | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DailyTip>;
    if (typeof parsed.date !== 'string' || typeof parsed.content !== 'string') return null;
    if (!parsed.content.trim()) return null;
    return { date: parsed.date, content: parsed.content };
  } catch {
    // 存的东西坏了或者隐私模式读不到，当作没有
    return null;
  }
}

export function persistDailyTip(tip: DailyTip): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(tip));
  } catch {
    // 写不进去只影响下次启动会重新生成，忽略
  }
}
