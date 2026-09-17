# docs

复刻 `pascalorg/editor` 的分阶段方案。对照仓库在 `../editor`（同 workspace，可直接读）。

---

## 工作约定

**搬到了 `../CLAUDE.md`（2026-09-16，D29）**，从 `r3f-arch` 目录启动 Claude Code 会自动加载。
开场输入 `/kickoff`；其它 skill 见 `CLAUDE.md` 的表。

从 M9 §07 起，代码写进 Markdown（`m<N>-code.md`），按 core → viewer → app 三批放出，每批先过 `/gate`。
M1–M9 的设计文档仍是 HTML，不转。

---

## 文件

| 文件 | 是什么 | 谁更新 |
|---|---|---|
| [ROADMAP.md](ROADMAP.md) | 14 个里程碑的定义、对照源码、对话分组 | 范围变化时 |
| [STATE.md](STATE.md) | 当前进度、下一步、未偿缺陷 | **每个 M 验收后** |
| [DECISIONS.md](DECISIONS.md) | 决策记录，每条带"为什么" | 有新决策时追加 |
| [m1-wall.html](m1-wall.html) | M1 能画一堵墙 | ✅ |
| [m2-miter.html](m2-miter.html) | M2 墙角严丝合缝 | ✅ |
| [m3-spine.html](m3-spine.html) | M3 一次点击只干一件事（含 §00 推导样板） | 🔨 |
| [m4-drag.html](m4-drag.html) | M4 拖动、撤销、脏传播（§07 全码 · §08 收尾清单 · §09 功能测试） | 🔨 |
| [m5-registry.html](m5-registry.html) | M5 节点注册表（**只含 §00 + §03**，其余用户产出） | 🔨 |
| [m5-registry-answers.html](m5-registry-answers.html) | **M5 参考答案（封存）** —— §01/§02/§04/§05/§06 + §07 全码。<br>**写完自己的版本再看** | 🔒 |
| [m6-prep.md](m6-prep.md) | 场景存档（M9 的一半，提前）。**开工闸门看 M6 文档的前置 C** | 开 M6 前 |
| [handoff-m6.md](handoff-m6.md) | M6 开新会话的前置闸门 + 粘贴的提示词 | 开 M6 前 |
| [m6-slab-ceiling-column.html](m6-slab-ceiling-column.html) | M6 楼板、天花、柱（前置 A 偏差 · 前置 B M5 检验测量 · 前置 C 开工闸门 20 处 + §00–§07 全码） | ✅ |
| [handoff-m7.md](handoff-m7.md) | M7 开新会话的前置闸门 + 粘贴的提示词 | 开 M7 前 |
| [m7-openings.html](m7-openings.html) | M7 门窗与开洞（前置 A 偏差 · §01–§06 · **§07 全码 24 文件，已在 src/ 拷贝上跑绿**） | ✅ |
| [handoff-m8.md](handoff-m8.md) | M8 开新会话的前置闸门 + 粘贴的提示词。**闸门只欠 M7 的 10 条肉眼验收** | 开 M8 前 |
| [m8-levels.html](m8-levels.html) | M8 多楼层（前置 A/B · §01–§06 · §07 十批 A–J）。**316KB，不要通读，按关键词 grep** | ✅（批 J 测试见 M9 前置 C） |
| [m8-demo-issues.md](m8-demo-issues.md) | M8 演示暴露的 9 个问题：现象 → 调查 → 方案 → 到期 | 修一条改一条 |
| [handoff-m9.md](handoff-m9.md) | M9 开新会话的交接（刻意写短） | 开 M9 前 |
| [m9-persistence.html](m9-persistence.html) | M9 存档、导入导出、迁移（前置 A 偏差 · 前置 B 待拍板 · 前置 C M8 收尾代码 · §00–§06） | 🔨 |
| [m9-code.md](m9-code.md) | M9 §07 全码，按 core → viewer → app 分批放出（core 批 2026-09-17，代码块由脚本从跑绿的拷贝导出） | 每过一道闸门追加 |
| [_template-m.md](_template-m.md) | M10 起设计文档的 Markdown 模板 | 结构变化时 |
| m<N>-code.md | M9 起的 §07 全码，按层追加，每层过 `/gate` 才放 | 每道闸门后 |
| WHY.md | R0 产出：app / core / viewer 为什么能跑，用户写草稿 | R0 |
| [LEARNING.md](LEARNING.md) | `/gate` 讲回来、`/recite` 时画错的地方，每条带正确版本 | 每次 gate / recite |
| [roadmap.html](roadmap.html) | 路线图可读版（权威版是 ROADMAP.md） | 范围变化时 |
| [deploy-and-ci.md](deploy-and-ci.md) | GitHub Pages 部署与 Actions CI 调查 | — |

在线版（私有）：

- M1 https://claude.ai/code/artifact/884fafbb-a835-4fc5-84ac-a26e691a4a44
- M2 https://claude.ai/code/artifact/2829bbba-e64b-42ba-b2db-91e5a894c144
- M3 https://claude.ai/code/artifact/71dc8bf4-e652-4d37-9149-9c2a319e8502
- 路线图 https://claude.ai/code/artifact/e3c270a5-0903-4e3e-8c81-3df399b89f5f

> HTML 文档若与 `ROADMAP.md` / `DECISIONS.md` 冲突，**以 Markdown 为准**。

---

## 常查的对照源码

```
wiki/architecture/                                20 页架构规则，全项目最值钱的部分
  interaction-scope.md    M3 的规格书
  node-definitions.md     M5 的规格书
  vertical-model.md       M8 的规格书
  materials-and-themes.md M14 的规格书

packages/core/src/schema/nodes/wall.ts            WallNode（426 行，你只要 20 行）
packages/core/src/systems/wall/wall-mitering.ts   斜接（536 行，M2）
packages/core/src/store/use-live-transforms.ts    拖拽临时覆盖（M4）
packages/core/src/store/history-control.ts        pause 租约 + 提交事务（M4）
packages/viewer/src/systems/wall/level-miter-cache.ts   斜接缓存（M4）
packages/core/src/registry/                       节点注册表（M5）
packages/viewer/src/systems/wall/wall-system.tsx  开洞 CSG（1281 行，M7/M10）
packages/viewer/src/systems/roof/roof-system.tsx  屋顶（2716 行，M10）
packages/editor/src/components/ui/primitives/     Radix 包装 ×19（M12）
apps/editor/components/build-tab.tsx              工具清单组织方式（M12）
```
