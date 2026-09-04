import type * as THREE from 'three'
import { useFrame, useThree } from "@react-three/fiber"
import { useEditor } from "../store/use-editor"
import { useEffect, useRef, type RefObject } from "react"
import type { Point2D } from "../../core/lib/geometry-2d"
import { useInteractionScope } from "../store/use-interaction-scope"
import { isClickGesture } from "../../viewer/lib/pointer-gesture"
import { eventToGround } from "../../viewer/lib/pointer-plane"
import { snapToGrid } from "../../core/schema/snap-2d"
import { useScene } from "../../core/store/use-scene"
import { DEFAULT_COLUMN_HEIGHT, DEFAULT_COLUMN_RADIUS } from '../../core/schema/column'

const NEVER_RAYCAST = () => null

export function ColumnTool() {
  const activeTool = useEditor((s) => s.activeTool)
  const { gl, camera } = useThree()

  const cursorRef = useRef<Point2D | null>(null)
  const active = activeTool === 'column'

  useEffect(() => {
    if (!active) return
    useInteractionScope.getState().begin({ kind: 'placing', tool: 'column' })
    return () => {
      useInteractionScope.getState().endIf((s) => s.kind === 'placing')
      cursorRef.current = null
    }
  }, [active])

  useEffect(() => {
    if (!active) return
    const el = gl.domElement

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return
      if (!isClickGesture(e)) return

      const raw = eventToGround(e, el, camera)
      if (!raw) return
      const p = snapToGrid(raw)

      useScene.getState().addNode({
        type: 'column',
        position: [p.x, 0, p.y],
        crossSection: e.shiftKey ? 'square' : 'round',
      })
    }

    const onPointerMove = (e: PointerEvent) => {
      cursorRef.current = eventToGround(e, el, camera)
    }

    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointermove', onPointerMove)

    return () => {
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointermove', onPointerMove)
    }
  }, [active, gl, camera])

  if (!active) return null

  return <ColumnGhost cursorRef={cursorRef} />
}

function ColumnGhost({ cursorRef }: { cursorRef: RefObject<Point2D | null> }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    const group = groupRef.current
    if (!group) return

    const cursor = cursorRef.current
    if (!cursor) {
      group.visible = false
      return
    }

    group.visible = true
    group.position.set(cursor.x, 0, cursor.y)
  })

  return (
    <group ref={groupRef} visible={false}>
      <mesh position={[0, DEFAULT_COLUMN_HEIGHT / 2, 0]} raycast={NEVER_RAYCAST}>
        <cylinderGeometry
          args={[DEFAULT_COLUMN_RADIUS, DEFAULT_COLUMN_RADIUS, DEFAULT_COLUMN_RADIUS, 24]}
        />
        <meshStandardMaterial
          color="#0b6e5f"
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}