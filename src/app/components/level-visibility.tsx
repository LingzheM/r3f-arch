import { useFrame } from "@react-three/fiber";
import { sceneRegistry } from "../../core/registry/scene-registry";
import { useScene } from "../../core/store/use-scene";
import { resolveCurrentLevelId } from "../lib/level/current-level";
import { useEditor } from "../store/use-editor";
import { applyLevelDisplay, levelDisplayMode } from "../lib/level/level-display";

export function LevelVisibility(): null {
  useFrame(() => {
    const levelIds = sceneRegistry.byType.level
    if (!levelIds || levelIds.size === 0) return

    const { nodes } = useScene.getState()
    const currentId = resolveCurrentLevelId(useEditor.getState().currentLevelId, nodes)

    for (const id of levelIds) {
      const object = sceneRegistry.nodes.get(id)
      if (object) applyLevelDisplay(object, levelDisplayMode(id, currentId, nodes))
    }
  })

  return null
}