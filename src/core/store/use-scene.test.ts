import { beforeEach, describe, expect, it } from 'vitest'
import type { AnyNodeId } from '../schema/types'
import { collectSubtree, useScene } from './use-scene'
import { runAsSingleSceneHistoryStep } from './history-control'

const reset = () => {
  useScene.setState({ nodes: {}, rootNodeIds: [], dirtyNodes: new Set() })
  useScene.temporal.getState().clear()
}

const addWall = () =>
  useScene.getState().addNode({ type: 'wall', start: [0, 0], end: [4, 0] })

const addDoor = (parentId: AnyNodeId, u = 1.5) =>
  useScene.getState().addNode({ type: 'door', parentId, position: [u, 1.05, 0] })

const nodeAt = (id: AnyNodeId) => useScene.getState().nodes[id]

describe('父子关系', () => {
  beforeEach(reset)

  it('addNode 带 parentId → 进父的 children，不进 rootNodeIds', () => {
    const wallId = addWall()
    const doorId = addDoor(wallId)

    expect(nodeAt(wallId)!.children).toEqual([doorId])
    expect(useScene.getState().rootNodeIds).toEqual([wallId])
  })

  it('addNode 的宿主不存在 → 抛错，且场景没被改动', () => {
    expect(() => addDoor('wall_nope' as AnyNodeId)).toThrow()
    expect(Object.keys(useScene.getState().nodes)).toHaveLength(0)
  })

  it('addNode 挂上去时宿主进脏集（墙要重切）', () => {
    const wallId = addWall()
    useScene.getState().clearDirty(wallId)

    addDoor(wallId)
    expect(useScene.getState().dirtyNodes.has(wallId)).toBe(true)
  })

  it('collectSubtree 含自己，且不会因为成环死循环', () => {
    const wallId = addWall()
    const doorId = addDoor(wallId)

    expect(collectSubtree(useScene.getState().nodes, wallId).sort()).toEqual(
      [wallId, doorId].sort(),
    )

    // 人为造一个环：门反过来把墙当孩子。
    useScene.setState((s) => ({
      nodes: { ...s.nodes, [doorId]: { ...s.nodes[doorId]!, children: [wallId] } },
    }))
    expect(collectSubtree(useScene.getState().nodes, wallId)).toHaveLength(2)
  })
})

describe('级联删除', () => {
  beforeEach(reset)

  it('删墙 → 门也没了，rootNodeIds 不含任何一个', () => {
    const wallId = addWall()
    const doorId = addDoor(wallId)

    useScene.getState().removeNode(wallId)

    expect(nodeAt(wallId)).toBeUndefined()
    expect(nodeAt(doorId)).toBeUndefined()
    expect(useScene.getState().rootNodeIds).toEqual([])
  })

  it('删门 → 墙还在，墙的 children 不含它，且墙进脏集', () => {
    const wallId = addWall()
    const doorId = addDoor(wallId)
    useScene.getState().clearDirty(wallId)

    useScene.getState().removeNode(doorId)

    expect(nodeAt(wallId)!.children).toEqual([])
    expect(nodeAt(doorId)).toBeUndefined()
    expect(useScene.getState().dirtyNodes.has(wallId)).toBe(true)
  })

  it('被删的节点都从脏集里清掉', () => {
    const wallId = addWall()
    const doorId = addDoor(wallId)

    useScene.getState().removeNode(wallId)

    expect(useScene.getState().dirtyNodes.has(wallId)).toBe(false)
    expect(useScene.getState().dirtyNodes.has(doorId)).toBe(false)
  })

  it('删墙 → 撤销【一次】，墙和门一起回来', () => {
    const wallId = addWall()
    const doorId = addDoor(wallId)

    runAsSingleSceneHistoryStep(useScene, () => {
      useScene.getState().removeNode(wallId)
    })
    expect(nodeAt(wallId)).toBeUndefined()

    useScene.temporal.getState().undo()

    expect(nodeAt(wallId)).toBeDefined()
    expect(nodeAt(doorId)).toBeDefined()
    expect(nodeAt(wallId)!.children).toEqual([doorId])
  })
})

describe('updateNode', () => {
  beforeEach(reset)

  it('改门的位置 → 宿主墙也进脏集', () => {
    const wallId = addWall()
    const doorId = addDoor(wallId)
    useScene.getState().clearDirty(wallId)

    useScene.getState().updateNode(doorId, { position: [2.5, 1.05, 0] })

    expect(useScene.getState().dirtyNodes.has(wallId)).toBe(true)
  })

  it('patch 里带 parentId 或 children → 抛错', () => {
    const wallId = addWall()
    const doorId = addDoor(wallId)

    expect(() => useScene.getState().updateNode(doorId, { parentId: wallId })).toThrow()
    expect(() => useScene.getState().updateNode(wallId, { children: [] })).toThrow()
  })

  it('普通 patch 照常工作（没被守卫误伤）', () => {
    const wallId = addWall()
    useScene.getState().updateNode(wallId, { end: [6, 0] })

    const wall = nodeAt(wallId)!
    expect(wall.type === 'wall' && wall.end).toEqual([6, 0])
  })
})