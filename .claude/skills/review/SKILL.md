---
name: review
description: 用户敲完一层后的 review：按层归类、跑 verify、按依据报告
disable-model-invocation: true
---

对象：用户刚敲进 `src/` 的一层（`git diff` 加未跟踪文件）。

1. `git status --short` 和 `git diff --stat`，列出本层触及的文件。
2. 每个新文件回答一个问题：它属于 core / viewer / app 哪一层？放错层的是 **blocker**。判据：core 无 three，viewer 不 import app，`eslint.config.js` 兜底但要说出理由。
3. `pnpm verify`。红的贴原文。
4. 逐文件对照 `docs/m<N>-code.md`。只列三类发现，每条带依据：
   - 编译器或 lint 报错（贴错误码）
   - 测试失败（贴用例名）
   - 助手实际运行后观察到的行为（写清怎么观察的）

   「和文档不一致」不进清单（D17）。发现用户写法比文档好时，改文档并说明。
5. 报告按严重度分 blocker / 应修 / 可选。末尾固定两行：`验证：…` 和 `未验证：浏览器…`（D16）。
6. 列出该层要用户在浏览器里看的肉眼验收条目（来自设计文档 §05）。等用户回报「看到了什么」，才算通过。

完成标准：每条发现都有上面三种依据之一；没有发现也写出验证范围。
