import { DEFAULT_LEVEL_HEIGHT } from "../../../core/schema/level";
import type { AnyNodeId } from "../../../core/schema/types";
import { levelBaseY, resolveLevelHeight } from "../../../core/services/storey";
import { acquireSceneHistoryPause } from "../../../core/store/history-control";
import { useScene } from "../../../core/store/use-scene";
import { useEditor } from "../../store/use-editor";
import { adjacentLevelId, nextLevelOrdinal, resolveCurrentLevelId } from "./current-level";

export function ensureScaffhold(): AnyNodeId {
  const { nodes, addNode } = useScene.getState()
  const existing = resolveCurrentLevelId(useEditor.getState().currentLevelId, nodes)
  if (existing !== null) {
    useEditor.getState().setCurrentLevel(existing)
    return existing
  }

  const release = acquireSceneHistoryPause(useScene)
  let levelId: AnyNodeId
  try {
    const siteId = addNode({ type: 'site' })
    const buildingId = addNode({ type: 'building', parentId: siteId })

    levelId = addNode({ type: 'level', parentId: buildingId, level: 0, height: DEFAULT_LEVEL_HEIGHT })
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