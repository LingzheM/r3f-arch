# M7 交接 —— 开新会话前读这个

> 写于 2026-09-04（**M6 已验收通过**：代码 + `pnpm verify` 全绿 + §05 肉眼验收走完）。
> M7「门窗与开洞」是 **[机制]** 型 —— 按 D13 **只交 §01–§06**（设计 + 方法签名 + hint，
> **不含实现体**），你手写，我 review。§07 你要的时候再补。
> 这和 M6 的形态完全不同，别按 M6 的节奏预期。

---

## ① 前置闸门 —— 全绿，可以开工

| 闸门 | 现状（2026-09-04 实测） |
|---|---|
| M6 代码进 `src/` | ✅ `0b4b879`→`a5e4ee6`，26 文件 / +726 行 |
| `pnpm verify` 全绿 | ✅ `check-types` · `eslint` · `vitest` **5 文件 / 51 用例** |
| M6 §05 的 22 条肉眼验收走完 | ✅ 含 D 组两条回归 |

**M6 已验收通过。**其中 D 组那两条值得新会话知道，因为 M7 会再碰同一块地方：

1. ✅ L 形转角**墙角严丝合缝** —— `def.computeLevelData` 在工作，M2 的斜接没丢
2. ✅ 只移动鼠标时 `buildPolygonPrism` **计数不涨** —— `clearDirty` 在工作

**为什么这两条要写进交接**：M7 要往墙上挖洞，改的正是 `buildWallGeometry` ——
也就是消费 `ctx.levelData`（斜接）的那个函数。
**开洞之后如果墙角出问题，你现在知道那不是斜接的锅，是你新加的洞的锅。**
这个"已知良好"的基线，比闸门本身值钱。

---

## ② 粘贴这段

```
项目 C:\Users\User\workspace\meguri\r3f-arch，对照仓库 ..\editor。

先读 docs/README.md 的「工作约定」，再读 docs/STATE.md、docs/DECISIONS.md、
docs/ROADMAP.md，然后扫一遍 src/ 的真实代码并跑 pnpm verify。

本次做 M7 门窗与开洞。[机制] 型，按 D13 只交 §01–§06，不要给 §07。
**开工前先读 docs/handoff-m7.md，①有开工闸门，③有四件不读会走偏的事。**

交付顺序：
1. 先报告实际代码与计划的偏差（含 pnpm verify 的颜色）
2. 再把 ③ 第 2 条那个「门窗的 position 到底在谁的坐标系里」摊开讲清楚，
   给出两条路各自的代价 —— 这是 M7 的地基，定错了后面全歪
3. 然后才出 §01–§06

代码写进 docs/m7-*.html，不要动 src/。
按 D16：任何声称验证过的地方，必须同时写清哪些轴没验。
```

---

## ③ 新会话必须知道的四件事

### 1. M7 的规格书比 ROADMAP 写的薄，真材料在别处

`ROADMAP.md` 的 M7 写着「参考源码：`wiki/architecture/spatial-queries.md`」。
**我读过了 —— 那 104 行讲的是家具摆放的碰撞检测（空间网格），不是门窗的宿主机制。**
对我们有用的只有 ~20 行：`canPlaceOnWall` 的签名和 `adjustedY` 那条规则。

真正该读的顺序：

```
1. packages/core/src/schema/nodes/door.ts       164 行  ← 只读 DoorNode，44-70 行是全部关键
2. packages/core/src/schema/nodes/window.ts     115 行  ← 同上，和 door 几乎一样
3. wiki/architecture/spatial-queries.md         104 行  ← 只读 canPlaceOnWall 那一节
4. packages/viewer/.../opening-cutout-geometry.ts 246 行  ← Shape+holes 的核心，D6 的兑现
5. packages/viewer/.../wall-cutout.tsx          273 行
6. packages/viewer/.../wall-system.tsx         1281 行  ← ⚠ 只读开洞那一段，别从头读
```

**要跳过的**（合起来 2160 行，占门窗全部源码的 85%）：

```
packages/nodes/src/door/tool.tsx      770   ⚠ 跳过：铰链方向/开启动画/双开/推拉/车库门
packages/nodes/src/window/tool.tsx    842   ⚠ 跳过：同上
packages/nodes/src/door/definition.ts 286   取 kind + geometry + relations，~15 行
packages/nodes/src/window/definition.ts 267  同上，~15 行
packages/nodes/src/door/door-math.ts   62   ← 这个要读，墙上定位的数学就在这里
```

`DoorNode` 有 `DoorSegment` / `DoorType`（10 种）/ `DoorTrackStyle` / `OpeningConstructionType`…
**读到 `DoorType` 那个 10 项枚举就该停**，和 M6 的 column 一样：D2 排除造型细节，
我们要的是 `position` / `wallId` / 洞口尺寸，五六个字段。

### 2. 门窗的 `position` 在【墙的局部坐标系】里 —— M6 那条债现在到期了

**这是 M7 的地基，也是新会话最容易走偏的地方。**

`m6-slab-ceiling-column.html` §06「来源三」第一条记的债：

> 「有 `position` 就绑，没有就信封」这条判据**没有任何机制强制**。
> 有人给 `SlabNode` 加一个 `position` 字段，楼板会立刻**被平移两次**，而且不报错。
> → **M7 复核**

现在复核，结论是：**判据不够用了。**

对照仓库 `door.ts:56-64` 的原文（讲 `roofSegmentId` 那条替代宿主时顺带说明了主路的约定）：

> *…`position` is FACE-LOCAL — [u along the face, v height, z from the wall mid-plane] —
> **exactly the wall-child convention**; the renderer mounts the node inside the face frame…*

翻译：**门的 `position` 不是世界坐标，是「沿墙面走多远 / 多高 / 离墙中面多深」。**

而我们的 `ParametricNodeRenderer` 绑的是**世界坐标**——它的 `<group>` 挂在
`scene-renderer` 底下，`position={node.position}` 直接就是世界位置。
M6 的 column 能用，是因为 column 的 `position` 恰好就是世界坐标。

所以 §02 必须正面回答：

- **门的 group 要不要挂到墙的 group 底下**（真正的父子关系，transform 自然复合）？
- 还是**保持平挂，由 builder 把墙的 transform 复合进去**（回到"信封"）？
- 还是**渲染器长出第三种模式**（`space: 'world' | 'local' | 'host'`）？

第三条正是 M6 §06 记的「可能的强制方式」。**M7 是决定它的时候。**

> ⚠ 顺带一条 M6 实测撞到的：**`eventToGround` 只和 y=0 地平面求交。**
> 3D 透视下点"柱子上方"，射线会越过柱子落在它后面的地面上。
> **门窗要落在墙面上，这套彻底不够用了** —— 得改成对 `sceneRegistry` 射线求交、
> 命中墙之后反算墙上的参数。这是 M7 的第一节课，也是
> `sceneRegistry.byType`（M1 就写入、至今零读者）的第一个真消费者。

### 3. 两处分叉，§02 要定

| 分叉 | ROADMAP 说 | 对照仓库实际 | 备注 |
|---|---|---|---|
| **沿墙定位** | 参数 `t ∈ [0,1]` + 底标高 | **绝对局部米**（`localX: distance along wall from start`，见 `spatial-queries.md`） | 差别是**拉伸墙的时候门怎么动**：归一化 `t` ⟹ 门跟着按比例挪；绝对米 ⟹ 门离起点的距离不变。**后者才是建筑的直觉**，但 ROADMAP 写的是前者。<br>**按工作约定第 6 条，改了要显式记录，不许静默替换。** |
| **开洞几何** | Shape + holes（D6） | 直墙矩形洞用 Shape+holes；屋顶裁墙才上 CSG | D6 已经定了，M7 不要重开这个。<br>但要写清 **Shape+holes 的天花板在哪** ——`m6` 的 §00 第 ② 步记过同类经验：`ExtrudeGeometry` 的**洞内壁是单面的**，从洞里往一侧看会看穿。这条对门窗是**致命**的（洞就是要从里面看的）。**§02 必须回答怎么处理，或者显式记成到期缺陷。** |

### 4. M6 留给 M7 的债，一次结清

| 债 | 记在哪 | M7 要做什么 |
|---|---|---|
| 「有 `position` 就绑」判据无强制 | M6 §06 来源三 ① | 见上面第 2 条，**§02 的主要内容** |
| 绕向不做归一化 | M6 §06 来源二 | **挖洞时洞必须和外轮廓反向** ⟹ `signedArea` 终于有消费者（已导出、已测） |
| `sceneRegistry.byType` 有写入无读者 | M1 起 | 射线拾取墙时按 kind 过滤，第一个真消费者 |
| `grid:click` 每次都对 sceneRegistry 多射一次线 | M3 | M7 会再射一次（拾取墙面）⟹ 值得合并/缓存 |
| 删墙没有级联 | M4 | 删墙要连门窗一起删 —— `removeNode` 现在完全没有子节点概念 |

**M6 已经替 M7 铺好的**：`ParametricNodeRenderer` 的 `position` 绑定（第一条路已通，
第二条路要新开）· `signedArea` 已导出并测过 · 三种类型共存证明了注册表通用 ·
`SelectionManager` 按注册表订阅（门窗自动可选中，0 改动）。

---

## ④ 这份交接为什么这么写（给用户看的，新会话可跳过）

三点和 `handoff-m6.md` 不同：

1. **闸门是空的，但 ① 仍然占了一节。**M6 那次闸门是 18 处代码修复；这次开工前一条不欠。
   留着它是因为 **D16**：那两条回归只有肉眼看得见，`verify` 对它们从头绿到尾。
   写清楚已经验过什么，比写还差什么更有用 —— 它给了 M7 一条**已知良好的基线**。

2. **③ 第 1 条花了篇幅说"别读什么"。**`ROADMAP.md` 指的那份规格书基本不对题，
   而门窗的两个 `tool.tsx` 合起来 1612 行、全是我们范围外的开启方式。
   一个照 ROADMAP 读的新会话会先花掉半个上下文窗口，然后才发现读错了。
   我已经替它读过并标了行号。

3. **③ 第 2 条把结论留白了。**M7 是 `[机制]` 型 —— 按 D13 是**你手写**。
   我把三条路和各自的代价摆出来，**没有推荐哪一条**：
   因为这个决定会连着影响 M8（楼层）和 M10（屋顶裁墙），
   而那两个的形状我现在还看不清。凡是要判断的地方我都标了「§02 要定」。

另外**建议 M7 单独一个会话**，不和 M8 合并。理由和 M6 那次一样，而且更强：
M7 结束时会出现这个项目的**第一个父子关系**（`door.parentId = wall.id`），
M8 的 `Site → Building → Level` 是在它之上再套三层。**地基没干透就砌墙，塌下来分不清是谁的锅。**
