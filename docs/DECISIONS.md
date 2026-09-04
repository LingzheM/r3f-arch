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
