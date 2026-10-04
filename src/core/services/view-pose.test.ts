import { describe, expect, it } from 'vitest'
import { boundsCenter, boundsDiagonal, type SceneBounds } from './scene-bounds'
import { isElevationView, toolsEnabled, VIEW_MODES, viewPose, type ViewMode } from './view-pose'

/** 一栋 8 × 6 m、高 5 m 的楼，中心在 (4, 2.5, 3) */
const house: SceneBounds = { min: [0, 0, 0], max: [8, 5, 6] }

const distanceToCenter = (mode: ViewMode, b: SceneBounds) => {
  const { position } = viewPose(mode, b)
  const c = boundsCenter(b)
  return Math.hypot(position[0] - c[0], position[1] - c[1], position[2] - c[2])
}

describe('viewPose · 立面（I3）', () => {
  it('front 在 +Z 侧，看向中心，up = +Y', () => {
    const pose = viewPose('front', house)
    const c = boundsCenter(house)
    expect(pose.position[2]).toBeGreaterThan(house.max[2])
    expect(pose.position[0]).toBeCloseTo(c[0])
    expect(pose.position[1]).toBeCloseTo(c[1])
    expect(pose.target).toEqual(c)
    expect(pose.up).toEqual([0, 1, 0])
  })

  it('back 在 −Z 侧 —— 写反了会看到背面', () => {
    expect(viewPose('back', house).position[2]).toBeLessThan(house.min[2])
  })

  it('right 在 +X 侧，left 在 −X 侧', () => {
    expect(viewPose('right', house).position[0]).toBeGreaterThan(house.max[0])
    expect(viewPose('left', house).position[0]).toBeLessThan(house.min[0])
  })

  it('四个立面都是正交，3D 是透视', () => {
    expect(viewPose('front', house).projection).toBe('orthographic')
    expect(viewPose('plan', house).projection).toBe('orthographic')
    expect(viewPose('3d', house).projection).toBe('perspective')
  })

  it('相机到中心的距离 ≥ 对角线 —— 近平面不该裁掉半栋楼', () => {
    for (const mode of VIEW_MODES) {
      expect(distanceToCenter(mode, house)).toBeGreaterThanOrEqual(boundsDiagonal(house))
    }
  })

  it('正交半高框得住：楼越大半高越大', () => {
    const small = viewPose('front', house).orthoHalfHeight
    const big = viewPose('front', { min: [0, 0, 0], max: [40, 20, 30] }).orthoHalfHeight
    expect(big).toBeGreaterThan(small)
    // 8 m 宽的立面，半高至少要能装下 4 m
    expect(small).toBeGreaterThanOrEqual(4)
  })

  it('顶视的 up 是 −Z（D5 万向锁），其余都是 +Y', () => {
    expect(viewPose('plan', house).up).toEqual([0, 0, -1])
    for (const mode of VIEW_MODES.filter((m) => m !== 'plan')) {
      expect(viewPose(mode, house).up).toEqual([0, 1, 0])
    }
  })
})

describe('viewPose · 空场景（I4）', () => {
  it('3D 回到 [10,10,10]、看原点 —— 新建场景的画面不许变', () => {
    const pose = viewPose('3d', null)
    expect(pose.position).toEqual([10, 10, 10])
    expect(pose.target).toEqual([0, 0, 0])
    expect(pose.projection).toBe('perspective')
  })

  it('顶视回到 [0,40,0]，up 仍是 −Z', () => {
    const pose = viewPose('plan', null)
    expect(pose.position).toEqual([0, 40, 0])
    expect(pose.up).toEqual([0, 0, -1])
  })

  it('空场景的立面不崩，相机也不和目标重合', () => {
    for (const mode of VIEW_MODES.filter(isElevationView)) {
      const pose = viewPose(mode, null)
      const d = Math.hypot(
        pose.position[0] - pose.target[0],
        pose.position[1] - pose.target[1],
        pose.position[2] - pose.target[2],
      )
      expect(d).toBeGreaterThan(1)
      expect(Number.isFinite(d)).toBe(true)
    }
  })

  it('退化盒（一根柱子）不会让相机贴在目标上', () => {
    const dot: SceneBounds = { min: [1, 0, 1], max: [1.3, 2.5, 1.3] }
    expect(distanceToCenter('front', dot)).toBeGreaterThan(1)
  })
})

describe('isElevationView / toolsEnabled（I11）', () => {
  it('四个立面是立面，3D 和顶视不是', () => {
    expect(isElevationView('front')).toBe(true)
    expect(isElevationView('back')).toBe(true)
    expect(isElevationView('left')).toBe(true)
    expect(isElevationView('right')).toBe(true)
    expect(isElevationView('3d')).toBe(false)
    expect(isElevationView('plan')).toBe(false)
  })

  it('立面里不挂工具，3D / 顶视里挂', () => {
    expect(toolsEnabled('front')).toBe(false)
    expect(toolsEnabled('plan')).toBe(true)
    expect(toolsEnabled('3d')).toBe(true)
  })

  it('两者永远互为反面 —— 加第七种模式时这条会提醒你两边都要改', () => {
    for (const mode of VIEW_MODES) {
      expect(toolsEnabled(mode)).toBe(!isElevationView(mode))
    }
  })
})