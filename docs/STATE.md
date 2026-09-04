# STATE —— 当前进度

> 每个 M 验收通过后更新本文件。新对话开场第二个读的（第一个是 README 的「工作约定」）。

**最后更新**：2026-09-04
**当前对话**：#3（M6）
**当前里程碑**：**M6 楼板、天花、柱 —— ✅ 验收通过**（代码 + `verify` 全绿 + §05 肉眼验收走完）。
**下一站：M7 门窗与开洞**，`[机制]` 型。开工前读 `handoff-m7.md`。

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
| M7 | 门窗与开洞 | ⬜ 下一站，见 `handoff-m7.md` |
| M8 | 多楼层 | ⬜ |
| M9 | 存档、导入导出、迁移 | ⬜ |
| M10 | 屋顶 | ⬜ |
| M11 | 楼梯 | ⬜ |
| M12 | UI 外壳 | ⬜ |
| M13 | 属性面板与大纲 | ⬜ |
| M14 | 材质与上色 | ⬜ |

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
| `grid:click` 每次都对 sceneRegistry 多射一次线 | M3 | M7（可复用 BVH） |
| 删墙没有级联（还没有子节点可级联） | M4 | M7 |
| 只吸端点和网格，无中点 / 交点 / 垂足吸附 | M4 | M12 |
| 墙高存在 `wall` 自己身上，无楼层概念 | M1 | M8 |
| 刷新即丢，无存档；撤销不跨刷新 | M1 | M9 |
| 选中高亮是换材质色不是描边；无悬停高亮（`enter`/`leave` 已发出但无人监听） | M3 | M12 |
| 拖拽中没有尺寸标注 | M4 | M13 |
| 不能多选（Ctrl/Shift + 点击）、不能框选 | M3 | M13 |
| UV 是 ExtrudeGeometry 默认的，贴图跨墙接不上 | M2 | M14 |
| `src/core/schema/camera.ts` 未使用（照抄原项目时带入） | M1 | 待定 |
| slab / ceiling / column **不能拖动、不能编辑顶点** | M6 | M13 |
| 多边形不能挖洞（楼板上的楼梯井） | M6 | M11 |
| 自相交多边形不检测（只有面积守卫挡退化） | M6 | M11 |
| 天花高度是硬编码常量，不"吸附到层顶"（ROADMAP 原文做不到，因为「层」要 M8 才存在） | M6 | M8 |
| 墙底在 y=0、楼板顶在 0.05 ⟹ 墙看起来陷进楼板 5cm | M6 | M8 |
| 「有 `position` 就绑，没有就信封」的判据**无机制强制**，加错字段会静默平移两次 | M6 | **M7 复核** |
| 绕向不做归一化（`ExtrudeGeometry` 自己转 CCW；挖洞时洞要反向才需要） | M6 | M7 |
| 绘制只吸网格 0.1m，不吸墙端点 ⟹ 楼板边缘和墙中心线差半个墙厚 | M6 | M12 |
| 预览线定长缓冲 64 点，超过 62 个顶点预览截断（数据不截） | M6 | M13 |

---

## 待决（需要用户拍板）

1. ~~M5 的交付方式~~ —— **2026-08-26 已定：助手给 §00 + §03，用户产出 §01/§02/§04/§05/§06，
   助手只 review。** 见 `m5-registry.html` 末尾「轮到你了」。

2. ~~M5 的三处结构分叉~~ —— **已定，见 `handoff-m6.md` ③ 第 2 条**：
   类型住 `core/registry/`、实例住 `viewer/nodes/`；`AnyNode` 继续手写 `discriminatedUnion`；
   斜接走 `def.computeLevelData`。

3. **里程碑文档要不要从 HTML 改成 Markdown。** 2026-09-04 提出，未决。
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
| **合计** | ✅ **5 文件 / 51 用例，全绿** |
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
