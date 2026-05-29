# Webwright Skill

## 名称
Webwright

## 概述
提供与 Playwright / Web E2E 自动化相关的辅助操作与生成能力。用于在仓库内创建、运行和解析 Playwright 测试、生成测试用例、提取测试报告与错误上下文，以及生成 CI/本地运行命令示例。

## 何时使用
- 需要我生成或修改 Playwright 测试用例时。 
- 需要我运行或解释 `playwright` 测试输出、定位失败原因、生成复现步骤时。
- 希望自动创建测试骨架、测试数据或测试运行脚本（本地/CI）时。
- 需要把失败测试转换为 issue/PR 描述时（含重现步骤、日志、截图引用）。

## 能力范围
- 读取并理解仓库中的 `playwright.config.ts`、`remake/package.json` 中的 e2e 脚本等配置。
- 生成或修改 Playwright 测试文件（TypeScript），包含断言、页面交互、截图、录制路径等。
- 生成用于本地或 CI 的 shell 命令与步骤说明（可复制执行的命令块）。
- 解析 Playwright 测试输出（文本/JSON），提取失败堆栈、截图路径、失败步骤并总结为简洁报告。
- 为常见 UI 测试场景生成测试矩阵与用例（登录、导航、表单、关键交互、网络断连等）。
- 建议或生成 Playwright 测试最佳实践（选择器策略、等待策略、Fixtures 用法、并发配置）。
- 在合理范围内，生成与 `remake/` 项目集成的测试 scaffold（示例 test、fixtures、stub 数据、map 模拟文件）。

## 不会做 / 限制
- 无法直接在远端环境中执行需要真实用户凭据或秘密的操作（不会泄露/记录 secrets）。
- 不会在没有确认的情况下更改与测试无关的生产源码逻辑。
- 如果需要实际运行 Playwright（安装依赖、启动浏览器），会给出命令和步骤，但不会自动在外部系统触发运行（除非用户允许在当前环境执行）。

## 输入/输出约定
- 输入：自然语言指令（例如“为登录页面生成 Playwright 测试”）、仓库路径、失败的测试日志片段、或需要覆盖的用例清单。
- 输出：一或多个文件（`tests/*.spec.ts`）、可复制的终端命令、JSON 报告摘要、以及可提交的 PR 描述草稿或 issue 模板。

## 示例用法
- 生成测试用例："为主菜单的保存/加载流程生成 Playwright 测试，含截图与重试策略" → 输出 `e2e/save-load.spec.ts`。
- 运行并解析测试："运行 `npm run test:e2e` 并把失败的第一个用例提取为 issue 描述" → 输出执行步骤建议与 issue 草稿（包含失败堆栈、建议复现步骤）。
- CI 集成建议：根据仓库的 `package.json`，生成 `.github/workflows/playwright-e2e.yml` 的建议内容，用于在 CI 上并行运行 e2e 并上传 artifact（截图/trace）。

## 输出格式示例
- 新文件路径（相对于仓库根）：`remake/e2e/<name>.spec.ts`。
- 可执行命令（fenced shell）：
  npm ci
  cd remake
  npm run test:e2e

- 简要报告（Markdown）：失败摘要、主要堆栈、重现步骤、可能原因、建议修复。

## 提示与元信息
- 若仓库使用不同目录（如 `remake/`）运行测试，请在请求中指明要使用的工作目录（例如 `workdir: remake`）。
- 如需我在当前环境尝试运行测试，请明确授权（我将提供命令并在当前 devcontainer 中执行）。
# Webwright Skill

## 名称
Webwright

## 概述
Webwright（https://github.com/microsoft/Webwright）是一套以“代码即动作”为核心的浏览器代理框架：代理将交互步骤写成可重跑的 Python 脚本，运行时生成轨迹、截图与结构化报告，便于调试、复现与打包为可复用 CLI。

本 skill 基于官方 README，提供在仓库内生成 Webwright 风格 scaffold、运行/解析产物、并为 Claude Code / OpenAI Codex 等宿主生成插件清单的能力。

## 何时使用
- 将复杂的浏览器任务表达为可重跑脚本并收集运行产物用于调试或展示。
- 需要把 LLM 生成的交互封装为参数化 CLI（`craft`）或一次性可复现脚本（`run`）。
- 希望生成 `skills/webwright/` 插件供 Claude Code / Codex 安装并调用。

## 能力范围
- 生成 Webwright run scaffold（`plan.md`、`final_script.py` 或 parameterized CLI wrapper）并放入指定 `workdir`（例如 `remake/`）。
- 生成运行与调试命令、提示所需环境（Python 3.10+, Playwright chromium, 模型 API key）。
- 解析 `outputs/<run>/trajectory.json`、`report.json` 与 screenshots，生成 Markdown 摘要与可提交的 issue/PR 草稿。
- 生成 `skills/webwright/` 插件目录结构（manifest、commands），并给出如何在 Claude Code / Codex 中安装与使用的说明。

## 安装与运行参考
Prereqs: Python 3.10+, Playwright chromium, backend API key (OpenAI / Anthropic / OpenRouter).

```bash
pip install -e .
playwright install chromium
```

示例运行：

```bash
python -m webwright.run.cli -c base.yaml -c model_openai.yaml \
  -t "Search for flights from SEA to JFK on 2026-08-15" \
  --start-url https://www.google.com/flights \
  --task-id demo_openai -o outputs/default
```

可选 flags: `-c`（配置文件，可叠加）、`-t`（任务描述）、`--start-url`、`--task-id`、`-o`（输出目录）。

## 输出与交付物约定
- `final_script.py` 或参数化 `final_script` CLI。
- `outputs/<run>/trajectory.json`（轨迹）、`outputs/<run>/report.json`（Task Showcase 模式下的结构化报告）、`outputs/<run>/screenshots/`。

## 插件集成
- 可生成 `skills/webwright/` 目录以供 Claude Code / Codex 安装（包含 `plugin.json`、`commands/` 与必要 manifest）。宿主会在会话启动时加载并可调用 Webwright run。

## 限制与安全
- 运行需要模型 API key；skill 不会注入或泄露密钥。
- 运行会在磁盘写入轨迹与截图，注意清理敏感数据。

## 请求与输出格式
- 输入示例：
  - `task: string`（自然语言任务）
  - `workdir: string`（可选，目标目录）
  - `mode: run|craft`（`run` 生成一次性脚本，`craft` 生成参数化 CLI）
- 输出：文件集合（`final_script.py`、`plan.md`）、运行命令、以及一份摘要 Markdown（包含产物路径与重现步骤）。

## 使用示例
- "为 `remake` 项目生成一个 Webwright `run` scaffold，用于演示地图加载与保存流程，task-id=map_load_demo" → 在 `remake/webwright_runs/map_load_demo/` 生成 `final_script.py`、`plan.md` 与运行指南。

## 建议的后续动作
- 将 scaffold 放入仓库并生成 CI 运行建议（包括如何在 CI 上安装 Playwright 与保存 artifacts）。
- 生成 `skills/webwright/` 插件清单以便在 Claude Code / Codex 中安装并演示一次示例 run。

---

此文件基于 Webwright 官方 README（https://github.com/microsoft/Webwright）生成，反映项目的安装、运行与集成要点。