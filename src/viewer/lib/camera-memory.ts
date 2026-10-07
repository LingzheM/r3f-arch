import type { Vec3 } from "../../core/services/scene-bounds";
import type { ViewMode } from "../../core/services/view-pose";

export type RememberedPose = { position: Vec3; target: Vec3 }

/**
 * 相机视角的记忆。
 * 
 * 为什么不是六份
 * 
 * 为什么是模块变量而不是 zustand
 */
let remembered: RememberedPose | null = null

/** 离开 3D 之前把当下的相机状态记录下来。非 3D模式直接忽略。 */
export function rememberPose(mode: ViewMode, pose: RememberedPose): void {
  if (mode !== '3d') return
  remembered = { position: [...pose.position] as Vec3, target: [...pose.target] as Vec3 }
}

/** 回到 3D 时取出来。没记过或者记忆被作废过，返回null */
export function recallPose(mode: ViewMode): RememberedPose | null {
  if (mode !== '3d') return null
  return remembered
}

export function forgetPose(): void {
  remembered = null
}