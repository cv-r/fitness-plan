import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { buildDailyTipPrompt, DAILY_TIP_SYSTEM_PROMPT } from '../utils/aiContext';
import { requestCompletion } from '../utils/aiRequest';
import { persistDailyTip } from '../utils/dailyTip';
import { todayISO } from '../utils/date';

/**
 * AI 每日激励：数据就绪后自动跑一次。
 *
 * 放在 hook 里而不是 store action，是因为 store 需要被 utils/aiContext 读取，
 * 反过来再让 store 导入 aiContext 就成环了（见 hooks/useAiChat 的同款拆分）。
 *
 * 规则：
 * - 今天已经生成过 -> 不请求、不弹窗（每天只弹一次）
 * - 没配 Key -> 静默跳过，不打扰
 * - 请求失败 -> 不落盘，下次打开应用自动重试
 */
export function useDailyTip(): void {
  const ready = useAppStore((state) => state.ready);

  useEffect(() => {
    if (!ready) return;

    const { dailyTip, dailyTipStatus, aiConfig, setDailyTip, openDailyTip } =
      useAppStore.getState();
    const today = todayISO();

    // 今天已经有结果了，或者上一次请求还没回来
    if (dailyTip?.date === today) return;
    if (dailyTipStatus === 'loading') return;
    if (!aiConfig.apiKey.trim()) return;

    setDailyTip(dailyTip, 'loading');

    // 故意不做 unmount 中断：请求很短，且状态落在 store（模块级单例）上，
    // 中断反而会在 StrictMode 的双次挂载下把唯一一次请求掐掉。
    void (async () => {
      try {
        const content = await requestCompletion({
          config: useAppStore.getState().aiConfig,
          system: DAILY_TIP_SYSTEM_PROMPT,
          user: buildDailyTipPrompt(),
          maxTokens: 400,
        });
        if (!content) throw new Error('AI 没有返回内容');

        const tip = { date: today, content };
        persistDailyTip(tip);
        useAppStore.getState().setDailyTip(tip, 'ready');
        openDailyTip();
      } catch (error) {
        // 不弹窗也不落盘：一次网络抖动不该被当成「今天的激励」
        console.warn('[dailyTip] 生成失败，下次打开会重试：', error);
        useAppStore.getState().setDailyTip(null, 'error');
      }
    })();
  }, [ready]);
}
