import { DEFAULT_LEVEL_HEIGHT } from "../../../core/schema/level";
import type { AnyNodeId } from "../../../core/schema/types";
import { levelBaseY } from "../../../core/services/storey";
import { acquireSceneHistoryPause } from "../../../core/store/history-control";
import { migrateToLevels } from "../../../core/store/migrate-to-levels";
import { useScene } from "../../../core/store/use-scene";
import { useEditor } from "../../store/use-editor";
import { adjacentLevelId, nextLevelOrdinal, resolveCurrentLevelId } from "./current-level";

export function ensureScaffold(): AnyNodeId {
  const { nodes } = useScene.getState()
  const existing = resolveCurrentLevelId(useEditor.getState().currentLevelId, nodes)
  if (existing !== null) {
    useEditor.getState().setCurrentLevel(existing)
    return existing
  }

  const release = acquireSceneHistoryPause(useScene)
  let levelId: AnyNodeId
  try {
    const { rootNodeIds } = useScene.getState()
    const migrated = migrateToLevels({ nodes, rootNodeIds })
    useScene.setState({ nodes: migrated.nodes, rootNodeIds: migrated.rootNodeIds })
    useScene.getState().markAllDirty()

    const created = resolveCurrentLevelId(null, migrated.nodes)
    if (created === null) throw new Error('[level] ensureScaffold')
    levelId = created
  } finally {
    release()
  }

  useEditor.getState().setCurrentLevel(levelId)
  return levelId
}

export function addLevelOnTop(): AnyNodeId | null {
  const { nodes, addNode } = useScene.getState()
  const currentId = resolveCurrentLevelId(useEditor.getState().currentLevelId, nodes)
  if (currentId === null) return null

  const current = nodes[currentId]!
  const id = addNode({
    type: 'level',
    parentId: current.parentId,
    level: nextLevelOrdinal(current.parentId, nodes),
    height: DEFAULT_LEVEL_HEIGHT,
  })
  useEditor.getState().setCurrentLevel(id)
  return id
}

export function switchLevel(direction: 1 | -1): boolean {
  const { nodes } = useScene.getState()
  const currentId = resolveCurrentLevelId(useEditor.getState().currentLevelId, nodes)
  const next = adjacentLevelId(currentId, nodes, direction)
  if (next === null) return false
  useEditor.getState().setCurrentLevel(next)
  return true
}

export function readCurrentLevel(): { id: AnyNodeId | null; baseY: number } {
  const { nodes } = useScene.getState()
  const id = resolveCurrentLevelId(useEditor.getState().currentLevelId, nodes)
  return { id, baseY: levelBaseY(id, nodes) }
}