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

describe('字段的缺席（M8 批 C）', () => {
  beforeEach(reset)

  const addWallWithHeight = (height: number, parentId?: AnyNodeId) =>
    useScene.getState().addNode(
      parentId === undefined
        ? { type: 'wall', start: [0, 0], end: [4, 0], height }
        : { type: 'wall', parentId, start: [0, 0], end: [4, 0], height },
    )

  it('patch 里显式 undefined → key 被【删掉】，不是存一个 undefined', () => {
    const wallId = addWallWithHeight(1.0)
    expect('height' in nodeAt(wallId)!).toBe(true)

    useScene.getState().updateNode(wallId, { height: undefined })

    // 判据是 key 在不在。写成 toBeUndefined() 的话，
    // 「留下一个值为 undefined 的 key」这个 bug 会照样绿。
    expect('height' in nodeAt(wallId)!).toBe(false)
  })

  it('patch 里给了值 → key 在，值对', () => {
    const wallId = addWall()
    expect('height' in nodeAt(wallId)!).toBe(false)

    useScene.getState().updateNode(wallId, { height: 1.0 })

    const wall = nodeAt(wallId)!
    expect('height' in wall).toBe(true)
    expect(wall.type === 'wall' && wall.height).toBe(1.0)
  })

  it('删 key 不误伤同一个 patch 里的其它字段', () => {
    const wallId = addWallWithHeight(1.0)

    useScene.getState().updateNode(wallId, { height: undefined, thickness: 0.2 })

    const wall = nodeAt(wallId)!
    expect('height' in wall).toBe(false)
    expect(wall.type === 'wall' && wall.thickness).toBe(0.2)
    expect(wall.type === 'wall' && wall.start).toEqual([0, 0])
  })

  it('撤销一次，被删掉的 key 回来', () => {
    const wallId = addWallWithHeight(1.0)
    useScene.temporal.getState().clear()

    useScene.getState().updateNode(wallId, { height: undefined })
    expect('height' in nodeAt(wallId)!).toBe(false)

    useScene.temporal.getState().undo()

    const wall = nodeAt(wallId)!
    expect('height' in wall).toBe(true)
    expect(wall.type === 'wall' && wall.height).toBe(1.0)
  })
})

describe('脏传播到孩子（M8 批 C）', () => {
  beforeEach(reset)

  const addLevel = (height = 2.5) =>
    useScene.getState().addNode({ type: 'level', level: 0, height })

  const addWallOn = (parentId: AnyNodeId) =>
    useScene.getState().addNode({ type: 'wall', parentId, start: [0, 0], end: [4, 0] })

  it('改层高 → 该层每一个孩子都进脏集', () => {
    const levelId = addLevel()
    const wallA = addWallOn(levelId)
    const wallB = addWallOn(levelId)
    useScene.getState().clearDirty(wallA)
    useScene.getState().clearDirty(wallB)

    useScene.getState().updateNode(levelId, { height: 3.0 })

    expect(useScene.getState().dirtyNodes.has(wallA)).toBe(true)
    expect(useScene.getState().dirtyNodes.has(wallB)).toBe(true)
  })

  it('只脏一层：改层高不会脏化墙的孩子（门）', () => {
    const levelId = addLevel()
    const wallId = addWallOn(levelId)
    const doorId = addDoor(wallId)
    useScene.getState().clearDirty(wallId)
    useScene.getState().clearDirty(doorId)

    useScene.getState().updateNode(levelId, { height: 3.0 })

    expect(useScene.getState().dirtyNodes.has(wallId)).toBe(true)
    // 门不读层高，读的是墙 —— 墙重建时它自己会被带上，不该在这里连坐。
    expect(useScene.getState().dirtyNodes.has(doorId)).toBe(false)
  })
})