import { beforeEach, describe, expect, it } from 'vitest'
import type { AnyNode, AnyNodeId } from '../../../core/schema/types'
import { resetSceneHistoryPause } from '../../../core/store/history-control'
import { useScene } from '../../../core/store/use-scene'
import { useEditor } from '../../store/use-editor'
import { levelWalls } from '../interaction/wall-linking'
import { addLevelOnTop, ensureScaffold, readCurrentLevel, switchLevel } from './level-actions'
import { WallNode } from '../../../core/schema/wall'

// 这些是碰 store 的测试，但 zustand 在 Node 里跑得动 —— 仍然在 D11 说「能测」的那一半。

const reset = () => {
  resetSceneHistoryPause(useScene)
  useScene.setState({ nodes: {}, rootNodeIds: [], dirtyNodes: new Set() })
  useScene.temporal.getState().clear()
  useEditor.setState({ currentLevelId: null })
}

const nodes = () => useScene.getState().nodes
const countOf = (type: string) => Object.values(nodes()).filter((n) => n.type === type).length
const past = () => useScene.temporal.getState().pastStates.length

describe('ensureScaffold', () => {
  beforeEach(reset)

  it('空场景 → Site → Building → Level 0，并设为当前层', () => {
    const levelId = ensureScaffold()

    const level = nodes()[levelId]!
    expect(level.type).toBe('level')
    expect(level.type === 'level' && level.level).toBe(0)
    // 创建处显式写了 height：缺席应该只表示「用户没设过」
    expect('height' in level).toBe(true)

    const building = nodes()[level.parentId as AnyNodeId]!
    expect(building.type).toBe('building')
    const site = nodes()[building.parentId as AnyNodeId]!
    expect(site.type).toBe('site')

    expect(useScene.getState().rootNodeIds).toEqual([site.id])
    expect(useEditor.getState().currentLevelId).toBe(levelId)
  })

  it('幂等：再调一次什么都不建，返回同一个层', () => {
    const first = ensureScaffold()
    const second = ensureScaffold()

    expect(second).toBe(first)
    expect(countOf('site')).toBe(1)
    expect(countOf('building')).toBe(1)
    expect(countOf('level')).toBe(1)
  })

  it('【不进历史】：建完之后撤销栈是空的', () => {
    ensureScaffold()
    expect(past()).toBe(0)
  })

  it('Ctrl+Z 按到底，脚手架还在（原来会被撤没，之后所有 addNode 抛错）', () => {
    const levelId = ensureScaffold()
    useScene.getState().addNode({ type: 'wall', parentId: levelId, start: [0, 0], end: [4, 0] })
    expect(countOf('wall')).toBe(1)

    for (let i = 0; i < 10; i += 1) useScene.temporal.getState().undo()

    expect(countOf('wall')).toBe(0)
    expect(nodes()[levelId]?.type).toBe('level')
    // 撤到底之后还能继续画
    expect(() =>
      useScene.getState().addNode({ type: 'wall', parentId: levelId, start: [0, 0], end: [4, 0] }),
    ).not.toThrow()
  })

  it('暂停租约在建完之后被释放：下一次用户操作照常进历史', () => {
    const levelId = ensureScaffold()
    useScene.getState().addNode({ type: 'wall', parentId: levelId, start: [0, 0], end: [4, 0] })
    expect(past()).toBe(1)
  })

  it('已经有层、只是 currentLevelId 为空 → 不新建，把当前层对齐过去', () => {
    const levelId = ensureScaffold()
    useEditor.setState({ currentLevelId: null })

    expect(ensureScaffold()).toBe(levelId)
    expect(useEditor.getState().currentLevelId).toBe(levelId)
    expect(countOf('level')).toBe(1)
  })
})

describe('addLevelOnTop / switchLevel / readCurrentLevel', () => {
  beforeEach(reset)

  it('在同一栋楼顶上加一层：序数 +1，显式 height，切过去', () => {
    const ground = ensureScaffold()
    const top = addLevelOnTop()!

    const g = nodes()[ground]!
    const t = nodes()[top]!
    expect(t.type === 'level' && t.level).toBe(1)
    expect(t.parentId).toBe(g.parentId)
    expect('height' in t).toBe(true)
    expect(useEditor.getState().currentLevelId).toBe(top)
  })

  it('加层【要】进历史；撤销之后当前层自愈回首层', () => {
    const ground = ensureScaffold()
    const top = addLevelOnTop()!
    expect(past()).toBe(1)

    useScene.temporal.getState().undo()

    expect(nodes()[top]).toBeUndefined()
    // useEditor 里存的还是那个已经没了的 id —— readCurrentLevel 兜住它
    expect(useEditor.getState().currentLevelId).toBe(top)
    expect(readCurrentLevel().id).toBe(ground)
  })

  it('switchLevel 上下切，到头返回 false 且不动', () => {
    const ground = ensureScaffold()
    const top = addLevelOnTop()!

    expect(switchLevel(-1)).toBe(true)
    expect(useEditor.getState().currentLevelId).toBe(ground)
    expect(switchLevel(-1)).toBe(false)
    expect(useEditor.getState().currentLevelId).toBe(ground)

    expect(switchLevel(1)).toBe(true)
    expect(useEditor.getState().currentLevelId).toBe(top)
    expect(switchLevel(1)).toBe(false)
  })

  it('readCurrentLevel 给出工具要的两样：挂到谁下面、在哪个高度求交', () => {
    const ground = ensureScaffold()
    expect(readCurrentLevel()).toEqual({ id: ground, baseY: 0 })

    const top = addLevelOnTop()!
    expect(readCurrentLevel()).toEqual({ id: top, baseY: 2.5 })
  })

  it('一个层都没有 → { id: null, baseY: 0 }，退化成 M8 之前的行为而不是抛错', () => {
    expect(readCurrentLevel()).toEqual({ id: null, baseY: 0 })
  })
})

describe('levelWalls', () => {
  beforeEach(reset)

  it('只返回这一层的墙 —— 吸附和联动拖拽不会跨层', () => {
    const ground = ensureScaffold()
    const top = addLevelOnTop()!
    const { addNode } = useScene.getState()
    const w0 = addNode({ type: 'wall', parentId: ground, start: [0, 0], end: [4, 0] })
    const w1 = addNode({ type: 'wall', parentId: top, start: [0, 0], end: [4, 0] })

    expect(levelWalls(ground).map((w) => w.id)).toEqual([w0])
    expect(levelWalls(top).map((w) => w.id)).toEqual([w1])
  })

  it('传 null 拿到的是挂在根下的墙，不是「所有墙」', () => {
    const ground = ensureScaffold()
    const { addNode } = useScene.getState()
    addNode({ type: 'wall', parentId: ground, start: [0, 0], end: [4, 0] })
    const root = addNode({ type: 'wall', start: [0, 5], end: [4, 5] })

    expect(levelWalls(null).map((w) => w.id)).toEqual([root])
  })
})

describe('ensureScaffold 收养散在根下的节点（M8 批 J）', () => {
  beforeEach(reset)

  /** 直接写 store，装出一个「M8 之前」的平场景：墙就躺在 rootNodeIds 里。 */
  const legacyScene = () => {
    const wall = WallNode.parse({ id: 'wall_old', type: 'wall', start: [0, 0], end: [4, 0] })
    useScene.setState({
      nodes: { [wall.id]: wall } as Record<AnyNodeId, AnyNode>,
      rootNodeIds: [wall.id],
      dirtyNodes: new Set(),
    })
    useScene.temporal.getState().clear()
  }

  it('开机时把老场景里的墙收进新建的那一层', () => {
    legacyScene()

    const levelId = ensureScaffold()

    expect(nodes()['wall_old' as AnyNodeId]!.parentId).toBe(levelId)
    expect(nodes()[levelId]!.children).toEqual(['wall_old'])
  })

  it('收养之后 root 只剩 site', () => {
    legacyScene()
    ensureScaffold()

    const roots = useScene.getState().rootNodeIds
    expect(roots).toHaveLength(1)
    expect(nodes()[roots[0]!]!.type).toBe('site')
  })

  it('收养也【不进历史】', () => {
    legacyScene()
    ensureScaffold()

    expect(past()).toBe(0)
  })

  it('收养的节点进脏集 —— 换了宿主，几何要重建', () => {
    legacyScene()
    ensureScaffold()

    expect(useScene.getState().dirtyNodes.has('wall_old' as AnyNodeId)).toBe(true)
  })

  it('墙原来的 height 缺席性没被收养弄丢', () => {
    legacyScene()
    ensureScaffold()

    expect('height' in nodes()['wall_old' as AnyNodeId]!).toBe(false)
  })
})