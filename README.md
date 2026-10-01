# 每日训练计划

移动端优先的健身打卡 PWA：4 分化训练待办与完成进度、每日体重、日历记录、多主题换肤、AI 教练。

- **技术栈**：React 19 · TypeScript · Vite · Tailwind CSS v4 · Zustand · Dexie(IndexedDB) · date-fns · framer-motion · lucide-react · react-markdown · vite-plugin-pwa
- **默认计划**：Day 1 胸·三头 / Day 2 背·二头 / Day 3 腿 / Day 4 肩·核心
- **关键重量**：杠铃平板卧推 70kg 5×8 · T 杠划船 50kg 4×10 · 杠铃深蹲 80kg 5×6
- **模型无关**：AI 接口按 OpenAI 兼容格式调用，Base URL 在设置页可改，模型在聊天框上方切换，换供应商不用动代码

---

## 快速开始

```bash
pnpm install                 # 用 npm / yarn 也行
cp .env.example .env.local   # 可选，见下方「AI Key」
pnpm dev                     # http://localhost:5173
```

其他脚本：

```bash
pnpm typecheck   # tsc --noEmit
pnpm build       # 类型检查 + 生产构建（含 PWA Service Worker）
pnpm preview     # 本地预览构建产物
node scripts/generate-icons.mjs   # 重新生成 PWA 图标
```

> 手机调试：`pnpm dev` 已开启 `host: true`，同一 Wi-Fi 下用手机访问终端里打印的 Network 地址即可。

---

## AI Key 怎么配

**推荐：在应用内填。** 点右上角 ⚙️ → 「AI 接入」→ 填入 API Key → 保存。

- Key 存在浏览器 **localStorage**（键名 `zr-fitness-plan::ai`），不会上传到任何服务器。
- 请求由浏览器直连 `https://api.deepseek.com/chat/completions`，流式输出。
- 设置页里还能改 Base URL；**模型在聊天框上方直接切换**，只能从内置列表（`MODEL_OPTIONS`）里选，不给手填。
- 注意：旧的 `deepseek-chat` / `deepseek-reasoner` 已于 2026-07-24 停用，现在默认 `deepseek-v4-flash`。存过旧模型名会自动回落到默认值。

**可选：环境变量兜底。** 复制 `.env.example` 为 `.env.local`：

```env
VITE_AI_API_KEY=sk-你的Key
VITE_AI_BASE_URL=https://api.deepseek.com
VITE_AI_MODEL=deepseek-v4-flash
```

优先级：**localStorage 里填的 > 环境变量 > 默认值**。设置页检测到环境变量 Key 时会显示「已从环境变量读取」。

> ⚠️ `VITE_` 前缀的变量会被打包进前端产物，浏览器里可见。本地自用没问题；**正式部署请改成后端代理转发**，不要把 Key 放进前端。
> `.env.local` 已在 `.gitignore` 中，不会被提交。

---

## 功能一览

| 模块 | 说明 |
| --- | --- |
| 顶部 Header | 哑铃 logo、标题（设置姓名后显示「XX，努力冲冲冲！」）、中文日期、日历/设置入口 |
| 激励语轮播 | 有 AI 每日激励时排在第一条，后面接 15 条本地文案池；上下翻滚轮播，起点由日期哈希决定，同一天顺序稳定 |
| AI 每日激励 | 配了 Key 时，每天首次打开自动把「昨天的训练 + 今天的安排 + 个人资料」发给 AI，生成一段动员文案并动画弹出，每天只弹一次 |
| 基础信息条 | 姓名 / 默认体重 / 默认身高（点进设置）+ **今日体重**就地编辑，自动保存到当天 |
| 主题切换 | 5 套深色主题（深海蓝 / 午夜紫 / 熔岩橙 / 森林绿 / 玫瑰红），设置页切换，存本机，立即生效不闪烁 |
| 训练日选择 | 4 个训练日按钮 + 「标记为休息日」 |
| 训练视图 | Day 标题、预计时长、热身说明、重选/重置、进度条、动作卡片列表 |
| 动作卡片 | 组数圆点打卡（点最后一个已点亮的圆点取消该组）、重量 `−/+`（按各自 `step` 步进）、手动输入、AI 动作指导、编辑/删除 |
| 休息日 | 休息提示 + 重选训练日 |
| 日历 | 月视图、上下月切换、今天描边、完成组数角标（如 23/32）、休息日显示「休」、有体重记录时右下角青色小圆点、点日期切换 |
| 设置 | 主题、姓名/性别/年龄/身高/体重/训练目标/训练经验、AI Key/Base URL、恢复默认训练计划、清空聊天记录 |
| 动作编辑 | 新增 / 修改 / 删除动作（名称、组数、次数、默认重量、步进、类型、提示），自定义动作标记 `isCustom` |
| AI 教练 | 左下角悬浮按钮 → 聊天抽屉，流式输出、可中断、可清空、记录持久化，自动携带今日训练上下文；输入框上方可切换模型 |
| AI 动作指导 | 动作卡片和热身卡片右上角的 ✨ → 底部升起独立面板，讲清动作要领；**不写进聊天记录**，按输入签名缓存，同一天重复点开不再请求 |
| Markdown | AI 回复按 Markdown 渲染（表格 / 列表 / 代码 / 引用等），用户自己的输入仍按纯文本显示 |
| 语音输入 | 聊天输入框的麦克风：调系统听写把语音转成文字再按文本发出去（模型本身不收音频），边听边出字 |
| 确认弹窗 | 全部为应用内自绘弹窗，不使用浏览器原生 `confirm` |
| Toast | 操作反馈，2.4 秒自动消失 |

### 交互细节

- **点圆点打卡**：点第 N 个圆点 = 已完成到第 N 组；再点一次当前最后一个已点亮的圆点 = 取消该组。
- **进度计算**：`完成组数 / 所有动作目标组数之和`。某个动作的完成组数会被裁剪到它的目标组数以内，所以调小组数不会算错。
- **重置本日**：所有重量回到模板默认值，完成组数清零（弹窗确认）。
- **重选训练日**：清空当天记录，回到选择界面（弹窗确认）。
- **删除动作**：从模板移除，并同步清理所有日期里该动作的完成记录（弹窗确认）。
- **恢复默认计划**：4 个训练日恢复成默认动作，自定义动作移除，已有记录按新模板重新对齐（弹窗确认）。
- **切换日期**：Header 日期随日历选择变化，训练区、体重输入、AI 上下文都会跟着切。

---

## 数据与持久化

`src/db/db.ts` 里定义了 6 张表：

```ts
db.version(1).stores({
  profile: 'id',                  // 单行，id = 'me'
  dayTemplates: 'id',             // 4 个训练日模板（含自定义动作）
  dayRecords: 'date',             // 每天的完成情况，主键 YYYY-MM-DD
  weights: 'date',                // 每天的体重
  chatMessages: 'id, createdAt',  // AI 对话，按时间排序
  settings: 'key',
});
```

- **IndexedDB 优先，localStorage 降级**：Dexie 抛错（Safari 无痕、浏览器禁用 IndexedDB）时自动整体降级到 localStorage，界面上会出现一条黄色提示，数据仍然保存在本机。
- 首次进入（或数据被清空）会自动写入默认计划。
- 记录不存动作的完整定义，只存 `{ exerciseId, weight, done }`；渲染时以模板为准合成，所以**新增动作会立刻出现在对应训练日**，被删除的动作也不会留下孤儿数据。

---

## 目录结构

```txt
zr-fitness-plan/
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts            # Tailwind v4 + PWA 插件配置
├─ .env.example              # AI 环境变量模板（复制成 .env.local）
├─ scripts/
│  └─ generate-icons.mjs     # 零依赖生成 PWA 图标 PNG
├─ public/
│  ├─ favicon.svg
│  ├─ favicon-32x32.png
│  ├─ apple-touch-icon.png
│  ├─ pwa-192x192.png
│  └─ pwa-512x512.png
└─ src/
   ├─ main.tsx
   ├─ App.tsx                # 布局 + 视图路由 + 各弹窗挂载
   ├─ index.css              # Tailwind v4 @theme 令牌 / 5 套主题变量 / 基础层 / 自定义 utility
   ├─ vite-env.d.ts
   ├─ types/index.ts         # 全部数据模型 + 资料可选项常量
   ├─ theme/themes.ts        # 主题元数据（名称/色板预览/主题色）+ 读写与应用
   ├─ db/db.ts               # Dexie 表定义 + localStorage 降级 + 读写仓储
   ├─ store/useAppStore.ts   # Zustand：资料/模板/记录/体重/聊天/主题/每日激励/UI/Toast + 纯函数
   ├─ data/
   │  ├─ defaultPlan.ts      # 默认 4 分化计划
   │  ├─ profile.ts          # 个人资料默认值 + 老数据归一化
   │  └─ motivations.ts      # 激励语池 + 按日期哈希挑选（单条 / 轮播）
   ├─ hooks/
   │  ├─ useLocalDate.ts     # 当前查看日期与格式化
   │  ├─ useAiChat.ts        # AI 流式请求 + 上下文注入
   │  ├─ useDailyTip.ts      # AI 每日激励：每天一次，失败下次重试
   │  ├─ useFormGuide.ts     # AI 动作指导：独立一次性会话，命中缓存即跳过
   │  └─ useSpeechInput.ts   # 语音输入：Web Speech API 封装（含最小类型声明）
   ├─ utils/
   │  ├─ cn.ts               # clsx + tailwind-merge
   │  ├─ date.ts             # date-fns 封装（本地时区安全）
   │  ├─ encode.ts           # uid / base64(UTF-8)
   │  ├─ aiConfig.ts         # 模型服务配置读写（localStorage + 环境变量兜底）
   │  ├─ aiContext.ts        # 拼给 AI 的上下文（资料 + 训练日摘要），聊天与每日激励共用
   │  ├─ aiRequest.ts        # 模型请求：流式（聊天/指导）与非流式（每日激励）
   │  ├─ formGuide.ts        # 动作指导的目标构造 + 按签名缓存
   │  └─ dailyTip.ts         # 每日激励的本地存储
   └─ components/
      ├─ Modal.tsx           # 通用弹窗外壳（底部升起 / 桌面居中）
      ├─ Header.tsx
      ├─ MotivationBar.tsx   # 激励语上下翻滚轮播
      ├─ ProfileStrip.tsx
      ├─ DaySelector.tsx
      ├─ TrainingDay.tsx
      ├─ ExerciseCard.tsx
      ├─ RestDay.tsx
      ├─ CalendarModal.tsx
      ├─ ConfirmModal.tsx
      ├─ DailyTipModal.tsx   # AI 每日激励弹出卡片
      ├─ FormGuideSheet.tsx  # AI 动作指导面板（底部升起）
      ├─ MarkdownMessage.tsx # Markdown 渲染 + 主题化各元素
      ├─ OptionChips.tsx     # 单选胶囊组（性别 / 目标 / 经验）
      ├─ SettingsModal.tsx
      ├─ ExerciseEditorModal.tsx
      ├─ AiChatDrawer.tsx
      ├─ AiFab.tsx
      └─ Toast.tsx
```

---

## 样式约定

- 冷色调暗色主题，默认主色 `#38bdf8`（brand）/ `#2dd4bf`（aqua），背景深蓝黑渐变。
- Tailwind v4 的 `@theme` 定义设计令牌，用 `bg-night-900`、`text-brand-400`、`rounded-card` 这类工具类引用。
- 自定义 utility：`pt-safe` / `pb-safe` / `px-safe` / `bottom-safe`（iPhone 安全区）、`glass`（玻璃拟态卡片）、`no-scrollbar`。
- 所有可点元素触控目标 ≥ 44px，按压有 `active:scale-*` 反馈。
- 375px 宽度优先，`max-w-md` 居中，桌面端也能正常看。
- 尊重 `prefers-reduced-motion`。

### 换肤怎么做的

工具类引用的是 `var(--color-*)`，所以换主题只需要覆盖同名 CSS 变量，**组件代码一行都不用改**：

- 默认值写在 `src/index.css` 的 `@theme` 里。
- 其余主题写在同文件的 `:root[data-theme='…']` 规则里（放在 `@layer base`，层序晚于 `theme` 层，稳定覆盖）。
- `src/theme/themes.ts` 负责 `data-theme` 的读写与 `<meta name="theme-color">` 同步，页面主体在 `main.tsx` 里挂载前先应用一次，避免首屏闪色。

**新增一套主题**：在 `index.css` 加一段 `:root[data-theme='xxx']`，再去 `themes.ts` 的 `THEMES` 补一条元数据即可。

## PWA

- `display: standalone`，`theme_color` / `background_color` 均为 `#040a14`。
- 图标为哑铃字形（`scripts/generate-icons.mjs` 生成）。字形是脚本里的 `GLYPH` 点阵（11×7，`#` 为实心），
  改配色改 `BRAND` / `AQUA`，改完记得同步 `public/favicon.svg` 里的矩形。
- Service Worker 缓存静态资源，离线可打开基础页面。
- iOS 加到主屏：Safari 分享 → 「添加到主屏幕」。

## 已知取舍

- 前端直连模型服务会暴露 Key，仅适合本地自用；正式环境请加后端代理。
- AI 上下文只带当前状态快照 + 最近 20 条消息，不做长期记忆。
- 日历角标显示的是「当天完成组数」，不是训练容量（kg）。
- AI 每日激励每天只请求一次，失败不落盘，下次打开应用才重试（不覆盖成半截结果）。
- 主题只做了深色多变体。要加真正的浅色主题，得先把 `text-slate-*` / `bg-night-*` 抽成语义令牌，改动面较大。
- 只换主题不改 `--color-night-*` 的语义，浅色模式下 `night-` 前缀会名不副实，加浅色主题时注意这点。
- 语音输入依赖浏览器自带的 Web Speech API：**需要 HTTPS 或 localhost**，否则报 `service-not-allowed`；
  iOS 上 `continuous` 支持差，所以配的是一次说一句（停顿即结束），不是持续听写。不支持的浏览器不显示麦克风。
