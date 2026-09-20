import { v0ToV1 } from "./migrations/v0-to-v1"
import { CURRENT_SCENE_VERSION, type RawSceneDocument } from "./scene-document"

export type SceneMigration = {
  from: number
  note: string
  migrate: (doc: RawSceneDocument) => Omit<RawSceneDocument, 'version'>
}

export const SCENE_MIGRATIONS: readonly SceneMigration[] = [v0ToV1]


export class SceneMigrationError extends Error {
  readonly from: number
  constructor(from: number, message: string) {
    super(message)
    this.name = 'SceneMigrationError'
    this.from = from
  }
}

export function runSceneMigrations(
  doc: RawSceneDocument,
  migrations: readonly SceneMigration[] = SCENE_MIGRATIONS,
  target: number = CURRENT_SCENE_VERSION,
): RawSceneDocument {
  let current = doc
  while (current.version < target) {
    const from = current.version
    const step = migrations.find((m) => m.from === from)
    if (!step) throw new SceneMigrationError(from, `没有从 v${from} 出发的迁移`)
    current = { ...step.migrate(current), version: from + 1 }
  }
  return current
}