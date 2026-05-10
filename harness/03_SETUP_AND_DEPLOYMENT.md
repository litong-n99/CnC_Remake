# 环境搭建、CI/CD 与 部署指南

> **目标**：一份可复制的操作手册，从 0 到 GitHub Pages 自动发布。  
> **技术栈**：Vite + TypeScript + Babylon.js + GitHub Actions。

---

## 1. 本地开发环境初始化

### 1.1 创建项目

```bash
# 使用 Vite 官方模板
npm create vite@latest CnC_Remake -- --template vanilla-ts

# 进入项目
cd CnC_Remake

# 安装核心依赖
npm install @babylonjs/core @babylonjs/gui @babylonjs/loaders

# 安装开发依赖
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier eslint-plugin-prettier vite-plugin-checker

# 初始化 Git
git init
git add .
git commit -m "init: vite + ts + babylonjs"
```

### 1.2 关键配置文件

#### `vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';

export default defineConfig({
  base: '/CnC_Remake/',  // ⚠️ 必须与仓库名一致，适配 GitHub Pages
  plugins: [
    checker({ typescript: true })   // 开发时实时类型检查，不阻断页面
  ],
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  server: {
    port: 3000,
    open: true
  }
});
```

#### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@core/*": ["src/core/*"],
      "@game/*": ["src/game/*"],
      "@renderer/*": ["src/renderer/*"]
    }
  },
  "include": ["src"]
}
```

#### `package.json`（关键 scripts）
```json
{
  "name": "cnc-remastered-web3d",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "preview": "vite preview"
  }
}
```

> **注意**：日常开发只需运行 `npm run dev` + `npm run type-check`。`build` 仅在 CI/CD 中自动执行。

---

## 2. GitHub Actions CI/CD 脚本

### 2.1 CI 工作流：类型检查与 Lint（`.github/workflows/ci.yml`）

```yaml
name: CI

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

jobs:
  type-check-and-lint:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: remake
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: remake/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Type Check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Build Test
        run: npm run build
```

### 2.2 CD 工作流：自动部署到 GitHub Pages（`.github/workflows/deploy.yml`）

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: remake
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: remake/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './remake/dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 2.3 GitHub 仓库设置步骤

1. 在 GitHub 创建仓库 `CnC_Remake`（**必须**与 `vite.config.ts` 中的 `base` 一致）
2. **Settings → Pages → Build and deployment**：
   - Source: **GitHub Actions**
3. **Settings → Branches**：
   - 添加规则保护 `main`：要求 PR + CI 通过 + 1 review
4. 推送代码到 `main`，Actions 自动运行，约 2 分钟后上线

---

## 3. 开发工作流约定

### 3.1 分支策略

```
main        ← 仅接受 PR，自动部署到 GitHub Pages
  ↑
dev         ← 日常开发分支
  ↑
feature/xx  ← 单个 Task 分支（如 feature/task-09-terrain-grid）
```

### 3.2 提交规范（Commit Message）

```
feat(task-09): 地形网格系统基础实现
type(task-11): 修复 Rules 模块中坦克血量类型错误
docs(harness): 更新任务分解表，标记 task-1 完成
asset(resource): 添加 u_mtank.glb 真实模型，替换 Dummy
```

### 3.3 日常开发命令

```bash
# 启动开发服务器（带实时类型检查）
npm run dev

# 在另一个终端检查类型（随时手动执行）
npm run type-check

# 自动修复格式
npm run lint:fix

# 本地预览生产构建（Task 35 前使用）
npm run build
npm run preview
```

---

## 4. 项目目录结构（最终版）

```
CnC_Remake/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── public/
│   ├── assets/
│   │   ├── units/           ← GLB 模型（Dummy → 真实）
│   │   ├── buildings/       ← GLB 模型
│   │   ├── terrain/         ← 纹理与地形装饰
│   │   ├── textures/        ← 材质纹理
│   │   ├── audio/           ← 音效与音乐
│   │   ├── ui/              ← UI 图片、光标、图标
│   │   └── fonts/           ← 字体文件
│   └── maps/                ← JSON 地图数据
├── src/
│   ├── core/                ← 引擎封装、输入、相机、音频
│   ├── game/                ← 游戏逻辑（C++ 翻译层）
│   │   ├── rules/
│   │   ├── house/
│   │   ├── terrain/
│   │   ├── unit/
│   │   ├── building/
│   │   ├── weapon/
│   │   ├── economy/
│   │   └── combat/
│   ├── renderer/            ← 3D 表现层
│   │   ├── meshes/          ← Dummy / GLB 加载
│   │   ├── materials/       ← 材质系统
│   │   ├── effects/         ← 粒子、弹道、爆炸
│   │   └── ui/              ← Babylon.GUI + HTML Overlay
│   ├── network/             ← WebSocket 预留
│   ├── save/                ← 存档序列化
│   ├── types/               ← 全局类型定义
│   └── main.ts              ← 入口
├── index.html
├── vite.config.ts
├── tsconfig.json
├── .eslintrc.cjs
├── .prettierrc
└── package.json
```

---

## 5. 常见问题（FAQ）

**Q: `npm run type-check` 报错，但 `npm run dev` 能跑，可以提交吗？**  
A: **不可以**。CI 会阻断合并，必须先修复类型错误。

**Q: 我想跳过 build 直接看效果，可以吗？**  
A: 可以。日常开发只需 `npm run dev` + `npm run type-check`。`build` 仅在 CI 中执行。

**Q: GitHub Pages 部署后资源 404？**  
A: 检查 `vite.config.ts` 中的 `base` 是否与仓库名完全一致（区分大小写）。

**Q: Babylon.js 的 GLB 加载在 GitHub Pages 上跨域失败？
A: GitHub Pages 支持同源加载，确保 GLB 放在 `remake/public/assets/` 下，使用相对路径 `/CnC_Remake/assets/units/xxx.glb`。**  
A: GitHub Pages 支持同源加载，确保 GLB 放在 `public/assets/` 下，使用相对路径 `/CnC_Remake/assets/units/xxx.glb`。

**Q: 如何更新 Harness 文件？**  
A: 直接修改 `/mnt/agents/output/` 中的 MD 文件，或在项目根目录创建 `docs/` 文件夹存放这些文档，随代码一起提交。

---

*本文档包含可直接复制使用的配置文件代码块。*
