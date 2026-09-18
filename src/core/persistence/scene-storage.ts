import { generateId } from "../schema/base"
import { CURRENT_SCENE_VERSION } from "./scene-document"

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
    maxCheckPointsPerScene?: number
  } = {},
) {
  const now = options.now ?? (() => new Date().toISOString())
  const newId = options.newId ?? ((kind: 'scene' | 'checkpoint') => generateId(kind))
  const maxCheckpoints = options.maxCheckPointsPerScene ?? 10

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
}