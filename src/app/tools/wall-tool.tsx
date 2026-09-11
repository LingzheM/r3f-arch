import { useFrame, useThree } from "@react-three/fiber";
import { useEditor } from "../store/use-editor";
import { useEffect, useRef, type ComponentRef } from "react";
import type { Point2D } from "../../core/lib/geometry-2d";
import { getScope, useInteractionScope } from "../store/use-interaction-scope";
import { isClickGesture } from "../../viewer/lib/pointer-gesture";
import { lastDraftPoint } from "../lib/interaction/scope";
import { useScene } from "../../core/store/use-scene";
import { Line } from "@react-three/drei";
import { eventToGround } from "../../viewer/lib/pointer-plane";
import { snapPoint } from "../../core/schema/snap-2d";
import { levelWalls } from "../lib/interaction/wall-linking";
import { readCurrentLevel } from "../lib/level/level-actions";

const PREVIEW_Y = 0.01

export function WallTool() {
  const activeTool = useEditor((s) => s.activeTool)
  const { gl, camera } = useThree()

  // 跟随光标的橡皮筋端点。
  const cursorRef = useRef<Point2D | null>(null)

  useEffect(() => {
    if (activeTool !== 'wall') return
    useInteractionScope.getState().begin({ kind: 'drafting', tool: 'wall', points: [] })
    return () => {
      useInteractionScope.getState().endIf((s) => s.kind === 'drafting')
      cursorRef.current = null
    }
  }, [activeTool])

  useEffect(() => {
    if (activeTool !== 'wall') return
    const el = gl.domElement

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return
      if (!isClickGesture(e)) return

      const level = readCurrentLevel()

      const raw = eventToGround(e, el, camera, level.baseY)
      if (!raw) return

      const scope = getScope()
      if (scope.kind !== 'drafting') return

      const point = snapPoint(raw, levelWalls(level.id))

      const last = lastDraftPoint(scope)
      if (last) {
        useScene.getState().addNode({
          type: 'wall',
          parentId: level.id,
          start: [last.x, last.y],
          end: [point.x, point.y],
        })
      }
      useInteractionScope.getState().update('drafting', { points: [point] })
    }

    const onPointerMove = (e: PointerEvent) => {
      cursorRef.current = eventToGround(e, el, camera)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        useInteractionScope.getState().update('drafting', { points: [] })
        cursorRef.current = null
      }
    }

    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointermove', onPointerMove)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [activeTool, gl, camera])

  if (activeTool !== 'wall') return null
  return <WallDraftPreview cursorRef={cursorRef} />
}

function WallDraftPreview({ cursorRef }: { cursorRef: React.RefObject<Point2D | null> }) {
  const lineRef = useRef<ComponentRef<typeof Line>>(null)

  useFrame(() => {
    const line = lineRef.current
    if (!line) return

    const last = lastDraftPoint(getScope())
    const cursor = cursorRef.current

    if (!last || !cursor) {
      line.visible = false
      return
    }

    line.visible = true
    line.geometry.setPositions([last.x, PREVIEW_Y, last.y, cursor.x, PREVIEW_Y, cursor.y])
    line.computeLineDistances()
  })

  return (
    <Line
      ref={lineRef}
      points={[
        [0, PREVIEW_Y, 0],
        [0, PREVIEW_Y, 0],
      ]}
      color="#0b6e5f"
      lineWidth={2}
      dashed
      dashScale={20}
    />
  )
}