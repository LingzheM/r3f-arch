import type { ViewMode } from "../../core/services/view-pose"
import type * as THREE from 'three'

export type Axis3 = 'x' | 'y' | 'z'

export type OrthoViewMode = Exclude<ViewMode, '3d'>

export type orthoWorldWindow = {
  hMin: number
  hMax: number
  vMin: number
  vMax: number
  hAxis: Axis3
  vAxis: Axis3
}

const AXES: Record<OrthoViewMode, { hAxis: Axis3; vAxis: Axis3 }> = {
  plan: { hAxis: 'x', vAxis: 'z' },
  front: { hAxis: 'x', vAxis: 'y' },
  back: { hAxis: 'x', vAxis: 'y' },
  left: { hAxis: 'z', vAxis: 'y' },
  right: { hAxis: 'z', vAxis: 'y' },
}

/**
 * 当前正交相机在世界空间里框住的可见区间，供标尺用
 * 
 */
export function orthoWorldWindow(
  camera: THREE.OrthographicCamera,
  mode: OrthoViewMode
): orthoWorldWindow {
  const halfW = (camera.right - camera.left) / (2 * camera.zoom)
  const halfH = (camera.top - camera.bottom) / (2 * camera.zoom)
  const { hAxis, vAxis } = AXES[mode]
  const centerH = camera.position[hAxis]
  const centerV = camera.position[vAxis]

  return {
    hMin: centerH - halfW,
    hMax: centerH + halfW,
    vMin: centerV - halfH,
    vMax: centerV + halfH,
    hAxis,
    vAxis,
  }
}