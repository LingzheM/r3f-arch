import { describe, expect, it } from "vitest";
import type { Tool } from "../../store/use-editor";
import type { InteractionScope } from "../interaction/scope";
import { statusHint } from "./status-hints";

const TOOLS: Tool[] = ['select', 'wall', 'slab', 'ceiling', 'column', 'door', 'window']

const IDLE: InteractionScope = { kind: 'idle' }


describe('statusHint', () => {
  it('空闲时按当前工具给提示，七种工具各不相同', () => {
    const hints = TOOLS.map((t) => statusHint(IDLE, t))
    expect(new Set(hints).size).toBe(TOOLS.length)
    expect(statusHint(IDLE, 'select')).toContain('选择')
    expect(statusHint(IDLE, 'wall')).toContain('起点')
  })
})