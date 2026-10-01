import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { MarkdownMessage } from './MarkdownMessage';

/**
 * 动作指导面板。
 *
 * 从底部升起的独立一次性会话：内容来自 hooks/useFormGuide，
 * 不写进教练聊天记录，关掉即散，下次点开优先读缓存。
 */
export function FormGuideSheet() {
  const target = useAppStore((state) => state.formGuideTarget);
  const status = useAppStore((state) => state.formGuideStatus);
  const content = useAppStore((state) => state.formGuideContent);
  const retryFormGuide = useAppStore((state) => state.retryFormGuide);
  const closeFormGuide = useAppStore((state) => state.closeFormGuide);

  const open = target !== null;
  const streaming = status === 'loading';

  // 打开时锁定背景滚动 + 支持 Esc 关闭
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFormGuide();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, closeFormGuide]);

  return (
    <AnimatePresence>
      {open && target && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeFormGuide}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="动作指导"
            className="relative z-10 flex max-h-[78vh] w-full flex-col overflow-hidden rounded-t-[24px] border border-brand-400/15 bg-night-900/95 shadow-2xl shadow-black/60 backdrop-blur-xl sm:max-w-md sm:rounded-[24px]"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.6 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          >
            {/* 顶部：项目信息 */}
            <header className="flex items-start gap-2.5 border-b border-brand-400/10 px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-aqua-400 text-night-950">
                <Sparkles size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold text-slate-50">{target.title}</h2>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">{target.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={closeFormGuide}
                aria-label="关闭"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition active:scale-90 hover:bg-white/5 hover:text-slate-200"
              >
                <X size={17} />
              </button>
            </header>

            {/* 内容区：边收边显示 */}
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
              {!content && streaming && (
                <p className="flex items-center gap-2 text-xs text-slate-400">
                  <Sparkles size={14} className="animate-pulse text-brand-300" />
                  AI 正在整理动作要领…
                </p>
              )}

              {content && (
                <div className="text-[13px] leading-relaxed text-slate-200">
                  <MarkdownMessage content={content} />
                  {streaming && (
                    <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-aqua-400" />
                  )}
                </div>
              )}
            </div>

            <footer className="flex gap-2 border-t border-brand-400/10 bg-night-950/60 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={retryFormGuide}
                disabled={streaming}
                className="flex h-12 shrink-0 items-center gap-1.5 rounded-chip border border-white/8 bg-night-850/70 px-4 text-sm font-medium text-slate-300 transition active:scale-[0.98] hover:border-brand-400/30 disabled:opacity-40"
              >
                <RefreshCw size={15} />
                重新生成
              </button>
              <button
                type="button"
                onClick={closeFormGuide}
                className="h-12 flex-1 rounded-chip bg-gradient-to-r from-brand-400 to-aqua-400 text-sm font-semibold text-night-950 shadow-lg shadow-brand-500/20 transition active:scale-[0.98]"
              >
                知道了
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
