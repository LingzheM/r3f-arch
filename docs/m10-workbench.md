# M10 操作台、定位与外立面 [混合]

> 设计文档。§07 全码在 `m10-code.md`，按 core → viewer → app 三批放出，每批先过 `/gate`。
> 本文件与 `ROADMAP.md` / `DECISIONS.md` 冲突时，以后者为准。
>
> **2026-09-18 插入**（D31）：这个 M 不在原 14 个里程碑里。原 M10–M14 顺延为 M11–M15。
> 起因是用户看过 M8/M9 的成品后提出的四个痛点，见 §01。

## 前置 A · 偏差

由开 M10 的那次 `/kickoff` 填写。M10 只能在 **M9 三道闸门都过、`/recite` 做完**之后开工，理由见 §02 F（存档版本号要从 M9 定下的 v1 往上加）。

开工时要核的三件事：

1. `pnpm verify` 的基线数字（M9 收尾时写进 `STATE.md` 的那组）。
2. M9 app 批把「存档 / 读档 / 导出 / 导入」放在了哪个组件里——M10 的工具条要把它们收编（§02 E）。
3. `STATE.md` 里 M8 前置 C 的尾巴（P4 测试、P5 半截、C6 的 `onPointerMove` 没传 `baseY`）有没有还清。C6 和本 M 的画墙标注改的是同一段代码（§04 第 21 步），没还就在这里一起还。

## 前置 B · 待拍板

| # | 问题 | 推荐 | 状态 |
|---|---|---|---|
| B1 | 贴图从哪来 | [ambientCG](https://ambientcg.com)（CC0）各下一张 1K 的 basecolor：`Bricks` · `Concrete` · `WoodFloor` · `PaintedPlaster`。放 `public/textures/<id>.jpg`，每张 ≤ 500 KB。玻璃不需要贴图 | 用户下载，文件名按 §02 A 的表 |
| B2 | 工具条放顶部还是左侧图标条 | 顶部一条（`layer-3d/src/components/ControlToolbar.tsx` 的布局），层面板在右侧。M13 换皮时再决定要不要改成 editor 那种左侧图标条 | 已按推荐写进设计 |
| B3 | 立面视图里要不要显示所有楼层 | 显示所有层、不灰显（§02 C）。立面图的意义就是看整栋 | 已按推荐写进设计 |

## §00 这个设计是怎么推出来的

1. **规格书**
   - `../editor/wiki/architecture/materials-and-themes.md`：只取三节。「Surface roles」——`core` 只存 token，不存颜色、不 import three；「Texture world scale」——**1 UV 单位 = 1 米**，`repeat` 是材质的属性（每米几块砖），不是每个面的属性；「Resolving a colour」里的缓存教训——缓存键漏了一个轴，切换时拿到旧材质。
   - `../editor/packages/viewer/src/systems/wall/wall-system.tsx:1075-1124` `applyWorldPlanarWallUVs`：50 行，按三角形法线选投影轴。**直接抄**，只把里面的分支逻辑抽成 `core` 的纯函数（§04 第 03 步）。
   - `../editor/packages/core/src/schema/material.ts:4-15` `MaterialPreset` 枚举（`white brick concrete wood glass …`）。我们的 id 集合是它的子集。注意它用 `.catch('custom')` 吞掉未知 id，§02 A 讲我们为什么也吞、但吞成 `undefined`。
   - `../editor/packages/core/src/material-library.ts`：4259 行，**只看形状**。砖 `repeatX: 1.5`（`:889-925`，每米 1.5 块砖纹理），玻璃 `#87ceeb` / `roughness 0.1` / `transparent`（`:3411-3435`）。
   - `../editor/packages/editor/src/components/tools/shared/placement-dimension-guides.tsx`（121 行）：尺寸标注 = 一条 `depthTest: false` 的线 + `<Html>` 标签。我们只要标签。
   - `../editor/wiki/architecture/tools.md` 「Help mirrors the model」：状态栏提示由当前交互 scope 驱动，不是一行写死的文字。
   - `../layer-3d/src/components/ControlToolbar.tsx:59-65` 相机预设清单（透视 / 等轴 / 俯瞰 / 正立面 / 侧立面）；`Viewport3D.tsx:398-420` 预设位置是**写死的常量**（`(0, 12, 45)`），只适合它那个固定场景。我们从场景包围盒算（§02 C）。

2. **之前是怎么错的**
   - **2026-09-02 `<Line>` 事故**（P5，`m8-demo-issues.md`）：叠加线被墙挡住，`verify` 全绿。本 M 的底图、幽灵、标注全是叠加层，**每一条都 `depthTest={false}`，且必须在浏览器里看过**。
   - **P6–P9**（`m8-demo-issues.md`，原到期 M12）：顶视图墙和地面同色；画内隔墙看不到落点；顶视图选中不明显；切层后端点球留在半空。四条都是「定位反馈」缺失，本 M 一起还。
   - **M8 债「灰显直接改材质」**：`app/lib/level/level-display.ts:44-52` 直接改 `material.opacity`。一旦材质按预设**共享**，灰显一层会把所有层同材质的墙一起变透明。这条债决定了 §02 A 的「贴图共享、材质不共享」。
   - **D5 万向锁**：顶视相机在 `[0, 40, 0]` 必须 `up = (0, 0, −1)`。立面相机是水平看，`up` 要回到 `(0, 1, 0)`。两种 `up` 都要在 OrbitControls 挂载前设好——`camera-rig.tsx` 现在的 `useLayoutEffect` 就是干这个的，扩展它，不另起炉灶。
   - **D28 / D30**：加字段不迁移 = 老构建读新文件时静默剥掉 `material`。所以版本号 1 → 2，哪怕迁移函数是空的（§02 F）。
   - **M7 批 I 教训**（`STATE.md`）：坐标系那一层错了，`verify` 从头绿到尾。本 M 的 UV 投影也是坐标系活：局部几何 × 墙的 frame 矩阵，少乘一次贴图就跟着墙转（§02 B 讲怎么肉眼验）。

3. **成本**

   | 部分 | 手写 / 抄 | 行数（估） | 为什么 |
   |---|---|---|---|
   | 材质预设表 + schema + 空迁移 + 冻结语料 | 手写 [机制] | ~110 + 测试 60 | 数据形状决定 M15 能不能扩展，要自己定 |
   | `planarUv` 纯函数 | 手写 [机制] | ~25 + 测试 40 | 抄来的 50 行里真正的机制只有这 6 行分支 |
   | `applyWorldPlanarUVs` 三角形循环 | 抄 [模式] | ~45 | 纯搬运 |
   | 场景包围盒 + 视图姿态 | 手写 [机制] | ~90 + 测试 50 | 立面相机的位置从这里来 |
   | 标尺刻度 + 米格式化 + 吸附类型 + 底图 | 手写 [机制] | ~80 + 测试 50 | 全是纯函数 |
   | 贴图缓存 + 材质工厂 + 相机 rig + 地面 | 手写，给 hint | ~150 | viewer 层接线 |
   | 工具条 / 材质盘 / 层面板 / 状态栏 / 标尺 / CSS | 给全码 [模式] | ~330 | 样板 JSX，机制为零 |
   | 画墙标注 + 幽灵 + 信标 + 底图组件 | 手写，给 hint | ~140 | 叠加层，和 P5 同一类坑 |
   | **合计** | | **~970 + 测试 ~250** | 目前最大的 M，约 2 周 |

4. **不变量**（每条一个测试用例，§04 里标 ⚑ 的步骤）

   | # | 不变量 | 破坏它会看到 |
   |---|---|---|
   | I1 | `material` 缺席 = 该类型的默认材质（D23「缺席即数据」的延伸）；未知 id 剥成 `undefined`，**节点不丢** | 一个手改错的材质名让整堵墙从存档里消失 |
   | I2 | v1 文档经 v1 → v2：`nodes` / `rootNodeIds` 逐字节相等，只有 `version` 变 2 | 空迁移悄悄改了数据 |
   | I3 | `toSceneDocument` 写出的 `version === 2`；`version: 3` 的文件被拒（`SceneTooNewError` 已存在于 `scene-storage.ts:31`，M9 的测试应已覆盖，本 M 只加一条钉住数字 2） | 老构建读新文件静默剥掉 `material` |
   | I4 | `planarUv`：竖直面 `v = 1 − y`，`u` 沿面内水平轴且随法线方向取正负；水平面 `(u, v) = (x, z)`；同一面上相距 1 m 的两点 uv 差恰好 1 | 砖纹跨墙角对不上；贴图被拉伸 |
   | I5 | `computeSceneBounds`：空场景或只有容器 → `null`；一堵墙 → 包住它的轮廓 × `[层底, 墙顶]`；加一层 → `max.y` 增加 | 「适配」把镜头对准空地 |
   | I6 | `viewPose('front', b)` 在 `b` 的 +Z 侧、看向中心、`up = +Y`；`'plan'` 的 `up = −Z`（D5）；相机到中心的距离 ≥ 包围盒对角线 | 正立面看到的是背面；近平面裁掉半栋楼 |
   | I7 | `levelBelowFootprints`：最底层 → `[]`；二层 → 一层每堵墙一个多边形，顶点数 ≥ 4 | 二层看不到一层的范围（原痛点） |
   | I8 | `snapPointDetailed` 吸到端点时 `kind === 'endpoint'`，否则 `'grid'`；`snapPoint` 的返回值不变 | 信标颜色骗人；M4 的吸附回归 |
   | I9 | `rulerTicks(min, max, pxPerMetre)`：步长 ∈ `{0.1, 0.5, 1, 5, 10}`，相邻刻度 ≥ 48 px，刻度数有上界，第一个刻度 ≥ `min` | 标尺糊成一团或空白 |
   | I10 | `formatMetres(3.14159) === '3.14 m'`，`formatMetres(−0.001) === '0.00 m'`（不出 `-0.00`） | 标签闪 `-0.00` |
   | I11 | `setCurrentLevel` 之后 `selectId === null` | P9：端点球留在半空 |

5. **最薄的垂直片**：点工具条上的「砖」→ 当前选中的墙立刻变成红砖，转到 3D 视图砖缝在墙角是连着的。第二片：切到二层顶视图，画一堵墙时橡皮筋旁边跟着 `3.20 m`，脚下是一层墙的灰色虚线。

6. **用户代码里的病灶**（为什么现在做）
   - `src/app/app.tsx:97-104`：整个产品的 UI 是一行 `pointerEvents: 'none'` 的文字。D29 第 1 条说「部署后别人不细问也能用」，这一行做不到。
   - `src/viewer/nodes/wall/geometry.ts:16-17`、`slab/geometry.ts:7-8`、`shared/polygon-prism.ts:44`：颜色是常量，材质在几何函数里 `new`，没有 UV 处理——M2 §06 记的「UV 是 ExtrudeGeometry 默认的，贴图跨墙接不上」到期。
   - `src/viewer/components/camera-rig.tsx`：只有两种模式，位置写死 `[10,10,10]` / `[0,40,0]`。楼一高就看不全。
   - `src/app/tools/wall-tool.tsx:82-122`：预览只有一条虚线，没有长度、没有厚度、没有落点信标（P7）。
   - `src/app/store/use-editor.ts:5`：`ViewMode = '3d' | 'plan'`，立面视图没地方放。
   - M9 之后产品**功能上**已齐（墙、门窗、楼板、多层、存档），缺的全是「看得见、摸得着」。这是第一个用**陌生人的眼睛**验收的 M。

7. **故意缺陷**：见 §06。

8. **原型**：**还没跑**。§04 开工前要先跑三个探针（各 ≤ 30 分钟，写进 `m10-code.md` 开头）：
   - (a) `TextureLoader.load` 是异步的，回调到来前材质是纯色——第一帧会不会闪一下？预期：会。对策：`preloadMaterialTextures()` 在 `registerAllNodes()` 旁边调，5 张 ≤ 2 MB。
   - (b) 玻璃 `depthWrite: false` + 下层灰显 `depthWrite: false` 叠在一起，透明排序会不会错？看一眼二层玻璃墙下面的一层砖墙。
   - (c) 切视图预设时 OrbitControls 的 `target` 不跟相机走——必须写 `controls.target.copy(...)` 再 `controls.update()`，否则第一次拖动会跳。`useThree((s) => s.controls)` 拿得到 `makeDefault` 注册的实例。

## §01 这一步解决什么问题

M9 之后手里是一个**功能齐、不能给人看**的编辑器。四个痛点（2026-09-18 用户原话的归纳）：

| 痛点 | 现状 | 本 M 之后 |
|---|---|---|
| 没有操作台 | 底部一行快捷键说明 | 顶部工具条（工具 / 视图 / 编辑 / 材质）、右侧层面板、底部状态栏 |
| 墙是灰白的 | 颜色常量 | 5 种外立面预设：抹灰 / 混凝土 / 红砖 / 玻璃 / 木板，贴图 1 格 = 1 米，跨墙连续 |
| 操作反直觉 | 画墙看不到长度和落点；二层看不到一层的范围；没有坐标和标尺 | 橡皮筋带长度和角度标签、墙厚幽灵、吸附信标；下一层墙的虚线底图；正交视图的边缘标尺；状态栏光标坐标；原点轴 |
| 没有立面 | 只有 3D 和顶视 | 前 / 后 / 左 / 右四个正交立面 + 「适配全景」，只看不编辑 |

**不做**：材质库 / 上传 / 自定义颜色、一堵墙内外面分别上色、点选某个面刷材质（M15）；Tailwind / Radix（M13）；属性面板（M14）；立面视图里编辑。

## §02 机制说明

### A · 材质预设：core 存 id，viewer 造材质，贴图共享、材质不共享

`core/schema/material.ts`：

```ts
export const MATERIAL_PRESET_IDS = ['plaster', 'concrete', 'brick', 'glass', 'wood'] as const
export const MaterialPresetId = z.enum(MATERIAL_PRESET_IDS)
export type MaterialPresetId = z.infer<typeof MaterialPresetId>

export type MaterialPreset = {
  label: string          // 工具条上显示的中文
  color: string          // 无贴图时的底色；有贴图时是 tint（白色 = 不染色）
  roughness: number
  metalness: number
  map?: string           // `/textures/<id>.jpg`，相对 public/
  repeat: number         // 每米几块纹理（editor 叫 repeatX，砖是 1.5）
  opacity?: number       // 只有玻璃有，< 1 即透明
}
export const MATERIAL_PRESETS: Record<MaterialPresetId, MaterialPreset>
export const DEFAULT_WALL_MATERIAL: MaterialPresetId = 'plaster'
export const DEFAULT_SLAB_MATERIAL: MaterialPresetId = 'concrete'
export const resolveMaterial = (node: WallNode | SlabNode): MaterialPresetId
```

| id | label | color | roughness | map | repeat | opacity |
|---|---|---|---|---|---|---|
| `plaster` | 抹灰 | `#e8e6e1` | 0.9 | `plaster.jpg` | 1 | — |
| `concrete` | 混凝土 | `#b8b8b4` | 0.85 | `concrete.jpg` | 0.5 | — |
| `brick` | 红砖 | `#ffffff` | 0.8 | `brick.jpg` | 1.5 | — |
| `glass` | 玻璃 | `#87ceeb` | 0.05 | — | 1 | 0.35 |
| `wood` | 木板 | `#ffffff` | 0.7 | `wood.jpg` | 1 | — |

`WallNode` / `SlabNode` 各加一个字段：

```ts
material: MaterialPresetId.optional().catch(undefined)
```

- **缺席即默认**（D23）：没写 = 用该类型的默认。`updateNode(id, { material: undefined })` 删键，回默认。
- **未知 id 剥成 `undefined`，不丢节点**。editor 是 `.catch('custom')`，我们没有 custom。理由：墙是数据，材质是装饰，为装饰丢数据是本末倒置。代价：静默，不进 `LoadReport`——记 §06。
- 柱、天花、门窗**不加字段**，仍是纯色（§06）。

`viewer/lib/materials.ts`：

```ts
createPresetMaterial(id: MaterialPresetId, appearance: NodeAppearance): THREE.MeshStandardMaterial
createFlatMaterial(color: string, appearance: NodeAppearance): THREE.MeshStandardMaterial   // 柱 / 天花用
```

- **每次调用都 `new` 一个材质**；只有 `THREE.Texture` 走缓存（`viewer/lib/textures.ts`，按 url）。为什么不缓存材质：`level-display.ts` 灰显是**直接改材质的 `opacity`**，共享材质会让所有层一起灰。贴图很重（要缓存），材质很轻（一个对象），这样分最省事，M8 那条债顺手关掉。`GeometrySystem.disposeSubtree` 会 `material.dispose()`，不会碰缓存里的 Texture——`dispose()` 材质不释放它引用的贴图。
- **选中不再换颜色，改 `emissive`**：`emissive = #1f8f7a`，`emissiveIntensity = 0.35`。贴图还看得见（P8 顶视图选中不明显，正是因为换色后和地面更像了）。
- 玻璃：`transparent: true`，`opacity: 0.35`，`depthWrite: false`，`side: DoubleSide`。
- `repeat` 写在 Texture 上（`texture.repeat.set(r, r)`），所以同一张贴图不能给两个不同 `repeat` 的预设用——目前没这种情况，写进 §06。

### B · 世界投影 UV：1 格 = 1 米，跨墙连续

`ExtrudeGeometry` 的 UV 是每堵墙从自己的 0 起算，砖缝在墙角必断。改法照抄 editor：**de-index 之后逐三角形按法线选投影面**。

`core/lib/planar-uv.ts`（纯数字，可测）：

```ts
export type Vec3 = readonly [number, number, number]
export function planarUv(p: Vec3, normal: Vec3): [number, number]
```

- `|n.y|` 最大 → 水平面：`u = x, v = z`
- 否则竖直面：`v = 1 − y`；`|n.x| ≥ |n.z|` 时 `u = n.x ≥ 0 ? z : −z`，否则 `u = n.z ≥ 0 ? x : −x`
- 这 6 行就是 `wall-system.tsx:1109-1115`。取正负是为了让相邻两面（法线相反）的 `u` 方向一致。

`viewer/nodes/shared/planar-uv.ts`：

```ts
export function applyWorldPlanarUVs(geometry: THREE.BufferGeometry, frame: THREE.Matrix4): THREE.BufferGeometry
```

- `toNonIndexed()`（每个三角形有自己的三个顶点，才能各投各的面）→ 逐三角形算法线 → 三个顶点各乘 `frame` 再调 `planarUv`。
- **`frame` 是墙的 `NodeFrame` 拼成的矩阵**（`position` + `rotationY`），不含层的 Y 平移。几何在墙局部坐标里，不乘 frame 的话贴图跟着墙转，砖缝在墙角就对不上。**不含层 Y** 是故意的：每层砖纹从层底重新起算，楼板本来就把砖纹断开了。
- 只用于渲染网格；射线拾取不看 UV。
- **肉眼验法**：L 形转角两堵砖墙，砖缝在转角处**一行对一行**；转 90° 再画一堵，砖纹不倾斜。

### C · 视图：六种模式，姿态从包围盒算

`core/services/view-pose.ts`：

```ts
export type ViewMode = '3d' | 'plan' | 'front' | 'back' | 'left' | 'right'
export const isElevationView = (m: ViewMode) => m !== '3d' && m !== 'plan'
export const toolsEnabled = (m: ViewMode) => !isElevationView(m)

export type ViewPose = {
  position: Vec3; target: Vec3; up: Vec3
  projection: 'perspective' | 'orthographic'
  orthoHalfHeight: number        // 正交相机要框住的半高（米），viewer 换算成 zoom
}
export function viewPose(mode: ViewMode, bounds: SceneBounds | null): ViewPose
```

- `bounds` 为 `null`（空场景）时用 10 m 的默认盒，位置就是今天的 `[10,10,10]` / `[0,40,0]`——**空场景行为不变**。
- `front` 在 +Z 侧看 −Z（Point2D 的 `y` 是世界 Z，D3）；`back` 反之；`right` 在 +X 侧；`left` 在 −X 侧。`up` 全是 `(0,1,0)`。`plan` 的 `up = (0,0,−1)`（D5）。
- 距离 = 对角线 × 1.2，近远平面照旧 `[-1000, 1000]` / `[0.1, 1000]`。

`core/services/scene-bounds.ts`：

```ts
export type SceneBounds = { min: Vec3; max: Vec3 }
export function computeSceneBounds(nodes: Record<AnyNodeId, AnyNode>): SceneBounds | null
```

- 墙：`wallFootprint(start, end, thickness)` 的 4 点（不用斜接，包围盒不在乎半个墙厚）× `[levelBaseY, levelBaseY + resolveWallTop]`；楼板 / 天花：多边形 × 自己的高度区间；柱：位置 ± 半径。层的 Y 用 `getLevelElevations`（D22）。
- 按 `nodes` 引用缓存（和 `getLevelElevations` 一样的 WeakMap），app 每帧读也不重算。

`viewer/components/camera-rig.tsx` 扩展：

```tsx
<CameraRig mode={mode} pose={pose} fitToken={fitToken} />
```

- `mode === '3d'` 用 `PerspectiveCamera`，其余用 `OrthographicCamera`。
- `useLayoutEffect([mode, fitToken])`：设 `up`、`position`、`lookAt(target)`，正交时 `zoom = viewportHeight / (2 × orthoHalfHeight)`，然后 `controls.target.copy(target); controls.update()`。**只在模式切换和 `fitToken` 变化时执行**，平时不碰相机——用户拖过的视角不能每帧被拉回去。
- `pose` 只在这两个时刻读，所以 app 传的是「当下」的姿态，不需要订阅。

app 层：

- `useEditor.viewMode: ViewMode`、`setViewMode(mode)`；`Tab` 仍在 3D / 顶视之间切；`fitToken: number` + `requestFit()`（`Home` 键和工具条「适配」按钮）。
- **立面视图里工具不挂载**（`toolsEnabled(viewMode)` 为假时 `LevelFrame` 那一组和 `OpeningTool` / `MoveTool` / `EndpointHandles` 全不渲染），工具条上的工具按钮变灰。选中仍可用（点墙看它是什么），但 `Del` 不响应——避免在一个看不出层的视图里删错东西。
- `OrbitControls`：3D 可旋转；顶视和立面 `enableRotate={false}`，左键平移（今天的 `PLAN_MOUSE_BUTTONS`）。
- `LevelVisibility`：`isElevationView` 时**所有层都按 `'current'` 处理**——立面图要看整栋（B3）。

### D · 定位反馈：五个叠加层

全部在 app 层，全部 `depthTest={false}`（P5 教训），全部只在 `toolsEnabled` 的视图里挂。

**D1 画墙：标签 + 幽灵 + 信标**（改 `wall-tool.tsx`）

- `snapPointDetailed(p, walls) → { point, kind: 'endpoint' | 'grid' }`（core，§04 第 07 步）。`onPointerMove` 也走它（今天只有 `onPointerUp` 吸附，预览线和落点不一致——这就是 P7）。**`onPointerMove` 传 `baseY`**（C6）。
- 标签：drei `<Html>` 挂在橡皮筋中点上方，内容 `formatMetres(len) · angle°`，角度按 `atan2(−dy, dx)` 归到 `[0, 360)`。`useFrame` 里直接改 DOM `textContent`，不走 React state（M4 的「橡皮筋改 ref」同一理由）。
- 幽灵：一块 `wallFootprint(last, cursor, DEFAULT_WALL_THICKNESS)` 的平面，`y = baseY + 0.005`，青色 `opacity 0.25`。让人看到墙**有多厚、落在哪一侧**。
- 信标：吸附点上一个半径 0.08 的圆环；`kind === 'endpoint'` 时青色实心，`grid` 时灰色空心。

**D2 底图**（新 `app/components/level-underlay.tsx`）

- `levelBelowFootprints(currentLevelId, nodes)`（core，§04 第 08 步）→ 每个多边形一条 drei `<Line>`，`dashed`，灰 `#8a9490`，`y = 当前层 baseY + 0.005`。
- 最底层没有底图。3D 视图里也画——站在二层看一层的轮廓比灰显更清楚。
- 楼板、柱不画（§06）。

**D3 标尺**（新 `app/ui/rulers.tsx`，HTML，不进 Canvas）

- 只在正交视图（顶视 + 四个立面）显示：顶边 20 px 一条、左边 20 px 一条。
- `orthoWorldWindow(camera, width, height)`（viewer/lib，需要 three）算出可见的世界区间；`rulerTicks` 出刻度；每帧（`useFrame` 拿不到，因为在 Canvas 外——用 `requestAnimationFrame` + 读 `camera.matrixWorld`）重画。刻度和标签直接写 `<canvas>` 2D，不生成几百个 DOM 节点。
- 顶视：横轴是世界 X，纵轴是世界 Z（**向下为正**，D5 的 `up = −Z` 决定的）。立面：横轴是 X 或 Z，纵轴是 Y。

**D4 光标坐标**（状态栏）

- `pointermove` 上 `eventToGround(e, el, camera, baseY)` → 写进一个 ref；`requestAnimationFrame` 里把 `x = 3.20  z = −1.40` 写进 DOM。不进 zustand，不触发 React。

**D5 顶视图对比 + 原点轴**（viewer `ground.tsx`）

- `<Ground variant={mode === 'plan' ? 'plan' : '3d'} />`：顶视地面 `#ffffff`、网格 `#cfd4d2` / 中线 `#9aa39f`（P6）。
- 原点两条 1 m 短线：X 红 `#d64545`、Z 蓝 `#3b6fd6`，`y = 0.002`。这是看图时判断方向的锚。

### E · 操作台：三个组件，一个 CSS 文件，零新依赖

不引 Tailwind / Radix。M13 决定要不要换皮，届时**只换皮不换逻辑**：这三个组件只读 `useEditor` / `useScene`，不 import three，不知道 Canvas。

```
┌──────────────────────────────────────────────────────────────┐
│ 工具  选择 墙 楼板 天花 柱 门 窗 │ 视图 3D 顶视 前 后 左 右 ⤢ │ ↶ ↷ 存档 读档 导出 导入 │ 材质 ▢▢▢▢▢ │
├───────────────────────────────────────────────┬──────────────┤
│                                               │ 楼层         │
│                Canvas                         │ ▸ 2  h 2.5   │
│                                               │   1  h 2.5   │
│                                               │   0  h 2.5   │
│                                               │ [+ 顶上加层] │
├───────────────────────────────────────────────┴──────────────┤
│ x = 3.20  z = −1.40 │ 层 1 │ wall · 点第二点 · Enter 闭合 · Esc │
└──────────────────────────────────────────────────────────────┘
```

- **`Toolbar`**：四组。工具组的按钮 = 今天 `app.tsx` 的快捷键表，按钮上带快捷键字母；`toolsEnabled` 为假时整组 `disabled`。视图组六个 + 「适配」。编辑组：撤销 / 重做（`useScene.temporal`）+ **M9 app 批的四个按钮搬进来**（前置 A 第 2 条）。材质组见下。
- **`MaterialPalette`**：5 个色块（有贴图的用 `background-image: url(/textures/x.jpg)` 当缩略图）。有选中的墙或楼板 → 点击 `updateNode(id, { material })`，进撤销历史；没选中 → 设 `useEditor.defaultMaterial`，之后 `WallTool` / `PolygonTool('slab')` 的 `addNode` 带上它。当前值高亮：有选中时显示选中节点的 `resolveMaterial`，否则显示默认。
- **`LevelPanel`**：`useScene` 里当前 building 的所有 level，按 `level` 序数**从高到低**列（和楼一样）。点行 = `setCurrentLevel`；层高是一个 `<input type="number" step="0.1">`，`onBlur` 才 `updateNode(id, { height })`，`≤ 0` 不提交（zod 会拒，`updateNode` 会抛——**要在 UI 拦住**）。「+ 顶上加层」= `addLevelOnTop()`。删层不放按钮（债「删一整层没有确认」到期 M14）。
- **`StatusBar`**：光标坐标 · 当前层 · **按 scope 出的提示**：`idle` → 「点击选择 · 拖动移动」；`drafting(wall)` → 「点第二点 · Esc 取消」；`drafting(polygon)` → 「点回起点或 Enter 闭合」；`placing` → 「点墙放置 · 移动到墙的另一侧翻转」。提示表是一个纯对象，`scope.kind` + `scope.tool` 查表。
- **P9**：`useEditor.setCurrentLevel` 里同时 `selectId: null`。所有切层入口（`[` `]` `L`、层面板）都经过它。
- `workbench.css`：布局用 CSS Grid（`grid-template-rows: 44px 1fr 28px; grid-template-columns: 1fr 220px`），按钮样式 20 行。

### F · 存档：版本 1 → 2，空迁移

- `CURRENT_SCENE_VERSION = 2`。
- `migrations/v1-to-v2.ts`：`from: 1`，`note: 'M10 material 字段（可选，缺席即默认）——空迁移，只为让 v2 文件在 v1 构建上被拒绝'`，`migrate: (doc) => ({ nodes: doc.nodes, rootNodeIds: doc.rootNodeIds })`。
- **为什么不能只加字段不升版本**：v1 构建用 `z.object` parse v2 文件，`material` 被静默剥掉、存回去就没了（D28 的反向）。升版本之后 `SceneTooNewError` 会拦住。
- **冻结语料**（D30）：`__fixtures__/legacy-scenes.ts` 新增一个导出 `V1_HOUSE`（一层两堵墙一块楼板，v1 形状），**不改 v0 的导出**。
- 现有 v0 测试若断言 `runSceneMigrations(doc).version === 1`，改成传 `target = 1`——那条测的是 v0 → v1 这一环，不是链尾。这是本 M 唯一允许改老测试的地方，且只改 `target` 参数。

## §03 文件树增量

```
public/
  textures/                       plaster.jpg · concrete.jpg · brick.jpg · wood.jpg   ← 用户下载（B1）

src/
  core/
    schema/material.ts            ★ 预设表 + MaterialPresetId + resolveMaterial
    schema/material.test.ts       ⚑
    schema/wall.ts                + material 字段
    schema/slab.ts                + material 字段
    schema/snap-2d.ts             + snapPointDetailed
    schema/snap-2d.test.ts        ⚑（已有则追加）
    lib/planar-uv.ts              ★ planarUv
    lib/planar-uv.test.ts         ⚑
    lib/ruler.ts                  ★ rulerTicks · formatMetres
    lib/ruler.test.ts             ⚑
    services/scene-bounds.ts      ★ computeSceneBounds
    services/scene-bounds.test.ts ⚑
    services/view-pose.ts         ★ ViewMode · viewPose · isElevationView · toolsEnabled
    services/view-pose.test.ts    ⚑
    systems/wall/level-underlay.ts      ★ levelBelowFootprints
    systems/wall/level-underlay.test.ts ⚑
    persistence/scene-document.ts       CURRENT_SCENE_VERSION = 2
    persistence/migrations.ts           + v1ToV2
    persistence/migrations/v1-to-v2.ts  ★
    persistence/migrations/v1-to-v2.test.ts ⚑
    persistence/__fixtures__/legacy-scenes.ts  + V1_HOUSE（只追加）

  viewer/
    lib/textures.ts               ★ getTexture · preloadMaterialTextures
    lib/materials.ts              ★ createPresetMaterial · createFlatMaterial
    lib/ortho-window.ts           ★ orthoWorldWindow
    nodes/shared/planar-uv.ts     ★ applyWorldPlanarUVs（抄）
    nodes/shared/polygon-prism.ts buildPolygonPrism 收 material 不收 color
    nodes/wall/geometry.ts        材质 + UV
    nodes/slab/geometry.ts        材质
    nodes/ceiling/geometry.ts     createFlatMaterial
    nodes/column/geometry.ts      createFlatMaterial
    components/camera-rig.tsx     六种模式 + pose + fitToken
    components/ground.tsx         variant + 原点轴
    components/viewer.tsx         mode: ViewMode · pose · fitToken · 预加载贴图

  app/
    store/use-editor.ts           ViewMode 从 core 来 · setViewMode · defaultMaterial · fitToken · setCurrentLevel 清选中
    lib/level/level-actions.test.ts  ⚑ + I11
    lib/ui/status-hints.ts        ★ scope → 提示文字（纯对象，可测但不强求）
    ui/workbench.css              ★
    ui/toolbar.tsx                ★
    ui/material-palette.tsx       ★
    ui/level-panel.tsx            ★
    ui/status-bar.tsx             ★
    ui/rulers.tsx                 ★
    components/level-underlay.tsx ★
    components/level-visibility.tsx  立面视图全层 current
    tools/wall-tool.tsx           标签 + 幽灵 + 信标 + onPointerMove 的 baseY
    tools/polygon-tool.tsx        addNode 带 defaultMaterial（slab）
    app.tsx                       Grid 布局 · 工具按 toolsEnabled 挂载 · OrbitControls 按模式
```

★ 新文件 · ⚑ 有测试

## §04 建造顺序

每步只给签名和 hint。⚑ = 该步先写红测试（`/gate` 第 2 步）。

### core

**00 ⚑ `schema/material.ts`** —— 预设表。
`MATERIAL_PRESET_IDS` / `MaterialPresetId` / `MATERIAL_PRESETS` / `DEFAULT_WALL_MATERIAL` / `DEFAULT_SLAB_MATERIAL` / `resolveMaterial(node)`。
hint：表的键用 `satisfies Record<MaterialPresetId, MaterialPreset>`，少一个 id 编译就红。
测试：每个 id 在表里；`resolveMaterial({ type: 'wall' })` 是 `plaster`、slab 是 `concrete`；`MaterialPresetId.optional().catch(undefined).parse('marble')` 是 `undefined`。

**01 ⚑ `schema/wall.ts` / `schema/slab.ts`** —— 加 `material` 字段。
测试（追加到 `use-scene.test.ts`）：`addNode({ type: 'wall', material: 'brick' })` 读回 `brick`；`material: 'marble'` 的墙**创建成功**且 `material` 为 `undefined`（I1）；`updateNode(id, { material: undefined })` 删键。

**02 ⚑ 存档版本 2** —— `scene-document.ts` 改数字；`migrations/v1-to-v2.ts`；`migrations.ts` 追加；语料 `V1_HOUSE`。
测试：I2、I3。老的 v0 测试只改 `target`（§02 F）。

**03 ⚑ `lib/planar-uv.ts`** —— `planarUv(p, normal)`。
测试：I4 的四条 + 「法线相反的两个竖直面，同一世界点的 `u` 符号相反」。

**04 ⚑ `lib/ruler.ts`** —— `rulerTicks(min, max, pxPerMetre, minPx = 48): { step: number; ticks: number[] }` · `formatMetres(v: number): string`。
hint：`step` 从候选表里取第一个满足 `step × pxPerMetre ≥ minPx` 的；`ticks` 用 `Math.ceil(min / step) × step` 起算，浮点误差用 `Number((k * step).toFixed(3))` 压掉。
测试：I9、I10。

**05 ⚑ `services/scene-bounds.ts`** —— `computeSceneBounds(nodes)`。
hint：先 `getLevelElevations` 拿每层的 `baseY`；墙的顶用 `resolveWallTop(wall, resolveLevelHeight(...))`；缓存照抄 `storey.ts` 的 WeakMap 写法。
测试：I5。

**06 ⚑ `services/view-pose.ts`** —— `ViewMode` · `isElevationView` · `toolsEnabled` · `viewPose(mode, bounds)`。
hint：先算中心 `c` 和对角线 `d`；六种模式各是 `c + dir × 1.2d`；`up` 只有 `plan` 特殊。
测试：I6 + 「`bounds === null` 时 `'3d'` 的 `position` 是 `[10,10,10]`」（空场景行为不变）。

**07 ⚑ `schema/snap-2d.ts`** —— `snapPointDetailed(p, walls, options): { point: Point2D; kind: 'endpoint' | 'grid' }`；`snapPoint` 改成 `snapPointDetailed(...).point`。
测试：I8；现有 `snapPoint` 测试一条不改、全绿。

**08 ⚑ `systems/wall/level-underlay.ts`** —— `levelBelowFootprints(levelId, nodes): Point2D[][]`。
hint：用 `adjacentLevelId(levelId, nodes, −1)`（`app/lib/level/current-level.ts` 里的——**它在 app 层，core 不能 import**；把它挪到 `core/services/storey.ts` 或在这里重写 5 行，选后者，记进偏差表）；墙用 `calculateLevelMiters` + `getWallPlanFootprint`。
测试：I7。

### viewer

**09 `lib/textures.ts`** —— `getTexture(url): THREE.Texture`（缓存）· `preloadMaterialTextures(): void`。
hint：`wrapS = wrapT = RepeatWrapping`，`colorSpace = SRGBColorSpace`，`repeat.set(r, r)`，`anisotropy = 4`。

**10 `lib/materials.ts`** —— `createPresetMaterial(id, appearance)` · `createFlatMaterial(color, appearance)`。
hint：**不缓存材质**（§02 A）。`appearance.selected` → 设 `emissive` / `emissiveIntensity`。玻璃四个开关一个不能少（`depthWrite: false` 漏了会挡住后面的墙）。

**11 `nodes/shared/planar-uv.ts`** —— `applyWorldPlanarUVs(geometry, frame)`。抄 `wall-system.tsx:1075-1124`，分支换成调 `planarUv`。
hint：`toNonIndexed()` 返回新几何，**老的要 `dispose()`**（editor `:1080` 就是这么做的）。

**12 `nodes/wall/geometry.ts`** —— 删两个颜色常量；`frameMatrix(wallTransform(node))` → 每个 band 的几何过 `applyWorldPlanarUVs`；材质 `createPresetMaterial(resolveMaterial(node), appearance)`。
hint：`new THREE.Matrix4().compose(position, quaternionFromAxisAngle(Y, rotationY), (1,1,1))`。**每个 band 一个材质实例**（现在是一个材质共享，共享在这里无害，但 `disposeSubtree` 会重复 `dispose` 同一个——无害但脏；顺手分开）。

**13 `nodes/shared/polygon-prism.ts` + `slab` / `ceiling` / `column`** —— `buildPolygonPrism` 的 `color` 参数换成 `material: THREE.Material`；slab 传 `createPresetMaterial`，ceiling / column 传 `createFlatMaterial`。楼板也过 `applyWorldPlanarUVs`（`frame` 是单位矩阵——楼板几何本来就在层局部坐标）。

**14 `components/camera-rig.tsx`** —— `CameraRig({ mode, pose, fitToken })`。
hint：正交 `zoom = size.height / (2 × pose.orthoHalfHeight)`；`controls` 从 `useThree((s) => s.controls)` 拿，可能为 `null`（首帧），判空。**`up` 必须在 `lookAt` 之前设**。

**15 `components/ground.tsx`** —— `variant` + 原点轴。

**16 `lib/ortho-window.ts`** —— `orthoWorldWindow(camera: THREE.OrthographicCamera, mode: ViewMode): { hMin, hMax, vMin, vMax, hAxis: 'x' | 'z', vAxis: 'y' | 'z' }`。
hint：半宽 = `(camera.right − camera.left) / 2 / camera.zoom`，中心从 `camera.position` 取对应轴；顶视的纵轴 Z **向下为正**。

**17 `components/viewer.tsx`** —— `mode: ViewMode`、`pose`、`fitToken` 三个 prop 透传；`registerAllNodes()` 旁边 `preloadMaterialTextures()`。

### app

**18 ⚑ `store/use-editor.ts`** —— `ViewMode` 改从 `core/services/view-pose` import；`setViewMode`；`defaultMaterial` / `setDefaultMaterial`；`fitToken` / `requestFit`；`setCurrentLevel` 同时 `selectId: null`。
测试（`level-actions.test.ts` 追加）：I11。

**19 `lib/ui/status-hints.ts`** —— `statusHint(scope: InteractionScope, tool: Tool): string`。纯查表。

**20 `ui/workbench.css` · `ui/toolbar.tsx` · `ui/material-palette.tsx` · `ui/level-panel.tsx` · `ui/status-bar.tsx`** —— [模式]，给全码。
hint：`LevelPanel` 的层高输入 `onBlur` 提交，`Number.isFinite(v) && v > 0` 才 `updateNode`。

**21 `tools/wall-tool.tsx`** —— `onPointerMove` 走 `snapPointDetailed` 且传 `baseY`；`WallDraftPreview` 加标签（`<Html>`）、幽灵（`<mesh>` + `PlaneGeometry` 每帧 `setFromPoints`，或直接 `BufferGeometry` 4 顶点）、信标（`<mesh>` + `RingGeometry`）。
hint：三样东西都在 `useFrame` 里改 ref，不进 state；标签的 `<Html>` 用 `center` + `style={{ pointerEvents: 'none' }}`，否则会吃掉点击。

**22 `tools/polygon-tool.tsx` / `wall-tool.tsx`** —— `addNode` 带 `material: useEditor.getState().defaultMaterial`（只有 wall 和 slab；ceiling 不带，schema 没这个字段会被剥掉，但别依赖这一点）。

**23 `components/level-underlay.tsx`** —— 订阅 `useScene((s) => s.nodes)` + 当前层 id，`useMemo` 算 `levelBelowFootprints`，每个多边形一条 `<Line dashed depthTest={false}>`。
hint：多边形要闭合——把第一个点补到末尾。

**24 `components/level-visibility.tsx`** —— `isElevationView(useEditor.getState().viewMode)` 时对所有层调 `applyLevelDisplay(object, 'current')`。

**25 `app.tsx`** —— Grid 布局；`toolsEnabled(viewMode)` 决定工具组挂不挂；`<Rulers />` 只在 `viewMode !== '3d'` 时挂；`OrbitControls` 的 `enableRotate={viewMode === '3d'}`；快捷键表加 `1–6` 切视图、`Home` 适配；删掉底部那行文字（被 `StatusBar` 取代）。M9 的存档按钮搬进 `Toolbar`。

## §05 验收清单

- **A 自动化**：新增测试文件 7（`material` · `planar-uv` · `ruler` · `scene-bounds` · `view-pose` · `level-underlay` · `v1-to-v2`），追加用例到 3 个已有文件（`use-scene` · `snap-2d`（若无则新建，算第 8 个）· `level-actions`）。预计 **+55 用例**。敲完应为 **M9 收尾基线 + 7 或 8 文件 / + 约 55 用例**，准确数字开工时由 `/kickoff` 填。
- **B 肉眼**（每条写「看到了什么」才算过）：
  1. 顶部工具条可见；点「墙」按钮和按 `W` 效果一样，按钮高亮。
  2. 选中一堵墙，点「红砖」→ 墙变砖；`Ctrl+Z` 变回。
  3. L 形转角两堵砖墙，**砖缝在转角一行对一行**；转 90° 画的墙砖纹不倾斜（§02 B）。
  4. 什么都不选时点「玻璃」，再画一堵墙 → 新墙是半透明蓝色，透过它能看到后面的砖墙。
  5. 二层玻璃墙下面是一层砖墙，从 3D 斜上方看，透明叠加不脏（§00 探针 b）。
  6. 顶视图：地面白、网格灰、墙一眼能找到（P6）；选中的墙有青色发光（P8）。
  7. 画墙时橡皮筋中点有 `3.20 m · 90°` 标签，青色幽灵显示墙厚；光标靠近已有端点时信标变青色实心（P7）。
  8. 二层顶视图和 3D 里都能看到一层墙的灰色虚线底图；最底层没有底图。
  9. 顶视图和四个立面有顶边 / 左边标尺，缩放时刻度密度合理（不糊、不空）；3D 视图没有标尺。
  10. 状态栏光标坐标随鼠标变，切层后 `z` 不跳（`baseY` 传对了）。
  11. 点「前」→ 看到正立面，整栋楼所有层都显示、不灰显；工具按钮变灰；拖动只能平移。
  12. 楼盖到四层后点「适配」，整栋楼进画面；空场景点「适配」相机回到 `[10,10,10]`。
  13. 层面板点第 0 层 → 切层且**选中清空**，端点球消失（P9）；改层高 `3.0` 失焦 → 墙变高；输入 `0` → 不提交、不报错。
  14. 存档、刷新、读档 → 材质还在；用旧构建（`git stash` 前的）读新存档 → 提示版本太新而不是静默丢材质。**这一条要真做一次。**
  15. 原点处有红 X / 蓝 Z 两条短线。
- **C 未验证的轴**（D16）：浏览器渲染与交互全部；贴图首帧闪烁（探针 a）；相机切换的手感（探针 c）；CSS 在窄窗口下的布局。

## §06 故意保留的缺陷

| 缺陷 | 到期 |
|---|---|
| 未知 `material` id 静默剥成默认，不进 `LoadReport` | M15 |
| 一堵墙只能一种材质，无内外面、无分带（editor 的 `slots`） | M15 |
| 只有 5 个预设；无自定义颜色、无上传、无材质库 | M15（或永不） |
| 柱 / 天花 / 门窗仍是纯色常量 | M15 |
| 只有 basecolor 贴图，无法线 / 粗糙度贴图 | 不还 |
| `repeat` 写在 Texture 上，同一张贴图不能给两个不同 `repeat` 的预设用 | 出现第二个用例时 |
| 选中高亮是 `emissive`，不是描边；仍无悬停高亮 | M13 |
| 标尺只在正交视图；3D 里只有光标坐标 | 不还 |
| 立面视图只看不编辑 | 不还（D5 的延伸） |
| 底图只画墙，不画楼板 / 柱 | 不还 |
| 尺寸标注只在画墙时；拖动、楼板多边形、门窗无标注 | M14 |
| 工具条纯文字按钮，无图标、无 Tooltip、无命令面板 | M13 |
| 层面板不能改名、不能重排、不能删层 | M14 |
| 层高输入只在 UI 拦 `≤ 0`，没有上限、没有单位切换 | 不还 |
| 贴图 4 张进 `public/`，首次加载约 1–2 MB，无懒加载 | 不还 |
| 相机切换无动画（`layer-3d` 有 lerp 过渡） | 不还 |
| 一堵墙 N 个洞 = 2N+1 个 draw call，现在每个 band 还各自一个材质实例 | M15 |

关掉的债（同步进 `STATE.md`）：M2「UV 是 ExtrudeGeometry 默认的」· M8「灰显直接改材质会和材质系统互相覆盖」· M8「楼层切换 / 加删层 / 改层高没有 UI」（切层、加层、改层高三项；删层留 M14）· P6 / P7 / P8 / P9 · C6。
