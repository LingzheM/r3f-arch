# M6 交接 —— 开新会话前读这个

> **⚠ 2026-09-02 更新：M6 已经写完了 —— `docs/m6-slab-ceiling-column.html`**
> （前置 A/B/C + §00–§07，3232 行）。**开工闸门以那份的「前置 C · 21 处编辑」为准。**
> 本文件保留作为「交接指令是怎么设计的」的记录，以及 ③ 那四条背景说明。

> 更新于 2026-09-02（M5 代码已进 `src/` 之后重写）。
> M6「楼板、天花、柱」是 **[模式]** 型，一次交完 §01–§07。

---

## ① 前置闸门 —— 两条全绿才开新会话

| 闸门 | 现状（2026-09-02 实测） |
|---|---|
| M5 代码进了 `src/` | ✅ `core/registry/` + `viewer/nodes/wall/` + `viewer/systems/geometry-system.tsx` 都在（commit `abda947`、`7a822e4`） |
| `pnpm verify` 全绿 | ❌ **`check-types` 12 个错**，且 `GeometrySystem` 有两个编译器看不见的 bug |

**verify 红着别开 M6。**理由不是流程洁癖：M6 的第一件事是**测量 M5 成不成立**（见 ③ 第 1 条）。
现在 `GeometrySystem` 少了一句 `clearDirty`、`computeLevelData` 从没被调用过 ——
带着这两个 bug 去测量 M5，测出来的是噪声。

### 开工前必须清掉的清单

> **全部整理成了可执行清单：`docs/m6-prep.md`**（10 处编辑 + 2 个删除 + 2 个新文件，
> 已在 `src/` 的完整拷贝上验证过能修到全绿）。下面是摘要。

**A · 9 个 M4 遗留编译错** —— 完整修法在 `m4-drag.html` §08（已验证的 14 处编辑 + 4 个测试文件）。

**B · 3 个 M5 新增问题**

| 位置 | 问题 |
|---|---|
| `viewer/components/wall-renderer.tsx` | M5 应删未删。已成孤儿（没人 import），但它 import 了两个不存在的东西 → 2 个编译错。连 `viewer/hooks/use-level-miters.ts` 一起删 |
| `core/registry/node-definition.ts:19` | `geometry` 写成了**必填**（没有 `?`）→ `node-renderer.tsx:28` 的 `if (def.geometry)` 报 TS2774 |
| `core/registry/node-registry.ts` | 缺 `resetNodeRegistry()`。M6 要写注册表测试，没有它测试之间会互相污染 |

**C · 2 个编译器看不见的 `GeometrySystem` bug** —— 这两个最要紧，因为 verify 修绿之后它们还在

| 行 | 问题 | 症状 |
|---|---|---|
| 25 / 32 / 37 / 68 | `levelDataBykind` **声明了、读了，但从没写过**。阶段一算出 `siblings` 存进了 `effectiveBykind`，却<strong>没有调 `def.computeLevelData(siblings)`</strong> | `ctx.levelData` 恒为 `undefined` → `buildWallGeometry` 退化成 `calculateLevelMiters([node])`（只有自己）→ **墙角斜接全部失效**，M2 的成果丢了 |
| 79 | 重建成功后**没有 `clearDirty(id)`** | 脏集只增不减 → 每一堵墙每帧都 dispose + 重建一次 ExtrudeGeometry → M4 的头号目标（「只移动鼠标时一次不重算」）反向达成 |

---

## ② 粘贴这段

```
项目 C:\Users\User\workspace\meguri\r3f-arch，对照仓库 ..\editor。

先读 docs/README.md 的「工作约定」，再读 docs/STATE.md、docs/DECISIONS.md、
docs/ROADMAP.md，然后扫一遍 src/ 的真实代码并跑 pnpm verify。

本次做 M6 楼板、天花、柱。[模式] 型，按 D13 一次交完 §01–§07。
**开工前先读 docs/handoff-m6.md，①有开工闸门，③有四件不读会走偏的事。**

交付顺序：
1. 先报告实际代码与计划的偏差（含 pnpm verify 的颜色）
2. 再交「M5 检验测量」—— 照 src/ 里实际的注册表加一个 slab，
   要碰几个文件、写多少行、要不要改任何框架文件？
   **要改框架文件就说明 M5 没成立，停下来报告，先别写 M6 方案。**
3. 测量通过之后，才出 M6 的 §01–§07

代码写进 docs/m6-*.html，不要动 src/。
```

---

## ③ 新会话必须知道的四件事

### 1. M6 是 M5 的验收，不只是"下一个里程碑"

`ROADMAP.md` 的 M6 验收原文：

> **加第三种类型的工作量 ≈ 加第二种。这一条本身就是对 M5 的检验。**

所以新会话的**第一件交付是一次测量，不是方案**。基线在
`m5-registry-answers.html` §05 第一条：M5 之前加类型要碰 **18 处 / 11 个文件**，
M5 之后应该是 **5 处、框架文件 0 处**。

**测量不通过就停。**M6 一口气加三种类型；注册表如果没真正成立，
那就是把同一个错误复制三遍 —— 而且是在你已经相信它成立的前提下复制的。

### 2. M5 的三处分叉：用户实际选的（已核过代码，不必再猜）

| 分叉 | 用户实际的选择 | 位置 |
|---|---|---|
| 定义放哪层 | 类型住 `core/registry/node-definition.ts`（`import type * as THREE`），实例住 `viewer/nodes/wall/` | 和 `m5-registry-answers.html` 一致 |
| `AnyNode` | 继续手写 `discriminatedUnion` | `core/schema/types.ts` 未变 |
| 斜接 | `def.computeLevelData`（**但系统里没调用，见 ① C**） | `viewer/nodes/wall/definition.ts:9` |
| 标脏方法名 | **`makeDirty`**（不是文档里的 `markDirty`） | `core/store/use-scene.ts:63` |

> `docs/m5-registry-answers.html` 是助手写的**一个**答案，不是这个项目的规格书。
> 上表已经核过真实代码，可以直接用；但**再遇到没列的项，一律以 `src/` 为准**。

### 3. M6 是两种节点形状的第一次碰撞 —— 这是 §02 的主要内容

对照仓库的 schema 实测（`packages/core/src/schema/nodes/`）：

```
slab      polygon: [[x,z], …] + elevation + thickness    ← 没有 position
ceiling   同 slab                                          ← 没有 position
column    position: [x, y, z] + radius / width / height   ← 有 position
```

**这正好撞上 M5 留下的一条债**（`m5-registry-answers.html` §06 来源三第四条）：

> 墙的 transform 由 builder 算（因为 `WallNode` 没有 `position`，只有 `start`/`end`）——
> 和 M6 的 slab / column 会走两条不同的路 → **M6 复核**

现在可以确认这条债是真的：
- **wall / slab / ceiling** —— 由点定义，几何和位置分不开 → builder 返回"信封"（`root > body > mesh`）
- **column** —— 由 `position` 定义，是规格书 Rule ② 说的那种正常情况 → 渲染器可以直接绑 `<group position={node.position}>`

§02 必须回答：`ParametricNodeRenderer` 要不要长出一个 `position` 绑定（让 column 走规格书原路），
还是三种都用信封？**两条路并存不算失败** —— 规格书自己就允许，但"为什么并存"要写清楚，
否则 M7 门窗（也有 position）来的时候没人知道该走哪条。

### 4. 顺序是 slab → ceiling → column，多边形工具在**第二种**出现时才抽

- **slab 先**：最简单，且是 ceiling 的基础
- **ceiling 第二**：复用 slab 的几乎全部 —— **这时候才抽多边形绘制工具**。
  写 slab 时就抽是提前抽象（D10 rule of three）；等到 column 才抽就晚了
- **column 最后**：和前两个完全不同（有 position、参数化截面、不用多边形工具）。
  **它是"注册表真的通用吗"的对照组** —— 前两种共享太多，
  只有 column 能证明注册表不是"多边形节点专用"

#### 对照源码的行数账（新会话该抄多少）

```
packages/nodes/src/slab/geometry.ts             335    取轮廓挤出，~60 行
packages/nodes/src/slab/definition.ts           381    取 kind + geometry，~10 行
packages/nodes/src/slab/tool.tsx                394    点击成环的绘制工具，~80 行
packages/nodes/src/ceiling/definition.ts        233    ~10 行
packages/nodes/src/column/definition.ts         428    ~10 行
packages/nodes/src/column/tool.tsx              220    单击放置，~40 行

core/src/lib/slab-polygon.ts                    825    ⚠ 整个跳过（自相交/布尔/洞）
editor/.../tools/shared/polygon-editor.tsx     1267    ⚠ 整个跳过（顶点编辑 → M13）
core/src/lib/polygon-geometry.ts                109    取面积/质心/绕向判定，~30 行
```

**2364 行的多边形工具里我们要 ~110 行。**M6 只做「点击成环 → 挤出」，
不做自相交检测、不做布尔运算、不做顶点编辑。那三样各自到期 M11 / M9 / M13。

---

## ④ 这份交接为什么这么写（给用户看的，新会话可以跳过）

`README.md` 的「开新对话时贴这段」是通用模板，它对 M3/M4/M5 够用，对 M6 漏了两件事：

1. **它没有前置闸门。**M1–M5 的每一个都能在上一个没完全收尾时开工
   （M4 就是在 M3 肉眼验收没走完时开的）。**M6 不行** —— 它的第一件交付
   是对 M5 的测量，而现在 `GeometrySystem` 的两个 bug 会让测量结果全是噪声。

2. **它假设"读 `src/` 的真实代码"就够了。**M5 之后多了一份**参考答案**躺在 `docs/`
   里，而它写的是"一个"答案不是"这个项目的"答案。一个只看文件名的新会话
   会把 `m5-registry-answers.html` 当成 M5 的规格书 —— 这是这个项目第一次
   出现"文档可能比代码更权威"的错觉，值得单独挡一下。
   （所以 ③ 第 2 条我已经替新会话核过真实代码了。）

另外**建议 M6 单独一个会话**，不按 `ROADMAP.md` 对话分组里的 M6–M8。
M7（门窗与开洞）和 M8（多楼层）都是 [机制] 型，各自需要读两三页 wiki 规格书；
M6 是 [模式] 型但要一次加三种类型。三个塞一个会话，到 M8 时上下文早就摘要过好几轮了。
**实际经验：对话 2 计划装 M3–M5，装到 M4 就满了。**
