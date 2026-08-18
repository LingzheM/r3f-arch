# ROADMAP —— 14 个里程碑

> **这是权威版本。** 在线可读版会漂移，以本文件为准。
> 目标：一个自己能用、能给别人看的住宅编辑器。**不是** `pascalorg/editor` 的 90% 功能覆盖。

对照仓库：`../editor`（同 workspace 下，可直接读）

## 类型标记

- **[机制]** — 新机制，只给设计 + 方法签名 + hint，你手写，我 review
- **[模式]** — 已有机制的重复应用，直接给全码，你读懂并跑通
- **[混合]** — 核心机制给 hint，样板部分给全码

---

## 对话分组

| 对话 | 里程碑 | 主题 | 状态 |
|---|---|---|---|
| 1 | M1–M2 | 几何基础 | M1 ✅ / M2 进行中 |
| 2 | M3–M5 | 交互与框架 | 未开始 |
| 3 | M6–M8 | 结构扩展 | 未开始 |
| 4 | M9–M11 | 持久化与复杂几何 | 未开始 |
| 5 | M12–M14 | UI 与材质 | 未开始 |

**切换信号**：当前对话开始出现上下文摘要，或一组 M 全部验收通过。

---

## M1 能画一堵墙 ✅

三层边界 / Zod schema / sceneRegistry / 射线拾取 / 正交透视切换。
详见 `m1-wall.html`。

## M2 墙角严丝合缝 ⬅ 当前

**[机制]** 交点检测、斜接、平面轮廓、Shape+Extrude。详见 `m2-miter.html`。

**本 M 引入的约定**：墙的局部 Y ∈ `[0, height]`，`wallTransform.position.y = 0`。

---

## M3 选中与交互状态机 **[机制]**

**承接 M2**：稳定的墙几何；`sceneRegistry` 的 `nodeIdFromObject` 反查已可用。

**做什么**
- `app/lib/interaction/scope.ts` — `InteractionScope` 判别联合：`idle | drafting | placing | moving | handle-drag`
- `app/store/use-interaction-scope.ts` — `begin / update / end / endIf`，原子结束，单一所有者
- 铁律 `selectionEnabled(scope)`：只有 `idle` 时指针才属于"选择"
- viewer 层暴露 hover/click 事件出口，**不知道"选中"这个词**
- app 层：选择状态 + 选中高亮（换材质色即可，不做描边后期）
- `WallTool` 从裸 `useState` 迁移到 `drafting` scope

**参考源码**
```
wiki/architecture/interaction-scope.md          ← 必读全文，这是本 M 的规格书
wiki/architecture/selection-managers.md
packages/editor/src/store/use-interaction-scope.ts
packages/viewer/src/components/viewer/selection-manager.tsx
packages/editor/src/hooks/use-node-events.ts
```

**验收**：画墙中途点击不会误选中；Esc 取消回 idle；两工具来回切换不留残状态。

---

## M4 拖动、撤销、脏传播 **[机制]**

**承接 M3**：`moving` / `handle-drag` scope 已存在。

**做什么**
- `core/store/use-live-transforms.ts` — 拖拽期临时覆盖，不进主 store
- `zundo` 接入 `useScene`，`partialize` 只追踪 `nodes` / `rootNodeIds`
- `core/store/history-control.ts` — pause 租约（拖拽期停记历史）+ commit 事务
- **命令式路径**：拖拽中 `useFrame` 直接 mutate `Object3D.position`，一次都不 `setState`
- 端点手柄：拖墙的 start/end
- **脏标记 + `getAdjacentWallIds`** → 只重算受影响的墙（消除 M2 的全量重算缺陷）
- `level-miter-cache` 缓存整层斜接结果
- 端点吸附（吸到已有端点 / 网格步长）

**参考源码**
```
packages/core/src/store/use-live-transforms.ts
packages/core/src/store/use-live-node-overrides.ts
packages/core/src/store/history-control.ts
packages/core/src/systems/wall/wall-mitering.ts   ← getAdjacentWallIds
packages/viewer/src/systems/wall/level-miter-cache.ts
packages/editor/src/components/tools/wall/move-tool.tsx
```

**验收**：100 堵墙中拖一堵，只有它和邻居重建几何；`Ctrl+Z` 一次撤销整个拖拽而不是每帧一步。

---

## M5 节点注册表 **[机制]**

**承接 M4**：脏标记机制已就位（`GeometrySystem` 靠它驱动）。

**做什么**
- `core/registry/node-registry.ts` + `NodeDefinition` 三复选框：`geometry?` / `renderer?` / `system?`
- `viewer/systems/geometry/geometry-system.tsx` — 每帧读 `dirtyNodes` → 调 `def.geometry()` → 换子节点 → `clearDirty`
- `viewer/components/renderers/parametric-node-renderer.tsx` — 空 group + 注册 + 事件
- **把 wall 迁进注册表**（第一个用户），`wall-renderer.tsx` 删除
- 工具也进注册表：`def.tool`

**参考源码**
```
wiki/architecture/node-definitions.md            ← 必读全文
wiki/architecture/systems.md
wiki/architecture/renderers.md
packages/core/src/registry/
packages/viewer/src/systems/geometry/
packages/viewer/src/components/renderers/parametric-node-renderer.tsx
```

**验收**：wall 完全走注册表渲染；per-kind renderer 文件消失。

---

## M6 楼板、天花、柱 **[模式]**

**承接 M5**：注册表就位，加类型的成本应该接近于零。

**做什么**
- `slab`：多边形轮廓 + 厚度 + 标高，点击成环的绘制工具
- `ceiling`：同 slab，但吸附到层顶
- `column`：参数化截面（矩形 / 圆形）
- 抽出可复用的**多边形绘制工具**（slab / ceiling 共用）

**参考源码**
```
packages/nodes/src/slab/      packages/nodes/src/ceiling/      packages/nodes/src/column/
packages/viewer/src/systems/slab/
```

**验收**：加第三种类型的工作量 ≈ 加第二种。这一条本身就是对 M5 的检验。

---

## M7 门窗与开洞 **[机制]**

**承接 M5/M6**：注册表 + 多种类型共存。

**做什么**
- 宿主关系：`door.parentId = wall.id`，`wall.children` 反向索引
- 沿墙定位：参数 `t` ∈ [0,1] + 底标高，而不是绝对坐标
- 放置约束 `canPlaceOnWall`：射线命中墙 → 反算 `t`
- **Shape + holes**：墙轮廓挤出时挖洞（决策 4 的兑现）
- 删墙级联删门窗
- 拖动门窗沿墙滑动（约束在墙面内）

**参考源码**
```
packages/nodes/src/door/     packages/nodes/src/window/
wiki/architecture/spatial-queries.md
packages/viewer/src/systems/wall/opening-cutout-geometry.ts
packages/viewer/src/systems/wall/wall-cutout.tsx
```

**验收**：洞是真的（从洞里能看到墙那边）；拖墙端点门窗跟随；删墙门窗一起消失。

---

## M8 多楼层 **[机制]**

**承接 M7**：宿主关系与级联删除已有。

**做什么**
- `Site → Building → Level` 节点树
- 层高、墙顶绑定层平面、墙底绑楼板
- 楼层切换：当前层实心、下层灰显、上层隐藏
- **迁移**：`wall.height` → `level.height`（第一次真实 schema 迁移，M1 那个"不给 default"的决定在这里付息）

**参考源码**
```
wiki/architecture/vertical-model.md              ← 必读全文
packages/viewer/src/systems/level/
packages/core/src/store/use-scene-vertical-migration.test.ts
```

**验收**：两层楼，二层墙站在一层楼板上；改层高，该层所有墙跟着变，显式设过高度的墙不变。

---

## M9 存档、导入导出、迁移 **[混合]**

**承接 M8**：已经做过一次迁移，知道痛在哪。

**做什么**
- localStorage 自动保存 + 手动存档点
- JSON 导出 / 导入
- schema 版本号 + 迁移链（每次 schema 变更追加一个迁移函数 + 一个测试）
- 场景列表 / 新建 / 删除

**参考源码**
```
packages/core/src/store/use-scene-*-migration.test.ts    ← 8 个迁移测试，看它们怎么写
packages/mcp/src/storage/
```

**验收**：把 M1 时代格式的存档喂进去，能加载、能迁移、能再存回新格式。

---

## M10 屋顶 **[模式]**

**承接 M8**：层与标高体系。

**做什么**：`roof` + `roof-segment`，山形 / 四坡生成，墙向上裁切到屋面下。CSG 首次登场。

**参考源码**
```
packages/nodes/src/roof/          packages/nodes/src/roof-segment/
packages/viewer/src/systems/roof/roof-system.tsx    ← 2716 行，全项目几何最难
```

**注**：这是唯一一个我建议你**大段参照原码改写**而不是从零推的 M。屋面生成的边界情况极多。

---

## M11 楼梯 **[模式]**

**承接 M6/M8**：楼板 + 多层。

**做什么**：`stair` + `stair-segment`；**在楼板上开洞**——第一个真正的跨类型几何依赖（改楼梯要让楼板重建）。

**参考源码**
```
packages/nodes/src/stair/    packages/nodes/src/stair-segment/
packages/viewer/src/systems/stair/
StairOpeningSystem（在 packages/core，搜 StairOpeningSystem）
```

---

## M12 UI 外壳 **[模式]**

**承接**：功能已全部就位，现在给它一张脸。

**做什么**
- 接入 Tailwind + Radix + CVA + clsx + tailwind-merge + lucide-react
- `ui/primitives/` — Button / Popover / Dropdown / Slider / Dialog / Tooltip / Switch 的 Radix 包装
- 侧栏 + 图标条 + tab bar
- Build 面板（工具选择）
- 视口叠加层：当前工具提示、快捷键条

**参考源码**
```
packages/editor/src/components/ui/primitives/    ← 19 个，直接对照改写
packages/editor/src/components/ui/sidebar/
apps/editor/components/build-tab.tsx             ← 556 行，工具清单的组织方式
```

---

## M13 属性面板与大纲 **[模式]**

**做什么**
- 参数化属性面板：选中节点 → 按 schema 生成表单
- 每种类型的专属 panel
- 多选面板
- 场景大纲树（可展开、可选中、可改名）

**参考源码**
```
packages/editor/src/components/ui/panels/parametric-inspector.tsx
packages/editor/src/components/ui/panels/multi-selection-panel.tsx
packages/nodes/src/*/panel.tsx                   ← 24 个样本
```

---

## M14 材质与上色 **[混合]**

**做什么**
- 表面角色（surface roles）+ 颜色预设 + 场景主题
- 材质槽位 `slots`：一堵墙内外面分别上色
- 上色模式：点选某个面刷材质
- 需要 M2 §06 里那条"UV 世界投影"——贴图跨墙连续

**参考源码**
```
wiki/architecture/materials-and-themes.md        ← 必读全文
packages/nodes/src/wall/paint.ts
packages/nodes/src/wall/treatments.tsx
packages/viewer/src/systems/wall/wall-materials.ts
packages/viewer/src/systems/wall/wall-system.tsx  ← applyWorldPlanarWallUVs
```

**验收**：这是最后一个 M。跑通后你手里是一个能画多层住宅、开门窗、盖屋顶、上颜色、能存能读的编辑器。

---

## 新对话开场协议

把下面这段原样贴给我：

```
项目 C:\Users\User\workspace\meguri\r3f-arch，对照仓库 ..\editor。
先读 docs/STATE.md、docs/DECISIONS.md、docs/ROADMAP.md，
再扫一遍 src/ 的真实代码和测试结果，
报告实际代码与计划的偏差，然后出 M<N> 的方案。
```

**我在开场必须做的四件事**（缺一会导致漂移）：

1. 读 `STATE.md` / `DECISIONS.md` / `ROADMAP.md`
2. **读 `src/` 的真实代码**，不是读我上次写的计划
3. 跑 `pnpm verify` 和测试，确认基线是绿的
4. **先报告偏差，再出计划**——如果实际代码和路线图假设不符，先对齐

---

## 三种失败模式与对策

| 失败模式 | 什么时候发生 | 对策 |
|---|---|---|
| **接口漂移** | 后一个 M 的计划假设前一个 M 留了某个钩子，但实际写法不同 | 开场第 2、4 步。已经发生过一次（eslint `allowTypeImports` 位置） |
| **决策失忆** | 跨对话必然发生 | `DECISIONS.md` 累积记录，含"为什么"，开场必读 |
| **累积腐坏** | 前期临时方案在中后期集中爆发 | 每个 M 的"故意保留的缺陷"清单标注到期 M，`STATE.md` 里跟踪 |
