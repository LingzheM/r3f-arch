// 无头几何探针：不渲染，只 build 出 Object3D 然后量包围盒。
// 它守的是【批 F 唯一没有别的护栏的那一条】——「墙的顶到底跟不跟层高走」。
// tsc / eslint 对此结构上看不见，而 D11 说的「不测」指的是 React / 指针 / 键盘，
// 不包括这种纯函数式的几何构建：three 在 Node 里跑得动，不需要 GL 上下文。
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { WallNode } from '../../core/schema/wall'
import { CeilingNode } from '../../core/schema/ceiling'
import { LevelNode } from '../../core/schema/level'
import type { AnyNode, AnyNodeId } from '../../core/schema/types'
import type { GeometryContext } from '../../core/registry/node-definition'
import type { MiterData } from '../../core/systems/wall/wall-mitering'
import { buildWallGeometry } from './wall/geometry'
import { buildCeilingGeometry } from './ceiling/geometry'

const nodes: Record<string, AnyNode> = {
  level_3m: LevelNode.parse({ id: 'level_3m', type: 'level', level: 0, height: 3.0 }),
}
const ctx = <L,>(): GeometryContext<L> => ({
  resolve: (id: AnyNodeId) => nodes[id],
  siblings: [],
  levelData: undefined,
})

const yRange = (obj: THREE.Object3D) => {
  const box = new THREE.Box3().setFromObject(obj)
  // +0 是为了把 -0 归一成 0：toEqual 区分正负零。
  return [Number(box.min.y.toFixed(4)) + 0, Number(box.max.y.toFixed(4)) + 0]
}

const wall = (extra: Record<string, unknown>) =>
  WallNode.parse({ id: 'wall_a', type: 'wall', start: [0, 0], end: [4, 0], ...extra })

describe('墙顶 / 天花底跟不跟层走（M8 批 F）', () => {
  it('无宿主 + 无 height → [0, 2.5]（和批 F 之前完全一样）', () => {
    const g = buildWallGeometry(wall({}), ctx<MiterData>(), { selected: false })
    expect(yRange(g)).toEqual([0, 2.5])
  })

  it('挂在 3.0 m 的层上 + 无 height → [0, 3.0]（plane-bound 生效）', () => {
    const g = buildWallGeometry(wall({ parentId: 'level_3m' }), ctx<MiterData>(), { selected: false })
    expect(yRange(g)).toEqual([0, 3])
  })

  it('挂在 3.0 m 的层上 + 显式 height 1.0 → [0, 1.0]（explicit 不动）', () => {
    const g = buildWallGeometry(
      wall({ parentId: 'level_3m', height: 1.0 }),
      ctx<MiterData>(),
      { selected: false },
    )
    expect(yRange(g)).toEqual([0, 1])
  })

  it('天花无 height 挂 3.0 m 层 → 底面 2.99', () => {
    const c = CeilingNode.parse({
      id: 'ceiling_a', type: 'ceiling', parentId: 'level_3m',
      polygon: [[0, 0], [4, 0], [4, 4], [0, 4]],
    })
    expect(yRange(buildCeilingGeometry(c, ctx(), { selected: false }))[0]).toBe(2.99)
  })
})