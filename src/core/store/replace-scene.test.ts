import { M1_FLAT_SCENE } from "../persistence/__fixtures__/legacy-scenes"
import { loadSceneDocument } from "../persistence/load-scene-document"
import { resetSceneHistoryPause } from "./history-control"
import { useScene } from "./use-scene"

const reset = () => {
  resetSceneHistoryPause(useScene)
  useScene.setState({ nodes: {}, rootNodeIds: [], dirtyNodes: new Set() })
  useScene.temporal.getState().clear()
}

const snapshot = () => {
  const r = loadSceneDocument(structuredClone(M1_FLAT_SCENE))
  if (!r.ok) throw new Error('fixture')
  return r.snapshot
}

describe('replaceScene', () => {
  beforeEach(reset)

  it('不进历史：替换完撤销栈为空，Ctrl+Z 撤不回替换之前的场景', () => {
    const stale = useScene.getState().addNode({ type: 'wall', start: [0, 0], end: [1, 0] })
    const next = snapshot()

    replaceScene(next)
    expect(useScene.temporal.getState().pastStates).toHaveLength(0)

    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes).toBe(next.nodes)
    expect(useScene.getState().nodes[stale]).toBeUndefined()
  })

  it('脏集恰好是新场景的全部节点——旧 id 不留在脏集里', () => {
    const stale = useScene.getState().addNode({ type: 'wall', start: [0, 0], end: [1, 0] })
    const next = snapshot()

    replaceScene(next)
    const dirty = useScene.getState().dirtyNodes
    expect([...dirty].sort()).toEqual(Object.keys(next.nodes).sort())
    expect(dirty.has(stale)).toBe(false)
  })

  it('替换之后的下一次编辑照常进历史、能撤', () => {
    replaceScene(snapshot())
    const wallId = 'wall_0a1b2c3d4e5a6b7c' as AnyNodeId

    useScene.getState().updateNode(wallId, { end: [9, 0] })
    expect(useScene.temporal.getState().pastStates).toHaveLength(1)

    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes[wallId]).toMatchObject({ end: [4, 0] })
  })
})