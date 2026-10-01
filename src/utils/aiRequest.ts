/**
 * 模型请求封装。接口按 OpenAI 兼容格式调用。
 *
 * - `requestCompletion`：一次性非流式，适合每日激励这种短文案
 * - `streamCompletion`：SSE 流式，聊天和动作指导共用这一份解析实现
 */
import type { AiConfig } from './aiConfig';

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function authHeaders(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
}

/** 非 2xx 时抛出带响应片段可读错误 */
async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  const detail = await response.text().catch(() => '');
  throw new Error(`请求失败 ${response.status}${detail ? ` · ${detail.slice(0, 200)}` : ''}`);
}

/** 取出生效的 Key，没配就抛错，避免两个入口各写一遍判断 */
function requireApiKey(config: AiConfig): string {
  const apiKey = config.apiKey.trim();
  if (!apiKey) throw new Error('还没有配置 API Key');
  return apiKey;
}

/* ------------------------------------------------------------------ */
/* 非流式                                                              */
/* ------------------------------------------------------------------ */

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
  const apiKey = requireApiKey(config);

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    signal,
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      model: config.model,
      stream: false,
      max_tokens: maxTokens,
      messages: [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: user }],
    }),
  });

  await ensureOk(response);
  const json = (await response.json()) as CompletionResponse;
  return json.choices?.[0]?.message?.content?.trim() ?? '';
}

/* ------------------------------------------------------------------ */
/* 流式                                                                */
/* ------------------------------------------------------------------ */

export interface StreamOptions {
  config: AiConfig;
  /** 完整消息列表（含 system） */
  messages: ChatTurn[];
  /** 每收到一段增量回调一次 */
  onDelta: (delta: string) => void;
  signal?: AbortSignal;
}

/**
 * 流式调用，返回完整正文。
 *
 * 中途出错会抛出，但已经收到的增量已经通过 onDelta 交给调用方了，
 * 所以调用方自己累积的那份 buffer 仍然保留着半截内容。
 */
export async function streamCompletion({
  config,
  messages,
  onDelta,
  signal,
}: StreamOptions): Promise<string> {
  const apiKey = requireApiKey(config);

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    signal,
    headers: authHeaders(apiKey),
    body: JSON.stringify({ model: config.model, stream: true, messages }),
  });

  await ensureOk(response);
  if (!response.body) throw new Error('当前浏览器不支持流式响应');

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let pending = '';
  let buffer = '';
  let done = false;

  while (!done) {
    const chunk = await reader.read();
    if (chunk.done) break;
    pending += decoder.decode(chunk.value, { stream: true });

    // SSE 以行为单位，最后一段可能是半行，留给下一次
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
        if (delta) {
          buffer += delta;
          onDelta(delta);
        }
      } catch {
        // 半截 JSON，等下一片
      }
    }
  }

  return buffer;
}
