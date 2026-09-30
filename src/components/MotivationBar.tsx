import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { pickMotivationRotation } from '../data/motivations';
import { useLocalDate } from '../hooks/useLocalDate';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../utils/cn';
import { todayISO } from '../utils/date';

/** 每条停留时长 */
const ROTATE_MS = 4200;
/** 轮播几条本地激励语 */
const LOCAL_COUNT = 5;

interface Slide {
  text: string;
  /** 来自 AI 的那条，可以点开看全文 */
  isAi: boolean;
}

export function MotivationBar() {
  const { date } = useLocalDate();
  const dailyTip = useAppStore((state) => state.dailyTip);
  const openDailyTip = useAppStore((state) => state.openDailyTip);

  // AI 那条排最前，后面接本地激励语；本地顺序由日期决定，同一天不会乱跳
  const slides = useMemo<Slide[]>(() => {
    const local: Slide[] = pickMotivationRotation(date, LOCAL_COUNT).map((text) => ({
      text,
      isAi: false,
    }));
    // 只有「今天」的 AI 激励才参与轮播，翻到别的日期时自动隐藏
    if (dailyTip && dailyTip.date === todayISO()) {
      return [{ text: dailyTip.content, isAi: true }, ...local];
    }
    return local;
  }, [date, dailyTip]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setIndex((prev) => prev + 1), ROTATE_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  // 切换日期时重新从第一条开始
  useEffect(() => {
    setIndex(0);
  }, [date]);

  if (slides.length === 0) return null;

  const current = slides[index % slides.length];
  const canOpen = current.isAi;

  return (
    <div className="px-safe px-4 pt-3">
      <div className="mx-auto flex w-full max-w-md items-center gap-2.5 rounded-chip border border-brand-400/20 bg-gradient-to-r from-brand-500/20 via-brand-400/10 to-aqua-400/20 px-4 py-2.5">
        <Sparkles size={16} className="shrink-0 text-aqua-300" />

        {/* 固定高度 + overflow-hidden，让文字在条内上下翻滚 */}
        <div className="relative h-5 min-w-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={index}
              initial={{ y: '110%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-110%', opacity: 0 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              onClick={canOpen ? openDailyTip : undefined}
              role={canOpen ? 'button' : undefined}
              tabIndex={canOpen ? 0 : undefined}
              onKeyDown={
                canOpen
                  ? (event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      openDailyTip();
                    }
                  : undefined
              }
              className={cn(
                'truncate text-sm font-medium text-slate-100',
                canOpen && 'cursor-pointer hover:text-white',
              )}
            >
              {current.text}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
