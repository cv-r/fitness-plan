/**
 * 非流式的一次性 AI 请求。
 *
 * 聊天那条链路要边收边显示（见 hooks/useAiChat），
 * 而每日激励只要一小段文案，等完整结果更简单，所以单独放这里。
 */
import type { AiConfig } from './aiConfig';

export interface CompletionOptions {
  config: AiConfig;
  /** system 提示词，可省略 */
  system?: string;
  /** 本轮 user 内容 */
  user: string;
  signal?: AbortSignal;
  /** 限制生成长度，避免跑题跑很远 */
  maxTokens?: number;
}

interface CompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/** 调一次 /chat/completions，返回去掉首尾空白的正文 */
export async function requestCompletion({
  config,
  system,
  user,
  signal,
  maxTokens = 400,
}: CompletionOptions): Promise<string> {
  const apiKey = config.apiKey.trim();
  if (!apiKey) throw new Error('还没有配置 AI API Key');

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      stream: false,
      max_tokens: maxTokens,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`请求失败 ${response.status}${detail ? ` · ${detail.slice(0, 200)}` : ''}`);
  }

  const json = (await response.json()) as CompletionResponse;
  return json.choices?.[0]?.message?.content?.trim() ?? '';
}
