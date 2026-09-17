import type { SceneSnapshot } from "../store/history-control";
import { runSceneMigrations, SceneMigrationError } from "./migrations";
import { normalizeSceneNodes, type LoadReport } from "./normalize-snapshot";
import { CURRENT_SCENE_VERSION, SCENE_FORMAT, type RawNode, type RawSceneDocument } from "./scene-document";

export type SceneLoadError =
  | { kind: 'not-json' }
  | { kind: 'not-a-scene' }
  | { kind: 'too-new'; version: number }
  | { kind: 'migration-failed'; from: number; message: string }

export type SceneLoadResult =
  | { ok: true; snapshot: SceneSnapshot; report: LoadReport; fromVersion: number }
  | { ok: false; error: SceneLoadError }

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const asRawNodes = (list: readonly unknown[]): RawNode[] => list.map((n) => (isObject(n) ? n : {}))
const asIds = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

export function toRawDocument(value: unknown): RawSceneDocument | SceneLoadError {
  if (!isObject(value)) return { kind: 'not-a-scene' }

  if (value.format === SCENE_FORMAT) {
    const { version, nodes } = value
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || !Array.isArray(nodes)) {
      return { kind: 'not-a-scene' }
    }
    if (version > CURRENT_SCENE_VERSION) return { kind: 'too-new', version }
    return { version, nodes: asRawNodes(nodes), rootNodeIds: asIds(value.rootNodeIds) }
  }

  if ('format' in value || 'version' in value) return { kind: 'not-a-scene' }

  const { nodes } = value
  const list = Array.isArray(nodes) ? nodes : isObject(nodes) ? Object.values(nodes) : null
  if (list === null) return { kind: 'not-a-scene' }
  return { version: 0, nodes: asRawNodes(list), rootNodeIds: asIds(value.rootNodeIds) }
}

/**
 * 读档: 信封 迁移 规范化.
 * @param value 
 */
export function loadSceneDocument(value: unknown): SceneLoadResult {
  const raw = toRawDocument(value)
  if ('kind' in raw) return { ok: false, error: raw }

  let migrated: RawSceneDocument
  try {
    migrated = runSceneMigrations(raw)
  } catch (e) {
    return {
      ok: false,
      error: {
        kind: 'migration-failed',
        from: e instanceof SceneMigrationError ? e.from : raw.version,
        message: e instanceof Error ? e.message : String(e),
      },
    }
  }

  const { snapshot, report } = normalizeSceneNodes(migrated.nodes, migrated.rootNodeIds)
  return { ok: true, snapshot, report, fromVersion: raw.version }
}

export function parseSceneDocument(text: string): SceneLoadResult {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, error: { kind: 'not-json' } }
  }
  return loadSceneDocument(value)
}