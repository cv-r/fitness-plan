import { useCallback, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatChineseDate, formatShortDate, isTodayISO, todayISO } from '../utils/date';

/** 当前查看的日期 + 常用格式化结果 */
export function useLocalDate() {
  const date = useAppStore((state) => state.currentDate);
  const setCurrentDate = useAppStore((state) => state.setCurrentDate);

  const today = useMemo(() => todayISO(), []);

  const goToday = useCallback(() => setCurrentDate(todayISO()), [setCurrentDate]);

  return {
    /** YYYY-MM-DD */
    date,
    /** 本地时区的今天 */
    today,
    isToday: isTodayISO(date),
    /** 2026年9月30日 周三 */
    label: formatChineseDate(date),
    /** 9月30日 */
    short: formatShortDate(date),
    setDate: setCurrentDate,
    goToday,
  };
}
