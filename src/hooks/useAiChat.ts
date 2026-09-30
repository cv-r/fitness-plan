import { useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { ChatMessage } from '../types';
import { buildChatContext } from '../utils/aiContext';
import { uid } from '../utils/encode';

const SYSTEM_PROMPT = '你是一位私人健身教练，回答要简洁、专业、可执行。';

/** 只保留最近 N 轮对话，避免上下文无限膨胀 */
const HISTORY_LIMIT = 20;

function toApiMessage(message: ChatMessage): { role: ChatMessage['role']; content: string } {
  return { role: message.role, content: message.content };
}

export interface AiChatController {
  /** 发送一条消息并流式接收回复 */
  send: (text: string) => Promise<void>;
  /** 中断当前流式请求 */
  abort: () => void;
  streaming: boolean;
  /** 是否已经配置 Key */
  configured: boolean;
}

export function useAiChat(): AiChatController {
  const streaming = useAppStore((state) => state.streaming);
  const configured = useAppStore((state) => state.aiConfig.apiKey.trim().length > 0);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    useAppStore.getState().setStreaming(false);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      const store = useAppStore.getState();
      if (!content || store.streaming) return;

      // 1. 先把用户消息落库
      await store.appendMessage({
        id: uid('msg-'),
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      });

      const { apiKey, baseUrl, model } = useAppStore.getState().aiConfig;
      if (!apiKey.trim()) {
        await useAppStore.getState().appendMessage({
          id: uid('msg-'),
          role: 'assistant',
          content: '还没有配置 API Key。点右上角「设置」→「AI 模型」填入 Key，就能开始聊了。',
          createdAt: new Date().toISOString(),
        });
        return;
      }

      // 2. 占位一条 assistant 消息，边收边改
      const assistantId = uid('msg-');
      await useAppStore.getState().appendMessage({
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      });

      const history = useAppStore
        .getState()
        .chatMessages.filter((item) => item.id !== assistantId && item.content.trim().length > 0)
        .slice(-HISTORY_LIMIT)
        .map(toApiMessage);

      const controller = new AbortController();
      abortRef.current = controller;
      useAppStore.getState().setStreaming(true);

      let buffer = '';
      let scheduled = false;
      const flush = () => {
        scheduled = false;
        useAppStore.getState().patchMessage(assistantId, { content: buffer });
      };
      const appendDelta = (delta: string) => {
        buffer += delta;
        if (!scheduled) {
          scheduled = true;
          requestAnimationFrame(flush);
        }
      };

      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            model,
            stream: true,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'system', content: buildChatContext() },
              ...history,
            ],
          }),
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => '');
          throw new Error(`请求失败 ${response.status}${detail ? ` · ${detail.slice(0, 200)}` : ''}`);
        }
        if (!response.body) throw new Error('当前浏览器不支持流式响应');

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let pending = '';
        let done = false;

        while (!done) {
          const chunk = await reader.read();
          if (chunk.done) break;
          pending += decoder.decode(chunk.value, { stream: true });

          const lines = pending.split('\n');
          pending = lines.pop() ?? '';

          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') {
              done = true;
              break;
            }
            try {
              const json = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) appendDelta(delta);
            } catch {
              // 半截 JSON，等下一片
            }
          }
        }
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === 'AbortError';
        const message = aborted
          ? '（已中断）'
          : `出错了：${error instanceof Error ? error.message : String(error)}`;
        buffer = buffer ? `${buffer}\n\n${message}` : message;
      } finally {
        abortRef.current = null;
        const finalContent = buffer.trim() || '（没有收到回复，请检查 Key 或网络后重试）';
        const store2 = useAppStore.getState();
        store2.patchMessage(assistantId, { content: finalContent });
        store2.setStreaming(false);
        // appendMessage 是 upsert，这里把最终的完整内容落库
        await store2.appendMessage({
          id: assistantId,
          role: 'assistant',
          content: finalContent,
          createdAt: new Date().toISOString(),
        });
      }
    },
    [],
  );

  return { send, abort, streaming, configured };
}

/** 供 AI 抽屉在无 Key 时展示的引导文案 */
export const AI_SETUP_HINT = `还没有配置 API Key。

1. 点右上角「设置」
2. 找到「AI 模型」分组
3. 填入你的 Key（存本机 localStorage，不会上传）
4. 保存后就能开始聊了

也可以直接问我训练安排，比如「今天卧推该加重量吗」。`;
