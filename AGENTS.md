# AGENTS.md

本文件用于约定本项目中 AI 编码助手需要遵守的项目规则与开发偏好。

## 项目技术栈

本项目主要使用以下技术栈：

- Bun
- Tauri 2
- React / TypeScript
- AI SDK
- AI Elements
- shadcn/ui
- Tailwind CSS
- Motion / Framer Motion

## 项目规则

### 1. 命令优先使用 Bun

在执行依赖安装、运行脚本、构建、开发服务等命令时，优先使用 Bun。

优先使用：

```bash
bun install
bun run dev
bun run build
bun run tauri
```

除非遇到 Bun 不兼容、项目脚本明确要求，或用户特别指定，否则不要主动切换到 npm / pnpm / yarn。

### 2. UI 优先使用 AI Elements 或 shadcn/ui 原生样式

实现界面、交互组件、聊天组件、模型选择器、输入框、弹窗等 UI 时，优先使用项目已有的 AI Elements 或 shadcn/ui 组件与样式体系。

优先级：

1. 已有的项目组件
2. AI Elements 组件
3. shadcn/ui 组件
4. 使用 Tailwind CSS 进行少量组合样式
5. 自定义复杂样式或新建组件

### 3. 动画优先使用 Motion

实现加载、过渡、进入/退出、状态反馈等动画时，优先使用项目已有的 Motion / Framer Motion。

优先使用：

```tsx
import { motion } from "framer-motion";
```

除非只是极简单的 CSS 状态或组件库自带动画，否则不要优先使用手写 CSS keyframes 或 Tailwind 动画类。
