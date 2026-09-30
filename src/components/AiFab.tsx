import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

/** 左下角 AI 悬浮按钮 · 避开 iPhone 安全区 */
export function AiFab() {
  const openAi = useAppStore((state) => state.openAi);
  const aiOpen = useAppStore((state) => state.ui.ai);

  if (aiOpen) return null;

  return (
    <motion.button
      type="button"
      onClick={openAi}
      aria-label="打开 DeepSeek 健身教练"
      initial={{ opacity: 0, scale: 0.8, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26, delay: 0.15 }}
      whileTap={{ scale: 0.9 }}
      className="bottom-safe px-safe fixed left-4 z-40 flex h-14 items-center gap-2 rounded-full bg-gradient-to-br from-brand-400 to-aqua-400 pr-4 pl-4 text-night-950 shadow-2xl shadow-brand-500/35"
    >
      <span className="relative grid place-items-center">
        <Sparkles size={20} />
        <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-white/40" />
      </span>
      <span className="text-xs font-bold">AI 教练</span>
    </motion.button>
  );
}
