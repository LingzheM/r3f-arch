# docs

复刻 `pascalorg/editor` 的分阶段方案。对照仓库在 `../editor`（同 workspace，可直接读）。

---

## 工作约定 —— 新会话必读，优先级高于其它一切

**1. 代码写进 `docs/m<N>-*.html` 的 §07，不写 `src/`。**
用户手敲。这是学习方式，不是效率问题。写进 `src/` 等于把用户从作者降级成集成商。

**2. 需要改 `src/` 时先问。** 唯一免问的例外：修复让 `pnpm verify` 变红的**编译错误**，
且必须在回复里逐条列出改了什么、为什么。除此之外——包括"顺手修个 bug"——都要先确认。

**3. 不许覆盖用户已存在的文件，哪怕它是空的或只有几行草稿。**
那些是用户正在写的东西，未跟踪、git 恢复不了。

**4. 每个里程碑一份 HTML，结构固定：**
⓪ 这个设计是怎么推出来的（七步推导，样板见 `m3-spine.html` §00）
① 这一步解决什么问题 ② 机制说明 ③ 文件树增量
④ 建造顺序（方法签名 + hint，**不含实现体**） ⑤ 验收清单 ⑥ 故意保留的缺陷 ⑦ 全部代码

**§00 的七步**：①找规格书读全文（wiki 在前源码在后）②找「之前是怎么错的」
③量成本决定手写还是抄 ④抽不变量（它们就是测试用例）⑤切最薄的垂直片
⑥去用户代码里找病灶（动机必须先于机制）⑦列故意缺陷并标到期
＋⑧遇到顺序/时序/手感问题先跑一段原型，别在纸上推

**5. `[机制]` 型里程碑先只交 ①–⑥。** 用户要 §07 时再补。
`[模式]` 型可以一次交完。类型见 `ROADMAP.md`。

**6. 方案有缺陷就在文档里显式记录**，写成"原方案 X 行不通，因为 Y，改成 Z"，
不要静默替换——用户是照着文档敲的，静默改会让文档和他手里的代码对不上。

---

## 开新对话时贴这段

```
项目 C:\Users\User\workspace\meguri\r3f-arch，对照仓库 ..\editor。

先读 docs/README.md 的「工作约定」，再读 docs/STATE.md、docs/DECISIONS.md、
docs/ROADMAP.md，然后扫一遍 src/ 的真实代码并跑 pnpm verify。

先报告实际代码与计划的偏差，再出 M<N> 的方案。
代码写进 docs/m<N>-*.html，不要动 src/。
```

**接手方开场必须做的四件事**（缺一会漂移）：

1. 读工作约定 + `STATE.md` / `DECISIONS.md` / `ROADMAP.md`
2. **读 `src/` 的真实代码**——不是读上一个会话写的计划
3. 跑 `pnpm verify`（check-types + lint + test），确认基线颜色
4. **先报告偏差，再出计划**

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
