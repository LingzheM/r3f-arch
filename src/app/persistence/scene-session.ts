import { parseSceneDocument, type SceneLoadError, type SceneLoadResult } from "../../core/persistence/load-scene-document";
import { toSceneDocument } from "../../core/persistence/scene-document";
import type { CheckpointMeta, SceneMeta, SceneStorage } from "../../core/persistence/scene-storage";
import type { SceneSnapshot } from "../../core/store/history-control";
import { replaceScene } from "../../core/store/replace-scene";
import { useScene } from "../../core/store/use-scene";
import { ensureScaffold } from "../lib/level/level-actions";
import { useEditor } from "../store/use-editor";
import { usePersistence } from "../store/use-persistence";
import { startAutosave } from "./autosave";

let autosave: { flush(): void; stop(): void } | null = null

const EMPTY: SceneSnapshot = { nodes: {}, rootNodeIds: [] }

const snapshotNow = (): SceneSnapshot => {
  const { nodes, rootNodeIds } = useScene.getState()
  return { nodes, rootNodeIds }
}

export function describeLoadError(error: SceneLoadError): string {
  switch (error.kind) {
    case 'not-json': return '这不是一个 JSON 文件'
    case 'not-a-scene': return '这不是 r3f-arch 的场景文件'
    case 'too-new': return `这个文件是 v${error.version} 存的，比当前代码认识的版本新。换新版代码再打开，别用这份代码覆盖它`
    case 'migration-failed': return `从 v${error.from} 迁移失败：${error.message}`
  }
}

const nameOf = (storage: SceneStorage, sceneId: string): string | null => storage.list().find((s) => s.id === sceneId)?.name ?? null

function startSessionAutosave(storage: SceneStorage, sceneId: string): void {
  autosave = startAutosave({
    store: useScene,
    write: (snapshot) => {
      storage.save(sceneId, snapshot)
      usePersistence.getState().bumpRevision()
    },
    onStatus: (status, error) => {
      usePersistence.getState().setSaveStatus(status)
      if (status === 'error') {
        usePersistence.getState().setError(error instanceof Error ? error.message : String(error))
      }
    },
  })
}

function stopSessionAutosave(): void {
  autosave?.stop()
  autosave = null
}

export function newScene(storage: SceneStorage, name: string): SceneMeta {
  stopSessionAutosave()

  replaceScene(EMPTY)
  useEditor.getState().select(null)
  useEditor.getState().setCurrentLevel(null)
  ensureScaffold()

  const meta = storage.create(name, snapshotNow())
  storage.setCurrentSceneId(meta.id)

  const persistence = usePersistence.getState()
  persistence.setCurrentScene(meta.id, meta.name)
  persistence.setSaveStatus('saved')
  persistence.setReport(null)
  persistence.bumpRevision()

  startSessionAutosave(storage, meta.id)
  return meta
}

export function openScene(storage: SceneStorage, id: string): SceneLoadResult | null {
  const result = storage.load(id)
  if (result === null) {
    usePersistence.getState().setError(`场景 ${id} 的文档不见了`)
    return null
  }
  if (!result.ok) {
    usePersistence.getState().setError(describeLoadError(result.error))
    return result
  }

  adoptScene(storage, id, result.snapshot)
  usePersistence.getState().setReport(
    result.fromVersion === 0 || result.report.dropped.length > 0 || result.report.repairedParents.length > 0
      ? { fromVersion: result.fromVersion, report: result.report }
      : null,
  )
  return result
}

export function adoptScene(storage: SceneStorage, sceneId: string, snapshot: SceneSnapshot): void {
  stopSessionAutosave()

  replaceScene(snapshot)

  useEditor.getState().select(null)
  useEditor.getState().setCurrentLevel(null)

  ensureScaffold()

  storage.setCurrentSceneId(sceneId)

  const persistence = usePersistence.getState()
  persistence.setCurrentScene(sceneId, nameOf(storage, sceneId))
  persistence.setSaveStatus('saved')
  persistence.setError(null)
  persistence.bumpRevision()
}

export function bootScenes(storage: SceneStorage): void {
  const remembered = storage.currentSceneId() ?? storage.list()[0]?.id ?? null

  if (remembered !== null) {
    const result = openScene(storage, remembered)
    if (result !== null && result.ok) return

    const reason = usePersistence.getState().lastError
    newScene(storage, '未命名')
    usePersistence.getState().setError(reason)
    return
  }

  newScene(storage, '未命名')
}

export function importSceneText(storage: SceneStorage, text: string, name: string): SceneLoadResult {
  const result = parseSceneDocument(text)
  if (!result.ok) {
    usePersistence.getState().setError(describeLoadError(result.error))
    return result
  }

  const survivors = Object.values(result.snapshot.nodes)
    .filter((n) => n.type !== 'site' && n.type !== 'building' && n.type !== 'level')
  if (survivors.length === 0 && result.report.dropped.length > 0) {
    const rejected: SceneLoadResult = { ok: false, error: { kind: 'not-a-scene' } }
    usePersistence.getState().setError(describeLoadError(rejected.error))
    return rejected
  }

  const meta = storage.create(name, result.snapshot)
  adoptScene(storage, meta.id, result.snapshot)
  usePersistence.getState().setReport({ fromVersion: result.fromVersion, report: result.report })
  return result
}

export function exportCurrentScene(storage: SceneStorage): { filename: string, text: string } | null {
  const sceneId = storage.currentSceneId()
  if (sceneId === null) return null

  const name = nameOf(storage, sceneId) ?? sceneId
  const safe = name.replace(/[\\/:*?"<>|]/g, '_').trim() || sceneId
  return {
    filename: `${safe}.r3f-scene.json`,
    text: JSON.stringify(toSceneDocument(snapshotNow()), null, 2),
  }
}

export function checkpointNow(storage: SceneStorage, label?: string): CheckpointMeta | null {
  const sceneId = storage.currentSceneId()
  if (sceneId === null) return null

  autosave?.flush()

  const meta = storage.checkpoint(sceneId, label ?? new Date().toLocaleString(), snapshotNow())
  usePersistence.getState().bumpRevision()
  return meta
}

export function restoreCheckpoint(storage: SceneStorage, sceneId: string, checkpointId: string): SceneLoadResult | null {
  const result = storage.loadCheckpoint(sceneId, checkpointId)
  if (result === null) {
    usePersistence.getState().setError('这个存档点的文档不见了')
    return null
  }
  if (!result.ok) {
    usePersistence.getState().setError(describeLoadError(result.error))
    return result
  }

  const base = nameOf(storage, sceneId) ?? '场景'
  const meta = storage.create(`${base}（存档点）`, result.snapshot)
  adoptScene(storage, meta.id, result.snapshot)
  return result
}

export function renameScene(storage: SceneStorage, id: string, name: string): void {
  storage.rename(id, name)
  if (usePersistence.getState().currentSceneId === id) {
    usePersistence.getState().setCurrentScene(id, name)
  }
  usePersistence.getState().bumpRevision()
}