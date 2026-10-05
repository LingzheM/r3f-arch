import { describe } from "vitest";

describe('orthoWorldWindow', () => {
  it('V1: 半宽按 zoom 反比 —— 800 px 宽 + zoom 40 ⟹ 半宽 10 m；zoom 翻倍，区间减半', () => {
    const base = makeOrthoCamera({ widthPx: 800, heightPx: 800, zoom: 40, position: [0, 40, 0] })
    const w = orthoWordWindow(base, 'plan')
    expect(w.hMax - w.hMin).toBeCloseTo(20, 5)
  })
})