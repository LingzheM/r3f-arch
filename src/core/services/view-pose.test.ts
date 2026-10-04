import { boundsCenter, type SceneBounds } from "./scene-bounds";
import { describe, expect, it } from "vitest";
import { viewPose, type ViewMode } from "./view-pose";

/** 一栋 8 x 6 m, 高 5 m的楼，中心在（4, 2.5, 3） */
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

  it('back 在 -Z侧 —— 写反了会看到背面', () => {
    expect(viewPose('back', house).position[2]).toBeLessThan(house.min[2])
  })

  it('right 在 +X 侧，left 在 −X 侧', () => {
    expect(viewPose('right', house).position[0]).toBeGreaterThan(house.max[0])
    expect(viewPose('left', house).position[0]).toBeLessThan(house.min[0])
  })
})