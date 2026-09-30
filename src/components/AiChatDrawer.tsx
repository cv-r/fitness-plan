import { AnimatePresence, motion } from 'framer-motion';
import { Bot, SendHorizontal, Settings2, Square, Trash2, User, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AI_SETUP_HINT, useDeepSeek } from '../hooks/useDeepSeek';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../utils/cn';

const QUICK_PROMPTS = [
  '今天卧推该加重量吗？',
  '帮我看看今天还剩哪些没练',
  '深蹲卡在 80kg 很久了，怎么突破？',
  '练完腿之后第二天很酸，还能练吗？',
];

export function AiChatDrawer() {
  const open = useAppStore((state) => state.ui.ai);
  const closeAi = useAppStore((state) => state.closeAi);
  const openSettings = useAppStore((state) => state.openSettings);
  const openConfirm = useAppStore((state) => state.openConfirm);
  const clearChat = useAppStore((state) => state.clearChat);
  const messages = useAppStore((state) => state.chatMessages);

  const { send, abort, streaming, configured } = useDeepSeek();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const lastContent = messages.length > 0 ? messages[messages.length - 1].content : '';

  // 新消息 / 流式增量时自动滚到底部
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages.length, lastContent, open]);

  // 打开时锁定背景滚动
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const visible = useMemo(() => messages.filter((item) => item.content.trim().length > 0), [messages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || streaming) return;
    setDraft('');
    await send(text);
  };

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
            onClick={closeAi}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="DeepSeek 健身教练"
            className="relative z-10 flex h-[88vh] w-full flex-col overflow-hidden rounded-t-[24px] border border-brand-400/15 bg-night-900/95 shadow-2xl shadow-black/60 backdrop-blur-xl sm:h-[80vh] sm:max-w-md sm:rounded-[24px]"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.6 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          >
            {/* 顶部 */}
            <header className="flex items-center gap-2.5 border-b border-brand-400/10 px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-aqua-400 text-night-950">
                <Bot size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold text-slate-50">DeepSeek 健身教练</h2>
                <p className="truncate text-[11px] text-slate-500">
                  {configured ? '已就绪 · 回答简洁专业可执行' : '未配置 API Key'}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  openConfirm({
                    title: '清空聊天记录',
                    message: '会删除与 DeepSeek 教练的全部历史对话，训练数据不受影响。',
                    confirmText: '清空',
                    danger: true,
                    onConfirm: clearChat,
                  })
                }
                disabled={messages.length === 0}
                aria-label="清空聊天记录"
                className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition active:scale-90 hover:bg-white/5 hover:text-rose-300 disabled:opacity-35"
              >
                <Trash2 size={16} />
              </button>

              <button
                type="button"
                onClick={closeAi}
                aria-label="关闭"
                className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 transition active:scale-90 hover:bg-white/5 hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </header>

            {/* 消息区 */}
            <div ref={scrollRef} className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {visible.length === 0 && (
                <div className="glass rounded-card p-4">
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
                    {configured
                      ? '我是你的私人健身教练。可以问我训练安排、重量选择、动作细节或者恢复问题。'
                      : AI_SETUP_HINT}
                  </p>
                  {!configured && (
                    <button
                      type="button"
                      onClick={openSettings}
                      className="mt-3 flex h-11 items-center gap-2 rounded-chip border border-brand-400/25 bg-brand-500/10 px-3.5 text-xs font-medium text-brand-300 transition active:scale-95"
                    >
                      <Settings2 size={14} />
                      去设置里填 Key
                    </button>
                  )}
                </div>
              )}

              {visible.map((message) => {
                const isUser = message.role === 'user';
                const isStreamingHere =
                  streaming && message.id === messages[messages.length - 1]?.id && !isUser;

                return (
                  <div
                    key={message.id}
                    className={cn('flex items-end gap-2', isUser ? 'justify-end' : 'justify-start')}
                  >
                    {!isUser && (
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-aqua-400 text-night-950">
                        <Bot size={14} />
                      </span>
                    )}

                    <div
                      className={cn(
                        'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap',
                        isUser
                          ? 'rounded-br-sm bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/20'
                          : 'rounded-bl-sm border border-brand-400/12 bg-night-850/80 text-slate-200',
                      )}
                    >
                      {message.content}
                      {isStreamingHere && (
                        <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-aqua-400" />
                      )}
                    </div>

                    {isUser && (
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/8 text-slate-400">
                        <User size={14} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 输入区 */}
            <div className="border-t border-brand-400/10 bg-night-950/60 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              {messages.length === 0 && configured && (
                <div className="no-scrollbar mb-2.5 flex gap-2 overflow-x-auto">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void send(prompt)}
                      className="shrink-0 rounded-full border border-brand-400/20 bg-brand-500/8 px-3 py-2 text-[11px] font-medium text-brand-300 transition active:scale-95"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  rows={1}
                  placeholder={configured ? '问点什么…' : '先配置 API Key'}
                  className="no-scrollbar max-h-28 min-h-12 flex-1 resize-none rounded-2xl border border-brand-400/15 bg-night-900/80 px-3.5 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-brand-400/55"
                />

                {streaming ? (
                  <button
                    type="button"
                    onClick={abort}
                    aria-label="停止生成"
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-night-850/80 text-slate-300 transition active:scale-90"
                  >
                    <Square size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={draft.trim() === ''}
                    aria-label="发送"
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-aqua-400 text-night-950 shadow-lg shadow-brand-500/25 transition active:scale-90 disabled:opacity-40 disabled:shadow-none"
                  >
                    <SendHorizontal size={18} />
                  </button>
                )}
              </div>

              <p className="mt-2 text-center text-[10px] text-slate-600">
                Key 仅存本机 localStorage · 回复由 DeepSeek 生成，仅供参考
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
