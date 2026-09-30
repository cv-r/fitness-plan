import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { cn } from '../utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  /** 固定在面板底部的操作区，不随内容滚动 */
  footer?: ReactNode;
  className?: string;
  /** 面板最大高度类名 */
  heightClass?: string;
}

/** 移动端从底部升起、桌面端居中弹出的通用弹窗外壳 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className,
  heightClass = 'max-h-[88vh]',
}: ModalProps) {
  // 打开时锁定背景滚动
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative z-10 flex w-full flex-col overflow-hidden',
              'rounded-t-[24px] border border-brand-400/15 bg-night-900/95 shadow-2xl shadow-black/60 backdrop-blur-xl',
              'sm:max-w-md sm:rounded-[24px]',
              heightClass,
              className,
            )}
            initial={{ y: 48, opacity: 0, scale: 0.99 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 32, opacity: 0, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            {(title || subtitle) && (
              <header className="flex items-start gap-3 border-b border-brand-400/10 px-5 pt-5 pb-3">
                <div className="min-w-0 flex-1">
                  {title && <h2 className="truncate text-lg font-semibold text-slate-50">{title}</h2>}
                  {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="关闭"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-400 transition active:scale-90 hover:bg-white/5 hover:text-slate-200"
                >
                  <X size={20} />
                </button>
              </header>
            )}

            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

            {footer && (
              <footer className="border-t border-brand-400/10 bg-night-950/60 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
