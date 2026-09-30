import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../utils/cn';
import { Modal } from './Modal';

/** 通用确认弹窗 · 不依赖浏览器原生 confirm */
export function ConfirmModal() {
  const confirm = useAppStore((state) => state.ui.confirm);
  const closeConfirm = useAppStore((state) => state.closeConfirm);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!confirm) setBusy(false);
  }, [confirm]);

  const handleConfirm = async () => {
    if (!confirm || busy) return;
    setBusy(true);
    try {
      await confirm.onConfirm();
    } finally {
      setBusy(false);
      closeConfirm();
    }
  };

  return (
    <Modal
      open={confirm !== null}
      onClose={closeConfirm}
      title={confirm?.title ?? ''}
      heightClass="max-h-[70vh]"
      className="sm:max-w-sm"
      footer={
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={closeConfirm}
            className="h-12 flex-1 rounded-chip border border-white/8 bg-night-850/70 text-sm font-medium text-slate-300 transition active:scale-[0.97] hover:border-white/15"
          >
            {confirm?.cancelText ?? '取消'}
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={busy}
            className={cn(
              'h-12 flex-1 rounded-chip text-sm font-semibold transition active:scale-[0.97] disabled:opacity-60',
              confirm?.danger
                ? 'bg-gradient-to-r from-rose-500 to-rose-400 text-white shadow-lg shadow-rose-500/20'
                : 'bg-gradient-to-r from-brand-400 to-aqua-400 text-night-950 shadow-lg shadow-brand-500/20',
            )}
          >
            {busy ? '处理中…' : (confirm?.confirmText ?? '确定')}
          </button>
        </div>
      }
    >
      <div className="flex gap-3">
        <span
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-full',
            confirm?.danger ? 'bg-rose-500/15 text-rose-300' : 'bg-brand-500/15 text-brand-300',
          )}
        >
          <AlertTriangle size={18} />
        </span>
        <p className="pt-1 text-sm leading-relaxed text-slate-300">{confirm?.message}</p>
      </div>
    </Modal>
  );
}
