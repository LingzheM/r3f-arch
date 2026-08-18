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
