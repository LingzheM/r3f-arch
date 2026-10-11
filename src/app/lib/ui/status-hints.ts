import type { Tool } from "../../store/use-editor";
import type { InteractionScope } from "../interaction/scope";

const IDLE: Record<Tool, string> = {
  select: '点击选择 · 拖动移动 · Del删除',
  wall: '点一下定起点，再点一下成墙 · ESC取消',
  slab: '依次点出楼板轮廓 · 点回起点或 Enter 闭合',
  ceiling: '依次点出天花轮廓 · 点回起点或 Enter 闭合',
  column: '点一下放柱 · Shift 切方柱',
  door: '点墙放门 · 移到墙的另一侧翻转',
  window: '点墙放窗 · 移到墙的另一侧翻转',
}

export function statusHint(scope: InteractionScope, tool: Tool): string {
  switch (scope.kind) {
    case 'drafting':
      if (scope.tool === 'wall') {
        return scope.points.length === 0
          ? '点一下定起点 · Esc 取消'
          : '点第二点成墙 · Esc 取消'
      }
      return scope.points.length < 3
        ? '继续点轮廓 · Esc 取消'
        : '点回起点 或 Enter 闭合 · Esc 取消'

    case 'placing':
      return '点墙放置 · 移到墙的另一侧翻转 · Esc 取消'

    case 'moving':
      return '拖动移动 · 松手落位 · Esc 取消'

    case 'handle-drag':
      return '拖动端点 · 靠近已有端点会吸附 · Esc 取消'

    case 'idle':
      return IDLE[tool]
  }
}