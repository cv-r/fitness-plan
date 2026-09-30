import { AnimatePresence, motion } from 'framer-motion';
import { Flame, X } from 'lucide-react';
import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatChineseDate } from '../utils/date';

/**
 * AI 每日激励弹窗。
 *
 * 只负责「展示已生成好的那条」——请求本身在 hooks/useDailyTip 里，
 * 生成成功才会打开，所以这里没有 loading 态。
 */
export function DailyTipModal() {
  const open = useAppStore((state) => state.ui.dailyTip);
  const tip = useAppStore((state) => state.dailyTip);
  const closeDailyTip = useAppStore((state) => state.closeDailyTip);

  // 打开时锁定背景滚动 + 支持 Esc 关闭
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDailyTip();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, closeDailyTip]);

  return (
    <AnimatePresence>
      {open && tip && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-5">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeDailyTip}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="今日动员"
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-[24px] border border-brand-400/25 bg-night-900/95 p-5 text-center shadow-2xl shadow-black/70 backdrop-blur-xl"
            initial={{ opacity: 0, y: 28, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            {/* 顶部光晕，让卡片有「亮起来」的观感 */}
            <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-brand-400/25 blur-3xl" />

            <button
              type="button"
              onClick={closeDailyTip}
              aria-label="关闭"
              className="absolute top-2.5 right-2.5 grid h-9 w-9 place-items-center rounded-full text-slate-500 transition active:scale-90 hover:bg-white/5 hover:text-slate-300"
            >
              <X size={16} />
            </button>

            <div className="relative">
              <motion.span
                className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-aqua-400 text-night-950 shadow-lg shadow-brand-500/30"
                initial={{ scale: 0.5, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 14, delay: 0.08 }}
              >
                <Flame size={26} />
              </motion.span>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16, duration: 0.32 }}
              >
                <h2 className="mt-3 text-base font-semibold text-slate-50">今日动员</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {formatChineseDate(tip.date)} · AI 教练
                </p>

                <p className="mt-4 text-left text-[13px] leading-relaxed whitespace-pre-wrap text-slate-200">
                  {tip.content}
                </p>
              </motion.div>

              <motion.button
                type="button"
                onClick={closeDailyTip}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.32 }}
                className="mt-5 h-12 w-full rounded-chip bg-gradient-to-r from-brand-400 to-aqua-400 text-sm font-semibold text-night-950 shadow-lg shadow-brand-500/20 transition active:scale-[0.98]"
              >
                开练
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
