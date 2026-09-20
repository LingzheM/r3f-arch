import { generateId } from "../schema/base"
import type { SceneSnapshot } from "../store/history-control"
import { parseSceneDocument, type SceneLoadResult } from "./load-scene-document"
import { CURRENT_SCENE_VERSION, toSceneDocument } from "./scene-document"

export type KeyValueStore = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  keys(): string[]
}

export type SceneMeta = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  nodeCount: number
  docVersion: number
}

export type CheckpointMeta = { id: string; sceneId: string; label: string; createdAt: string }

type SceneIndex = { scenes: SceneMeta[]; checkpoints: CheckpointMeta[]; currentSceneId: string | null }

const PREFIX = 'r3f-arch:'
const INDEX_KEY = `${PREFIX}index`
const SCENE_PREFIX = `${PREFIX}scene:`
const CHECKPOINT_PREFIX = `${PREFIX}checkpoint:`
const sceneKey = (sceneId: string) => `${SCENE_PREFIX}${sceneId}`
const checkpointKey = (sceneId: string, checkpointId: string) => `${CHECKPOINT_PREFIX}${sceneId}:${checkpointId}`

export class SceneTooNewError extends Error {
  constructor(sceneId: string, version: number) {
    super(`场景 ${sceneId} 是v${version}存的, 比当前 v${CURRENT_SCENE_VERSION} 新, 拒绝覆盖`)
    this.name = 'SceneTooNewError'
  }
}

const isString = (v: unknown): v is string => typeof v === 'string'
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

const isSceneMeta = (v: unknown): v is SceneMeta =>
  isRecord(v) && isString(v.id) && isString(v.name) && isString(v.createdAt) && isString(v.updatedAt) && isNumber(v.nodeCount) && isNumber(v.docVersion)

const ischeckpointMeta = (v: unknown): v is CheckpointMeta =>
  isRecord(v) && isString(v.id) && isString(v.sceneId) && isString(v.label) && isString(v.createdAt)

function peekDocument(text: string | null): { docVersion: number; nodeCount: number } {
  let value: unknown
  try {
    value = JSON.parse(text ?? '')
  } catch {
    return { docVersion: 0, nodeCount: 0 }
  }

  if (!isRecord(value)) return { docVersion: 0, nodeCount: 0 }
  const { version, nodes } = value
  return {
    docVersion: isNumber(version) ? version : 0,
    nodeCount: Array.isArray(nodes) ? nodes.length : isRecord(nodes) ? Object.keys(nodes).length : 0,
  }
}

export function createSceneStorage(
  kv: KeyValueStore,
  options: {
    now?: () => string
    newId?: (kind: 'scene' | 'checkpoint') => string
    maxCheckpointsPerScene?: number
  } = {},
) {
  const now = options.now ?? (() => new Date().toISOString())
  const newId = options.newId ?? ((kind: 'scene' | 'checkpoint') => generateId(kind))
  const maxCheckpoints = options.maxCheckpointsPerScene ?? 10

  const readStoredIndex = (): Partial<SceneIndex> => {
    const raw = kv.getItem(INDEX_KEY)
    if (raw === null) return {}
    let value: unknown
    try {
      value = JSON.parse(raw)
    } catch {
      return {}
    }
    if (!isRecord(value)) return {}
    return {
      scenes: Array.isArray(value.scenes) ? value.scenes.filter(isSceneMeta) : [],
      checkpoints: Array.isArray(value.checkpoints) ? value.checkpoints.filter(ischeckpointMeta) : [],
      currentSceneId: isString(value.currentSceneId) ? value.currentSceneId : null,
    }
  }

  const readIndex = (): SceneIndex => {
    const stored = readStoredIndex()
    const keys = kv.keys()

    const knowScenes = new Map((stored.scenes ?? []).map((s) => [s.id, s]))
    const scenes: SceneMeta[] = []
    for (const key of keys) {
      if (!key.startsWith(SCENE_PREFIX)) continue
      const id = key.slice(SCENE_PREFIX.length)
      scenes.push(knowScenes.get(id) ?? { id, name: id, createdAt: '', updatedAt: '', ...peekDocument(kv.getItem(key)) })
    }
    const sceneIds = new Set(scenes.map((s) => s.id))

    const present = new Set(keys.filter((k) => k.startsWith(CHECKPOINT_PREFIX)))
    const listed = new Set<string>()
    const recorded: CheckpointMeta[] = []
    for (const c of stored.checkpoints ?? []) {
      const key = checkpointKey(c.sceneId, c.id)
      if (!present.has(key) || listed.has(key)) continue
      listed.add(key)
      recorded.push(c)
    }
    const orphans: CheckpointMeta[] = []
    for (const key of present) {
      if (listed.has(key)) continue
      const rest = key.slice(CHECKPOINT_PREFIX.length)
      const cut = rest.indexOf(':')
      if (cut <= 0) continue
      orphans.push({ sceneId: rest.slice(0, cut), id: rest.slice(cut + 1), label: '', createdAt: '' })
    }
    const checkpoints = [...orphans, ...recorded].filter((c) => sceneIds.has(c.sceneId))

    const current = stored.currentSceneId ?? null
    return { scenes, checkpoints, currentSceneId: current !== null && sceneIds.has(current) ? current : null }
  }

  const writeIndex = (index: SceneIndex) => kv.setItem(INDEX_KEY, JSON.stringify(index))

  const writeDoc = (key: string, snapshot: SceneSnapshot) => kv.setItem(key, JSON.stringify(toSceneDocument(snapshot)))

  const loadKey = (key: string): SceneLoadResult | null => {
    const text = kv.getItem(key)
    return text === null ? null : parseSceneDocument(text)
  }

  const requireScene = (index: SceneIndex, sceneId: string): SceneMeta => {
    const meta = index.scenes.find((s) => s.id === sceneId)
    if (!meta) throw new Error(`场景 ${sceneId} 不存在`)
    return meta
  }

  return {
    list: (): SceneMeta[] => [...readIndex().scenes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),

    create(name: string, snapshot: SceneSnapshot): SceneMeta {
      const index = readIndex()
      const t = now()
      const meta: SceneMeta = {
        id: newId('scene'),
        name,
        createdAt: t,
        updatedAt: t,
        nodeCount: Object.keys(snapshot.nodes).length,
        docVersion: CURRENT_SCENE_VERSION,
      }
      writeDoc(sceneKey(meta.id), snapshot)
      writeIndex({ ...index, scenes: [...index.scenes, meta] })
      return meta
    },

    save(sceneId: string, snapshot: SceneSnapshot): SceneMeta {
      const index = readIndex()
      const prev = requireScene(index, sceneId)
      const stored = Math.max(prev.docVersion, peekDocument(kv.getItem(sceneKey(sceneId))).docVersion)
      if (stored > CURRENT_SCENE_VERSION) throw new SceneTooNewError(sceneId, stored)

      writeDoc(sceneKey(sceneId), snapshot)
      const meta: SceneMeta = {
        ...prev,
        updatedAt: now(),
        nodeCount: Object.keys(snapshot.nodes).length,
        docVersion: CURRENT_SCENE_VERSION,
      }
      writeIndex({ ...index, scenes: index.scenes.map((s) => (s.id === sceneId ? meta : s)) })
      return meta
    },

    load: (sceneId: string): SceneLoadResult | null => loadKey(sceneKey(sceneId)),

    remove(sceneId: string): void {
      kv.removeItem(sceneKey(sceneId))
      const prefix = `${CHECKPOINT_PREFIX}${sceneId}:`
      for (const key of kv.keys()) if (key.startsWith(prefix)) kv.removeItem(key)
      writeIndex(readIndex())
    },

    rename(sceneId: string, name: string): void {
      const index = readIndex()
      requireScene(index, sceneId)
      writeIndex({ ...index, scenes: index.scenes.map((s) => (s.id === sceneId ? { ...s, name } : s)) })
    },

    checkpoint(sceneId: string, label: string, snapshot: SceneSnapshot): CheckpointMeta {
      const index = readIndex()
      requireScene(index, sceneId)
      const meta: CheckpointMeta = { id: newId('checkpoint'), sceneId, label, createdAt: now() }
      writeDoc(checkpointKey(sceneId, meta.id), snapshot)

      const mine = [...index.checkpoints.filter((c) => c.sceneId === sceneId), meta]
      const doomed = new Set(mine.slice(0, Math.max(0, mine.length - maxCheckpoints)))
      for (const c of doomed) kv.removeItem(checkpointKey(c.sceneId, c.id))
      writeIndex({ ...index, checkpoints: [...index.checkpoints, meta].filter((c) => !doomed.has(c)) })
      return meta
    },

    listCheckpoints: (sceneId: string): CheckpointMeta[] =>
      readIndex().checkpoints.filter((c) => c.sceneId === sceneId),

    loadCheckpoint: (sceneId: string, checkpointId: string): SceneLoadResult | null => loadKey(checkpointKey(sceneId, checkpointId)),

    currentSceneId: (): string | null => readIndex().currentSceneId,

    setCurrentSceneId(sceneId: string | null): void {
      const index = readIndex()
      if (sceneId !== null) requireScene(index, sceneId)
      writeIndex({ ...index, currentSceneId: sceneId })
    },
  }
}

export type SceneStorage = ReturnType<typeof createSceneStorage>