import { describe, expect, it } from "vitest";
import { commitLevelHeight } from "./commit-level-height";

describe('commitLevelHeight (I9)', () => {
  it('正常值原样提交', () => {
    expect(commitLevelHeight('3.0')).toBe(3)
  })
})