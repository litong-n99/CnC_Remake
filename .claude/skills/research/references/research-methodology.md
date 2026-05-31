# Research Methodology

## 目标
本方法用于把“需求调研”转化为“可落地设计输入”。

## 步骤
1. 用需求关键词搜索当前项目，先找已有能力、已有数据结构、已有约束。
2. 用相同关键词搜索参考项目，确认是否存在同类实现。
3. 把“是否存在”与“如何实现”分开写，避免概念混淆。
4. 对浏览器相关功能，单独增加环境约束分析：渲染、资源、输入、线程、同步、性能。
5. 最终输出必须能回答：
   - 有没有？
   - 怎么做的？
   - 为什么这么做？
   - 我们该怎么落地？

## 推荐关键词
- 数值相关：damage, armor, health, speed, range, cooldown, rate, cost, reload, modifier, rule, balance
- 浏览器适配：web, browser, canvas, webgl, input, event, asset, audio, worker, wasm, sync

## 输出原则
- 绝不只给目录树；必须提炼实现模式。
- 绝不只写参考项目；必须落地到当前项目。
- 结论必须附证据等级。
