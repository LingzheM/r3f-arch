import { boundsCenter, boundsDiagonal, type SceneBounds, type Vec3 } from "./scene-bounds"

/**
 * 视图模式和它们的相机姿态
 * 
 * 这里只算数字（位置/看向/UP/正交半高）。把数字装到一台THREE相机上是viewer的CameraRig的事
 */
export type ViewMode = '3d' | 'plan' | 'front' | 'back' | 'left' | 'right'

export const VIEW_MODES = ['3d', 'plan', 'front', 'back', 'left', 'right'] as const

/** 四个立面。它们是图，不是视角：姿态唯一，不记忆用户的偏移。 */
export const isElevationView = (m: ViewMode): boolean => m !== '3d' && m !== 'plan'

/** 立面里不挂工具。 */
export const toolsEnabled = (m: ViewMode): boolean => !isElevationView(m)

export type ViewPose = {
  position: Vec3
  target: Vec3
  up: Vec3
  projection: 'perspective' | 'orthographic'
  /** 正交相机要框住的半高（米）。viewer换算成 zoom：zoom = 视口高 */
  orthoHalfHeight: number
}

/** 相机到中心的距离 = 包围盒对角线 x 这个系数。> 1 才留得出边距。 */
export const FIT_MARGIN = 1.2

/** 空场景用的 10 m 盒子，只给四个立面兜底；3D / 顶视走下面写死的历史姿态。 */
export const EMPTY_BOUNDS: SceneBounds = { min: [-5, 0, -5], max: [5, 5, 5] }

const UP_Y: Vec3 = [0, 1, 0]
/** 顶视相机在正上方，正好落在万向锁退化点，必须显式给 up（D5）。 */
const UP_PLAN: Vec3 = [0, 0, -1]

const SQRT3 = Math.sqrt(3)

/** 从中心指向相机的单位向量。front 在 +Z 侧，因为 Point2D.y 就是世界 Z（D3）。 */
const DIRECTION: Record<ViewMode, Vec3> = {
  '3d': [1 / SQRT3, 1 / SQRT3, 1 / SQRT3],
  plan: [0, 1, 0],
  front: [0, 0, 1],
  back: [0, 0, -1],
  right: [1, 0, 0],
  left: [-1, 0, 0],
}

/** 空场景的 3D / 顶视姿态 */
/** 新建场景时画面不许变 */
const LEGACY_EMPTY: Partial<Record<ViewMode, ViewPose>> = {
  '3d': {
    position: [10, 10, 10],
    target: [0, 0, 0],
    up: UP_Y,
    projection: 'perspective',
    orthoHalfHeight: 10,
  },
  plan: {
    position: [0, 40, 0],
    target: [0, 0, 0],
    up: UP_PLAN,
    projection: 'orthographic',
    orthoHalfHeight: 10,
  },
}

export function viewPose(mode: ViewMode, bounds: SceneBounds | null): ViewPose {
  if (bounds === null) {
    const legacy = LEGACY_EMPTY[mode]
    if (legacy) return legacy
    return poseFromBounds(mode, EMPTY_BOUNDS)
  }
  return poseFromBounds(mode, bounds)
}

function poseFromBounds(mode: ViewMode, bounds: SceneBounds): ViewPose {
  const center = boundsCenter(bounds)
  const diagonal = Math.max(boundsDiagonal(bounds), 1)
  const distance = diagonal * FIT_MARGIN
  const dir = DIRECTION[mode]

  return {
    position: [
      center[0] + dir[0] * distance,
      center[1] + dir[1] * distance,
      center[2] + dir[2] * distance,
    ],
    target: center,
    up: mode === 'plan' ? UP_PLAN : UP_Y,
    projection: mode === '3d' ? 'perspective' : 'orthographic',
    orthoHalfHeight: orthoHalfHeight(mode, bounds),
  }
}

/**
 * 正交半高。viewer 只按视口高换算zoom，所以这里取“屏幕上横竖两个方向里更大的那个”，
 * 否则一栋又宽又矮的楼在顶视图里会被左右切掉
 */
function orthoHalfHeight(mode: ViewMode, bounds: SceneBounds): number {
  const sizeX = bounds.max[0] - bounds.min[1]
  const sizeY = bounds.max[1] - bounds.min[1]
  const sizeZ = bounds.max[2] - bounds.min[2]

  const [h, v] =
    mode === 'plan' ? [sizeX, sizeZ]
      : mode === 'front' || mode === 'back' ? [sizeX, sizeY]
        : mode === 'left' || mode === 'right' ? [sizeZ, sizeY]
          : [sizeX, sizeY]

  return (Math.max(h, v, 1) / 2) * FIT_MARGIN
}