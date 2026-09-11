import type { ReactNode } from "react"
import { useEditor } from "../store/use-editor"
import { useScene } from "../../core/store/use-scene"
import { levelBaseY } from "../../core/services/storey"
import { resolveCurrentLevelId } from "../lib/level/current-level"

export function LevelFrame({
  levelId,
  children,
}: {
  levelId?: string | null
  children: ReactNode
}) {
  const preferred = useEditor((s) => s.currentLevelId)

  const baseY = useScene((s) =>
    levelBaseY(levelId !== undefined ? levelId : resolveCurrentLevelId(preferred, s.nodes), s.nodes),
  )
  return <group position-y={baseY}>{children}</group>
}