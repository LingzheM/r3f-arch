# M8 交接 —— 开新会话前读这个

> 写于 2026-09-10。**M7 尚未验收** —— ① 是真闸门，不是形式。
> M8「多楼层」是 **[机制]** 型 —— 按 D13 先只交 §01–§06，你手写，我 review。
> §07 你要的时候再补（M7 就是这么走的）。

---

## ① 前置闸门 —— **黄的：代码齐了，验收没走**

| 闸门 | 现状（2026-09-10 实测） |
|---|---|
| M7 代码进 `src/` | ✅ 全部补齐，与 `m7-openings.html` §07 那份跑绿拷贝对齐 |
| `pnpm verify` 全绿 | ✅ `check-types` · `eslint` · `vitest` **8 文件 / 95 用例**（M6 基线 51 → 95）|
| M7 §05 的肉眼验收 | ❌ **10 条一条都没走** |

**只欠最后一项，但它恰恰是最不能省的一项。**

### 那 10 条（`m7-openings.html` §05 有全文）

```
1  墙看起来和补批 I 之前【一模一样】     ← 批 I 是纯重构，变了就是搬错了
2  画一堵斜墙，朝向正确                  ← 原点从中点搬到 start，斜墙最容易露馅
3  L 形转角墙角仍然严丝合缝              ← M2 的斜接没丢
4  按 D，幽灵贴在鼠标下的墙面上
5  点一下 → 门落在墙上，墙上有洞
6  站在门洞里转一圈 → 门框内壁看得见      ← ROADMAP 原话「洞是真的」
7  拖墙整体移动 → 门跟着走，相对位置不变    ← I1
8  拖墙端点拉长 → 门【不动】              ← §02 E 的判据
9  选中墙按 Del → 门一起消失              ← I3
10 Ctrl+Z 一次 → 墙和门一起回来
```

另外还有 §05 A 组最后一条，**它单独值一次操作**：
临时给 `SlabNode` 加一个 `position: [5,0,5]` 跑一次，**楼板必须纹丝不动**，然后删掉。
那是 M6 记的那条债（「加错字段会静默平移两次」）真的还清了的**唯一证据**。

### 为什么这一条不能通融

**M7 的父子关系在浏览器里一次都没被验证过，而 M8 是在它之上再套三层。**

这不是流程洁癖，是本次会话的实测教训：M7 批 I 的第 03、04 步被跳过了，
`wall/definition.ts` 少一个 `frame:`、渲染器少一行 `rotation-y`、
墙几何还留着老的 `body` group —— **`pnpm verify` 对这三条从头绿到尾**，
症状伪装成「门的预览位置算错了」，花了一整轮才定位到「墙 group 是单位矩阵」。

M8 之后坐标系会有**四层**（Site → Building → Level → Wall → Door）。
同样的跳步在那时不是难定位一点，是难一个量级。

**先把那 10 条走完，再开 M8。**

---

## ② 粘贴这段

```
项目 C:\Users\User\workspace\meguri\r3f-arch，对照仓库 ..\editor。

先读 docs/README.md 的「工作约定」，再读 docs/STATE.md、docs/DECISIONS.md、
docs/ROADMAP.md，然后扫一遍 src/ 的真实代码并跑 pnpm verify。

本次做 M8 多楼层。[机制] 型，按 D13 只交 §01–§06，不要给 §07。
**开工前先读 docs/handoff-m8.md，①有开工闸门（代码齐了但肉眼验收没走），③有五件不读会走偏的事。**

交付顺序：
1. 先报告实际代码与计划的偏差（含 pnpm verify 的颜色）
2. 再把 ③ 第 2 条那个「def.frame 的签名在 Level 上会破」摊开讲清楚，
   给出三条路各自的代价 —— 这是 M8 的地基，定错了 M10 屋顶还会再撞一次
3. 然后才出 §01–§06

代码写进 docs/m8-*.html，不要动 src/。
按 D16：任何声称验证过的地方，必须同时写清哪些轴没验。
```

---

## ③ 新会话必须知道的五件事

### 1. 规格书 147 行，有用的约 15 行。别读全文

`ROADMAP.md` 说 `wiki/architecture/vertical-model.md` 「必读全文」。
**我读过了——那 147 行里绝大部分是我们范围外的。**

**要读的（约 15 行）**

```
「Stored truth」表的前 6 行     level.height / level.baseElevation / wall.height
                               / ceiling.height / slab.elevation / slab.thickness
「Two schema rules」两条        ← 这是 M8 的核心，见下面第 3 条
「Gotchas」的第一条            Ordinals are semantic：level<0 是地下室，level===0 是首层
```

**要跳过的（占全文 ~85%）**

```
整节「Inheriting terrain」      地形雕刻，D2 排除
整节「Pointer-decided placement」 依赖 terrain + 支撑选举
recessed slab / rim / fillToTerrain / supportSlabId / supportOffset
stair.totalRise / syncStairRises / fence
auto-room（autoFromWalls）
「Clone paths differ」/ 协作 / hosted scene authority
```

**该读的源码顺序**（都很短，加起来 ~250 行）

```
1. packages/core/src/schema/nodes/level.ts       93 行  ← 只有 65-91 是 schema，其余是 import
2. packages/core/src/schema/nodes/building.ts    22 行  ← 全读
3. packages/core/src/schema/nodes/site.ts        44 行  ← 只看 children，polygon/terrain 跳过
4. packages/core/src/services/storey.ts:65-102   38 行  ← getLevelElevations，堆叠算法，可照抄
5. packages/viewer/src/systems/level/level-system.tsx  77 行  ← 楼层显示，见第 4 条
```

### 2. **层的世界 Y 是【算出来的】，不是存的** —— 而且 M7 的 `def.frame` 在这里会破

**这是 M8 的地基，也是新会话最容易走偏的地方。**

**事实 1：`LevelNode` 没有 `elevation` 字段。**（`level.ts:65-91` 实测）

```ts
LevelNode = BaseNode.extend({
  children: ...,
  level:  z.number().default(0),              // ← 序数，不是标高
  baseElevation: z.number().default(0),       // ← 附加偏移
  height: z.number().optional(),              // ← 层高，【没有 default】，见第 3 条
})
```

世界 Y 由 `getLevelElevations` 按序数累加算出（`storey.ts:65-102`）。算法只有 12 行：

```
按 ordinal 排序
cumulative = 0（每栋楼各一个）
for 每一层：
    baseY = cumulative + level.baseElevation
    cumulative = baseY + level.height
```

⚠ **`baseElevation` 是累加的**：它抬高本层，并且**连带抬高同一栋楼里所有更高的层**
（因为它进了 `baseY`，而 `baseY` 又喂给 `cumulative`）。规格书原文也这么写。

> 附：对照仓库用 `WeakMap` 以 `nodes` 记录为键做记忆化。
> 我们的 `useScene` 也是每次改动整体替换 `nodes`，同一个技巧直接可用。

**事实 2：M7 定的 `frame` 签名表达不了这件事。**

`m7-openings.html` §04 的修订框第 2 条写着：

> **`frame` 不收 `ctx`。**原签名是 `(node, ctx: GeometryContext<L>)`。
> 但渲染器那一层根本没有 `ctx`，而 wall / column / door / window
> **四种实现一个都不需要它**。

**Level 是第五种，它需要。** 一层的 Y 依赖**它的兄弟**（所有更低层的 `height`）
和**它的父**（哪一栋楼）。`(node: N) => NodeFrame` 拿不到这两样。

所以 §02 必须正面回答，三条路：

- **(a) 给 `frame` 加回 `ctx`** —— 但渲染器那一层确实没有 `GeometryContext`，
  要么造一个更小的上下文（只要 `resolve` + `siblings`），要么把 `ctx` 铺到渲染器层。
- **(b) 走 `def.system`，每帧 imperatively 写 `obj.position.y`** —— 对照仓库的做法（见第 4 条）。
  代价：**给节点定位就有了两条路**，而 D19 选路 1 的第一条理由正是
  「I1 的强制方式：交给场景图，不可能算错」。两条路 = 回到靠自觉。
- **(c) 把算好的 elevation 塞进 `computeLevelData`** —— `GeometrySystem` 已经在按 kind
  算 levelData 了（`geometry-system.tsx:25-39`）。但那是给 **geometry** 用的，
  渲染器读不到；而且 Level 的位姿要在**几何之前**确定。

**按工作约定第 6 条：无论选哪条，都要显式记录「M7 定的签名为什么改」，不许静默改。**

### 3. 「显式设过高度的墙不变」= **字段在不在**，不是一个 mode 枚举

`ROADMAP.md` 的 M8 验收原文：

> 改层高，该层所有墙跟着变，**显式设过高度的墙不变**。

判据就是 `wall.height` 这个 key 在不在（规格书「Stored truth」表原文）：

| `wall.height` | 含义 |
|---|---|
| **不在** | **plane-bound** —— 顶跟随层平面 |
| **在** | **explicit** —— 半墙、女儿墙，改层高不动它 |

规格书为此写了两条 schema 规则，**两条都要照抄**：

> - **No Zod defaults on meaning-bearing fields.** `level.height`、`wall.height`、
>   `ceiling.height` 都是 `.optional()` 且**没有 `.default()`** —— **absence is data**。
> - **The store deletes explicit-`undefined` keys.** `updateNode(id, { height: undefined })`
>   要**移除这个 key**，不是存一个 `undefined`。

**这就是 `ROADMAP.md` 说的「M1 那个『不给 default』的决定在这里付息」。**

**对我们的两条具体后果**（都实测过当前 `src/`）：

1. ✅ `WallNode.height` 现在是 `z.number().positive().optional()`，**已经没有 default，是对的**。
   要改的是 `getWallHeight`：现在 `?? DEFAULT_WALL_HEIGHT`，M8 要变成 `?? 层平面高度`。
2. ❌ **我们的 `updateNode` 删不掉 key。** 它是 `{ ...prev, ...patch }` ——
   传 `{ height: undefined }` 会留下一个值为 `undefined` 的 key，
   于是 `'height' in wall === true`，判据当场失效。
   **而 M7 刚给 `updateNode` 加过守卫，M8 要再动它一次** —— 那三行守卫别删，是并列的。

**简化**：对照仓库的层平面是 `min(层高, 上层楼板底面)`（`getWallPlaneTop`，
`storey.ts:338-354`）。**M8 只做 `层高` 那一半**，「上层楼板压低下层墙」留到有需要时。
显式记成到期缺陷。

### 4. 楼层显示在对照仓库里**不是声明式的**

`ROADMAP.md` 写「当前层实心、下层灰显、上层隐藏」。对照仓库的实现是
`LevelSystem`（`level-system.tsx`，77 行），**每帧 imperatively 写 `obj.position.y`**：

- `levelMode: 'stacked' | 'exploded' | 'solo'`，exploded 给每层加 `ordinal × 5`
- **带 lerp 动画**（而且注释里记了一次事故：朴素 `lerp(y, target, delta*12)`
  在慢帧下发散，楼层飞到几公里外）
- solo 时，**被隐藏的、在 soloed 层【上方】的层保留在 shadow map 里**，
  这样太阳还能透过它们给 soloed 层打阴影；下方的层直接 `visible = false`

这和第 2 条的 (b) 是同一件事：**它绕过了 `def.frame`。**§02 要一起定。

> 📌 **`sceneRegistry.byType` 终于有了第一个真读者。**
> `level-system.tsx:29` 是 `sceneRegistry.byType.level!.forEach(...)`。
> 这条从 M1 记到现在的债（「有写入无读者」），M7 明确说过不会还
> （`m7-openings.html` §06），**M8 还**。

### 5. M8 顺手结清的债 + M7 暴露的一个新问题

| 债 | 记在哪 | M8 怎么办 |
|---|---|---|
| 墙底在 y=0、楼板顶在 0.05 ⟹ 墙陷进楼板 5cm | M6 | 墙的 y 变成**层内相对标高**，一次结清 |
| 天花高度硬编码，不「吸附到层顶」 | M6 | 层顶现在存在了。ROADMAP 原话：「原文做不到，因为『层』要 M8 才存在」 |
| 墙高存在 `wall` 自己身上，无楼层概念 | M1 | 本 M 的主线 |
| `sceneRegistry.byType` 有写入无读者 | M1 | 见第 4 条 |
| 门的高度夹紧读 `getWallHeight(wall)` | M7 §06 | **只有一处**（`clampOpeningToWall` 的 `wall.height` 参数），因为 M7 把夹紧抽成了纯函数 |

**M7 暴露的新问题（不在 ROADMAP 的清单里）**：

M7 的 `addNode` 要求**宿主必须已存在**（不存在直接抛错）。
有了 `Site → Building → Level` 之后，**建一堵墙需要知道「当前层」是谁** ——
而 `useEditor` 现在完全没有「当前楼层」这个概念，
`WallTool` / `PolygonTool` / `ColumnTool` 都是直接 `addNode({ type: 'wall', ... })`，`parentId` 为 null。

**这是 M8 的第一个真问题**，而且它会同时碰四个工具。

**M7 已经替 M8 铺好的**：`def.frame` + `children` 递归渲染 ——
`Level` 就是又一个宿主 frame，层高偏移**自动**传给墙、传给门，一行复合代码都不用写。
这正是 D19 选路 1 时列的第六条理由，现在到期兑现。

---

## ④ 这份交接为什么这么写（给用户看的，新会话可跳过）

三点和 `handoff-m7.md` 不同：

1. **① 只欠一项，而我仍然把它当成硬闸门。**
   代码齐了、`verify` 全绿、95 个用例——**看起来可以开工了**。
   但欠的那一项恰恰是唯一能看见渲染的那一项。
   理由不是原则，是**本次会话刚发生过的事**：跳过批 I 的两步，`verify` 全绿，
   症状伪装成别的问题。**「绿」在这个项目里已经骗过八次了。**

2. **③ 第 2 条是一条【推翻 M7 决定】的发现。**
   M7 我自己写下「`frame` 不收 `ctx`，因为四种实现一个都不需要」——
   读完 `level.ts` 才发现 Level 是第五种，而它需要。
   **我没有替新会话选**：三条路和各自的代价摆出来了，
   因为这个决定会连着影响 M10 的屋顶面宿主，而那个我还没读。

3. **③ 第 1 条又花了篇幅说「别读什么」。**
   和 M7 一样的理由，但这次比例更极端：147 行的规格书里 ~85% 是
   terrain / 支撑选举 / 楼梯 / 围栏 / 自动房间 / 协作，全在 D2 的排除清单里。
   一个照 ROADMAP「必读全文」读的新会话，会先读完再发现读错了。

另外**建议 M8 单独一个会话**，不和 M9 合并。M8 会做这个项目的
**第一次真实 schema 迁移**（`wall.height` → `level.height`），
而 M9 是存档/导入导出——两个都碰序列化，混在一起出问题分不清是迁移写错了还是存档写错了。
