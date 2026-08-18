# 部署与 CI 调查

调查日期：2026-08-18 · 基线 commit `0b20a18 M2 + line, 求线交点`

回答两个问题：**现在需不需要 GitHub Actions**，以及**没有后端能不能部署到 GitHub**。

---

## 结论

| 问题 | 结论 |
|---|---|
| 能部署到 GitHub Pages 吗 | **能**。纯静态，零后端依赖 |
| 需要 Actions 吗（部署） | **需要**。`dist/` 在 gitignore 里，不用 Actions 只能手推产物或把产物提交进 git，两条路都难看 |
| 需要 Actions 吗（CI） | **更需要**。类型检查现在是红的且已推上 origin；架构 lint 规则没有 CI 等于没有 |
| 能直接开工吗 | **不能**。有 4 个坑必须先填，见下 |

---

## 一、能部署：证据

### 零后端依赖

```
$ grep -rn "fetch(\|axios\|XMLHttpRequest\|WebSocket\|localStorage\|indexedDB" src/
(none)
```

全仓库没有任何网络调用或持久化。状态全在 zustand 内存里，刷新即丢。这是最干净的静态托管场景 —— 不需要 API、不需要数据库、不需要 SSR。

### 生产构建能过

```
$ pnpm exec vite build --outDir .tmp-build --emptyOutDir
vite v8.2.1 building client environment for production...
✓ 665 modules transformed.
.tmp-build/index.html                    0.40 kB │ gzip:   0.27 kB
.tmp-build/assets/index-BsT1KKUC.js  1,172.24 kB │ gzip: 321.37 kB
✓ built in 645ms
```

1.17 MB / gzip 321 KB，绝大部分体积是 three。Pages 的额度（单站约 1 GB、每月约 100 GB 流量）绰绰有余。

> 构建器提示单 chunk 超过 500 kB。现在无所谓 —— 首屏就是这个 3D 应用本身，拆包只会多一次往返。等 M4/M6 引入 `three-bvh-csg` 之类的重依赖再考虑 `dynamic import()`。

---

## 二、为什么部署这件事需要 Actions

Pages 只能托管**已经构建好的文件**。而 `dist/` 在 `.gitignore` 里。不用 Actions 就只剩两条路：

| 方案 | 问题 |
|---|---|
| 手动 `vite build` 后推到 `gh-pages` 分支 | 每次发布都要人记得做；构建产物进 git 历史，仓库越滚越大 |
| 把 `dist/` 从 gitignore 拿掉、直接提交 | 更糟。每次改代码都产生一坨无意义 diff，还会和 `tsc --build` 的库产物打架 |

官方的 `actions/upload-pages-artifact` + `actions/deploy-pages` 是把产物作为 artifact 直接交给 Pages，**不进 git 历史**。这是唯一不留后遗症的做法。

---

## 三、为什么 CI 这件事更值

### 类型检查现在就是红的，而且已经推上去了

```
$ pnpm check-types
src/viewer/lib/wall-geometry.ts(9,11): error TS6133: 'length' is declared but its value is never read.
```

`wall-geometry.ts:9` 的 `length` 只服务于 `:11` 那句被注释掉的 `BoxGeometry`，`noUnusedLocals` 拦下了。

关键在于：**`wall-geometry.ts` 已是 committed 状态**，HEAD 就是 `0b20a18`。也就是说这个错误已经在 origin/master 上了。

会漏掉是因为 `vite dev` 只做转译不做类型检查 —— 本地跑得好好的，你看不见。这正是 CI 存在的理由。

### 架构 lint 没有 CI 等于没有

`eslint.config.js` 里那条规则是这个项目的地基：

```
core 不许依赖 three。几何计算写成纯函数。
core 不许依赖渲染层。
core 不许反向依赖上层。
viewer 不许知道 editor/app 的存在。
```

（已验证规则本身有效：在 `src/core/` 下放一个 `import { Vector3 } from 'three'` 的探针文件，eslint 确实报错；而 `scene-registry.ts` 的 `import type * as THREE` 正常放行。）

但它**靠人记得跑才生效**。这种规则没有 CI，不会在写错的当天报警，而是三个月后你发现 core 里躺着五个 `import * as THREE` 才发现。按路线图，M3 上 spine 状态机、M4 上 GeometrySystem 的时候，这条线守不住整个分层就废了。

---

## 四、开工前必须填的 4 个坑

### 坑 1：`index.html` 未跟踪

```
$ git status --short
?? index.html
```

CI 上 clone 完直接 `vite build` 会失败 —— 找不到入口。**必须先 commit。**

### 坑 2：`dist/` 被两套构建争抢

| 命令 | 输出目录 | 用途 |
|---|---|---|
| `tsc --build` | `dist/` | 库产物，`package.json` 的 `exports` 指着它 |
| `vite build` | `dist/`（默认，且带 `emptyOutDir`） | 应用产物 |

两个命令互相清对方的产物。应用产物得换目录：

```ts
// vite.config.ts
build: { outDir: 'dist-app' }
```

然后 `.gitignore` 加一行 `dist-app/`。

### 坑 3：Pages 的子路径

站点会挂在 `https://lingzhem.github.io/r3f-arch/`，**不是根路径**。不设 `base`，打包出来的 `/assets/index-xxx.js` 会 404，页面白屏。

```ts
// vite.config.ts
base: '/r3f-arch/'
```

> 注意这个白屏和调试期遇到的那次长得一模一样，但成因完全不同（那次是 `BufferGeometry` 的 attribute 名写成了 `positions`，导致包围球半径停在 -1、每帧被视锥剔除）。提前知道，省得到时候误判。

### 坑 4：私有仓库的 Pages 要付费计划

`docs/README.md` 的表格里写着"在线版（私有）"，但那指的可能是 claude.ai artifact 而不是仓库本身。

**私有仓库开 Pages 需要 GitHub Pro / Team 以上，免费版开不了。** 这台机器上没装 `gh` CLI，无法查询 `LingzheM/r3f-arch` 的可见性 —— **需要你自己确认**。

### 附带：`pnpm-lock.yaml` 未提交

CI 用 `--frozen-lockfile` 会因此失败。当前 `git status` 显示它是 modified。先提交。

---

## 五、建议的形态

单个 workflow 文件，两个 job：

```
verify   ── 每次 push / PR
           pnpm install --frozen-lockfile
           pnpm verify          (= check-types + lint，已有脚本)

deploy   ── 仅 master，且 verify 通过
           pnpm build:app       (vite build → dist-app/)
           actions/upload-pages-artifact
           actions/deploy-pages
```

要点：

- **Pages 来源选 "GitHub Actions"**（Settings → Pages → Source），不建 `gh-pages` 分支。
- `pnpm/action-setup` 会读 `package.json` 的 `packageManager: "pnpm@10.0.0"` 字段，版本不用在 workflow 里重复写。
- `deploy` job 需要 `permissions: { pages: write, id-token: write }` 和 `concurrency` 组，防止并发部署互相覆盖。

### 可选：把 `docs/` 一起发布

`docs/m1-wall.html`、`docs/m2-miter.html` 本身就是静态 HTML，不需要构建（目前也未跟踪）。构建时原样拷进产物即可：

```
cp -r docs dist-app/docs
```

之后 `…/r3f-arch/docs/m1-wall.html` 可直接打开，`docs/README.md` 里指向 claude.ai artifact 的私有链接也能换成公开链接。

---

## 六、待办清单

| # | 事项 | 谁做 |
|---|---|---|
| 1 | 确认仓库可见性（私有需付费计划） | **你** |
| 2 | `git add index.html` | — |
| 3 | 提交 `pnpm-lock.yaml` | — |
| 4 | `vite.config.ts` 加 `base` + `outDir: 'dist-app'` | — |
| 5 | `.gitignore` 加 `dist-app/` | — |
| 6 | `package.json` 加 `build:app` 脚本 | — |
| 7 | 新建 `.github/workflows/ci.yml` | — |
| 8 | 删掉 `wall-geometry.ts:9` 未使用的 `length`，否则 CI 首跑即红 | 待定 |
| 9 | Settings → Pages → Source 选 "GitHub Actions" | **你** |
| 10 | commit / push | **你** |
