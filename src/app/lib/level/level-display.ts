import type * as THREE from 'three'
import type { AnyNode, AnyNodeId } from '../../../core/schema/types'

export type LevelDisplayMode = 'current' | 'below' | 'above'

export const GHOST_OPACITY = 0.25

export const HIDDEN_LEVEL_LAYER = 31

const GHOST_BACKUP = '__levelGhost'

type MaterialBackup = { transparent: boolean; opacity: number; depthWrite: boolean }

export function levelDisplayMode(
  levelId: AnyNodeId,
  currentId: AnyNodeId | null,
  nodes: Record<AnyNodeId, AnyNode>,
): LevelDisplayMode {
  if (currentId === null || levelId === currentId) return 'current'

  const level = nodes[levelId]
  const current = nodes[currentId]
  if (level?.type !== 'level' || current?.type !== 'level') return 'current'

  if (level.level < current.level) return 'below'
  if (level.level > current.level) return 'above'
  return 'current'
}

export function applyLevelDisplay(root: THREE.Object3D, mode: LevelDisplayMode): void {
  root.traverse((object) => {
    object.layers.set(mode === 'above' ? HIDDEN_LEVEL_LAYER : 0)

    const material = (object as Partial<THREE.Mesh>).material
    if (!material) return

    for (const m of Array.isArray(material) ? material : [material]) {
      if (mode === 'below') ghost(m)
      else restore(m)
    }
  })
}

function ghost(material: THREE.Material): void {
  const data = material.userData as { [GHOST_BACKUP]?: MaterialBackup }
  const backup = (data[GHOST_BACKUP] ??= {
    transparent: material.transparent,
    opacity: material.opacity,
    depthWrite: material.depthWrite,
  })

  setTransparent(material, true)
  material.opacity = backup.opacity * GHOST_OPACITY
  material.depthWrite = false
}

function restore(material: THREE.Material): void {
  const data = material.userData as { [GHOST_BACKUP]?: MaterialBackup }
  const backup = data[GHOST_BACKUP]
  if (!backup) return

  setTransparent(material, backup.transparent)
  material.opacity = backup.opacity
  material.depthWrite = backup.depthWrite
  delete data[GHOST_BACKUP]
}


function setTransparent(material: THREE.Material, value: boolean): void {
  if (material.transparent === value) return
  material.transparent = value
  material.needsUpdate = true
}