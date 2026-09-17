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

export type CheckpointMeta = { id: string; sceneId: string; label: string; created: string }

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