# M9 交接 —— 开新会话前读这个

> 2026-09-15，由 M8 会话在上下文将满时写成。**刻意写短**：只放新会话读 `src/` 和 git 查不出来的东西，其余全部给指针。
> 本文件里的每条事实都标了**怎么查到的**；没查过的写「未查」。

---

## ① 开工前，你（用户）要做的三件事

1. **从 `r3f-arch` 目录启动新会话**，不要从 `editor` 启动。
   M8 会话是从 `editor` 启动的，结果是：加载了对照仓库的 `AGENTS.md`（与本项目无关的噪音）、
   `git status` 显示的是对照仓库、记忆目录记在 `editor` 名下。`r3f-arch` 本身没有 `CLAUDE.md`（Glob 查过）。
2. **先提交文档和暂存区**（`git status` 2026-09-15 查过）：
   - 未跟踪、**丢了就找不回**：`docs/m7-openings.html`、`docs/m8-levels.html`、`docs/handoff-m8.md`、`docs/m8-demo-issues.md`、本文件
   - 自 09-05 起未提交：`docs/DECISIONS.md`（D19 / D20 等 +127 行）、`docs/STATE.md`、`docs/README.md`
   - **已暂存未提交**：`src/core/store/migrate-to-levels.ts`、`src/app/lib/level/level-actions.ts`、`src/viewer/systems/sibling-groups.test.ts`
3. 把 ③ 的提示词贴给新会话。

---

## ② 基线（2026-09-15 实测，新会话不必重做「逐文件对偏差」）

**`pnpm verify` 绿：15 文件 / 200 用例。** M8 文档预期是 **16 文件 / 210 用例**。

我把你的 `src/` 和 M8 会话里跑绿的沙箱拷贝逐文件 diff 过（去掉注释、引号、分号、行序之后再比）：

| 差异 | 结论 |
|---|---|
| **沙箱有 `core/store/migrate-to-levels.test.ts`，你的 `src/` 没有**（Glob 确认，没有改名） | **批 J 的 15 条测试没敲**。批 J 的变异测试结果目前在你的 `src/` 上**没有护栏** |
| 用例数 200 ≠ 210 − 15 = 195，多出 5 条 | **未查**是哪个文件多。一条命令：`pnpm vitest run --reporter=verbose`，按文件数 |
| `level-actions.ts` 的错误信息缩短了（`'[level] ensureScaffold'`） | 无害 |
| 其余 `app.tsx` / `level-visibility.tsx` / `level-display*.ts` / `migrate-to-levels.ts` | 只有格式、注释、import 顺序不同，**逻辑一致** |

所以新会话的「报告偏差」只需要：跑 verify、补查那 5 条、确认批 J 测试补没补。**不要重新通读 `src/` 找偏差。**

---

## ③ 贴给新会话的提示词

```
项目 C:\Users\User\workspace\meguri\r3f-arch，对照仓库 ..\editor。

先读 docs/README.md 的「工作约定」，再读 docs/handoff-m9.md（全文，很短），
然后 docs/STATE.md、docs/DECISIONS.md、docs/ROADMAP.md 的 M9 一节。
不要通读 docs/m8-levels.html（316KB），需要时按 handoff-m9 ④ 给的关键词 grep。

跑 pnpm verify，按 handoff-m9 ② 核对基线，报告差异。
然后先做 ⑤「M9 前置」，再出 M9 的方案。代码写进 docs/m9-*.html，不要动 src/。
```

---

## ④ M8 定下、但还没进 `DECISIONS.md` / `STATE.md` 的东西

**`STATE.md` 停在 2026-09-10（M7 等验收、M8「闸门红」）**——新会话照它读会以为 M8 没开始。
更新它是 ⑤ 的第一件事。下面这些要写成 `DECISIONS.md` 的新条目（在 `m8-levels.html` 里 grep 括号内关键词可找到原文）：

| 决定 | 一句话 | grep |
|---|---|---|
| Level 的位姿走 `def.renderer`，不改 `def.frame` 签名 | 路径 (e)：`LevelRenderer` 把 `frame` 作为 prop 传给 `ParametricNodeRenderer`；M7 定的 `frame` 签名不变 | `前置 B` |
| 层的世界 Y 是**算出来的，不存** | `getLevelElevations`：同一 building 内按 `level` 序数排序累加 `height`，加 `baseElevation`；按 `nodes` 引用 WeakMap 缓存 | `getLevelElevations` |
| **缺席即数据** | `wall.height` / `level.height` / `ceiling.height` 可选、**无默认值**；缺席 = 跟着层高走，有值 = 显式。`updateNode` 删除值为 `undefined` 的键 | `缺席` |
| 墙顶 / 天花 | `resolveWallTop = wall.height ?? 层高`；`resolveCeilingHeight = ceiling.height ?? 层高 − 0.01`；**天花板不看墙高**（这就是 P3 悬空） | `CEILING_CLAMP_MARGIN` |
| 兄弟分组 | 几何系统按 `(type, parentId)` 分组，跨层的墙不再互相斜接 | `siblingGroupKey` |
| 上层隐藏走 `layers`（31），不走 `visible` | three 的射线**无视** `visible`，只看 layers；下层灰显、可编辑 | `HIDDEN_LEVEL_LAYER` |
| `migrateToLevels` | 纯函数，幂等；把平的场景收进 Site → Building → Level 0，**自己维护 `children`**。它是 M9 迁移链的第一个节点 | `migrateToLevels` |
| 批 F 更正 | `WallNode.height` **保留**（意义从「高度」变成「显式高度」）；删掉它 zod 会静默剥掉字段 | `height 字段保留` |

---

## ⑤ M9 前置（先于 M9 本体）

**全部问题、调查过程和方案都在 `docs/m8-demo-issues.md`，新会话不要重新诊断，只核对行号是否漂移。**

按顺序：

1. **更新 `STATE.md` / `DECISIONS.md`**（④ 的内容）。M7 的 10 条肉眼验收、M8 各批末尾的肉眼验收（批 E / G / H / I 四条没有自动护栏）**是否走过：未知，问用户**。
2. **补批 J 的测试**，查清 ② 那多出的 5 条。
3. **P2 天花板选不中**：先看状态栏第一个词。是 `ceiling` → 不是 bug，写进演示说明；否则按 `m8-demo-issues.md` P2 的控制台片段查。
4. **P1（高，会静默改错数据）+ P4**：都在 `opening-tool.tsx` / `move-tool.tsx`，一起出代码。
5. **P5**：`depthTest={false}`，**必须用户在浏览器里看过**才算完（2026-09-02 `<Line>` 事故）。
6. P3：只改演示步骤。P6–P9 到期 M12，不做。
7. 按 `工作约定`，代码写进文档由用户敲，放在 `m9-*.html` 的「前置 C」。

**做完这一步是一个阶段边界**：提交，然后判断剩余上下文够不够做 M9 本体（`handoff-m8.md` 本来就建议 M8 / M9 分开会话——两个都碰序列化）。

---

## ⑥ M9 本体：三个会让新会话走偏的事实

1. **`m6-prep.md` 写过 localStorage 自动保存的设计（「M9 的一半，提前到 M6」），但 `src/` 里没有任何实现**
   （grep `localStorage|persist|schemaVersion|serialize`：0 处）。它是 **M8 之前的 schema**，只能当参考，不能照搬。
2. **ROADMAP 的验收「把 M1 时代格式的存档喂进去」没有语料**——项目从来没有过持久化。
   M8 `§02 K` 已按工作约定第 6 条更正过这句。M9 要自己定义「老格式」：大概率就是 `migrateToLevels` 吃的那种平场景快照，做成 fixture。
3. **`STATE.md` 里到期 M9 的两笔债**：导入若直接写 `nodes` **必须重建 `children`**（否则门不渲染且不报错）；live 覆盖是 `Partial<AnyNode>`，无按类型校验。

---

## ⑦ 省钱：M8 会话为什么贵，M9 别再这样

| M8 的做法 | 代价 | M9 改成 |
|---|---|---|
| §07 分十批，每批一个来回 | 每一轮都带着整个会话的上下文；单个文档涨到 316KB | **按层交 §07：core → viewer → app**，最多三轮（用户在 M8 末尾认可的方案） |
| 每轮往 HTML 里插内容前先读大文档 | 大文件反复进上下文 | 新内容写成单独片段文件，用脚本插入（M8 的 `patch_doc_ij.py` 就是这个模式） |
| 在上下文快满时才想写交接 | 差点写不出来 | **在阶段边界就写**：§01–§06 交完、§07 交完、前置做完，各是一个边界 |

**沙箱验证的坑**（M8 踩过，每个都花过一轮以上）：

- 沙箱 = 拷贝 `src/` + 用 junction 链接 `node_modules`。scratchpad 按会话隔离，新会话拿不到 M8 的沙箱。
- Write 工具会把字符串里的 `\u0000` 写成真的 NUL 字节 → 在 Python 里用 `chr(92) + "u0000"` 拼。
- 仓库里有 CRLF 文件，多行模式匹配会失败 → 读入时先 `.replace('\r\n', '\n')`，写回时还原。
- Bash 里 `python -c "..."` 会吃掉双引号 → 补丁脚本写成 `.py` 文件；终端是 cp932，要设 `PYTHONIOENCODING=utf-8`。
- 变异测试被中断会把源文件写空 → 原子写（临时文件 + `os.replace`），备份放在 `src/` 之外。
