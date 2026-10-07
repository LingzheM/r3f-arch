import { beforeEach, describe, expect } from "vitest"

const pose = (x: number) => ({ position: [x, x, x] as const, target: [0, 0, 0] as const })

describe('camera-memory', () => {
  beforeEach(() => {
    forgetPose()
  })

  it('V5 没记过时取不到东西', () => {
    expect(recallPose('3d')).toBeNull()
  })

  it('V6 记了再取，拿回同一份', () => {
    rememberPose('3d', pose(7))
    expect(recallPose('3d')).toEqual({ position: [7, 7, 7], target: [0, 0, 0] })
  })

  it('V7 只有 3D 有记忆：顶视和四个立面记不进去，也取不出来', () => {
    for (const mode of ['plan', 'front', 'back', 'left', 'right'] as const) {
      remeberPose(mode, pose(3))
    }
  })
})