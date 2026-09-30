/**
 * 模型服务配置：以「设置页填写 + localStorage」为主，环境变量作为兜底。
 *
 * 优先级：localStorage 里用户填的值 > .env.local 里的 VITE_ 变量 > 默认值。
 * Key 只存在本机浏览器，由浏览器直连所配置的服务，不经过任何中间服务器。
 *
 * 接口按 OpenAI 兼容格式调用，所以 Base URL + 模型名都能在设置页改，
 * 换供应商不需要动代码，只改这两项即可。
 */

export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const LS_KEY = 'zr-fitness-plan::ai';

/** 默认指向 DeepSeek 的 OpenAI 兼容接口；可在设置页改成任意兼容服务 */
export const DEFAULT_BASE_URL = 'https://api.deepseek.com';
export const DEFAULT_MODEL = 'deepseek-chat';

/** 打包时注入的环境变量兜底值 */
const ENV_API_KEY = (import.meta.env.VITE_AI_API_KEY ?? '').trim();
const ENV_BASE_URL = (import.meta.env.VITE_AI_BASE_URL ?? '').trim();
const ENV_MODEL = (import.meta.env.VITE_AI_MODEL ?? '').trim();

/** 是否存在环境变量兜底的 Key（设置页据此给出提示） */
export function hasEnvApiKey(): boolean {
  return ENV_API_KEY.length > 0;
}

function normalizeBaseUrl(value: string): string {
  return (value.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function readStored(): Partial<AiConfig> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<AiConfig>;
    return {
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : undefined,
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : undefined,
      model: typeof parsed.model === 'string' ? parsed.model : undefined,
    };
  } catch {
    return {};
  }
}

/** 读取生效中的配置 */
export function loadAiConfig(): AiConfig {
  const stored = readStored();
  return {
    apiKey: (stored.apiKey ?? '').trim() || ENV_API_KEY,
    baseUrl: normalizeBaseUrl(stored.baseUrl ?? '') || normalizeBaseUrl(ENV_BASE_URL),
    model: (stored.model ?? '').trim() || ENV_MODEL || DEFAULT_MODEL,
  };
}

/** 写回 localStorage；apiKey 传空字符串表示「清除本地 Key」 */
export function persistAiConfig(config: AiConfig): void {
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        apiKey: config.apiKey.trim(),
        baseUrl: normalizeBaseUrl(config.baseUrl),
        model: config.model.trim() || DEFAULT_MODEL,
      }),
    );
  } catch {
    // 隐私模式下写不进去，忽略即可，本次会话仍可使用
  }
}

export function clearStoredAiConfig(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // 同上
  }
}
