# Webwright Skill

## 名称
Webwright

## 概述
Webwright 是一种“代码即动作”浏览器自动化框架，基于 Python + Playwright，将交互步骤写成可重跑脚本，并生成轨迹、截图与结构化报告。

本 skill 用于在本仓库内生成 Webwright 风格的 scaffold、运行指南与结果分析，并支持将这些产物整理为可供 Claude Code / Codex 等宿主使用的插件形式。

## 何时使用
- 需要将复杂浏览器任务表达为可复现脚本。
- 希望将 LLM 生成的交互封装为参数化 CLI（`craft`）或一次性脚本（`run`）。
- 需要我在工作中帮你调用该 skill 以方便开发验证和测试回测。
- 需要将运行产物转换为可读报告或 issue/PR 描述。

## 能力要点
- 生成 Webwright 风格的 scaffold（`plan.md`、`final_script.py` / 参数化 wrapper），并放入指定工作目录（例如 `remake/webwright_runs/<id>/`）。
- 生成运行命令示例与环境说明（Python 3.10+、Playwright chromium、模型 API key），并提供可复制的本地/CI 步骤。
- 解析 `outputs/<run>/trajectory.json`、`report.json` 与 screenshots，生成 Markdown 摘要、失败重现步骤和可提交的 issue/PR 草稿。
- 可生成 `skills/webwright/` 插件结构（manifest、commands），以便在 Claude Code / Codex 中安装并调用。

## 安装与运行参考
Prereqs: Python 3.10+、Playwright chromium、模型 API key（`OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` 等）。

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

可选 flags：`-c`（配置文件，可叠加）、`-t`（任务描述）、`--start-url`、`--task-id`、`-o`（输出目录）。

## 输出与交付物约定
- `final_script.py` 或参数化 `final_script` CLI。
- `outputs/<run>/trajectory.json`（轨迹）、`outputs/<run>/report.json`（结构化报告）、`outputs/<run>/screenshots/`。

## 插件集成
- 生成 `skills/webwright/` 目录结构，包括 `plugin.json`、`commands/` 与必要 manifest，用于 Claude Code / Codex 安装与调用。

## 安全与限制
- 运行需要模型 API key；skill 不会注入或泄露密钥。
- 运行会在磁盘写入轨迹与截图，注意清理敏感数据。
- 在当前环境执行前，应获得明确运行授权。

## 输入/输出约定
- 输入：
  - `task: string`（自然语言任务描述）
  - `workdir: string`（可选，目标目录，例如 `remake/`）
  - `mode: run|craft`（`run` 生成一次性脚本，`craft` 生成参数化 CLI）
- 输出：
  - scaffold 文件（`plan.md`、`final_script.py`、可选 `plugin.json`）
  - 运行命令与环境说明
  - 产物分析摘要（Markdown）

## 使用示例
- “为 `remake` 项目生成一个 Webwright `run` scaffold，用于演示地图加载与保存流程，task-id=map_load_demo。”
- “解析 `remake/webwright_runs/map_load_demo/outputs/report.json`，并生成一份可提交的 issue/PR 草稿。”
- “生成一个 `skills/webwright/` 插件结构，用于 Claude Code / Codex 安装和运行 Webwright 脚本。”

## 建议的后续动作
- 将 scaffold 放入仓库并生成 CI 运行建议，包含如何安装 Playwright、启动 Chromium、保存 artifact。
- 生成 `skills/webwright/` 插件清单，便于在 Claude Code / Codex 中演示一次示例 run。
