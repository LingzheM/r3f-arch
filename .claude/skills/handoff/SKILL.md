---
name: handoff
description: 阶段边界写交接文档，给下一个会话
disable-model-invocation: true
---

时机：一层的 gate 或 review 做完、一个 M 收尾、或上下文将满。晚了写不出来。

写 `docs/handoff-m<N>.md`，刻意写短。只放读 `src/` 和 git 查不出来的东西：

1. 基线：verify 数字、日期、怎么测的。
2. 阶段：当前 M 停在哪一步（设计 / gate 哪一层 / review / recite），下一步第一件事。
3. 未提交、未跟踪的文件清单（`git status` 实测）。
4. 本会话定下但还没进 DECISIONS 或 STATE 的决定，每条一句话，加上在哪个文档能找到原文。
5. 会让新会话走偏的事实：文档说了但代码没做、旧方案已废等。
6. 每条事实标「怎么查到的」；没查的写「未查」。

然后更新 `docs/README.md` 文件表里的交接条目。
