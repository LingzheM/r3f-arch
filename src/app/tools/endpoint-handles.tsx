import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber"
import { wallEnd, wallStart, type WallNode } from "../../core/schema/wall"
import { useScene } from "../../core/store/use-scene"
import { useEffectiveNode } from "../../viewer/hooks/use-effective-node"
import type { WallHandle } from "../lib/interaction/scope"
import { useEditor } from "../store/use-editor"
import { useEffect, useRef } from "react"
import * as THREE from 'three'
import { startDragSession, type DragSession } from "../lib/interaction/drag-session"
import { documentWalls, linkedWallOverrides, type OverrideEntry } from "../lib/interaction/wall-linking"
import { getScope, useInteractionScope } from "../store/use-interaction-scope"
import { runAsSingleSceneHistoryStep } from "../../core/store/history-control"
import { snapPoint } from "../../core/schema/snap-2d"
import { eventToGround } from "../../viewer/lib/pointer-plane"
import { useLiveOverrides } from "../../core/store/use-live-overrides"

const HANDLE_RADIUS = 0.06
const HANDLE_Y = 0.02
const HANDLE_COLOR = '#0b6e5f'
const HANDLE_ACTIVE_COLOR = '#f0b429'

export function EndpointHandles() {
    const activeTool = useEditor((s) => s.activeTool)
    const selectId = useEditor((s) => s.selectId)
    const node = useScene((s) => (selectId ? s.nodes[selectId] : undefined))

    if (activeTool !== 'select') return null
    if (!node || node.type !== 'wall') return null

    return (
        <>
            <EndpointHandle wall={node} handle="start" />
            <EndpointHandle wall={node} handle="end" />
        </>
    )
}


function EndpointHandle({ wall: documentWall, handle }: { wall: WallNode; handle: WallHandle }) {
    const wall = useEffectiveNode(documentWall)
    const { gl, camera } = useThree()

    const meshRef = useRef<THREE.Mesh>(null)
    const sessionRef = useRef<DragSession | null>(null)
    const entriesRef = useRef<OverrideEntry[]>([])

    const scope = useInteractionScope((s) => s.scope)
    const isDragging =
        scope.kind === 'handle-drag' && scope.nodeId === wall.id && scope.handle === handle

    const point = handle === 'start' ? wallStart(wall) : wallEnd(wall)

    useEffect(() => () => sessionRef.current?.end('cancel'), [])

    useFrame(({ camera: activeCamera }) => {
        const mesh = meshRef.current
        if (!mesh) return
        mesh.scale.setScalar(handleScale(activeCamera, mesh.position))
    })

    const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (event.button !== 0) return
    // 手柄不在 sceneRegistry 里，use-grid-events 的射线看不见它 ——
    // 点手柄会被判成「点空地」并取消选中。但下面 begin() 一执行，
    // selectionEnabled 就假了，SelectionManager 会忽略那次 grid:click。
    event.stopPropagation()
    if (getScope().kind !== 'idle') return

    const el = gl.domElement
    const walls = documentWalls()
    const origin = handle === 'start' ? wallStart(documentWall) : wallEnd(documentWall)
    const ignoreIds = new Set([documentWall.id])

    const teardown = () => {
      entriesRef.current = []
      sessionRef.current = null
      useLiveOverrides.getState().clearAll()
      useInteractionScope.getState().end()
    }

    const onMove = (moveEvent: PointerEvent) => {
      const cursor = eventToGround(moveEvent, el, camera)
      if (!cursor) return

      // 端点拖走完整的 snapPoint：先试已有端点，没有才落网格。
      const snapped = snapPoint(cursor, walls, { ignoreIds })

      const self: OverrideEntry = [
        documentWall.id,
        handle === 'start'
          ? { start: [snapped.x, snapped.y] }
          : { end: [snapped.x, snapped.y] },
      ]
      const linked = linkedWallOverrides(walls, [{ from: origin, to: snapped }], ignoreIds)

      entriesRef.current = [self, ...linked]
      useLiveOverrides.getState().setMany(entriesRef.current)
    }

    // 手柄没有「点击」语义，所以不需要 move-tool 那套候选阶段：
    // 按下即占 scope 是正确的。
    useInteractionScope.getState().begin({
      kind: 'handle-drag',
      nodeId: documentWall.id,
      handle,
    })

    sessionRef.current = startDragSession({
      onMove,
      onCommit: () => {
        const entries = entriesRef.current
        runAsSingleSceneHistoryStep(useScene, () => {
          const { updateNode } = useScene.getState()
          for (const [id, patch] of entries) updateNode(id, patch)
        })
        teardown()
      },
      onCancel: teardown,
    })
  }

  return (
    <mesh
      ref={meshRef}
      position={[point.x, HANDLE_Y, point.y]}
      renderOrder={999}
      onPointerDown={onPointerDown}
    >
      <sphereGeometry args={[HANDLE_RADIUS, 16, 12]} />
      <meshBasicMaterial
        color={isDragging ? HANDLE_ACTIVE_COLOR : HANDLE_COLOR}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  )
}

function handleScale(camera: THREE.Camera, at: THREE.Vector3): number {
    const ortho = camera as THREE.OrthographicCamera
    if (ortho.isOrthographicCamera) return 40 / ortho.zoom
    return camera.position.distanceTo(at) / 10
}