import { motion } from 'framer-motion';
import { BedDouble, RefreshCw } from 'lucide-react';

interface RestDayProps {
  onReselect: () => void;
}

export function RestDay({ onReselect }: RestDayProps) {
  return (
    <section className="px-safe px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass mx-auto flex w-full max-w-md flex-col items-center rounded-card px-6 py-12 text-center"
      >
        <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-aqua-500/25 to-brand-500/20 text-aqua-300">
          <BedDouble size={30} />
        </div>

        <h2 className="mt-4 text-lg font-semibold text-slate-100">今天是休息日</h2>
        <p className="mt-2 max-w-[16rem] text-xs leading-relaxed text-slate-400">
          肌肉是在休息时长出来的。好好吃饭、睡够觉，明天继续冲。
        </p>

        <button
          type="button"
          onClick={onReselect}
          className="mt-6 flex items-center gap-2 rounded-chip border border-brand-400/25 bg-brand-500/10 px-4 py-3 text-sm font-medium text-brand-300 transition active:scale-95 hover:border-brand-400/50"
        >
          <RefreshCw size={15} />
          重选训练日
        </button>
      </motion.div>
    </section>
  );
}
