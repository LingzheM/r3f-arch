import { describe, expect, it } from "vitest";
import { SELECTION_EMISSIVE, SelectionGlow } from "./selection-glow";

describe('selectionGlow (P8)', () => {
  it('选中时发青绿光', () => {
    expect(SelectionGlow(true)).toEqual({ emissive: SELECTION_EMISSIVE, emissiveIntensity: 0.35 })
  })

  it('没选中时强度是0，不是不设置 —— three 的 emissiveIntensity 默认是1', () => {
    expect(SelectionGlow(false).emissiveIntensity).toBe(0)
  })
})