# r3f-arch

复刻 `../editor`（pascalorg/editor）的住宅编辑器，14 个里程碑，范围以 `docs/ROADMAP.md` 为准。
三层：`src/core`（无 three，纯逻辑）→ `src/viewer`（渲染，不知道工具和选中）→ `src/app`（编辑体验）。边界由 `eslint.config.js` 强制。

## 会话开场

用户会输入 `/kickoff`。没输入也先按 `.claude/skills/kickoff/SKILL.md` 做完，再回答任何问题。跳过它的会话都漂移过。

## 工作约定（优先级高于其它一切）

1. **代码写进 `docs/m<N>-code.md`，不写 `src/`。** 用户手敲，这是学习方式。改 `src/` 先问；唯一免问的例外是修让 `pnpm verify` 变红的编译错误，且逐条报告改了什么、为什么。
2. **不覆盖用户已存在的文件**，哪怕是空的或只有草稿。未跟踪文件 git 救不回来。
3. **每个 M 两份 Markdown**：`docs/m<N>-<slug>.md` 是设计（§00–§06，模板 `docs/_template-m.md`）；`docs/m<N>-code.md` 是 §07 全码，**按层分三批放出：core → viewer → app**，每批先过 `/gate`。M1–M9 的设计仍在 HTML 里，不转。
4. **交付必须带验证范围**（D16）：`验证：tsc · eslint · vitest N 文件 / M 用例` 和 `未验证：浏览器渲染与交互`。没在浏览器跑过就明写。
5. **收尾清单每条要有依据**（D17）：编译器报错、测试失败、或助手实际运行后观察到的行为。「和文档不一致」不是依据，用户的偏离可能是对的。
6. **方案变更显式记录**：写成「原方案 X 行不通，因为 Y，改成 Z」，不静默替换。用户照着文档敲，静默改会让文档和代码对不上。
7. **纯函数层的修复配一条会因它变红的测试**（D18）。
8. **范围以 ROADMAP 为准**，不加路线图外的功能。

## Skills（用户手动调用）

| 输入 | 什么时候 |
|---|---|
| `/kickoff` | 每次会话开始 |
| `/gate core` `/gate viewer` `/gate app` | 用户要某一层的 §07 之前 |
| `/review` | 用户敲完一层、verify 之后 |
| `/recite` | 一个 M 收尾，或复盘「为什么能」 |
| `/handoff` | 上下文将满，或阶段边界 |

## 记忆在哪

`docs/DECISIONS.md` 是决策记忆（每条带为什么），`docs/STATE.md` 是进度与债表，`docs/LEARNING.md` 是用户讲回来时画错的地方。有新决定就追加，验收过了就更新。
