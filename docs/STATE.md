# STATE —— 当前进度

> 每个 M 验收通过后更新本文件。新对话由 `/kickoff` 读它（工作约定在 `../CLAUDE.md`）。

**最后更新**：2026-09-21
**当前对话**：M9 `/gate app`（从 `r3f-arch` 启动）
**当前里程碑**：**M9 存档 —— 三道闸门全过**。core 批已敲完；`/gate viewer` ✅（本层无改动，只确认）；`/gate app` ✅（2026-09-21，三问过）；**app 批 §07 已放出（`m9-code.md` 末尾），待敲**。
`pnpm verify`：**2026-09-21 实测全绿，19 文件 / 264 用例**（入场时红在 `check-types` 的 4 处编译错，助手按约定 1 修掉，见下「偏差」）。
文件/用例数比 core 批文档预告的 20 / 265 各少一个：闸门红测试 `gate-core.test.ts` 被并进了 `load-scene-document.test.ts:80`，桩文件删了。
敲完 app 批应为 **21 文件 / 287 用例**。
**注意**：用户 2026-09-21 已建 `src/app/persistence/autosave.ts`，里面只有签名没有实现 → `check-types` 现在红在 `TS2391`。敲到 app 批第 10 步就绿。
**方法 v2 已落地（D29）**：`../CLAUDE.md` + `../.claude/skills/{kickoff,gate,review,recite,handoff}` + `_template-m.md`。

**下一站（按顺序）**：
1. 敲 `m9-code.md` 的 **app 批**（第 09 → 18 步，测试排在实现前面）→ `pnpm verify`（21 / 287）→ `/review`。
2. **§05 B 的肉眼验收**（清单在 app 批末尾）。这一批 8 个文件里 4 个没有任何自动护栏（`file-io` / `scene-panel` / `app.tsx` / `main.tsx`），**M9 的验收压在这一步**。ROADMAP 给 M9 定的验收原文（M1 时代存档喂进去能加载、能迁移、能再存回）也在这张表里。
3. `/recite` 收尾 M9。
4. **M8 前置 C 的尾巴**：P4 `sideFromHit` 的 4 条测试没敲（D18）；`wall-tool.tsx` 的 P5 没敲；P1 / P5 / C6 待浏览器看；P2 待复现。
5. **R0**（`/recite` M1–M8 → `WHY.md`）尚未开始。原计划排在 M9 之前，2026-09-16 用户选择先做 M9 core。
6. **M10 已被顺延**（D31，2026-09-18）：新 M10 是「操作台、定位与外立面」（`m10-workbench.md`），原 M10 屋顶 → M11。**`ROADMAP.md` 还没按这个改**。

---

## 进度

| M | 名称 | 状态 |
|---|---|---|
| M1 | 能画一堵墙 | ✅ 验收通过 |
| M2 | 墙角严丝合缝 | ✅ 测试已转绿（`pointOnSegment` 的 `L2` 已修） |
| M3 | 一次点击只干一件事 | ✅ 代码已提交（`b56877e`→`9914873`）；**肉眼验收未走完**，见下 |
| M4 | 拖动、撤销、脏传播 | ✅ 收尾清单已全部应用（`d20ff7f`），`verify` 转绿 |
| M5 | 节点注册表 | ✅ 代码在 `src/`（`abda947`→`7a822e4`）；**M6 是它的验收，已通过**，见下 |
| M6 | 楼板、天花、柱 | ✅ 验收通过（`0b4b879`→`a5e4ee6`）；`verify` 全绿 + §05 肉眼验收走完 |
| M7 | 门窗与开洞 | ✅ 验收通过 —— §05 的 10 条肉眼验收，2026-09-15 用户确认走完 |
| M8 | 多楼层 | ✅ 肉眼验收走完（批 E/G/H/I）；批 J 10 条测试 ✅（C1）；P1 / P4 已修（`e4b1de3`），⚠ P4 测试未敲、P5 只敲了一半、P2 待复现 |
| M9 | 存档、导入导出、迁移 | 🔨 三道闸门全过；core 批已敲完且绿；**app 批已放出待敲**；肉眼验收未走 |
| M10 | **操作台、定位与外立面**（D31 新插入） | ⬜ 设计已写（`m10-workbench.md`），开工条件：M9 闸门全过 + `/recite` 做完 |
| M11 | 屋顶（原 M10） | ⬜ |
| M12 | 楼梯（原 M11） | ⬜ |
| M13 | UI 外壳（原 M12） | ⬜ |
| M14 | 属性面板与大纲（原 M13） | ⬜ |
| M15 | 材质与上色（原 M14） | ⬜ |

> ⚠ 顺延只改了本表。**债表和历史记录里的「M12 / M13 / M14」仍是旧编号**（= 现在的 M13 / M14 / M15），`ROADMAP.md` 同样没改。统一改名要专门走一趟，别顺手改一半。

---

## M9 进行中（2026-09-21）

### 2026-09-21 这次会话做了什么

**入场偏差（4 处编译错，助手按约定 1 修掉，逐条报告过）**：

| 文件:行 | 改动 | 后果 |
|---|---|---|
| `core/persistence/migrations.ts:1,10` | `v0Tov1` → `v0ToV1` | 迁移链数组那一项是 `undefined`，`runSceneMigrations` 读 `m.from` 直接炸 → 20 条 `migration-failed` |
| `core/persistence/scene-storage.ts:71,76` | `maxCheckPointsPerScene` → `maxCheckpointsPerScene` | 大写 P 只在实现里，测试和文档都是小写 |
| `core/store/replace-scene.test.ts:1` | 补 3 行 import（`vitest` 四个名字 / `AnyNodeId` / `replaceScene`） | 整个 import 块少了一半 |
| `core/store/use-scene.ts:109-114` | 删掉外层 `set((s) => { … })` 包裹 | 08b 的新代码被套进旧的 `set` 回调里，回调返回 `void` → **B4 那 7 条写入边界测试全红，浏览器里表现为 `updateNode` 静默不写** |

**其它偏差**：`src/core/persistence/fixtures.ts` 是 0 字节空壳、已被 git 跟踪（第 00 步遗留，D30 定的语料在 `__fixtures__/legacy-scenes.ts`），**删不删待用户决定，助手没碰**。

**`/gate viewer` ✅ 本层无改动**，三条依据：① `grep -rn "persistence|replaceScene|SceneDocument" src/viewer` 为空；② `geometry-system.tsx:35-38` 脏 id 找不到节点就 `clearDirty` 跳过，`replaceScene` 换掉整个 `nodes` 不会崩；③ **本层无自动护栏，验收靠肉眼**。

**`/gate app` ✅ 三问过**（Q1 补了「宿主环境」和「磁盘指针 vs 活着的订阅」；Q2 补了「下次打开旧场景才发现」；**Q3 不完整 → Q3' 过**）。

> **Q3 暴露的缺口值得记**：调用链画得出来，但 `autosave.stop()` / `startAutosave()` 那两端整个没出现 —— 而 Q2 刚刚把这两条顺序答得完全正确。**规矩记住了，它在调用链上的位置还没长进去。**app 批的红测试就是照这个缺口选的，写进 D33。

**方案变更（约定 6）**：原计划「用户先自己写红测试，助手再放码」没走通 —— 用户缺的是这类测试的搭法（假 store / 假时钟 / `EventTarget`），不是断言。**改成测试和实现一起给、测试排在前面**，第 09 / 13 步敲完必须是红的，红的样子写在文档里。

### `/gate core` 记下的命名 —— 后续文档跟这个走

| 设计文档（`m9-persistence.html`） | 实际 | 出处 |
|---|---|---|
| 目录 `src/core/persistence/` | **同设计**（2026-09-17 用户改回；闸门时建在 `src/core/store/persistence/`） | 用户决定 |
| `persistence/fixtures.ts` | **`persistence/__fixtures__/legacy-scenes.ts`**，冻结、只给测试用 | 用户授权按推荐定；D30 |
| `readSceneDocument` | **`loadSceneDocument`** | 用户的桩 `gate-core.ts` |
| —— | 闸门红测试 `gate-core.test.ts` → **并进 `load-scene-document.test.ts:80`**，桩文件删了 | 用户敲 core 批时合的；2026-09-21 实测 |
| 用户桩的返回 `{ snapshot, report }`、失败抛 | 设计的联合类型 `{ ok, … }`，`report` 带原因 | 沙箱实测：抛异常时 `not-a-scene` 说不清原因，见 `m9-code.md` 开头 |
| （app 批）`app/persistence/autosave.ts` | **同设计**，用户 2026-09-21 先建了空壳 | 用户建的文件 |
| §04 的 `localStorageKV(storage?)` 自带隐私模式兜底 | 拆成 `localStorageKV(storage)` · `memoryKV()` · `detectLocalStorage()`，退化决定权在 `main.tsx` | app 批差异表第 1 条 |

**前置 B 五条全定了**（D32）：B2 = 导入新建场景、B3 = 不抄误删护栏（2026-09-21 用户拍板）；B1 / B4 / B5 在 core 批里已按推荐实现并跑绿，补记。

**core 批修订版（2026-09-17）**：复查修了四类测试没覆盖的问题——v0 → v1 悄悄吞掉没 id / 重复 id 的节点；缺 id 的节点被 parse 发明新 id；`in` 被原型链骗（`constructor`）；存储层把索引当真相（孤儿文档不可见、失效记录、缺字段崩溃、存档点泄漏、降级保护只看索引）。每处配测试。v0 → v1 不再调 `migrateToLevels`（**D30** 迁移冻结）。按敲的顺序逐步实测，变异测试 32 / 32 被抓。

**设计文档三处更正**（已在 HTML 里加更正框，第三处是 §02 C 的 `migrateToLevels`）：§07 分批改为 core → viewer → app（D29）；§02 I 的例子写错了——跨类型字段读档时被 zod 静默剥掉，真正丢数据的是非法值（层高 0 → 整层连同墙和门窗消失，沙箱探针实测）。

**app 批的设计偏差 8 条**列在 `m9-code.md` 的 app 批开头（约定 6）。其中两条值得在这里点名：
- **§02 J 的伪代码自相矛盾**：第一句 `autosave?.stop()`，同一段又写「读失败什么都不动」。实现里 `storage.load()` 排在 `stop()` 前面 —— load 是纯读，两条都满足。变异测试「照伪代码写」会红。
- **§02 H 的兜底判据写错了**：「一个节点都没留下」不能写成 `nodes` 为空 —— v0 → v1 自己会造 site / building / level，永远不空。判据改成「**文件里的东西一个都没留下**」。沙箱第一版就是照原文写的，测试当场红。

**M9 新决定**：**D31**（M10 顺延，补录）· **D32**（前置 B 五条）· **D33**（两条顺序是 app 层的，不是 core 的）。

---

## M8 实测状态（2026-09-15）

`pnpm verify` **全绿**：`check-types` ✅ · `eslint` ✅ · `vitest` ✅ **15 文件 / 200 用例**（M7 基线 95 → 200）。

### 与 `m8-levels.html` §07 的差（M9 前置会话实测）

| 差 | 结论 |
|---|---|
| ~~没有 `core/store/migrate-to-levels.test.ts`~~ | ✅ **2026-09-17 已敲**（前置 C · C1，10 条全过） |
| 批 J 追加进 `level-action.test.ts` 的 **5 条已经在**（`:169-221`） | `handoff-m9.md` ② 说「15 条全没敲、另外多出 5 条」**是误判**：多出来的 5 条就是批 J 的这 5 条（批 H 13 + 5 = 18，实测 18） |
| ~~文件名是 `level-action.test.ts`~~ | ✅ 用户在 `e4b1de3` 改名成 `level-actions.test.ts`，和文档一致了 |
| `ensureScaffold` 的报错信息缩短成 `'[level] ensureScaffold'` | 无害 |
| **`wall-tool.tsx:64` 的 `onPointerMove` 没传 `baseY`**（批 H 原文 `m8-levels.html:4438` 传了 `readCurrentLevel().baseY`） | **读代码推出来的，没观察过**：顶视图（正交、竖直射线）下没有差别；3D 透视下在二层以上画墙，绿线终点会偏离光标（提交用的 `onPointerUp` 是对的）。**请在 3D 视图的二层画墙看一眼再定**，前置 C · C6 |

各文件用例数（`vitest --reporter=verbose` 实测）：`storey` 24 · `level-display` 22 · `wall-openings` 19 · `level-action` 18 ·
`use-scene` 17 · `geometry-2d` 16 · `wall-mitering` 15 · `opening-placement` 14 · `current-level` 12 · `sibling-groups` 11 ·
`polygon-draft` 9 · `node-registry` 8 · `polygon-2d` 6 · `register` 5 · `storey-geometry` 4。

### M8 定下的决定已进 `DECISIONS.md`

D21（Level 位姿走 `def.renderer`，**带作废条件，M10 开工先读**）· D22（层的 Y 算出来不存）·
D23（缺席即数据）· D24（墙顶 / 天花只跟层高）· D25（兄弟按 `(type, parentId)` 分组）·
D26（上层隐藏走 layers 31）· D27（`migrateToLevels`）· D28（`WallNode.height` 保留）。

### 演示问题（`m8-demo-issues.md`）

| # | 状态 |
|---|---|
| P1 拖墙 / 放门窗作用到下层墙 | 修法在前置 C · C2。**原方案漏了一行**：`stopPropagation` 会让 R3F 给更远的墙补发 `leave`，`onWallLeave` 必须只清自己那面墙的预览 |
| P2 天花板选不中 | **待复现**。先看状态栏第一个词（2026-09-15 用户还没看） |
| P3 屋顶层天花悬空 | 设计如此（D24）。演示步骤更正版在前置 C · C5 |
| P4 顶视图门窗朝向 | 前置 C · C3：`sideFromHit` + 4 条测试 |
| P5 楼板预览线被墙挡 | 前置 C · C4。**必须在浏览器里看过才算完** |
| P6–P9 | 到期 M12，见下方债表 |

---

## M6 收尾实测（2026-09-04）

`pnpm verify` **全绿**：`check-types` ✅ · `eslint` ✅ · `vitest` ✅ **5 文件 / 51 用例**。
自 gate 提交 `d20ff7f` 以来：**26 文件 / +726 −13 行**。

### ROADMAP 给 M6 定的验收原文已满足

> 「加第三种类型的工作量 ≈ 加第二种。**这一条本身就是对 M5 的检验。**」

照真实代码数出来：

| | 加 ceiling（第二种） | 加 column（第三种） |
|---|---|---|
| `core/schema/<kind>.ts` | 新建 21 行 | 新建 30 行 |
| `core/schema/types.ts` | +1 行（联合加一项） | +1 行 |
| `viewer/nodes/<kind>/geometry.ts` | 新建 23 行 | 新建 40 行 |
| `viewer/nodes/<kind>/definition.ts` | 新建 8 行 | 新建 8 行 |
| `viewer/nodes/register.ts` | +1 行 | +1 行 |
| **合计** | **5 处 / 框架文件 0** | **5 处 / 框架文件 0** |

**5 = 5 ⟹ M5 成立。**注册表那六个文件（`node-renderer` / `parametric-node-renderer` /
`geometry-system` / `node-registry` / `node-definition` / `events/types`）在加第二、第三种类型时
**一行都没改**。

### 一次性能力（加第 4 种类型时不用再动）

| 改动 | 谁逼出来的 | 量 |
|---|---|---|
| `ParametricNodeRenderer` 绑 `position` | column（第一个有 `position` 的类型） | +4 行 |
| `SelectionManager` 按 `nodeRegistry.entries()` 订阅 | 第二个可选中的类型 | +3 行 |
| M4 三处「`AnyNode` 只有一个成员」假设 | 联合从 1 涨到 2 | ~16 行 |

工具路径（`Tool` 联合 / `app.tsx` / `scope.tool`）属 **C 类·真·类型特有**，
注册表不该碰；`def.tool` 排期 **M12**。

### §05 肉眼验收：22 条已走完（2026-09-04）

**D 组两条回归通过** —— 它们验的是 M6 没把 M2 / M4 弄坏，而且挂了都是静默的
（`verify` 全绿、画面看着正常）：

1. ✅ L 形转角 **墙角严丝合缝** —— 前置 C · C1（`def.computeLevelData`）确实修好了，
   M2 的斜接没丢
2. ✅ 只移动鼠标时 `buildPolygonPrism` **计数不涨** —— 前置 C · C2（`clearDirty`）确实修好了，
   M4 的头号目标（「只移动鼠标时一次不重算」）成立

**这两条是本项目第一次真正验证 `GeometrySystem` 在工作。**M5 建了它，
M6 的前置 C 才让它跑起来，而这两条肉眼验收才证明它跑对了 ——
`verify` 从头到尾对这两个 bug 都是绿的。

---

## M7 实测状态（2026-09-10）—— ✅ 2026-09-15 验收通过

`pnpm verify` **全绿**：`check-types` ✅ · `eslint` ✅ · `vitest` ✅
**8 文件 / 95 用例**（M6 基线 51 → 95，+44）。与 `m7-openings.html` §07 那份跑绿拷贝完全对齐。

**代码已全部补齐**（含 `updateNode` 守卫、重叠判定、`slideOpeningAlongWall`、
`opening-placement.test.ts` 14 条）。

> 途中有一条测试先红后绿，值得记：`use-scene.test.ts` 的
> 「patch 里带 parentId / children → 抛错」在实现补上之前就红着——
> **测试先到位、实现缺三行**。D18 那条规则在这里当场生效了。

**✅ §05 的 10 条肉眼验收：2026-09-15 用户确认全部走过、全部通过。**

### 本次会话的教训，值得记住

M7 批 I 的第 03、04 步被跳过了：`wall/definition.ts` 少一个 `frame:`、
渲染器少一行 `rotation-y`、墙几何还留着老的 `body` group。
**`pnpm verify` 对这三条从头绿到尾**，症状伪装成「门的预览位置算错了」——
幽灵和创建出来的门都落在世界原点附近，而不是墙上。

定位靠的是一个可自证的信号：**幽灵和创建出来的门落在【同一个】错的地方**
⟹ 放置数学是对的，错的只有坐标系那一层 ⟹ 锁定批 I。

这是本项目第 8 个「类型系统看不见」的 bug。
和前七个共同点没变：写出来都像对的，`verify` 全绿，功能静默死掉。

---

## M3 未走完的肉眼验收

M3 §05 第 6 条「选择工具下点墙 → 选中并高亮」当时不可能通过——
`wall-renderer.tsx` 的 `{...events}` 展开的是 `@react-three/fiber` 的 `createPointerEvents` 函数
（自动导入遮蔽），`wall:click` 从未 emit 过。**该行已在 M4 期间改正**，
但 §05 的八条没有重走。M4 收尾之后连同 M4 §05 一起走一遍。

---

## 当前的"故意保留的缺陷"

| 缺陷 | 引入于 | 到期 |
|---|---|---|
| 改一堵墙 → 全场景 miter 重算 + 所有墙重建几何 | M2 | ✅ **M6 前置 C · C2 已关**（`clearDirty`）|
| 画墙落点不吸附到已有端点 | M2 | ✅ M4 已关（`snap-2d.ts`） |
| 墙画完不能移动、不能删、无撤销 | M1 | ✅ M4 已关 |
| 橡皮筋预览用 `useState`，每次鼠标移动都重渲染 | M3 | ✅ M4 已关（改 ref + `useFrame`） |
| 交点检测 O(交点×墙)，无空间网格 | M2 | ~~M4~~ → **M8+**，条件见 `m4-drag.html` §02 B |
| 没有 `GeometrySystem`，几何重建仍靠 `useMemo` 依赖数组 | M4 | ✅ M5 建好，**M6 前置 C 才让它真的工作** |
| live 覆盖是 `Partial<AnyNode>`，无 per-type 校验 | M4 | 🔨 M6 还了一半（调用方有检查，合并处一个显式 `as`，见 D16 事故）→ **M9** |
| `grid:click` 每次都对 sceneRegistry 多射一次线 | M3 | **M7 不还**；现在同一次点击有两次独立射线，两次结果必须一致 → M12 |
| 删墙没有级联 | M4 | ✅ **M7 已关**（`collectSubtree` + `removeNode` 级联，7 条测试）|
| 只吸端点和网格，无中点 / 交点 / 垂足吸附 | M4 | M12 |
| 墙高存在 `wall` 自己身上，无楼层概念 | M1 | ✅ **M8 已关**（D23 / D24） |
| 刷新即丢，无存档 | M1 | 🔨 **M9 app 批第 18 步（`main.tsx` 接 `bootScenes`）敲完才关**。core 批敲完时仍然刷新即丢 |
| 撤销不跨刷新（`replaceScene` 明确清历史，见 D33 / core 批第 06 步） | M1 | 不做 —— 跨刷新的撤销栈要连同历史一起存盘，M9 不碰 |
| 选中高亮是换材质色不是描边；无悬停高亮（`enter`/`leave` 已发出但无人监听） | M3 | M12 |
| 拖拽中没有尺寸标注 | M4 | M13 |
| 不能多选（Ctrl/Shift + 点击）、不能框选 | M3 | M13 |
| UV 是 ExtrudeGeometry 默认的，贴图跨墙接不上 | M2 | M14 |
| `src/core/schema/camera.ts` 未使用（照抄原项目时带入） | M1 | 待定 |
| slab / ceiling / column **不能拖动、不能编辑顶点** | M6 | M13 |
| 多边形不能挖洞（楼板上的楼梯井） | M6 | M11 |
| 洞只能是轴对齐矩形（拱形/圆角做不了）—— 段切的定义 | M7 | M10（CSG 到位后）|
| 洞必须贯通整个墙厚（壁龛、半深窗台板做不了）；`position[2]` 恒为 0 | M7 | M12 |
| 一堵墙 N 个洞 = 2N+1 个 draw call，不合并 | M7 | M14 |
| **`children` 是反规范化字段**，只在 `addNode`/`removeNode` 维护。**M9 存档导入若直接写 `nodes`，必须重建这个索引**，否则门渲染不出来且不报错 | M7 | ✅ **M9 core 批已关**：`normalizeSceneNodes` 一律按 `parentId` 重建 `children`，存档里的 `children` 不信（变异「不重建 children」→ 7 条红） |
| 拖门时宿主墙每帧重切（「有 `parentId` 就把父标脏」在拖拽期每帧触发） | M7 | M13 |
| 门窗不吸附到相邻门窗（只吸 0.1m 网格） | M7 | M12 |
| 门窗不能改尺寸（无宽/高手柄）、不能换宿主（只能沿当前墙滑） | M7 | M13 |
| 门没有开合（铰链/推拉/双开全不做，D2） | M7 | 不做 |
| 自相交多边形不检测（只有面积守卫挡退化） | M6 | M11 |
| 天花高度是硬编码常量，不"吸附到层顶"（ROADMAP 原文做不到，因为「层」要 M8 才存在） | M6 | ✅ **M8 已关**（D24） |
| 墙底在 y=0、楼板顶在 0.05 ⟹ 墙看起来陷进楼板 5cm | M6 | ✅ **M8 批 F 已关**（`DEFAULT_SLAB_ELEVATION` → 0）。⚠ M6 / M7 时代的楼板**存着** 0.05（zod `.default()` 在 `addNode` 时物化），M9 的 v0→v1 迁移要改写 |
| 「有 `position` 就绑，没有就信封」的判据**无机制强制**，加错字段会静默平移两次 | M6 | ✅ **M7 已关**（`def.frame`，见 D19）|
| ~~绕向不做归一化 ⟹ 挖洞时洞要反向~~ | M6 | ⊘ **撤销**：`ExtrudeGeometry` 自己归一化绕向（D20 实测）。`signedArea` 仍零消费者 → M11 |
| 绘制只吸网格 0.1m，不吸墙端点 ⟹ 楼板边缘和墙中心线差半个墙厚 | M6 | M12 |
| 预览线定长缓冲 64 点，超过 62 个顶点预览截断（数据不截） | M6 | M13 |
| 支撑选举不做：墙不会站到脚下那块楼板上（抬高露台 / 下沉客厅做不了） | M8 | M11 |
| 上层楼板不压低下层墙、天花不避让上层楼板（`min(层高, 上层楼板底)` 只做了层高那一半） | M8 | 有需要时 |
| Building 没有 `position` / `rotation`；`OpeingGhost` 用局部 `host.rotation.y`，因「Level 只做 Y 平移」而恰好正确 | M8 | M13（两条同批改） |
| 没有 exploded / solo 模式，切层硬切、无动画 | M8 | M12 |
| 灰显直接改材质，会和 M14 的材质系统、选中高亮互相覆盖 | M8 | M14 |
| 楼层切换 / 加删层 / 改层高没有 UI，只有快捷键和控制台 | M8 | M12 / M13 |
| 层不能重排（改 `ordinal` 算法是对的，但没有 UI） | M8 | M12 |
| 删一整层没有确认（`collectSubtree` 连内容一起删） | M8 | M13 |
| `eventToGround` 仍只和一个水平面求交（现在是当前层地面，不再是 y=0） | M8 | M12 |
| **`migrateToLevels` 没有版本号，不是迁移链**；绕过 `addNode`，`children` 是手填的 | M8 | ✅ **M9 已关，但不是"接进迁移链"**：D30 把它排除在迁移之外（迁移要冻结），v0 → v1 自己用字面量造容器。`migrateToLevels` 留作 `ensureScaffold` 的脚手架工具，D27 作废 |
| 演示 P6 顶视图墙与地面同色 · P7 画内隔墙看不到落点 · P8 顶视图选中不明显 · P9 切层后端点球留在半空 | M8 | M12（见 `m8-demo-issues.md`） |

---

## 待决（需要用户拍板）

1. ~~M5 的交付方式~~ —— **2026-08-26 已定：助手给 §00 + §03，用户产出 §01/§02/§04/§05/§06，
   助手只 review。** 见 `m5-registry.html` 末尾「轮到你了」。

2. ~~M5 的三处结构分叉~~ —— **已定，见 `handoff-m6.md` ③ 第 2 条**：
   类型住 `core/registry/`、实例住 `viewer/nodes/`；`AnyNode` 继续手写 `discriminatedUnion`；
   斜接走 `def.computeLevelData`。

3. ~~**里程碑文档要不要从 HTML 改成 Markdown。**~~ **2026-09-16 已定：改 Markdown，见 D29。** 2026-09-04 提出。
   HTML 的代价这次事故暴露过：错误的一行埋在 131KB 标签里，交叉核对费劲，
   而且新会话读它要先剥标签。M7 是 `[机制]` 型只交 §01–§06，
   正好是 HTML 优势最小的形态，可以拿它试一次。

3. **三处命名漂移**（不影响运行，但 M5 的 `GeometrySystem` 每帧要调第一个）：

   | 文档 | 实际代码 |
   |---|---|
   | `markDirty` | `makeDirty` |
   | `ScopeOfKind` | `scopeOfKind` |
   | `draggingNodeId` | `draggingNodeIds`（复数名返回单个 id，M13 做多选时会撞车） |

---

## 待处理（非里程碑）

- **尚无 CI。** 架构层边界的 lint 规则没有 CI 等于没有——只在本地手敲时生效。
  见 `deploy-and-ci.md`。
- **建议加一条 lint 规则**：禁止 import `@react-three/fiber` 的 `events` 导出。
  同一个自动导入幽灵已经出现三次（M3 `wall-renderer.tsx`、M4 `wall-renderer.tsx`、
  M4 `drag-session.ts`），而它三次都不产生任何红字。
- **无 DOM 测试环境。** `jsdom` / `happy-dom` / `@testing-library` / `@react-three/test-renderer`
  都没装，所以 R3F 组件、指针事件、键盘快捷键跑不了自动化测试。
  纯 JS 的部分（store / 历史 / 邻接 / 吸附 / 缓存）不受影响，见下。
- `dist/` 与 `index.html` 的 git 状态见 `deploy-and-ci.md`。

---

## 测试覆盖现状

| 层 | 现状 |
|---|---|
| 纯几何（`geometry-2d` 16 / `wall-mitering` 15） | ✅ 31 用例 |
| M6 的纯函数（`polygon-2d` 6 / `polygon-draft` 9 / `node-registry` 5） | ✅ 20 用例 |
| M7 的纯函数（`wall-openings` 19 / `use-scene` 11 / `opening-placement` 14） | ✅ 44 用例 |
| M8（`storey` 24 / `level-display` 22 / `level-action` 18 / `current-level` 12 / `sibling-groups` 11 / `register` 5 / `storey-geometry` 4 / `node-registry` +3 / `use-scene` +6） | ✅ 105 用例 |
| 批 J `migrate-to-levels.test.ts` | ✅ 10 用例（2026-09-17） |
| **M9 core 批**（`load-scene-document` 29 含并进来的闸门那条 · `scene-storage` 16 · `replace-scene` 3 · `use-scene` +7） | ✅ **已敲完**（2026-09-21 实测绿）。`gate-core.test.ts` 并进 `load-scene-document.test.ts:80`，桩删了 |
| **合计** | **19 文件 / 264 用例，全绿**（2026-09-21 实测。⚠ 用户随后建的 `app/persistence/autosave.ts` 空壳让 `check-types` 红在 TS2391，敲 app 批第 10 步就绿） |
| P4 `sideFromHit` 4 条 | ⬜ 前置 C · C3 给了，未敲（D18） |
| **M9 app 批**（`autosave` 9 · `scene-session` 14） | ⬜ 已放出：+2 文件 / +23 用例，敲完 **21 / 287**。沙箱实测绿，变异 16/16 被抓 |
| M4 的纯函数（`wall.test` / `history-control.test` / `wall-adjacency.test` / `snap-2d.test`） | ⬜ `m4-drag.html` §07 给了全码（64 用例），**一个都没敲**。不阻塞 M7 |
| 真实功能操作（建墙→拖→撤销→删的端到端） | ⬜ `m4-drag.html` §09 给了 7 个文件 / 85 用例，待敲 |
| R3F 渲染 / 指针 / 键盘 | ❌ 无环境，靠跑起来看（D11 明确接受）。**D16 要求交付时明写"未验证"** |

---

## 已知的实际代码 vs 文档偏差

- `eslint.config.js` —— `allowTypeImports` 必须写在每条 `paths` / `patterns` 条目内部，
  不是顶层选项。用户另补了 `languageOptions.parser`（`.tsx` 解析需要）。
- `use-editor.ts` 里选中状态字段名是 `selectId`（不是 `selectedId`）。
  M13 做多选时会改成 `selectedIds`，届时一并重命名。
- `core/schema/snap-2d.ts` 在 `schema/` 而不是 `lib/`（M4 §03 的文件树写的是 `lib/`）。
  纯几何放 `schema/` 与 `geometry-2d.ts` 不一致，但只是两行 import 的事，未改。
- M3 §07 相对 §04 有三处设计修正，原因见 `DECISIONS.md` D15。
- M4 §07 相对 §03/§04 有六处偏差，全部在 §07 开头列出（其中
  `acquireSceneHistoryPause` 必须带 store 参数，否则 `use-scene` ↔ `history-control` 循环导入）。
- **`m4-drag.html` §08 第 08 条已作废**（`level-miter-cache.ts` 在 M5 期间删了），
  **第 13 条已作废并加更正框**（`<Line visible={false}>` 会连材质一起关掉，见事故记录）。
- `polygon-draft.ts` 的 `isClosingClick` 用 `<=`，与 `snap-2d.ts` 的 `nearestEndpoint`
  「正好落在半径上算命中」一致。
- **`eventToGround` 只和 y=0 地平面求交。**3D 透视下点"柱子上方"，射线会越过柱子落在它后面的地面上，
  所以天花会画歪。画多边形要按 Tab 切正交顶视。**M7 的门窗必须落在墙面上，这条彻底不够用。**

---

## 事故记录

**2026-08-20**：M3 期间助手直接把实现代码写进了 `src/`（约 800 行，12 新文件 + 6 处改写），
违反了当时尚未成文的工作约定，已全部回滚到 `e71782d` 并保留基建（mitt/vitest/两个测试文件）。
用户的 8 个未跟踪 stub 文件被覆盖丢失。规则已写入 `README.md` 顶部与 `DECISIONS.md` D14。

**2026-09-02 · 重大事故：文档把正确的代码"修"成了错的**

一条从没运行过的修复指令，经过一次"收尾清单"的放大，
最终让 M4 的橡皮筋预览永久失效；同一次提交里的一个转录错误让墙完全画不出来。
两个 bug 对 `pnpm verify` 全部不可见。定位耗时一整个会话。

**因果链**（每一步都有一手证据）

| # | 时间 | 事件 | 证据 |
|---|---|---|---|
| 1 | ~08-26 | 助手在 `m4-drag.html` **§07 全码**里写下 `<Line visible={false}>`，**从没在浏览器里跑过** | `m4-drag.html` 行 4083 |
| 2 | M4 手敲 | **用户漏掉了这一行。绿线一直是好的** | `d20ff7f` 之前的 `wall-tool.tsx` 没有这一行 |
| 3 | ~08-26 | §08「收尾清单」拿 §07 当基准逐行比对，把这个"遗漏"列成第 13 条缺陷，配理由「挂载第一帧会在原点闪一下」——**该闪烁同样未经观察** | `m4-drag.html` 行 4640 |
| 4 | ~08-26 | §08 声称「这份清单是验证过的，不是推测 —— `tsc` ✅ `eslint` ✅ `vitest` ✅」。属实，但这三样**结构上看不见渲染** | §08 开头 |
| 5 | 09-02 | 助手把第 13 条原样搬进 `m6-slab-ceiling-column.html` 前置 C 的 **B5**，并在文档开头声称「已在 `src/` 的完整拷贝上跑绿」（`tsc`/`eslint`/`vitest`/`vite build` + 9 条几何探针——**依然没有一项是渲染**） | M6 文档前置 C |
| 6 | 09-02 | 用户提交 `d20ff7f`，敲进 `visible={false}` → **绿线死** | `git show d20ff7f -- src/app/tools/wall-tool.tsx` |
| 7 | 09-02 | 同一提交，A6 的 `!==` 被敲成 `===` → `update()` 变成空操作 → **墙一堵都画不出来** | `use-interaction-scope.ts:21` |
| 8 | 09-02 | 助手定位并修好第 7 条，验证了数据链（合成点击建出两堵墙），**据此宣称「只改 `!==` 就够了，我验过了」**——而绿线仍然是坏的，且坏在助手自己引入的第 6 条上 | 本次会话 |

**技术根因**（第 6 条）

`@react-three/drei` 10.7.8 的 `core/Line.js` 只解构了
`points / color / vertexColors / linewidth / lineWidth / segments / dashed`，
`visible` 落进 `...rest`，而 `rest` 被**同时**铺到 `<primitive object={line2}>`
和 `<primitive object={lineMaterial}>` 上。`WebGLRenderer` 判的是 `material.visible`，
所以 `useFrame` 里那句 `line.visible = true` 只翻了 Object3D，材质那半永远关着。
`grep -n visible Line.js` 结果为空 —— 这是静态可证的。

**过程根因**（四条，已写进决策）

1. **不是 D11 没被遵守，是 D11 没写清。** 它规定了"怎么测"，
   没规定"声称验证过时必须声明哪些轴没验"。→ **D16**
2. 该规则要向上盖住 **§07 全码**这种"不声称验证"的交付。→ **D16**
3. 收尾清单把「和 §07 不一致」当成了缺陷依据，
   系统性地把作者的正确偏离改回文档的错误。与 D14 冲突。→ **D17**
4. 「编译器看不见」那类修复没有强制护栏。
   `use-interaction-scope.ts` 是纯 store，五行测试就能挡住第 7 条。→ **D18**

**为什么这次比 2026-08-20 那次严重**

上一次是助手越权写 `src/`，破坏立刻可见、`git` 可回滚。
这一次**没有任何一步违反当时的规则**：§07 该给全码（D13），
§08 该做收尾比对，用户该手敲（D14），助手该跑 `verify`。
每一步都合规，合起来把一个正确的实现改坏了，
而且伪装成"你敲漏了一行"。**规则没被违反，规则本身有洞。**

**未决**

- `src/app/tools/wall-tool.tsx` 的修法归用户（D14）。
  最小改动是删掉 `visible={false}` 一行，**先跑起来确认到底闪不闪**——
  第 13 条声称的那个闪烁至今没有任何人观察过。
- `m4-drag.html` §08 第 13 条与 M6 前置 C 的 B5 已按工作约定第 6 条加更正框。
