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

/**
 * 可选模型列表。设置页直接列出来点选，省得手打。
 *
 * 模型 ID 是服务商定义的字符串，这里只能照抄，所以必然带厂商名；
 * 界面上用 label 展示，不直接糊 ID 给用户。
 * 旧的 deepseek-chat / deepseek-reasoner 已于 2026-07-24 停用，换成会 404。
 *
 * 要接别的服务商（OpenAI / 通义 / Kimi…）：在设置页改 Base URL，
 * 再往下面这个数组里加一条即可。
 */
export interface ModelOption {
  id: string;
  label: string;
  hint: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  { id: 'deepseek-v4-flash', label: 'V4 Flash', hint: '快、便宜，日常问答够用' },
  { id: 'deepseek-v4-pro', label: 'V4 Pro', hint: '更强，复杂问题更稳' },
];

export const DEFAULT_MODEL = MODEL_OPTIONS[0].id;

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

/**
 * 模型只能从内置列表里选。
 * 存过旧模型名（比如已停用的 deepseek-chat）时静默回落到默认，
 * 否则会拿着一个必然 404 的模型名去请求。
 */
export function normalizeModel(value: string): string {
  const trimmed = value.trim();
  return MODEL_OPTIONS.some((item) => item.id === trimmed) ? trimmed : DEFAULT_MODEL;
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
    model: normalizeModel((stored.model ?? '').trim() || ENV_MODEL),
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
        model: normalizeModel(config.model),
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
