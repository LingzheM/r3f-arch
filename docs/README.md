# docs

复刻 `pascalorg/editor` 的分阶段方案。对照仓库在 `../editor`。

## 开新对话时贴这段

```
项目 C:\Users\User\workspace\meguri\r3f-arch，对照仓库 ..\editor。
先读 docs/STATE.md、docs/DECISIONS.md、docs/ROADMAP.md，
再扫一遍 src/ 的真实代码和测试结果，
报告实际代码与计划的偏差，然后出 M<N> 的方案。
```

## 文件

| 文件 | 是什么 | 谁更新 |
|---|---|---|
| [ROADMAP.md](ROADMAP.md) | 14 个里程碑的完整定义、对照源码、对话分组 | 范围变化时 |
| [STATE.md](STATE.md) | 当前进度、下一步、未偿缺陷清单 | **每个 M 验收后** |
| [DECISIONS.md](DECISIONS.md) | 决策记录，每条带"为什么" | 有新决策时追加 |
| [m1-wall.html](m1-wall.html) | M1 方案 + 全部源码 | 已完成 |
| [m2-miter.html](m2-miter.html) | M2 方案 + 全部变更代码 | 进行中 |
| [roadmap.html](roadmap.html) | 路线图的可读版（权威版是 ROADMAP.md） | 范围变化时 |
| [deploy-and-ci.md](deploy-and-ci.md) | GitHub Pages 部署与 Actions CI 调查 | — |

里程碑文档用浏览器打开。在线版（私有）：

- M1 https://claude.ai/code/artifact/884fafbb-a835-4fc5-84ac-a26e691a4a44
- M2 https://claude.ai/code/artifact/2829bbba-e64b-42ba-b2db-91e5a894c144
- 路线图 https://claude.ai/code/artifact/e3c270a5-0903-4e3e-8c81-3df399b89f5f

> HTML 里程碑文档若与 `ROADMAP.md` / `DECISIONS.md` 冲突，**以 Markdown 为准**。

## 常查的对照源码

```
wiki/architecture/                                   20 页架构规则，全项目最值钱的部分
  interaction-scope.md    M3 的规格书
  node-definitions.md     M5 的规格书
  vertical-model.md       M8 的规格书
  materials-and-themes.md M14 的规格书

packages/core/src/schema/nodes/wall.ts               WallNode（426 行，你只要 20 行）
packages/core/src/systems/wall/wall-mitering.ts      斜接（536 行，M2）
packages/core/src/store/{use-live-transforms,history-control}.ts   M4
packages/core/src/registry/                          M5
packages/viewer/src/systems/wall/wall-system.tsx     开洞 CSG（1281 行，M7/M10）
packages/viewer/src/systems/roof/roof-system.tsx     屋顶（2716 行，M10）
packages/editor/src/components/ui/primitives/        Radix 包装 ×19（M12）
apps/editor/components/build-tab.tsx                 工具清单组织方式（M12）
```
