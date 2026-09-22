import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { M1_FLAT_SCENE } from "../../core/persistence/__fixtures__/legacy-scenes"
import { createSceneStorage, type KeyValueStore, type SceneStorage } from "../../core/persistence/scene-storage"
import type { AnyNode } from "../../core/schema/types"
import { resetSceneHistoryPause } from "../../core/store/history-control"
import { replaceScene } from "../../core/store/replace-scene"
import { useScene } from "../../core/store/use-scene"
import { useEditor } from "../store/use-editor"
import { usePersistence } from "../store/use-persistence"
import { memoryKV } from "./local-storage-kv"
import {
  bootScenes, checkpointNow, deleteScene, exportCurrentScene,
  importSceneText, newScene, openScene, restoreCheckpoint, stopSession,
} from "./scene-session"

const SCENE_PREFIX = 'r3f-arch:scene:'

const freshSession = () => {
  stopSession()
  resetSceneHistoryPause(useScene)
  replaceScene({ nodes: {}, rootNodeIds: [] })
  useEditor.setState({ selectId: null, currentLevelId: null })
  usePersistence.setState({ currentSceneId: null, currentSceneName: null, saveStatus: 'idle', lastReport: null, lastError: null })
}

const nodesOf = (): AnyNode[] => Object.values(useScene.getState().nodes)
const typesInStore = () => new Set(nodesOf().map((n) => n.type))
const wallCount = () => nodesOf().filter((n) => n.type === 'wall').length

const addWall = () => useScene.getState().addNode({
  type: 'wall',
  parentId: useEditor.getState().currentLevelId,
  start: [0, 0],
  end: [1, 0],
})

const sceneKeys = (kv: KeyValueStore) => kv.keys().filter((k) => k.startsWith(SCENE_PREFIX))
const docTextOf = (kv: KeyValueStore, sceneId: string) => kv.getItem(`${SCENE_PREFIX}${sceneId}`)
const docWallCount = (kv: KeyValueStore, sceneId: string) => {
  const nodes = JSON.parse(docTextOf(kv, sceneId) ?? '{"nodes":[]}').nodes as { type: string }[]
  return nodes.filter((n) => n.type === 'wall').length
}

describe('scene-session', () => {
  let kv: KeyValueStore
  let storage: SceneStorage

  beforeEach(() => {
    vi.useFakeTimers()                       // 防抖用不到：每条断言前都靠 stop() / flush() 同步落盘
    freshSession()
    kv = memoryKV()
    storage = createSceneStorage(kv)
  })
  afterEach(() => {
    stopSession()
    vi.useRealTimers()
  })

  it('冷启动：建出一个带脚手架的场景，并记住它是当前场景', () => {
    bootScenes(storage)

    expect(storage.list()).toHaveLength(1)
    expect(typesInStore()).toEqual(new Set(['site', 'building', 'level']))
    expect(storage.currentSceneId()).toBe(storage.list()[0]!.id)
    expect(useEditor.getState().currentLevelId).not.toBeNull()
    expect(usePersistence.getState().currentSceneId).toBe(storage.currentSceneId())
  })

  it('再启动：读回同一个场景，不会多建一个', () => {
    bootScenes(storage)
    const sceneId = storage.currentSceneId()!
    addWall()
    stopSession()                            // 模拟关页面：stop 里那次 flush 落盘

    freshSession()                           // 新的一次会话：store 是空的
    expect(wallCount()).toBe(0)

    bootScenes(storage)
    expect(storage.list()).toHaveLength(1)
    expect(storage.currentSceneId()).toBe(sceneId)
    expect(wallCount()).toBe(1)
  })

  it('读档之后自动保存是干净的：什么都没改就退出，不会把刚读回来的东西再写一遍', () => {
    bootScenes(storage)
    const sceneId = storage.currentSceneId()!
    stopSession()

    freshSession()
    bootScenes(storage)                      // ← 读档

    // 在文档末尾放一个探针空格：只要被写过一次，JSON.stringify 的结果就没有它了。
    const key = `${SCENE_PREFIX}${sceneId}`
    kv.setItem(key, `${kv.getItem(key)} `)

    stopSession()                            // 没有任何编辑就退出

    expect(kv.getItem(key)!.endsWith(' ')).toBe(true)
  })

  it('打开一个坏场景：当前场景原样继续，自动保存还绑在当前场景上', () => {
    bootScenes(storage)
    const good = storage.currentSceneId()!
    const bad = newScene(storage, '坏的')
    openScene(storage, good)                 // 切回好的那个
    kv.setItem(`${SCENE_PREFIX}${bad.id}`, '{ 这不是 JSON')

    const result = openScene(storage, bad.id)

    expect(result?.ok).toBe(false)
    expect(storage.currentSceneId()).toBe(good)
    expect(usePersistence.getState().lastError).not.toBeNull()

    addWall()
    stopSession()
    expect(docWallCount(kv, good)).toBe(1)   // 改动仍然落在当前场景上
  })

  it('切场景清掉编辑器状态：选中不会留在上一个场景的节点 id 上', () => {
    bootScenes(storage)
    const first = storage.currentSceneId()!
    const wallId = addWall()
    useEditor.getState().select(wallId)

    newScene(storage, '第二个')
    expect(useEditor.getState().selectId).toBeNull()

    useEditor.getState().select(addWall())   // 在第二个场景里选中一堵墙，再切回去
    openScene(storage, first)
    expect(useEditor.getState().selectId).toBeNull()
    expect(useScene.getState().nodes[useEditor.getState().currentLevelId!]).toBeDefined()
  })

  it('打开 too-new 的场景：不覆盖它，另起一个新场景，状态栏说清为什么', () => {
    bootScenes(storage)
    const sceneId = storage.currentSceneId()!
    stopSession()

    // 用"未来版本"的代码存过一次：把文档的 version 改成 99
    const key = `${SCENE_PREFIX}${sceneId}`
    const future = JSON.stringify({ ...JSON.parse(kv.getItem(key)!), version: 99 })
    kv.setItem(key, future)

    freshSession()
    bootScenes(storage)

    expect(storage.currentSceneId()).not.toBe(sceneId)          // 当前场景是新建的那个
    expect(storage.list()).toHaveLength(2)
    expect(usePersistence.getState().lastError).toMatch(/v99/)
    expect(kv.getItem(key)).toBe(future)                         // 那份文档一个字节都没动

    addWall()
    stopSession()                                                // 改动落盘
    expect(kv.getItem(key)).toBe(future)                         // 仍然没动 —— 自动保存没绑在它身上
  })

  it('导入 M1 语料：新建一个场景并切过去，原场景一个字节不变（B2）', () => {
    bootScenes(storage)
    const before = storage.currentSceneId()!
    const beforeDoc = docTextOf(kv, before)

    const result = importSceneText(storage, JSON.stringify(M1_FLAT_SCENE), '导入的')

    expect(result.ok).toBe(true)
    expect(storage.list()).toHaveLength(2)
    expect(storage.currentSceneId()).not.toBe(before)
    expect(docTextOf(kv, before)).toBe(beforeDoc)               // 原场景没被动过
    expect(wallCount()).toBe(3)                                  // M1 语料的三堵墙
    expect(typesInStore()).toEqual(new Set(['site', 'building', 'level', 'wall']))  // v0 → v1 收进了容器
    expect(usePersistence.getState().lastReport?.fromVersion).toBe(0)
  })

  it('导入一个不是场景的 JSON：拒绝，当前场景不动，不多建场景', () => {
    bootScenes(storage)
    const before = storage.currentSceneId()!

    const result = importSceneText(storage, JSON.stringify({ nodes: [{ id: 'x', type: '不是节点' }] }), '垃圾')

    expect(result.ok).toBe(false)
    expect(storage.list()).toHaveLength(1)
    expect(storage.currentSceneId()).toBe(before)
    expect(usePersistence.getState().lastError).toMatch(/不是 r3f-arch/)
  })

  it('切场景：切走之前那笔改动写进【旧】场景，不写进新场景', () => {
    bootScenes(storage)
    const first = storage.currentSceneId()!
    addWall()                                                    // 还挂在防抖里，没落盘

    const second = newScene(storage, '第二个')

    expect(docWallCount(kv, first)).toBe(1)                      // ② stop 先把它写进旧 id
    expect(docWallCount(kv, second.id)).toBe(0)
    expect(wallCount()).toBe(0)                                  // 画面上是新场景
  })

  it('切回去再切过来：两个场景各自记得各自的内容', () => {
    bootScenes(storage)
    const first = storage.currentSceneId()!
    addWall()
    const second = newScene(storage, '第二个')
    addWall()
    addWall()

    openScene(storage, first)
    expect(wallCount()).toBe(1)

    openScene(storage, second.id)
    expect(wallCount()).toBe(2)
  })

  it('删当前场景：先切到别的场景，再删文档', () => {
    bootScenes(storage)
    const first = storage.currentSceneId()!
    const second = newScene(storage, '第二个')

    deleteScene(storage, second.id)

    expect(storage.currentSceneId()).toBe(first)
    expect(sceneKeys(kv)).toHaveLength(1)
    expect(storage.list().map((s) => s.id)).toEqual([first])
  })

  it('删掉最后一个场景：新建一个顶上，不会留下"没有当前场景"的状态', () => {
    bootScenes(storage)
    const only = storage.currentSceneId()!

    deleteScene(storage, only)

    expect(storage.currentSceneId()).not.toBeNull()
    expect(storage.currentSceneId()).not.toBe(only)
    expect(typesInStore()).toEqual(new Set(['site', 'building', 'level']))
  })

  it('导出：文件名带场景名，内容是 store 里【当前】的样子（不是磁盘上那份）', () => {
    bootScenes(storage)
    addWall()                                                    // 只在内存里，没落盘

    const out = exportCurrentScene(storage)!
    const doc = JSON.parse(out.text)

    expect(out.filename).toBe('未命名.r3f-scene.json')
    expect(doc.format).toBe('r3f-arch/scene')
    expect(doc.version).toBe(1)
    expect(doc.nodes.filter((n: { type: string }) => n.type === 'wall')).toHaveLength(1)
  })

  it('存档点：存一份、恢复成一个新场景，当前场景不动', () => {
    bootScenes(storage)
    const sceneId = storage.currentSceneId()!
    addWall()

    const cp = checkpointNow(storage, '一堵墙')!
    expect(storage.listCheckpoints(sceneId)).toHaveLength(1)

    addWall()
    addWall()
    expect(wallCount()).toBe(3)

    restoreCheckpoint(storage, sceneId, cp.id)

    expect(wallCount()).toBe(1)                                  // 回到存档点那一刻
    expect(storage.currentSceneId()).not.toBe(sceneId)           // 恢复走"导入"那条路：新场景
    expect(docWallCount(kv, sceneId)).toBe(3)                    // 原场景留着切走前的三堵
  })
})