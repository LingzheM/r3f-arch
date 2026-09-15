# M8 演示问题记录

> 来源：2026-09-15 用户照「用现有功能盖一栋两层小楼」的步骤实际操作后反馈。
> **本文件只记录，不修改 `src/`。** 修正统一放在开 M9 之前做。
> 每条的格式：现象 → 调查方法 → 调查结果 → 方案 → 优先级 / 到期 → 状态。
> 「调查结果」一律标明验证到哪一层（D16）。这一轮**没有在浏览器里复现过任何一条**，结论来自读代码和读依赖源码。
> 文中引用的颜色、常量、行号、`STATE.md` 条目，已于 2026-09-15 对照**你的 `src/`（批 A–J 敲入后）**和 `node_modules` 逐条核对过；
> 核对时更正了三处初稿错误（P1 的 R3F 行号、P1 漏写 `onWallClick` 已有 `stopPropagation`、P2 的控制台片段拿不到 store）。

---

## 总表

| # | 问题 | 性质 | 优先级 | 到期 | 状态 |
|---|---|---|---|---|---|
| P1 | 多层叠放时，拖动墙 / 放门窗会作用到**下层**的墙 | **bug** | **高** | **M9 之前** | 已定位，待修 |
| P2 | 创建天花板后，天花板**选不中** | 待查 | **高** | **M9 之前** | 有假设，待复现 |
| P3 | 屋顶层创建天花板，天花板**悬空** | 设计如此 + 演示文档写错 | 中 | M9 之前（改文档） | 已定位，待改文档 |
| P4 | 顶视图放门窗，门窗**朝向无法选择** | bug | 中 | M9 之前 | 已定位，待修 |
| P5 | 楼板（多边形）预览虚线被墙遮住 | 体验 | 中 | M9 之前 | 已定位，待修 |
| P6 | 顶视图里墙和地面几乎同色，很难找到墙 | 体验 | 低 | M12 | 已定位 |
| P7 | 画内隔墙时，无法确认落点是否在墙上 | 缺功能 | 低 | M12 | 已定位 |
| P8 | 顶视图里选中墙「没有变绿」 | 体验 | 低 | M12 | 已定位 |
| P9 | 选中某层的墙后切层，端点球留在半空 | bug | 低 | M12 | 已定位（批 I 已记） |

---

## P1 · 多层叠放时，拖动墙 / 放门窗会作用到下层的墙

**现象**

屋顶层按 V，拖动墙时，被拖走的是**下面楼层**的墙。

**调查方法**

1. 读 `app/tools/move-tool.tsx` 的 `onWallPointerDown`、`app/tools/opening-tool.tsx` 的 `onWallMove` / `onWallClick`，看它们有没有调用 `stopPropagation`。
2. 对照 R3F 的事件派发规则（批 D 已读过 `@react-three/fiber` 9.7.0 源码）：
   - `events-b1bdeb1a.cjs.dev.js:614-688`：一条射线上**每一个**挂了事件的命中都会被推进 `intersections`（`:674`），按距离从近到远；
   - 同文件 `:692` `handleIntersects` 逐个派发，`:806` `if (localState.stopped === true) break` —— 只有调用 `stopPropagation` 才会停止向更远的物体派发。
3. 对照 `app/components/selection-manager.tsx` 的 `onNodeClick`：它调用了 `stopPropagation`。

**调查结果**（读代码 + 读依赖源码，**未在浏览器中复现**）

- 顶视图里，各层外墙在 XZ 上重合，一条射线会**依次穿过屋顶层、二层、一层的墙**。
- `SelectionManager` 在 click 时调用了 `stopPropagation` ⟹ **选中的是离鼠标最近的那面墙**（正确）。
- `MoveTool.onWallPointerDown`（`move-tool.tsx:132-153`）**没有**调用 ⟹ pointerdown 被派发给射线上的每一面墙，每一次都用**那面墙自己的** `planeY` / `levelWalls(wall.parentId)` 覆盖 `candidateRef`，最后留下的是**最远（最底层）**那面 ⟹ 拖走的是下层的墙，而且拖动平面也是下层的。
- `OpeningTool.onWallMove`（`opening-tool.tsx:75-90`）**也没有**调用 ⟹ `previewRef` 同样被最底层的墙覆盖。
- `OpeningTool.onWallClick`（`:95-107`）**其实调用了** `stopPropagation`（`:100`），但它排在 `e.node.id !== preview.wallId` 这个 return **之后**：近处的墙 id 对不上，直接 return、没拦；派发继续到最底层那面，id 对上，这时才拦 ⟹ **门窗落到下层墙上**。所以光看「有没有 `stopPropagation`」会漏判，要看它在哪一行。
- 单层时每条射线最多命中一面墙，所以 M4 / M7 从来没暴露。**是 M8 把楼层叠起来之后才出现的。**
- 在 3D 侧视角里基本不触发（水平方向的射线穿不到别的楼层），所以主要影响顶视图。

**方案**

各加一行，都在 app 层，**只认离鼠标最近的那面墙**：

```ts
// app/tools/move-tool.tsx —— onWallPointerDown，两个 return 判断之后
    if (wall.type !== 'wall') return
    // 多层叠放时射线会穿过好几层的墙，R3F 按远近逐个派发。
    // 不拦住的话，更低层的墙会覆盖 candidate，拖走的是最底下那面。
    e.stopPropagation()
```

```ts
// app/tools/opening-tool.tsx —— onWallMove
    const hit = hitFrom(e)
    if (!hit) return
    e.stopPropagation()   // 同理：只认离鼠标最近的那面墙
```

为什么是「最近的」而不是「当前层的」：批 I 已经把上层搬到隐藏图层（射线打不中），所以射线上最近的墙只可能是当前层或灰显的下层；而批 H 的设计是灰显的下层**允许编辑**。

**验收（修完后）**：顶视图、屋顶层拖一面与下层重合的墙 → 只动屋顶层那面；二层顶视图放门 → 门在二层墙上。
**测试**：这一层是 React 事件接线，vitest 抓不到（D11），只能靠上面两条肉眼验收。

**优先级 / 到期**：**高 —— 它会静默地改错数据**。M9 之前。

---

## P2 · 创建天花板后，天花板选不中

**现象**

在 3D 视图（**不是**顶视图）画了天花板，之后点它选不中。

**调查方法（已做的静态部分）**

1. `viewer/nodes/ceiling/definition.ts`：只有 `kind` 和 `geometry`，**没有** `selectable: false` ⟹ `selectableKinds()` 包含 ceiling，`SelectionManager` 订阅了 `ceiling:click`。
2. `viewer/components/parametric-node-renderer.tsx`：`interactive = def?.selectable !== false` ⟹ 天花板的 group 上挂了事件。
3. `viewer/nodes/shared/polygon-prism.ts`：`MeshStandardMaterial` 默认 `FrontSide`；挤出体经 `rotateX(-π/2)` 后，`z = depth` 那个盖面朝 `+Y` ⟹ 从上方点击，射线打得到顶面；**从下方点击，打的是底面，也应该打得到**（底盖朝 `-Y`，是正面）。
4. `app/tools/polygon-tool.tsx`：`commit()` 之后只执行 `reset()`（清空点），**工具仍然是 ceiling，交互 scope 仍然是 `drafting`**。
5. `app/components/selection-manager.tsx:11`：`if (!isSelectionEnabled()) return` → `use-interaction-scope.ts:39` → `lib/interaction/scope.ts:33` `selectionEnabled(scope)`：**只有 `idle` 才允许选中**。
6. `polygon-tool.tsx:31-37`：scope 只在工具**卸载**（切到别的工具）时才 `endIf(drafting)` 回到 `idle`。

**调查结果**（静态，**未复现**）

几何、注册、事件挂载三条链路在代码上都是通的。最可能的原因按可能性排序：

| 假设 | 依据 | 怎么确认 |
|---|---|---|
| **H1 画完天花板后仍处于 G（天花板）工具，没按 V** | 第 4、5 步：`drafting` 状态下选中被整体禁用，这是 M3 的铁律 | 看状态栏第一个词：是 `ceiling` 还是 `select` |
| H2 按了 V，但点击被离镜头更近的物体挡住 | `SelectionManager` 选射线上**最近**的那个。但若天花板正是 P3 那种悬在墙顶之上的，从上方看它本身就是最近的，**这种情况下 H2 不太可能**；只有从下方或水平视角点才会被墙挡住 | 按 V 后从正上方点天花板中央，看状态栏 `sel=` 是否变成 `ceiling_xxxx` |
| H3 天花板所在的层不是当前层 | 批 I：上层被搬到隐藏图层，射线打不中 | 控制台：天花板的 `parentId` 是否等于当前层 id |

**待做的运行时调查**（按顺序，第一条命中即停）：

H1 不用控制台：**状态栏第一个词**就是 `activeTool`（`app.tsx:93`）。其余几条要在浏览器控制台里跑。store 没有挂到 `window` 上，
要用 Vite 的动态 import 拿（和批 E 建层的写法一样）：

```js
const { useScene }      = await import('/src/core/store/use-scene.ts')
const { useEditor }     = await import('/src/app/store/use-editor.ts')
const { sceneRegistry } = await import('/src/core/registry/scene-registry.ts')
const { getScope }      = await import('/src/app/store/use-interaction-scope.ts')

useEditor.getState().activeTool                 // H1：若为 'ceiling'，按 V 再试
getScope().kind                                 // H1：按 V 之后应为 'idle'
const c = Object.values(useScene.getState().nodes).filter(n => n.type === 'ceiling')
c.map(n => ({ id: n.id, parent: n.parentId }))  // H3：parent 是否为当前层
useEditor.getState().currentLevelId             // ⚠ 从没切过层时是 null（由 resolveCurrentLevelId 兜底成最低层），null 不代表出错
sceneRegistry.nodes.get(c[0].id)?.children.length  // 几何是否真的建出来了（应 ≥ 1；你已经看到它悬空，大概率是）
```

**方案**

- 若为 **H1**：代码无误，属于体验问题。M12 的工具提示条里提示「按 V 选择」。演示文档写明「画完先按 V」。
- 若为 **H2**：同 P1 的思路，确认 click 的派发顺序；必要时在 `SelectionManager` 里按 kind 优先级处理重叠（待复现后再定，**不预先改**）。
- 若为 **H3**：检查 `PolygonTool` 的 `parentId: readCurrentLevel().id`（批 H）是否敲对。
- 若三条都不是：记录复现步骤，进入 `/diagnosing-bugs` 流程。

**优先级 / 到期**：高（先确认是不是 bug）。M9 之前。

---

## P3 · 屋顶层创建天花板，天花板悬空

**现象**

当前层是最高层（屋顶层）时，在 **3D 视图**里画天花板，天花板悬在空中。

**调查方法**

1. `viewer/nodes/ceiling/geometry.ts`：`bottomY = resolveCeilingHeight(node, hostStoreyHeight(node.parentId, ctx.resolve))`。
2. `core/services/storey.ts`：`resolveCeilingHeight = ceiling.height ?? storeyHeight − 0.01`，`hostStoreyHeight` 取所在层的 `height`。
3. 对照演示第 12、13 步：屋顶层（层 2）是一个完整的楼层（层高 2.5），墙被改成了 1 m 的显式高度（女儿墙）。
4. 确认视图模式无关：`PolygonTool` 在 3D 和顶视图下都用 `readCurrentLevel()`，`parentId` 和求交平面相同。

**调查结果**（读代码，**未复现**）

- 天花板**只跟层高走，不看墙高**（批 F 的设计）：底面 = 本层地面 + 2.49 m。
- 屋顶层地面在 5.0 m ⟹ 天花板在 **7.49 m**。
- 墙若是 1 m 女儿墙 ⟹ 墙顶 6.0 m ⟹ 天花板比墙顶高 1.49 m，**看起来悬空**。
- 墙若保持默认（跟着层高走）⟹ 墙顶 7.5 m ⟹ 天花板贴在墙顶，不悬空。
- **与 3D / 顶视图无关。** 代码行为符合设计；**错的是演示步骤**：屋顶平台本来就不该有天花板。

**方案**

1. **不改代码。更正演示文档**：
   - 平屋顶 = 在**屋顶层画楼板（F）**。楼板顶面在屋顶层地面（5.0 m），正好压在二层墙顶上。
   - 女儿墙 = 把**屋顶层的层高改成 1.0**（`updateNode(层2id, { height: 1.0 })`），这一层所有跟着层高的墙一起变成 1 m，不用逐面改，也绕开了 P1 / P8。
   - 要演示「显式高度的墙不跟着变」时，再单独给某一面墙设 `height`。
2. 可选（M13）：属性面板里显示天花板的**实际底面标高**，以及它是「跟着层高」还是「显式高度」。

**优先级 / 到期**：中。文档部分 M9 之前改。

---

## P4 · 顶视图放门窗，门窗朝向无法选择

**现象**

在顶视图里放门窗（用户问「顶视图模式下能创建门吗」）。

**调查方法**

1. `app/tools/opening-tool.tsx`：`side: sideFromNormal(e.normal)`。
2. `app/lib/interaction/opening-placement.ts`：`sideFromNormal = (normal?.[2] ?? 1) >= 0 ? 'left' : 'right'`。
3. 顶视图下射线命中的是墙的**顶面**，顶面法线在墙局部坐标里是 `(0, 1, 0)`。

**调查结果**（读代码，**未复现**）

- 顶面法线的 z 分量是 0 ⟹ `sideFromNormal` **恒返回 `'left'`** ⟹ 顶视图里放的门窗朝向永远相同，无法选择开向哪一侧。
- 另外受 P1 影响：楼层叠放时，门窗会落到下层的墙上。
- `localPoint[0]`（沿墙距离）在顶面上仍然正确，所以**位置是对的，只有朝向不对**。

**方案**

- 短期（演示文档）：**门窗在 3D 里对着墙侧面放。**
- 修正：命中顶面时，改用**光标在墙中心线哪一侧**来决定朝向——墙局部坐标下 `localPoint[2]`（厚度方向，范围 `[-t/2, t/2]`）的正负就是这个信息：

```ts
// app/tools/opening-tool.tsx —— hitFrom
side: Math.abs(e.normal?.[2] ?? 0) > 0.5
  ? sideFromNormal(e.normal)                 // 侧面：按法线
  : (e.localPoint[2] >= 0 ? 'left' : 'right') // 顶面：按光标在中心线哪一侧
```

  可以抽成纯函数放进 `opening-placement.ts`，补测试（D18）。

**优先级 / 到期**：中。M9 之前（和 P1 一起改 `opening-tool.tsx`）。

---

## P5 · 楼板（多边形）预览虚线被墙遮住

**现象**

画楼板时，绿色虚线被外墙挡住，只能靠「看不到绿点」来判断是否点到了墙角。

**调查方法**

1. `app/tools/polygon-tool.tsx`：`PREVIEW_Y = 0.02`，`<Line>` 使用默认材质设置。
2. 楼板的角点正好落在墙中心线上（吸附到网格，而外墙也在网格上）。
3. 对照 `app/tools/endpoint-handles.tsx`：端点球用了 `depthTest={false}`，所以永远可见。

**调查结果**（读代码，**未复现**）

- 预览线在层内 y = 0.02 m，墙高 2.5 m；虚线沿墙中心线走，从上方或斜上方看，**被墙体遮挡**，属于正常的深度测试结果。

**方案**

```tsx
// app/tools/polygon-tool.tsx —— PolygonDraftPreview 的 <Line>
<Line ... depthTest={false} renderOrder={999} />
```

⚠ **注意 2026-09-02 事故**：drei 的 `Line` 会把没解构的 props **同时**铺到 `line2` 对象和 `lineMaterial` 上（`visible={false}` 就是这样把材质关掉的）。`depthTest` 本身就是材质属性，铺到两边的结果正是我们要的；但**必须在浏览器里看一眼**再确认，不能只靠 `verify`。

`WallTool` 的橡皮筋线同理（`wall-tool.tsx:9` 也是 drei `Line`，`PREVIEW_Y = 0.01`），一起加。

**优先级 / 到期**：中。M9 之前。

---

## P6 · 顶视图里墙和地面几乎同色，很难找到墙

**现象**

顶视图下外墙不明显，得仔细看才能找到墙。

**调查方法**

1. `viewer/nodes/wall/geometry.ts`：墙色 `#e8e8e8`。
2. `viewer/components/ground.tsx`：地面 `#f0f2f1`，网格线 `#d8dcda`。
3. 顶视图从正上方看，墙只露出 0.1 m 宽的顶面。

**调查结果**（读代码）

两种颜色几乎相同，加上墙在俯视下只有很细的一条，所以看不清。这是 D5（「正交顶视代替独立 2D 平面图」）的已知代价：平面图没有自己的样式。

**方案（M12）**

- 顶视图下墙顶面用深色填充（或在 `viewMode === 'plan'` 时给墙叠一层轮廓线）。
- 地面在顶视图下降低对比，或隐藏阴影面。
- 短期（演示文档）：顶视图下滚轮放大，或直接在 3D 里画墙（批 H 之后 3D 落点已准确）。

**优先级 / 到期**：低。M12。

---

## P7 · 画内隔墙时，无法确认落点是否在墙上

**现象**

画内隔墙时，没法确定点击点严格落在外墙上。

**调查方法**

1. `core/schema/snap-2d.ts`：`snapPoint` 只吸附**已有墙的端点**（半径 0.35 m）和 0.1 m 网格。
2. 状态栏（`app/app.tsx`）不显示光标坐标。
3. `STATE.md` 故意缺陷表：「只吸端点和网格，无中点 / 交点 / 垂足吸附 → M12」。

**调查结果**（读代码）

- 墙身上的任意一点**不会**被吸附；又看不到坐标，只能靠数网格。
- 实际上外墙也在 0.1 m 网格上，所以**按网格点下去就一定在中心线上**，T 形交接检测（`pointOnSegment`，容差 1e-3）能正确识别；只是用户无从确认。

**方案（M12）**

- 状态栏显示光标的吸附后坐标（例如 `x 5.00 · z 0.00`），以及当前吸附类型（端点 / 网格 / 墙身）。
- `snapPoint` 增加「吸附到墙中心线上最近点」一档（垂足），优先级在端点之后、网格之前；纯函数，补测试。
- 短期（演示文档）：一格 0.5 m，数格子。

**优先级 / 到期**：低。M12。

---

## P8 · 顶视图里选中墙「没有变绿」

**现象**

屋顶层按 V 点墙，墙没有明显变绿。

**调查方法**

1. `viewer/nodes/wall/geometry.ts`：选中时整面墙换成 `#7dd3c0`。
2. 顶视图下只看得到墙顶面（0.1 m 宽）。
3. 与 P1 交叉：此时拖动的是下层墙，容易误以为「选中失败」。

**调查结果**（读代码，**未复现**）

- 选中本身大概率成功（`SelectionManager` 选的是最近的墙），只是顶视图里变色的区域太细，不易察觉。
- `STATE.md` 已有：「选中高亮是换材质色不是描边 → M12」。

**方案**

- 确认方法（演示文档）：看状态栏 `sel=wall_xxxx` 是否出现、端点球是否出现，或 Tab 回 3D 看。
- M12：选中描边或顶视图下加粗高亮。

**优先级 / 到期**：低。M12。

---

## P9 · 选中某层的墙后切层，端点球留在半空

**现象**（批 I 验收时已知）

选中二层的墙后按 `[` 回一层，二层被隐藏，但那面墙的两个端点球还悬在 2.5 m。

**调查方法**

1. `app/tools/endpoint-handles.tsx`：手柄挂在 `<LevelFrame levelId={node.parentId}>` 里，不在层的 group 下。
2. `app/components/level-visibility.tsx`：只处理层 group 的子树（`sceneRegistry.byType.level`）。

**调查结果**（读代码）

手柄不属于层的子树，所以批 I 的隐藏不作用于它；选中状态也不会因切层而清除。

**方案（二选一，M12 定）**

- A：`EndpointHandles` 里判断 `levelDisplayMode(wall.parentId, 当前层, nodes) === 'above'` 时不渲染。
- B：`switchLevel` / `addLevelOnTop` 切层时清空选中。
- 短期：点一下空地取消选中。

**优先级 / 到期**：低。M12。

---

## 演示文档需要更正的地方

与 P3、P4、P5、P6、P8 对应，下次整理演示步骤时一并修改：

1. 画墙、放门窗**在 3D 视图里做**；顶视图只用于核对位置。
2. 画完天花板 / 楼板后**先按 V** 再去选东西（P2 H1）。
3. 屋顶：**画楼板（F），不画天花板**；女儿墙用「屋顶层层高改 1.0」（P3）。
4. 确认选中：看状态栏 `sel=`，不要只看颜色（P8）。
5. P1 修复之前，**不要在顶视图里拖动与其它楼层重合的墙**。
