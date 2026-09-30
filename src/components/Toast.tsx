import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../utils/cn';

const ICONS = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
} as const;

const TONES = {
  info: 'text-brand-300',
  success: 'text-aqua-300',
  error: 'text-rose-300',
} as const;

export function ToastHost() {
  const toasts = useAppStore((state) => state.toasts);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="pointer-events-auto flex max-w-[88vw] items-center gap-2 rounded-chip border border-brand-400/15 bg-night-900/95 px-3.5 py-2.5 shadow-xl shadow-black/40 backdrop-blur-xl"
            >
              <Icon size={15} className={cn('shrink-0', TONES[toast.tone])} />
              <span className="text-xs font-medium text-slate-200">{toast.text}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
