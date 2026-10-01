# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目背景与目标

给个人用的移动端优先健身打卡 PWA。核心诉求是「打开手机就能看到今天练什么、练到哪了」，
所以一切围绕 iPhone 单手操作设计：375px 宽度优先、`max-w-md` 居中、触控目标 ≥ 44px、
`env(safe-area-inset-*)` 适配刘海与home indicator。

功能面：4 分化训练计划打卡 → 每日体重 → 日历回看 → 多主题换肤 → AI 教练（聊天 + 每日激励）。
无后端、无账号，全部数据存在本机（IndexedDB / localStorage），AI Key 也只在浏览器里，
由浏览器直连所配置的模型服务。

技术栈：React 19 · TypeScript(strict) · Vite · Tailwind CSS v4 · Zustand · Dexie · framer-motion ·
date-fns · react-markdown · vite-plugin-pwa。

## 常用命令

```bash
pnpm dev            # 开发服务器（已开 host: true，同 Wi-Fi 可用手机访问 Network 地址）
pnpm typecheck      # tsc --noEmit —— 本仓库唯一的静态检查
pnpm build          # typecheck + 生产构建（含 PWA Service Worker）
pnpm preview        # 预览构建产物
node scripts/generate-icons.mjs   # 重新生成 PWA 图标 PNG
```

**没有配置 lint / formatter / 测试框架**（无 ESLint、Prettier、Vitest/Jest/Playwright）。
改完代码用 `pnpm typecheck` 兜底即可；不要假设存在 `pnpm test` 或 `pnpm lint`。

包管理器是 **pnpm**（`node_modules/.pnpm` 结构）。仓库里 `package-lock.json` 和 `pnpm-lock.yaml`
同时存在，是历史遗留；新增依赖请用 `pnpm add`，只更新 `pnpm-lock.yaml`。

## 架构：动代码前先理解这五件事

### 1. 模板 / 记录分离（本仓库最重要的设计）

计划与完成情况是两份数据，永远不要合并存储：

- **`DayTemplate`**（存在 `dayTemplates` 表）= 可编辑的计划。动作定义、组数、次数、默认重量、步进都在这。
- **`DayRecord`**（存在 `dayRecords` 表，主键是日期）= 某一天的实际完成。**只存 `{ exerciseId, weight, done }`**，
  不存动作的完整定义。

两者由 `store/useAppStore.ts` 的 `resolveExercises(template, record)` 合成，这是唯一的合成入口：

- 以**模板为准**排序和决定动作集合；
- 记录里缺失的动作（模板刚新增的）用模板默认值补齐；
- 记录里多余的动作（模板已删除的）直接忽略，不留孤儿数据。

由此推出几个必须遵守的行为：

- 改模板会立刻反映到**所有**已存在的日期，不需要迁移记录。
- 删动作要在 `deleteExercise` 里同步清理所有日期的记录；改动作要调 `pruneRecords` 把 `done`
  裁剪到新的组数以内（否则调小组数会算出 >100% 的进度）。
- 任何「按某人某天渲染动作列表」的地方都要走 `resolveExercises`，不要直接读 `record.exercises`。

### 2. 存储层：IndexedDB 优先，失败后整体降级

`db/db.ts` 所有读写函数都包在 `withDb(idbOp, fallbackOp)` 里，必须同时提供两条路径。
一旦 IndexedDB 抛错（Safari 无痕、被禁用），模块级 `degraded` 永久置 true，之后全部走
localStorage 的整份快照，不再重试。store 里的 `storageDegraded` 驱动 App 顶部的黄色横幅。

注意：

- 新增读写函数要**成对**实现两条路径，否则降级后功能会静默失效。
- 旧数据可能缺字段。`profile` 读取统一过 `data/profile.ts` 的 `normalizeProfile` 做补齐和边界校验，
  新增资料字段时记得同步它。
- 给 Dexie 加表/索引要升 `db.version(n).stores({...})`，并考虑老库的兼容。

### 3. 状态与弹窗

单个非切片的 Zustand store（`store/useAppStore.ts`）承载全部应用状态：资料、模板、记录、体重、聊天、
主题、每日激励、UI、Toast，外加 `resolveExercises` / `sumProgress` / `roundWeight` 这些纯函数。

- **弹窗可见性放 `state.ui.*`**。所有弹窗组件在 `App.tsx` 底部统一挂载，组件**自己**读 `ui.xxx`
  决定渲染与否，而不是由父组件传 `open` prop。加新弹窗照这个套路。
- 流式聊天高频更新走 `patchMessage`（只改内存），流结束后才用 `appendMessage` 落库。
  `appendMessage` 是 upsert 语义（同 id 覆盖）。
- 所有更新必须是不可变的（spread 出新对象），不要就地改 state。

### 4. AI 层

- `utils/aiContext.ts` 负责拼「用户资料 + 某天训练摘要」的上下文，**三个入口共用**。
  加新的用户字段时改 `profileLines`，几处同时生效。
- 请求实现统一在 `utils/aiRequest.ts`：`streamCompletion`（SSE 流式，聊天和动作指导共用）
  和 `requestCompletion`（非流式一次性，每日激励用）。
- 三个入口，各自一个 hook，都在 `App.tsx` 里调用：
  - `useAiChat` — 教练聊天，写进 `chatMessages`，有上下文历史。
  - `useDailyTip` — 每日激励，每天一次，写 localStorage。
  - `useFormGuide` — 动作指导，**独立一次性会话，不写 chatMessages**，按输入签名缓存在
    `utils/formGuide.ts`；动作定义改了签名就变，自动重新生成。
- 模型只能从 `aiConfig.ts` 的 `MODEL_OPTIONS` 里选（聊天框上方的胶囊），不提供手填入口；
  `normalizeModel` 会把存过的非法模型名回落到默认值——旧模型名是会 404 的。
  切换模型用 `updateAiConfig({ model })`。
- 接口按 OpenAI 兼容格式调用。**模型侧没有语音/ASR 能力**：DeepSeek 的 API 只吃文本，
  发音频会 413；官方 App 的语音输入用的也是手机系统听写，不是模型能力。
- 语音输入走浏览器自带的 Web Speech API（`hooks/useSpeechInput.ts`）：系统把语音转成文字 → 进输入框
  → 照常按文本发给模型。要点：需要 HTTPS/localhost，否则 `service-not-allowed`；
  配的是 `continuous: false`（iOS 对 continuous 支持差，一次说一句最稳）；
  该 hook 自带一份最小的 `SpeechRecognition` 类型声明，因为 TS 的 `lib.dom` 里还没有。
- **`store` 不能导入 `utils/aiContext`** —— aiContext 需要读 store，反向导入就成环。
  要在 store 里加需要 AI 上下文的逻辑，把它放到 hook 里（见 `hooks/useDailyTip.ts` 的拆分注释）。
- 每日激励的规则：每天最多生成/弹一次（按日期落盘在 `utils/dailyTip.ts`），失败**不落盘**，
  下次打开应用自动重试；没配 Key 时静默跳过。
- 模型无关：Base URL 和模型名都在设置页可改，代码里不要写死供应商名。

### 5. 换肤：只换 CSS 变量，不动组件

Tailwind 工具类引用的是 `var(--color-*)`，所以换主题只需覆盖同名 CSS 变量，**组件 className 一行都不用改**。

- 默认值（深海蓝）写在 `src/index.css` 的 `@theme` 里。
- 其余主题写在同文件的 `:root[data-theme='…']`，**必须放在 `@layer base`**——
  `@import 'tailwindcss'` 声明的层序是 `theme → base → components → utilities`，
  只有 base 层才压得住 `@theme` 定义的 `:root` 默认值。
- `theme/themes.ts` 管 `data-theme` 的读写和 `<meta name="theme-color">` 同步；
  `main.tsx` 在 React 挂载前先 `applyTheme(loadTheme())`，避免首屏闪一下默认配色。

**新增一套主题** = `index.css` 加一段 `:root[data-theme='xxx']` + `themes.ts` 的 `THEMES` 补一条元数据
（色板预览的色值要和 CSS 保持一致）。

## 约定与坑

- **日期一律走 `utils/date.ts`**。它是本地时区安全的封装；直接用 `toISOString()` 取日期会得到 UTC，
  在东八区会差一天（比如凌晨 8 点前显示成前一天）。新增日期计算优先看这里有没有现成的。
- `@/*` 路径别名在 `tsconfig.json` 里定义了，但**全仓库没有使用**，所有导入都是相对路径。
  新代码沿用相对路径，保持一致。
- `tsconfig` 开了 `noUnusedLocals` / `noUnusedParameters`，留未使用的变量会让 `pnpm typecheck` 失败。
- **图标字形有两处副本，必须手动保持一致**：`scripts/generate-icons.mjs` 里的 `GLYPH`
  （11×7 点阵，`#` 实心）和 `public/favicon.svg` 里对应的矩形。改完跑
  `node scripts/generate-icons.mjs` 重新生成 4 张 PNG，否则 SVG 与 PNG 会长得不一样。
- 前端直连模型服务意味着 Key 会打包进产物（`VITE_` 前缀变量在浏览器可见），
  这个项目定位是本地自用；正式部署需要改成后端代理。
- 主题只做了深色多变体。要加真正的浅色主题，得先把 `text-slate-*` / `bg-night-*` 抽成语义令牌，
  改动面很大（约 15 个文件、120+ 处 className），不是加一段 CSS 就能解决的。

## 文档

`README.md` 是面向使用者的完整说明（功能一览、交互细节、数据表结构、目录树、PWA 说明），
改动功能或目录结构时请一并同步它。
