/**
 * 主题系统：只切换 CSS 变量，不改任何组件样式。
 *
 * 各主题的调色板定义在 `src/index.css` 的 `:root[data-theme='…']` 规则里，
 * 工具类（`bg-night-900` / `text-brand-300` / `border-aqua-400`…）全都引用
 * `var(--color-*)`，所以切换 `data-theme` 就能整站换肤。
 *
 * 这里只放「UI 需要的元数据」：名称、描述、色板预览、浏览器主题色。
 * 色板预览的值需要和 index.css 保持一致，改动时两边一起改。
 */

export type ThemeId = 'abyss' | 'violet' | 'lava' | 'forest' | 'rose';

export interface ThemeOption {
  id: ThemeId;
  label: string;
  /** 设置页里的一句话说明 */
  hint: string;
  /** 预览色板：[背景, 主色, 辅色]，对应 index.css 里的 night-900 / brand-400 / aqua-400 */
  swatch: [string, string, string];
  /** 浏览器地址栏 / iOS 状态栏颜色，对应 night-950 */
  themeColor: string;
}

export const THEMES: ThemeOption[] = [
  {
    id: 'abyss',
    label: '深海蓝',
    hint: '默认冷色，天蓝配青绿',
    swatch: ['#061225', '#38bdf8', '#2dd4bf'],
    themeColor: '#040a14',
  },
  {
    id: 'violet',
    label: '午夜紫',
    hint: '静谧紫调，夜间不刺眼',
    swatch: ['#0d0a1c', '#a78bfa', '#e879f9'],
    themeColor: '#08060f',
  },
  {
    id: 'lava',
    label: '熔岩橙',
    hint: '暖色干劲，适合训练前',
    swatch: ['#1a0d06', '#fb923c', '#fbbf24'],
    themeColor: '#0f0805',
  },
  {
    id: 'forest',
    label: '森林绿',
    hint: '沉稳绿意，恢复日友好',
    swatch: ['#06180f', '#34d399', '#a3e635'],
    themeColor: '#030f0a',
  },
  {
    id: 'rose',
    label: '玫瑰红',
    hint: '高饱和红粉，冲击力强',
    swatch: ['#190a10', '#fb7185', '#f472b6'],
    themeColor: '#0f0508',
  },
];

export const DEFAULT_THEME: ThemeId = 'abyss';

const LS_KEY = 'zr-fitness-plan::theme';

const THEME_IDS = new Set<string>(THEMES.map((item) => item.id));

function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.has(value);
}

function themeById(id: ThemeId): ThemeOption {
  return THEMES.find((item) => item.id === id) ?? THEMES[0];
}

/** 读取本机保存的主题，非法或缺失时回落到默认主题 */
export function loadTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return isThemeId(raw) ? raw : DEFAULT_THEME;
  } catch {
    // 隐私模式下读不到，用默认主题即可
    return DEFAULT_THEME;
  }
}

function persistTheme(id: ThemeId): void {
  try {
    localStorage.setItem(LS_KEY, id);
  } catch {
    // 写不进去就只影响本次会话，忽略
  }
}

/** 把主题写到 <html data-theme> 并同步浏览器主题色 */
export function applyTheme(id: ThemeId): void {
  const theme = themeById(id);
  document.documentElement.dataset.theme = theme.id;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.themeColor);
}

/** 切换主题：落盘 + 立刻生效 */
export function setTheme(id: ThemeId): void {
  persistTheme(id);
  applyTheme(id);
}
