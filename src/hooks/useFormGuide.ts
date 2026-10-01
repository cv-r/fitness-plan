import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { buildFormGuidePrompt, FORM_GUIDE_SYSTEM_PROMPT } from '../utils/aiContext';
import { streamCompletion } from '../utils/aiRequest';
import { writeFormGuide } from '../utils/formGuide';

/**
 * 动作指导的请求流程。和 useDailyTip 一样放在 hook 里，
 * 避免 store 直接导入 utils/aiContext 造成循环依赖。
 *
 * 触发条件是 formGuideTarget / formGuideNonce 变化：
 * - openFormGuide 命中缓存时状态已经是 ready，这里直接跳过
 * - 关掉面板会 abort 掉在飞的请求，不会留下半截内容
 */
export function useFormGuide(): void {
  const target = useAppStore((state) => state.formGuideTarget);
  const nonce = useAppStore((state) => state.formGuideNonce);

  useEffect(() => {
    if (!target) return;

    const state = useAppStore.getState();
    // 缓存命中，或者上一个请求还没回来
    if (state.formGuideStatus !== 'idle') return;

    if (!state.aiConfig.apiKey.trim()) {
      state.setFormGuide({
        status: 'error',
        content: '还没有配置 API Key。点右上角「设置」→「AI 接入」填入后就能用了。',
      });
      return;
    }

    const controller = new AbortController();
    state.setFormGuide({ status: 'loading', content: '' });

    let buffer = '';
    let rafId = 0;
    const flush = () => {
      rafId = 0;
      useAppStore.getState().setFormGuide({ content: buffer });
    };

    void (async () => {
      try {
        await streamCompletion({
          config: useAppStore.getState().aiConfig,
          signal: controller.signal,
          messages: [
            { role: 'system', content: FORM_GUIDE_SYSTEM_PROMPT },
            { role: 'user', content: buildFormGuidePrompt(target) },
          ],
          onDelta: (delta) => {
            buffer += delta;
            if (!rafId) rafId = requestAnimationFrame(flush);
          },
        });

        const text = buffer.trim();
        if (!text) throw new Error('没有收到内容');

        useAppStore.getState().setFormGuide({ status: 'ready', content: text });
        writeFormGuide(target.key, { sig: target.sig, content: text });
      } catch (error) {
        // 用户关掉面板 / 换了项目导致的主动中断，状态已经被重置，不要再写回去
        if (error instanceof DOMException && error.name === 'AbortError') return;

        const reason = error instanceof Error ? error.message : String(error);
        const partial = buffer.trim();
        useAppStore.getState().setFormGuide({
          status: 'error',
          content: partial ? `${partial}\n\n---\n\n出错了：${reason}` : `出错了：${reason}`,
        });
      }
    })();

    return () => {
      controller.abort();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [target, nonce]);
}
