# STATE —— 当前进度

> 每个 M 验收通过后更新本文件。新对话开场第二个读的（第一个是 README 的「工作约定」）。

**最后更新**：2026-08-26
**当前对话**：#2（M4）
**当前里程碑**：**M4 拖动、撤销、脏传播** —— 方案 + §07 全码 + §08 收尾清单已就位，用户手敲到第 31 项

---

## 进度

| M | 名称 | 状态 |
|---|---|---|
| M1 | 能画一堵墙 | ✅ 验收通过 |
| M2 | 墙角严丝合缝 | ✅ 测试已转绿（`pointOnSegment` 的 `L2` 已修） |
| M3 | 一次点击只干一件事 | ✅ 代码已提交（`b56877e`→`9914873`）；**肉眼验收未走完**，见下 |
| M4 | 拖动、撤销、脏传播 | 🔨 手敲中，**`pnpm verify` 红**，见 `m4-drag.html` §08 |
| M5 | 节点注册表 | 🔨 `m5-registry.html` 已给 §00 + §03；§01/§02/§04/§05/§06 待用户产出。**参考答案封存在 `m5-registry-answers.html`，写完再开** |
| M6 | 楼板、天花、柱 | ⬜ |
| M7 | 门窗与开洞 | ⬜ |
| M8 | 多楼层 | ⬜ |
| M9 | 存档、导入导出、迁移 | ⬜ |
| M10 | 屋顶 | ⬜ |
| M11 | 楼梯 | ⬜ |
| M12 | UI 外壳 | ⬜ |
| M13 | 属性面板与大纲 | ⬜ |
| M14 | 材质与上色 | ⬜ |

---

## 必须先修（阻塞 M5）

**`pnpm verify` 停在 `check-types`，9 个错，`lint` 和 `test` 根本没跑到。**

完整清单在 **`docs/m4-drag.html` §08「收尾清单」**——14 处编辑 + 4 个测试文件，
已在一份 `src/` 的完整拷贝上验证过：应用之后 tsc / eslint / vitest 全绿（6 文件 / 64 用例）。
**不多不少，那些就是从红到绿的全部。**

三条最要紧的（其余见 §08）：

| 位置 | 症状 |
|---|---|
| `viewer/hooks/use-level-miters.ts:17` | 直接调 `calculateLevelMiters`，**`level-miter-cache.ts` 整个是死的** ⟹ M4 头号验收必然失败 |
| `core/store/use-scene.ts:42,48` | `updateNode`/`removeNode` 没接脏标记 ⟹ **M5 的地基是错的** |
| `core/store/history-control.ts:84` | `{...arr}` 花括号展开数组 ⟹ 每次事务把整个历史截成一条 |

第三条是本项目**第四个「类型系统看不见」的 bug**（前三个：M2 算术、M2 常量选错、M3 同名导入遮蔽）。
四个的共同点：写出来都像对的，而且 `verify` 全绿。

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
| 改一堵墙 → 全场景 miter 重算 + 所有墙重建几何 | M2 | **M4（§08 第 08 条修完才真正关掉）** |
| 画墙落点不吸附到已有端点 | M2 | ✅ M4 已关（`snap-2d.ts`） |
| 墙画完不能移动、不能删、无撤销 | M1 | ✅ M4 已关 |
| 橡皮筋预览用 `useState`，每次鼠标移动都重渲染 | M3 | ✅ M4 已关（改 ref + `useFrame`） |
| 交点检测 O(交点×墙)，无空间网格 | M2 | ~~M4~~ → **M8+**，条件见 `m4-drag.html` §02 B |
| 没有 `GeometrySystem`，几何重建仍靠 `useMemo` 依赖数组 | M4 | M5 |
| live 覆盖是 `Partial<AnyNode>`，无 per-type 校验 | M4 | M5 |
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

---

## 待决（需要用户拍板）

1. ~~M5 的交付方式~~ —— **2026-08-26 已定：助手给 §00 + §03，用户产出 §01/§02/§04/§05/§06，
   助手只 review。** 见 `m5-registry.html` 末尾「轮到你了」。

2. **M5 的三处结构分叉**（`m5-registry.html` §03 列了原材料，结论由用户写进 §02）：
   `wallDefinition` 放哪层（core 不许运行时依赖 three）、`AnyNode` 还手写不手写
   `discriminatedUnion`、斜接走 `ctx.siblings` 还是 `def.computeLevelData`。

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
| 纯几何（`geometry-2d` / `wall-mitering`） | ✅ 31 用例，已绿 |
| M4 的纯函数（`wall.test` / `history-control.test` / `wall-adjacency.test` / `snap-2d.test`） | ⬜ §07 给了全码，**一个都没敲** |
| 真实功能操作（建墙→拖→撤销→删的端到端） | ⬜ `m4-drag.html` §09 给了 7 个文件 / 85 用例，待敲 |
| R3F 渲染 / 指针 / 键盘 | ❌ 无环境，靠跑起来看（D11 明确接受） |

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

---

## 事故记录

**2026-08-20**：M3 期间助手直接把实现代码写进了 `src/`（约 800 行，12 新文件 + 6 处改写），
违反了当时尚未成文的工作约定，已全部回滚到 `e71782d` 并保留基建（mitt/vitest/两个测试文件）。
用户的 8 个未跟踪 stub 文件被覆盖丢失。规则已写入 `README.md` 顶部与 `DECISIONS.md` D14。
