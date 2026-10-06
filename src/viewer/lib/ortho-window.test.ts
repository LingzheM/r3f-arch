import { describe, expect, it } from "vitest";
import * as THREE from 'three'
import { orthoWorldWindow } from "./ortho-window";

function makeOrthoCamera(opts: {
  widthPx: number
  heightPx: number
  zoom: number
  position: [number, number, number]
}): THREE.OrthographicCamera {
  const camera = new THREE.OrthographicCamera(
    -opts.widthPx / 2,
    opts.widthPx / 2,
    opts.heightPx / 2,
    -opts.heightPx / 2,
    -1000,
    1000,
  )
  camera.zoom = opts.zoom
  camera.position.set(...opts.position)
  camera.updateProjectionMatrix()
  return camera
}

describe('orthoWorldWindow', () => {
  it('V1: 半宽按 zoom 反比 —— 800 px 宽 + zoom 40 ⟹ 半宽 10 m；zoom 翻倍，区间减半', () => {
    const base = makeOrthoCamera({ widthPx: 800, heightPx: 800, zoom: 40, position: [0, 40, 0] })
    const w = orthoWorldWindow(base, 'plan')
    expect(w.hMax - w.hMin).toBeCloseTo(20, 5)

    const doubled = makeOrthoCamera({ widthPx: 800, heightPx: 800, zoom: 80, position: [0, 40, 0] })
    const w2 = orthoWorldWindow(doubled, 'plan')
    expect(w2.hMax - w2.hMin).toBeCloseTo(10, 5)
  })

  it('V2: 轴的选择跟视图模式走', () => {
    const camera = makeOrthoCamera({ widthPx: 800, heightPx: 600, zoom: 40, position: [0, 0, 0] })
    expect(orthoWorldWindow(camera, 'plan')).toMatchObject({ hAxis: 'x', vAxis: 'z' })
    expect(orthoWorldWindow(camera, 'front')).toMatchObject({ hAxis: 'x', vAxis: 'y' })
  })

  it('V3: 区间以相机位置为中心', () => {
    const camera = makeOrthoCamera({ widthPx: 800, heightPx: 400, zoom: 40, position: [10, 40, -5] })
    const w = orthoWorldWindow(camera, 'plan')

    expect(w.hMin).toBeCloseTo(0, 5)
    expect(w.hMax).toBeCloseTo(20, 5)
    expect(w.vMin).toBeCloseTo(-10, 5)
    expect(w.vMax).toBeCloseTo(0, 5)
  })

  it('V4: 顶视纵轴向下为正', () => {
    const camera = makeOrthoCamera({ widthPx: 800, heightPx: 800, zoom: 40, position: [0, 40, 6] })
    const w = orthoWorldWindow(camera, 'plan')

    expect(w.vAxis).toBe('z')
    expect(w.vMin).toBeLessThan(w.vMax)
    expect(w.vMin).toBeCloseTo(6 - 10, 5)
    expect(w.vMax).toBeCloseTo(6 + 10, 5)
  })
})