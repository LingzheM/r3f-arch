# DECISIONS —— 决策记录

> 每条都带"为什么"。跨对话后我不记得当初的权衡，这个文件就是记忆。
> 新决策追加到末尾，不要重排编号。推翻旧决策时**保留原条目**并标注被哪条取代。

---

## D1 · 目标：完整产品，不是覆盖率

**2026-08-18 修订**（取代原 D1「机制覆盖度 90%」）

做一个自己能用、能给别人看的住宅编辑器，约原项目功能的 25–30%。

**为什么不是 90% 功能覆盖**：原项目 46 种节点、390k 行。按每小时 100 行可用代码算 ≈ 2 人年全职。
AI 能压缩打字时间，压缩不了三维几何的调试时间。

**为什么不停留在"机制 90%"**：跑完机制你能读懂原项目，但手里没有能给人看的东西。

---

## D2 · 产品边界

8 种节点：`wall / door / window / slab / ceiling / roof / stair / column`
\+ 容器：`site / building / level`
\+ 多楼层、材质上色（颜色预设，不做贴图）、完整编辑 UI

**排除**：家具 GLB 目录、HVAC 管道全家、电梯、栅栏、地形雕刻、点云扫描、
测量标注、结构网格、集合、命令面板、移动端、第一人称漫游。

**为什么排除家具**：多出一整条资产管线（GLB 材质槽位契约、UV 世界比例、素材来源），
和编辑器本身的机制无关。

---

## D3 · 领域约定

- 单位米，Y-up
- `Point2D = { x, y }`，其中 **`y` 是世界 Z**（抄原项目，为了能对照源码）
- 墙由**中心线**定义：只存 `start` / `end` 两个 2D 点，厚度沿左法线双向外扩
- `leftNormal(v) = normalize(-v.y, v.x)`，"左"指沿 `start→end` 看的左手边。
  **这个方向定死了 M7 门窗的 interior/exterior 语义，不许改**
- 墙的几何局部 Y ∈ `[0, height]`，`wallTransform.position.y = 0`
  （M2 修订；原为 `±h/2`。理由：挤出体天然 `[0, depth]`，且"墙底在局部原点"才是 M8 层高标高的正确基准）

---

## D4 · 三层边界

`core`（无 three，纯逻辑） → `viewer`（渲染，不知道工具/选中/模式） → `app`（编辑体验）
单向依赖，`eslint.config.js` 的 `no-restricted-imports` 强制。

**为什么**：`core` 无 three 是几何测试能在 Node 里裸跑的唯一原因。
`viewer` 不知道 app 是它能被单独复用的唯一原因。

**例外**：`core/registry/scene-registry.ts` 用 `import type * as THREE`，
类型导入编译后整行消失，不构成运行时依赖。
eslint 里靠 `allowTypeImports: true` 放行——**必须写在每条 `paths`/`patterns` 条目内部，不是顶层**。

---

## D5 · 2D 平面图：正交顶视，不做独立场景

原项目的 2D 是独立 DOM/SVG 场景（`data-floorplan-scene`），代价是
**每个工具写两份**（`door/move-tool.tsx` + `door/floorplan-move.ts`），
`wiki/architecture/tools.md` 明文规定必须同 PR 移植到孪生文件。全项目最大维护税。

我们用正交顶视相机 + `enableRotate={false}` 代替，工具只写一份。

**副作用**：正交相机在 `[0, 40, 0]` 正好落在万向锁退化点，
必须显式 `camera.up.set(0, 0, -1)`，且要在 OrbitControls 挂载前。原项目没有这个坑（它的正交相机在 `[10,10,10]`，是轴测图）。

---

## D6 · 墙体开洞：先 Shape+holes，需要时才上 CSG

> ⚠ **2026-09-05：手法被 D20 取代，意图不变。**
> 「先不上 CSG，M10 才引 `three-bvh-csg`」仍然有效；
> 但 `Shape` + `holes` 这个具体做法在 M7 **物理上不成立**——
> 墙是沿高度挤出的，洞会变成贯通楼层的竖井。改用「段切」。
> **照着下面这段做会走错，先读 D20。**

M7 用 `THREE.Shape` 带 `holes` 挤出。直墙 + 矩形洞场景下更快、UV 可控、零依赖。
M10 屋顶裁墙时才引入 `three-bvh-csg`。

**为什么不一步到位**：先撞到 Shape+holes 的天花板，才能理解原项目
`wall-system.tsx` 那 1281 行为什么存在。

---

## D7 · 数据 ↔ Three 绑定：registry 早建，命令式晚上

`sceneRegistry`（全局可变 `Map<nodeId, Object3D>`）M1 就建，因为射线拾取必须能反查 node id。
但几何先纯声明式 `useMemo`；M4 做拖拽时才引入 `useFrame` 直接 mutate Object3D 的命令式路径。

---

## D8 · 交互状态机：M3 直接上精简 spine

`InteractionScope` 判别联合，5 个态：`idle | drafting | placing | moving | handle-drag`。
铁律：`selectionEnabled(scope)` 只在 `idle` 为真。

**为什么不重走弯路**：原项目 `interaction-scope.md` 记载了 7 个独立布尔标志漂移成非法组合的历史。
弯路重走一遍不会让你更懂，只会多花两周调 bug。保留认知，不保留痛。

**触发时机**：第二个工具出现时（不是"代码变丑"时）。

---

## D9 · 撤销：zundo 全量快照 + pause 租约

不用 command pattern。

**为什么**：几何衍生状态太多（斜接、开洞、层高传播），命令的逆操作写不对。
拖拽期用 pause 租约把历史停掉，松手提交一条。

---

## D10 · 节点注册：第三个类型时才抽

M1–M4 硬编码 `switch (node.type)`，M5 加第三种类型时才抽 `nodeRegistry` + 三复选框
（`geometry?` / `renderer?` / `system?`）。rule of three。

---

## D11 · 验收：纯函数测试 + 截图

几何/约束写成不依赖 three 的纯函数并写 vitest；React/渲染层不测，靠跑起来看。
**测试必须在接 Three 之前跑绿**——否则"墙角有条缝"有四个成因分布在四个文件里。

---

## D12 · UI 栈：照抄 Tailwind + Radix

`tailwindcss` + `@radix-ui/*` + `class-variance-authority` + `clsx` + `tailwind-merge` + `lucide-react`。

**为什么**：UI 工作量的 60% 是 Radix 那些无障碍原语（弹出定位、焦点陷阱、键盘导航），
自己造是纯消耗。栈一致之后原项目的 panel 代码能直接读懂并改写。

---

## D13 · 交付节奏：分类处理

- **[机制]** M3 / M4 / M5 / M7 / M8 —— 只给设计 + 方法签名 + hint，你手写，我 review
- **[模式]** M6 / M10 / M11 / M12 / M13 —— 直接给全码
- **[混合]** M9 / M14

**为什么**：14 个 M 里只有 5 个引入新机制，其余是同一模式的重复应用。
全部手写会让周期翻倍，全部给全码会让你在 M10 出跨模块 bug 时无从下手。

---

## D14 · 交付方式：代码进文档，不进 src/

**2026-08-20 追加**（起因：M3 时我直接改了 `src/`，被回滚）

每个里程碑的代码写进 `docs/m<N>-*.html` 的 §07，**用户手敲**。
需要改 `src/` 时先问，唯一免问的例外是修复让 `pnpm verify` 变红的编译错误，
且必须逐条报告。

**为什么**：目标是"掌握实现的原因"（D1）。代码直接落盘的话，用户从作者变成集成商——
到 M10 出跨模块 bug 时无从下手。这不是效率问题，是能力问题。

**为什么之前会出错**：`ROADMAP.md` 的 D13 写了"[机制] 给 hint，[模式] 给全码"，
但没写**给到哪里**。一个只读 ROADMAP 的新会话会犯同样的错。
规则已提到 `README.md` 顶部的「工作约定」，优先级高于其它一切。

---

## D15 · 事件总线的分工：idle 走总线，活跃交互直接拥有指针

**2026-08-20 追加**（M3 实现时发现原方案行不通）

- `grid:click` 语义是**「点击且没命中任何已注册节点」**，由 viewer 主动对
  `sceneRegistry` 射一次线判定。只有 `SelectionManager` 用它。
- 工具（如 `WallTool`）在自己的 scope 活跃期间**直接监听 canvas DOM**，不走总线。
- 点击/拖拽的区分由 `viewer/lib/pointer-gesture.ts` 在**捕获阶段**判定（4px 阈值）。

**为什么**：原方案让工具和选择管理器都监听 `grid:*`，但 DOM 级监听器不知道 R3F
命中了什么，点一堵墙会同时触发"选中"和"取消选中"，**谁赢取决于监听器注册顺序**。
依赖注册顺序的代码不可调试。

**为什么工具直接拥有指针不算倒退**：这正是 `interaction-scope.md` 的原话——
*"During any active interaction the pointer belongs to that interaction's body."*
总线是给 **idle 路径**（选择、悬停）用的跨层通道，不是所有输入的唯一入口。

**为什么用捕获阶段而不是 `cameraDragging`**：OrbitControls 的 start/end 和 R3F 的
指针处理器都挂在冒泡阶段，顺序不定。捕获永远早于冒泡，与注册顺序无关。

---

## D16 · 「验证过」必须带范围，包括 §07 全码

**2026-09-02 追加**（起因：`visible={false}` 事故，见 `STATE.md` 事故记录）

任何声称验证过的交付，**必须同时列出验证了哪些轴、以及哪些轴没验**。
`§07` 这种不声称验证的全码交付也不例外：开头必须写一行「本节代码验证到哪一层」，
没在浏览器里跑过就明写**「未在浏览器中运行」**。

写法：

```
验证：tsc ✅ · eslint ✅ · vitest ✅ 5 文件 / 51 用例 · vite build ✅
未验证：浏览器中的实际渲染与交互（D11 说这一层不测，靠跑起来看）
```

**为什么**：D11 已经写了「React/渲染层不测，靠跑起来看」，规则本身没错。
错的是**措辞**——`m4-drag.html` §08 写「这份清单是验证过的，不是推测」，
`m6-slab-ceiling-column.html` 写「已在 `src/` 的完整拷贝上跑绿」，
两句都属实，但两次覆盖的都只是 D11 说*能*测的那一半，
而读起来像「全都验了」。用户照着敲，没有理由再去看一眼。

**为什么不是「交付前必须真跑一遍浏览器」**：那条规则更强，但执行不了——
助手不总有可用的浏览器（本次会话的扩展窗口 `visibilityState` 恒为 `hidden`，
`requestAnimationFrame` 一帧都不跑，肉眼验收在那个环境里物理上做不到）。
**做不到的规则会被静默跳过；说清楚做了什么则永远做得到。**

---

## D17 · 收尾清单：每条必须写依据，「和文档不一致」不是依据

**2026-09-02 追加**（同一次事故）

`§08` 那种把用户已敲的代码和 `§07` 逐行比对的「收尾清单」，
每一条必须标出**依据**，且只有这三种算数：

1. 编译器报错（贴错误码）
2. 测试失败（贴用例名）
3. **助手实际运行后观察到的行为**（说清怎么观察的）

「和 §07 不一致」**不是合法依据**。找不到依据的条目不许进清单。

**为什么**：§08 的自我定义是「和 §07 逐行比对之后剩下的差集 —— 只列**该改**的地方」，
里面藏着一个没说出口的前提：**凡是和文档不一致的，都是用户敲错了**。

这次事故证伪了这个前提。用户手敲 M4 时漏掉了 `<Line visible={false}>`——
那是整段代码里唯一正确的地方（drei 的 `Line` 会把未解构的 props 同时铺到
`line2` 和 `lineMaterial` 上，`material.visible=false` 之后渲染器根本不画）。
§08 第 13 条把这个「遗漏」列成缺陷，M6 前置 C 的 B5 原样搬运，
用户敲进去，橡皮筋预览永久消失。

**这条和 D14 是一体的**：D14 说手敲的目的是让用户从集成商变回作者。
**作者的偏离不该被默认当成打字错误。**

---

## D18 · 「编译器看不见」的修复，落在纯函数层的必须配测试

**2026-09-02 追加**（同一次事故）

凡是被归进「编译器看不见的 bug」那一类的修复，只要被修的东西**不碰 DOM / 不碰 three**
（store、几何、历史、邻接、吸附、交互 scope），就必须同 PR 带一个
**会因为这个 bug 而变红的测试**。碰渲染的（如 drei 的 prop 转发）免测，
但要按 D16 明写「未验证」。

**为什么**：这一类修复按定义就是「`verify` 全绿但功能是坏的」。
不配测试，改对改错是掷硬币——本次用户把 `!==` 敲成 `===`，
`update()` 从「不是我的就退回」变成「是我的才退回」，
`update` 整个成了空操作，墙一堵都画不出来，而 `pnpm check-types` / `eslint` / `vitest` 全绿。

`use-interaction-scope.ts` 是纯 zustand store，落在 D11 说**能测**的那一半里，
五行就能挡住：

```ts
begin({ kind: 'moving', nodeId, origin })
update('drafting', { points: [p] })                    // 发错对象
expect(getScope()).toEqual({ kind: 'moving', nodeId, origin })

begin({ kind: 'drafting', tool: 'wall', points: [] })
update('drafting', { points: [p] })                    // 发对对象
expect(draftPoints(getScope())).toHaveLength(1)        // === 版本在这里挂
```

而 `m4-drag.html` §08 C 组列了四个测试文件，**没有一个测它**。

**这是本项目第六、第七个「类型系统看不见」的 bug**（前五个：M2 算术、M2 常量选错、
M3 同名导入遮蔽、M4 `{...}` 展开数组、M5 `GeometrySystem` 漏调 `computeLevelData`）。
共同点没变：写出来都像对的，`verify` 全绿，功能静默死掉。

---

## D19 · 宿主关系走真父子，位姿由 `def.frame` 声明

**2026-09-05 追加**（M7 开工时定。这是 M7 的地基，M8 / M10 都长在它上面）

**门窗的 `position` 在【宿主墙的局部坐标系】里**，节点按真正的父子关系挂载：

- `door.parentId = wall.id`，宿主一侧 `BaseNode.children` 反向索引
- `NodeRenderer` 递归渲染 `children`，门的 `<group>` 是墙的 `<group>` 的子节点
- 世界位姿 = 宿主位姿 ∘ 局部位姿，**由 three 的场景图复合，不由任何业务代码复合**

配套机制：`NodeDefinition` 新增可选的

```ts
frame?: (node, ctx) => { position: [number, number, number]; rotationY: number }
```

`wall` 从 `start`/`end` 算；`column` / `door` / `window` 返回 `node.position`；
**`slab` / `ceiling` 不声明**（单位矩阵，builder 继续烤世界坐标）。

**为什么不走「信封」（门平挂在根下，builder 自己复合墙的 transform）**

三条，按份量排：

1. **I1「世界位姿 = 宿主 ∘ 局部」的强制方式不同。**真父子把它交给场景图，
   *不可能*算错；信封把它变成一条要靠每个消费者记住的公式（门的 builder、
   沿墙拖动、选中包围盒、M13 面板……）。本项目已经有七个
   「写出来像对的、`verify` 全绿、功能静默死掉」的案例了，不该再造第八个。
2. **信封的「零框架改动」是假的。**`parametric-node-renderer.tsx` 的判据是**结构性**的
   （`'position' in source ? source.position : undefined`）——谁有这个字段名谁就被绑。
   门恰好有一个叫 `position` 的字段，而它是**墙局部坐标**。走信封的话渲染器把它当世界坐标绑上去，
   builder 又把墙的 transform 烤进几何，**正好平移两次**——
   M6 §06「来源三」预言的那个 bug 一字不差地发生。
   **所以信封也得改这条判据，这笔开销两条路都躲不掉，只有真父子能把它变成收益。**
3. **对照仓库在两种宿主上用了同一套机制。**墙宿主（`wall/renderer.tsx:121`）和
   屋顶面宿主（`door/renderer.tsx:41` 的 `RoofFaceHostFrame`）都是「挂进宿主 frame」，
   **门的 `position` 语义在两种宿主下完全相同**（`door.ts:62-68` 原文）。
   这是 M10 会不会推翻 M7 的直接证据——它不会。

**这条同时关闭 M6 记的债**：「有 `position` 就绑，没有就信封」这条判据无机制强制。
`def.frame` 把它从「按字段名结构性猜测」变成「显式声明」——
没声明 `frame` 的类型，加一百个叫 `position` 的字段渲染器也看都不看。
`m7-openings.html` §05 A 组最后一条就是它的验收
（临时给 `SlabNode` 加个 `position`，楼板必须纹丝不动）。

**代价，写下来别装作没有**

`children` 是**反规范化**字段，和 `parentId` 表达同一件事，
只在 `addNode` / `removeNode` 两处维护，配一条「二者互为逆」的测试。
**M9 的存档导入如果直接写 `nodes`，必须重建这个索引**——
不重建的话门渲染不出来，而且不报错。已记进 `m7-openings.html` §06，到期 M9。

**连带定的三件**（每件都在 `m7-openings.html` §02 展开，这里只记结论）

| | 结论 | 取代了什么 |
|---|---|---|
| 墙局部坐标原点 | `wall.start`，不是中点 | 原 `wallTransform` 用中点。改动封闭：`wallTransform` / `worldToLocalXZ` 全 `src/` 只有 `wall/geometry.ts` 自己用 |
| 沿墙定位 | **绝对米**（离 `start`），不是 `t ∈ [0,1]` | `ROADMAP.md` M7 写的是 `t`。改用绝对米：拉长墙时门不动，离墙角的距离不变——这才是施工图的写法 |
| 开洞几何 | **段切**（切成几段实心棱柱），不是 Shape+holes | 见 D20 |

---

## D20 · 墙体开洞用「段切」，不用 Shape+holes（修正 D6 的字面做法）

**2026-09-05 追加**（保留 D6，D6 的**意图**仍然成立，作废的只有它的**手法**）

D6 的原话是「M7 用 `THREE.Shape` 带 `holes` 挤出」。
**这个做法在 M7 的场景里物理上不成立**，和实现水平无关：

墙是把**平面轮廓沿高度**挤出的（`wall/geometry.ts:55-64`：
`Shape(u, −perp)` → `ExtrudeGeometry({ depth: 墙高 })` → `rotateX(−π/2)`）。
往这个 `Shape` 里加一个 `hole`，挖掉的是「平面上的一块」**沿高度贯通**——
一根从地板通到天花板的竖井，像烟囱，不像门。

> **实测**（three r185，项目 `node_modules` 里那一份）：直墙 4×0.1×2.5，
> 在平面 `Shape` 上开 `u ∈ [−0.45, 0.45]` 的洞，洞壁顶点的 y 集合是 `{0, 2.5}`。

一句话：**门想沿厚度切，斜接想沿高度挤，一个 `ExtrudeGeometry` 只给你一个轴。**
这就是 D6 说的「Shape+holes 的天花板」，也是对照仓库
`wall-system.tsx` 那 1281 行和一个 `three-bvh-csg` 依赖存在的理由。

**改成段切**：不挖洞，把墙切成几段实心棱柱——洞左边一段（满高）、
洞右边一段（满高）、洞上方过梁、洞下方窗台。
每段 = 平面轮廓按 u 区间裁剪（Sutherland–Hodgman 半平面裁剪）后，在一段 y 区间里挤出。

**为什么是它**

- **精确，不是近似。**实测：4 m 墙 / 0.1 厚 / 2.5 高 / 门 0.9×2.1，
  三段体积和 `0.811` = 墙体积 − 洞体积 `0.811`；
  换成带接头顶点的 5 点斜接轮廓，两边**仍然都是** `0.811`，裁出的段是 5/4/4 个顶点。
  **斜接没丢**——这是「换轴」方案做不到的（立面挤出必然是等厚矩形，M2 直接作废）。
- **零新依赖**，复用 `buildPolygonPrism` 已有的管线。
- **门框内壁是封闭棱柱的普通外表面**（实测：左段 `u = u₀` 处 6 个顶点、法线全部 `+X`，朝着洞口），
  不是 `ExtrudeGeometry` 的洞壁。

**为什么不现在就上 CSG**：D6 的原话是「先撞到 Shape+holes 的天花板，
才能理解那 1281 行为什么存在」。我们刚撞到，收获正是上面那句「一个挤出只给你一个轴」。
立刻上 CSG 等于把这个收获换成一个依赖。**CSG 留在 M10**——
那时是屋顶斜切墙，真的没有解析解。

**段切的天花板**（`m7-openings.html` §06 逐条带到期）：洞只能是轴对齐矩形
（拱形/圆角做不了）· 洞必须贯通整个墙厚（壁龛做不了）· 同一 u 区间不能有两个洞重叠 ·
N 个洞 = 2N+1 个 draw call。

**顺带更正两条写错的旧记录**

1. **「挖洞时洞必须和外轮廓反向 ⟹ `signedArea` 终于有消费者」不成立。**
   `ExtrudeGeometry` 自己归一化绕向：外轮廓不是 CW 就 `reverse()`，
   每个洞是 CW 就 `reverse()`（`three.core.js:36317` / `:36327`，r185）。
   实测同向/反向两种输入，洞壁法线分布**完全一样**（24 朝内 / 0 朝外）。
   **`signedArea` 至今零消费者**，它真正的用户是 M11 的楼板挖洞。
   `STATE.md` 那条债应该**撤销**，不是「M7 关闭」。
2. **「`ExtrudeGeometry` 的洞内壁是单面的，从洞里看会看穿」在我们这条管线上不成立。**
   实测：走 `buildPolygonPrism` 的 `(x, −y) → extrude → rotateX(−π/2)` 管线，
   墙 `+Z` 外表面法线 6/6 朝外（**那个 `−y` 取反正是为了保住手性**），
   洞壁法线 24/24 朝向洞内——站在洞里看得见。
   对照仓库 `slab-system.tsx:85` 那段注释确实存在、说的也是真事，
   但那是**他们那条管线**的问题，照搬到我们这里是错的。
   （M6 §00 第 ② 步引用过它，按工作约定第 6 条在这里显式更正，不静默替换。）

---

> **D21–D28 是 M8（2026-09-10 → 09-12）定下的，2026-09-15 由 M9 前置会话补记。**
> 原文都在 `docs/m8-levels.html`，每条末尾给了 grep 关键词；这里的行号已对照 09-15 的 `src/` 核过。

## D21 · Level 的位姿走 `def.renderer`，`def.frame` 签名不动

**2026-09-11 定（M8 前置 B，批 E 落地）**

`frame?: (node) => NodeFrame`（D19）在 Level 上拿不到它要的东西：
层的世界 Y 取决于**同一栋楼里更低层的 `height`**（兄弟）和**它属于哪栋楼**（父）。

**破的只有 `frame`，不是整个注册表**：`GeometryContext` 早就有 `resolve`，
「墙读自己那一层的层高」一行签名都不用改。需要新上下文的只有「层自己坐在哪」这一件事。

**选 (e)**：`viewer/nodes/level/renderer.tsx` 的 `LevelRenderer` 自己订阅 store、算出 frame，
**作为 prop** 传给 `ParametricNodeRenderer`。M7 定的 `frame` 签名一个字不动。

**为什么不选 (a) 给 `frame` 加 `ctx`**

1. 每个节点的渲染器都得订阅整张 `nodes`（现在是按 id 订阅，`node-renderer.tsx:17`）⟹
   任何一次提交 / 新建 / 删除让 N 个 `ParametricNodeRenderer` 重渲染。
2. 想只让需要的 kind 订阅整表，只能拆成两个渲染器组件（hooks 不能条件调用）——那就是 (e)，绕了一圈。
3. 把「位姿依赖别人」做成所有 kind 的通用能力，而它现在只有一个用户（D10）。

**为什么不选 (b) 走 `def.system` 每帧写 `position.y`**（对照仓库 `level-system.tsx` 的做法）：
给节点定位从此有两条路，正面违背 D19 选真父子的第一条理由（「交给场景图，不可能算错」）。

**作废条件**：出现**第三个**「位姿依赖上下文」的 kind 时（候选：M10 屋顶面宿主、M11 楼梯段），
按 D10 的 rule of three 提升成 (a)。**M10 开工时先读这一条**，不要从零再推三条路。

grep：`前置 B`

---

## D22 · 层的世界 Y 是算出来的，不存

**2026-09-11 定（M8 批 B）**

`getLevelElevations(nodes)`（`core/services/storey.ts:23`）：
按 `level` 序数排序，同一 building 内累加 `height`，每层再加自己的 `baseElevation`。
以 **`nodes` 对象引用**为键放进 `WeakMap` 缓存——zustand 每次写入都换新引用，缓存天然失效。

**为什么不存 `elevation`**：存了就有两份真相，改一层层高要连带改它上面所有层。
对照仓库的 `LevelNode` 也没有这个字段。

**代价**：所有读者都得走 `levelBaseY` / `resolveLevelHeight`；
改层高的脏传播必须显式写（批 C：`updateNode` 脏化 children，`use-scene.ts:106-109`）。

grep：`getLevelElevations`

---

## D23 · 缺席即数据：高度字段可选、无默认值

**2026-09-11 定（M8 批 A / C / F）**

`wall.height` / `level.height` / `ceiling.height` 是 `.optional()`，**不给 `.default()`**。
缺席 = 跟着层高走；有值 = 显式。

- `updateNode` 删除 patch 里值为 `undefined` 的键（`use-scene.ts:48-54` 的 `mergeNodePath`）⟹
  `updateNode(id, { height: undefined })` 就是「恢复跟随」。
- **创建处显式写**：新建层写 `height: DEFAULT_LEVEL_HEIGHT`（`migrate-to-levels.ts:19`、`level-actions.ts:47`），
  缺席只留给「用户没设过」。

**为什么**：zod 的 `.default()` 在 parse 时**把默认值写进数据**。
给 `wall.height` 一个默认 2.5，每堵新墙都会带着 `height: 2.5` 入库 ⟹
分不清「设过」和「没设过」⟹ M8 的验收「改层高，普通墙跟着变，显式设过的不变」永远做不到。
对照仓库 `wiki/architecture/vertical-model.md:38-39` 是同一条规则。

grep：`缺席`

---

## D24 · 墙顶跟层高，天花也只跟层高——不看墙高

**2026-09-11 定（M8 批 F）**

```ts
resolveWallTop(wall, storeyHeight)       = wall.height    ?? storeyHeight
resolveCeilingHeight(ceiling, storeyHeight) = ceiling.height ?? storeyHeight − CEILING_CLAMP_MARGIN   // 0.01
```

（`core/services/storey.ts:6`、`:83-104`）

**天花板不看墙高。**墙被显式改矮（女儿墙）时，天花仍在层顶下 1 cm ⟹ 看起来悬空。
这是设计，不是 bug——`m8-demo-issues.md` P3 已查清，错的是演示步骤（屋顶该画楼板，不该画天花）。

`CEILING_CLAMP_MARGIN = 0.01` 是天花顶面与上方实体之间留的缝，防 z-fighting；对照仓库同名常量也是 0.01。

grep：`CEILING_CLAMP_MARGIN`

---

## D25 · 几何兄弟按 `(type, parentId)` 分组

**2026-09-11 定（M8 批 G）**

`siblingGroupKey(node)`（`viewer/systems/sibling-groups.ts:4`）。
斜接、`ctx.siblings`、`ctx.levelData` 都按组算。

**为什么**：M2–M7 所有墙都挂在根下，天然是一组。M8 叠层之后，一层和二层的外墙端点在 XZ 上重合，
不分组就会被当成同一个墙角互相斜接。

**唯一的护栏是肉眼**：批 G 那一行（`geometry-system.tsx` 取 `levelData` 的键）写错，
所有墙角静默丢斜接，`verify` 全绿。M8 变异测试抓到过一次。

grep：`siblingGroupKey`

---

## D26 · 上层隐藏走 layers（31），不走 `visible`

**2026-09-12 定（M8 批 I）**

`HIDDEN_LEVEL_LAYER = 31`（`app/lib/level/level-display.ts:8`）。
当前层之上的层整棵子树搬到 31 号 layer；当前层实心，下层灰显且**可编辑**。

**为什么不用 `visible = false`**：three 的射线**只看 layers，不看 `visible`**
（r185 `three.core.js:56188-56198`：`if ( object.layers.test( raycaster.layers ) ) object.raycast(...)`，
2026-09-15 核过；R3F 9.7.0 的事件派发里也没有 `visible` 判定）。
用 `visible` 隐藏的上层墙仍然会被点中，而且挡在下层前面。

**连带**：`m8-demo-issues.md` P1 的修法（`stopPropagation`，只认射线上最近的墙）依赖这一条——
上层打不中，所以「最近的墙」只可能是当前层或灰显的下层。

grep：`HIDDEN_LEVEL_LAYER`

---

## D27 · `migrateToLevels`：纯函数、幂等、自己维护 `children`

> ⚠ **2026-09-17：下文「M9 迁移链的第一个节点」这个定位被 D30 取代**——迁移链不调用它（它依赖今天的 schema）。它仍然是 `ensureScaffold` 的实现，其余不变。

**2026-09-12 定（M8 批 J）**

`core/store/migrate-to-levels.ts`：把「平的」场景（节点直接躺在 `rootNodeIds` 里）收进 Site → Building → Level 0。

- **不碰 store、不改入参**，进出都是 `SceneSnapshot`。
- **幂等判据看三种容器任一存在**，不只看 level——半套脚手架（有 site 没 level）再补一套会变成两个 site。
- 它绕过 `addNode` 直接拼 `nodes`，所以 **`children` 这个反规范化索引要自己维护对**——D19 记的那笔代价第一次落到实处。
- 唯一生产调用方是 `ensureScaffold`（`app/lib/level/level-actions.ts:10`）：`setState` 之后 `markAllDirty`，不进历史。

**它不是数据迁移**：M8 时项目没有任何持久化，没有语料可迁
（`m8-levels.html` §02 K 已按工作约定第 6 条更正 ROADMAP「第一次真实 schema 迁移」那句）。
它的定位是 **M9 迁移链的第一个节点**——趁还没有存档格式，先把「纯函数、进出都是 snapshot、自己维护索引」这个形状定下来。

grep：`migrateToLevels`

---

## D28 · 批 F 更正：`WallNode.height` 保留，意义从「高度」变成「显式高度」

**2026-09-11 定（M8 批 F 的更正框）**

批 F 起初打算删掉 `WallNode.height`（「墙高归层管」）。**不删。**

**为什么**：`z.object` 默认**剥掉未知键**。字段一删，所有带 `height` 的数据在 parse 时被静默剥掉 ⟹
显式设过高度的墙全部变回跟随层高，没有任何报错。
M9 的存档加载要走 parse，这条正好是它面对的第一类风险：**删字段 = 静默丢数据**，要删必须配迁移。

grep：`height 字段保留`

---

## D29 · 方法 v2：闸门、Markdown、按层放码

**2026-09-16 定**（起因：用户自述 M1–M8「基本是照抄，没什么思考」。证据：`m4-exercises.md` 早已诊断「能抄的全抄完了，要求理解的正好是缺的」，三组测试至今不存在；`m5-registry.html` 的「轮到你了」从未完成，直接用了答案文件；M7 / M8 是 [机制] 型却都拿到了 §07 全码。）

用户 2026-09-16 拍板的六条：

1. **产品和原理都要，产品先。** 产品：多层住宅，外观尽量接近现实，自己能用，部署后别人不细问也能用。原理：说清 app / core / viewer 为什么能。
2. **每周 2–3 天，1–1.5 个 M。** 范围以 ROADMAP 为准，不加注册、分享之类路线图外的功能。
3. **保留手敲**（D14 不变），助手不写 `src/`。
4. **里程碑文档改 Markdown**（关闭 STATE 待决 #3）。
5. **editor 的 AI 面之后单独聊**，顺序：为什么它做得好 → 它有什么工具和 skill → MCP 最后。
6. **只用 Claude Code**，规则放 `CLAUDE.md`。

由此定的机制：

- **§07 按层放码，每层过闸门**（`/gate`）：用户先用自己的话讲回该层机制（3 问），再先写红测试，然后才拿到该层代码。这是 D14「作者不是集成商」第一次有强制手段。
- **文档拆两份**：`m<N>-<slug>.md` 设计（模板 `_template-m.md`），`m<N>-code.md` 全码。M1–M9 的 HTML 设计文档保留不转。
- **每个 M 收尾 `/recite`**：合上文档讲机制、画调用链，产出 `LEARNING.md`。
- **R0**：M9 之前先对 M1–M8 做一次 recite，产出 `WHY.md`。用户写草稿，助手只标「不准确」和「漏了」。这直接回答「抄了这么多，为什么能」。
- **工作约定搬进 `CLAUDE.md`**，开场协议变成 `/kickoff`，阶段边界 `/handoff`。

**为什么不完全反转角色**（用户写设计，助手只 review）：用户明确要保留手敲和每周 1–1.5 M 的节奏，完全反转会把周期拉到两倍以上。闸门把「理解」压缩成每层 3 问加一个测试文件，是这个节奏能承受的最小强制量。

**为什么闸门在放码之前而不是之后**：M4 练习清单和 M5「轮到你了」都把理解放在拿到代码之后或旁边，两次都被跳过。理解必须是拿到代码的前置条件，否则永远会被跳过。

**取代**：README 的「工作约定」和「开新对话时贴这段」、ROADMAP 的「新对话开场协议」。原工作约定第 4 条（一份 HTML、§00–§07）和第 5 条（[机制] 型先只交 ①–⑥）由按层放码取代。

---

## D30 · 迁移是历史记录，必须冻结

**2026-09-17 定**（M9 core 批复查时由助手提出；起因是用户问「为什么迁移里要有固定数据」）

- **迁移函数不 import 任何会随 schema 变化的东西**：默认值常量、`XxxNode.parse`、`migrateToLevels` 这类调用当前 schema 的函数都不行。
  需要的历史值写成字面量（`V0_SLAB_ELEVATION = 0.05`、`V1_LEVEL_HEIGHT = 2.5`），产出的永远是「那一版」的形状。
- **迁移测试用的语料同样冻结**（`src/core/persistence/__fixtures__/`）：schema 变了，旧语料一个字都不改，新版本另起一个导出。
  语料只给测试用，产品代码不 import。

**为什么**

1. 迁移链上每一环的输入和输出都是某个**历史版本**。v0 → v1 如果调用今天的 schema，等 v2 出现，
   v0 文档会被直接造成 v2 的样子，再被 v1 → v2 改一遍——`verify` 全绿，数据静默出错。
2. 更直接的例子：迁移里要是写 `raw.elevation === DEFAULT_SLAB_ELEVATION`，今天它等于 `=== 0`，
   存档里当年物化进去的 0.05 一块都改不到，而测试照样能写绿。
3. 语料被「更新到新格式」之后，迁移测试就变成「新格式读新格式」，永远绿、什么都不证明。

**连带**：D27「`migrateToLevels` 是 M9 迁移链的第一个节点」作废。

**护栏**：`load-scene-document.test.ts`「v0 → v1 造出来的容器是冻结的 v1 形状」钉住容器的键集合和层高。

---

## D31 · 插入一个新 M10（操作台、定位与外立面），原 M10–M14 顺延

**2026-09-18 定**（用户看过 M8 / M9 的成品后提出四个痛点）。**2026-09-21 补录进本文件** —— 在此之前它只活在 `m10-workbench.md` 开头那一句里，`ROADMAP.md` 的 M10 仍写着「屋顶」，`STATE.md` 也没提。

- 新 M10 = **操作台、定位与外立面**，设计文档 `docs/m10-workbench.md`（494 行，提交 `ed936c6`）。
- 原 **M10 屋顶 → M11**，M11 楼梯 → M12，M12 UI 外壳 → M13，M13 属性面板 → M14，M14 材质 → M15。
- **开工条件**（`m10-workbench.md` 前置 A）：M9 三道闸门全过 + `/recite` 做完。理由是存档版本号要从 M9 定下的 v1 往上加。

**待办**：`ROADMAP.md` 还没按这个顺延改。改之前，「M10」这个词在 `ROADMAP.md` 和 `m10-workbench.md` 里指的是两件不同的事。

grep：`M10 顺延`

---

## D32 · M9 前置 B 五条地基（B1–B5）

**2026-09-21 定**（B2 / B3 由用户在 `/gate app` 里拍板；B1 / B4 / B5 在 core 批里已按推荐实现并跑绿，此处补记）

| | 定的 | 为什么 | 代价 |
|---|---|---|---|
| **B1** 版本号 | **文档级一个整数**，不按节点类型编号 | ① v0 → v1 要把所有类型收进容器，跨类型的迁移不属于任何一个类型；② 按类型编号会变成 N 维兼容矩阵，一个文档没有单一「版本」；③ 按类型编号真正的用户是插件，而我们不做插件（D2）。对照仓库虽然每个 `NodeDefinition` 一个 `schemaVersion`，但加载路径上没人读它（`registry.ts:54` 只校验它是正整数） | 任何一种节点的 schema 变了，整个文档版本号 +1，其它类型白走一遍恒等迁移。迁移只在加载时跑一次，可接受 |
| **B2** 导入 | **新建一个场景**，当前场景不动 | 导入永远不销毁任何东西：不需要「确定要覆盖吗」，也不需要把替换做成可撤销的一步。覆盖是 M9 里唯一会销毁数据的路径，还要和自动保存的顺序打交道 | 导入十次得到十个场景，列表要自己清理 |
| **B3** 误删护栏 | **不抄**对照仓库的 `isSuspiciousNodeDrop`，靠 Ctrl+S 存档点 | 它会让「我真的想清空这个场景」变成静默失败 —— 清空、刷新、东西又回来了，没人说为什么。查过对照仓库 git log：它是随一次功能 PR 进去的，没有证据说它救过什么 | 真误删且没存档点时救不回来。**注意它本来也救不了 M9 最危险的那个 bug**（切场景顺序写反 → 新场景覆盖旧 id，节点数不降反升，护栏不会响） |
| **B4** M4 那笔债 | **只还写入边界**（`updateNode` 里校验合并结果），不做 `NodeOverride<T>` 类型收窄 | 从 M9 起 store 里的东西会落盘，「值不合法的 patch」会让下次读档整层消失（层高 0 → 层 invalid → 墙 / 楼板 missing-parent → 门窗 ancestor-dropped）。收窄改动面铺到 move-tool / endpoint-handles / use-effective-node，而拖拽预览的数据不落盘，收益小 | live 覆盖仍是 `Partial<AnyNode>`，拖拽期间仍无校验 → M13（属性面板会大量写覆盖，那时收益才真实） |
| **B5** 存储接口 | **同步** + 一个薄接口 `KeyValueStore` | localStorage 本身同步。写成 Promise 每个调用点都要 await，启动顺序从三行变成一条异步链，而「读档必须在 render 之前」这条约束会难写得多 | 换 IndexedDB / 服务器时要改这个接口的实现和一次启动流程 —— 但那时我们已经知道自己需要什么了。**接口本身已经有两个实现**（`localStorageKV` / `memoryKV`），core 的测试全靠后者 |

**连带**：B5 那个接口是 core 能在 node 里跑测试的全部原因 —— `createSceneStorage` 只认 `KeyValueStore`，真正碰 `window.localStorage` 的代码住在 `app/persistence/local-storage-kv.ts`。

grep：`前置 B`

---

## D33 · 两条顺序是 app 层的，不是 core 的

**2026-09-21 定**（`/gate app` 的产物；Q3 暴露出「规矩记住了，但它在调用链上的位置没长进去」）

M9 里唯一会真丢数据的两个错，都不在 core：

1. **启动**：先读档、**后** `startAutosave`。反过来，读档那一次 `setState` 被订阅当成改动，把刚读回来的东西又写一遍。
2. **切场景**：先 `stop()`、再 `replaceScene`、再为新场景 `start`。反过来，`stop()` 里那次 flush 读到的 `getState()` 已经是**新**场景，而 `write` 还绑着**旧**场景的 id —— 旧文档被新房子覆盖，不报错、不闪，**下次打开旧场景才发现它变成了别的房子**。

**为什么 core 挡不住**：`storage.save(id, snapshot)` 两个参数都是合法的，它没有任何依据判断这一对是不是该凑在一起。**能挡住的只有调用顺序**，而顺序只存在于 app。

**护栏**：`autosave.test.ts` 把两条顺序**各写两个方向**（对的那个断言写进旧场景、反的那个断言写进新场景）。只写一个方向的话，实现里把顺序写死成任意一种都能绿。

**连带**：`startAutosave` 里**不放** `stopped` 标志位 —— 退订是唯一机制。加了它，「忘记退订」就不可观测（变异测试原本抓不到这一条）。

grep：`两条顺序`
