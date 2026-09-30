# 张瑞的每日训练计划

移动端优先的健身打卡 PWA：4 分化训练待办与完成进度、每日体重、日历记录、DeepSeek AI 教练。

- **技术栈**：React 19 · TypeScript · Vite · Tailwind CSS v4 · Zustand · Dexie(IndexedDB) · date-fns · framer-motion · lucide-react · vite-plugin-pwa
- **默认计划**：Day 1 胸·三头 / Day 2 背·二头 / Day 3 腿 / Day 4 肩·核心
- **关键重量**：杠铃平板卧推 70kg 5×8 · T 杠划船 50kg 4×10 · 杠铃深蹲 80kg 5×6

---

## 快速开始

```bash
npm install
cp .env.example .env.local   # 可选，见下方「DeepSeek Key」
npm run dev                  # http://localhost:5173
```

其他脚本：

```bash
npm run typecheck   # tsc --noEmit
npm run build       # 类型检查 + 生产构建（含 PWA Service Worker）
npm run preview     # 本地预览构建产物
node scripts/generate-icons.mjs   # 重新生成 PWA 图标
```

> 手机调试：`npm run dev` 已开启 `host: true`，同一 Wi-Fi 下用手机访问终端里打印的 Network 地址即可。

---

## DeepSeek Key 怎么配

**推荐：在应用内填。** 点右上角 ⚙️ → 「DeepSeek AI」→ 填入 API Key → 保存。

- Key 存在浏览器 **localStorage**（键名 `zr-fitness-plan::deepseek`），不会上传到任何服务器。
- 请求由浏览器直连 `https://api.deepseek.com/chat/completions`，流式输出。
- 同一页里还能改 Base URL 和模型名（默认 `deepseek-chat`）。

**可选：环境变量兜底。** 复制 `.env.example` 为 `.env.local`：

```env
VITE_DEEPSEEK_API_KEY=sk-你的Key
VITE_DEEPSEEK_BASE_URL=https://api.deepseek.com
VITE_DEEPSEEK_MODEL=deepseek-chat
```

优先级：**localStorage 里填的 > 环境变量 > 默认值**。设置页检测到环境变量 Key 时会显示「已从环境变量读取」。

> ⚠️ `VITE_` 前缀的变量会被打包进前端产物，浏览器里可见。本地自用没问题；**正式部署请改成后端代理转发**，不要把 Key 放进前端。
> `.env.local` 已在 `.gitignore` 中，不会被提交。

---

## 功能一览

| 模块 | 说明 |
| --- | --- |
| 顶部 Header | ZR logo、标题（设置姓名后显示「XX，努力冲冲冲！」）、中文日期、日历/设置入口 |
| 激励语 | 15 条文案池，按日期哈希固定，同一天刷新不变 |
| 基础信息条 | 姓名 / 默认体重 / 默认身高（点进设置）+ **今日体重**就地编辑，自动保存到当天 |
| 训练日选择 | 4 个训练日按钮 + 「标记为休息日」 |
| 训练视图 | Day 标题、预计时长、热身说明、重选/重置、进度条、动作卡片列表 |
| 动作卡片 | 组数圆点打卡（点最后一个已点亮的圆点取消该组）、重量 `−/+`（按各自 `step` 步进）、手动输入、编辑/删除 |
| 休息日 | 休息提示 + 重选训练日 |
| 日历 | 月视图、上下月切换、今天描边、完成组数角标（如 23/32）、休息日显示「休」、有体重记录时右下角青色小圆点、点日期切换 |
| 设置 | 姓名、默认体重、默认身高、DeepSeek Key/Base URL/模型、恢复默认训练计划、清空聊天记录 |
| 动作编辑 | 新增 / 修改 / 删除动作（名称、组数、次数、默认重量、步进、类型、提示），自定义动作标记 `isCustom` |
| AI 教练 | 左下角悬浮按钮 → 聊天抽屉，流式输出、可中断、可清空、记录持久化，自动携带今日训练上下文 |
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
├─ .env.example              # DeepSeek 环境变量模板（复制成 .env.local）
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
   ├─ index.css              # Tailwind v4 @theme 令牌 / 基础层 / 自定义 utility
   ├─ vite-env.d.ts
   ├─ types/index.ts         # 全部数据模型
   ├─ db/db.ts               # Dexie 表定义 + localStorage 降级 + 读写仓储
   ├─ store/useAppStore.ts   # Zustand：资料/模板/记录/体重/聊天/UI/Toast + 纯函数
   ├─ data/
   │  ├─ defaultPlan.ts      # 默认 4 分化计划
   │  └─ motivations.ts      # 激励语池 + 按日期哈希挑选
   ├─ hooks/
   │  ├─ useLocalDate.ts     # 当前查看日期与格式化
   │  └─ useDeepSeek.ts      # DeepSeek 流式请求 + 上下文注入
   ├─ utils/
   │  ├─ cn.ts               # clsx + tailwind-merge
   │  ├─ date.ts             # date-fns 封装（本地时区安全）
   │  ├─ encode.ts           # uid / base64(UTF-8)
   │  └─ aiConfig.ts         # DeepSeek 配置读写（localStorage + 环境变量兜底）
   └─ components/
      ├─ Modal.tsx           # 通用弹窗外壳（底部升起 / 桌面居中）
      ├─ Header.tsx
      ├─ MotivationBar.tsx
      ├─ ProfileStrip.tsx
      ├─ DaySelector.tsx
      ├─ TrainingDay.tsx
      ├─ ExerciseCard.tsx
      ├─ RestDay.tsx
      ├─ CalendarModal.tsx
      ├─ ConfirmModal.tsx
      ├─ SettingsModal.tsx
      ├─ ExerciseEditorModal.tsx
      ├─ AiChatDrawer.tsx
      ├─ AiFab.tsx
      └─ Toast.tsx
```

---

## 样式约定

- 冷色调暗色主题，主色 `#38bdf8`（brand）/ `#2dd4bf`（aqua），背景深蓝黑渐变。
- Tailwind v4 的 `@theme` 定义设计令牌，用 `bg-night-900`、`text-brand-400`、`rounded-card` 这类工具类引用。
- 自定义 utility：`pt-safe` / `pb-safe` / `px-safe` / `bottom-safe`（iPhone 安全区）、`glass`（玻璃拟态卡片）、`no-scrollbar`。
- 所有可点元素触控目标 ≥ 44px，按压有 `active:scale-*` 反馈。
- 375px 宽度优先，`max-w-md` 居中，桌面端也能正常看。
- 尊重 `prefers-reduced-motion`。

## PWA

- `display: standalone`，`theme_color` / `background_color` 均为 `#040a14`。
- 图标为 ZR 字样（`scripts/generate-icons.mjs` 生成，改配色改脚本里的 `BRAND` / `AQUA` 常量即可）。
- Service Worker 缓存静态资源，离线可打开基础页面。
- iOS 加到主屏：Safari 分享 → 「添加到主屏幕」。

## 已知取舍

- 前端直连 DeepSeek 会暴露 Key，仅适合本地自用；正式环境请加后端代理。
- AI 上下文只带当前状态快照 + 最近 20 条消息，不做长期记忆。
- 日历角标显示的是「当天完成组数」，不是训练容量（kg）。
