---
name: kickoff
description: 会话开场：读状态、跑 verify、报偏差，再谈计划
disable-model-invocation: true
---

目标：出任何方案之前，确认「文档说的」和「`src/` 里真实的」一致。

1. 读 `docs/STATE.md` 全文、`docs/DECISIONS.md` 最后 5 条、`docs/ROADMAP.md` 当前 M 一节。若有 `docs/handoff-m<N>.md` 且日期晚于 STATE，以它为准。
2. `git status --short`。列出未跟踪的 docs 文件（丢了找不回）和未提交改动，提醒用户先提交。
3. 跑 `pnpm verify`。记录测试文件数和用例数，与 STATE 里的基线比。
4. 读当前 M 涉及的 `src/` 真实文件，不是上一个会话写的计划。
5. 回复固定四段：
   - **基线**：verify 颜色，文件/用例数 vs STATE
   - **偏差**：实际代码与 STATE 或文档不符之处，每条注明怎么查到的（命令，或文件:行）
   - **阶段**：当前 M 停在 设计 / gate core / gate viewer / gate app / review / recite 哪一步
   - **下一步**：一句话
6. 停下等用户，不主动出方案。

完成标准：偏差表里每条都有出处；没查的写「未查」。
