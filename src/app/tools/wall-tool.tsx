import { useThree } from "@react-three/fiber";
import { useEditor } from "../store/use-editor";
import { useEffect, useState } from "react";
import type { Point2D } from "../../core/lib/geometry-2d";
import { getScope, useInteractionScope } from "../store/use-interaction-scope";
import { screenToGround } from "../../viewer/lib/pointer-plane";
import * as THREE from 'three'
import { isClickGesture } from "../../viewer/lib/pointer-gesture";
import { draftPoints, lastDraftPoint } from "../lib/interaction/scope";
import { useScene } from "../../core/store/use-scene";
import { Line } from "@react-three/drei";

const ndc = new THREE.Vector2()

export function WallTool() {
  const activeTool = useEditor((s) => s.activeTool)
  const { gl, camera } = useThree()

  // 跟随光标的橡皮筋端点。
  const [cursor, setCursor] = useState<Point2D | null>(null)

  useEffect(() => {
    if (activeTool !== 'wall') return
    useInteractionScope.getState().begin({ kind: 'drafting', tool: 'wall', points: [] })
    return () => {
      useInteractionScope.getState().endIf((s) => s.kind === 'drafting')
      setCursor(null)
    }
  }, [activeTool])

  useEffect(() => {
    if (activeTool !== 'wall') return
    const el = gl.domElement

    const toGround = (e: PointerEvent): Point2D | null => {
      const r = el.getBoundingClientRect()
      ndc.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      )
      return screenToGround(ndc, camera)
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return
      if (!isClickGesture(e)) return

      const p = toGround(e)
      if (!p) return

      const scope = getScope()
      if (scope.kind !== 'drafting') return

      const last = lastDraftPoint(scope)
      if (last) {
        useScene.getState().addNode({
          type: 'wall',
          start: [last.x, last.y],
          end: [p.x, p.y],
        })
      }
      useInteractionScope.getState().update({ points: [p] })
    }

    const onPointerMove = (e: PointerEvent) => setCursor(toGround(e))

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        useInteractionScope.getState().update({ points: [] })
        setCursor(null)
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

  return <WallDraftPreview cursor={cursor} />
}

function WallDraftPreview({ cursor }: { cursor: Point2D | null }) {
  const scope = useInteractionScope((s) => s.scope)
  const pts = draftPoints(scope)
  const last = pts.length > 0 ? pts[pts.length - 1]! : null

  if (!last || !cursor) return null

  return (
    <Line
      points={[
        [last.x, 0.01, last.y],
        [cursor.x, 0.01, cursor.y],
      ]}
      color="#0b6e5f"
      lineWidth={2}
      dashed
      dashScale={20}
    />
  )
}