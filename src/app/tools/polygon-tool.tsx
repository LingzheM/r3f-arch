import { useFrame, useThree } from "@react-three/fiber"
import type { PolygonToolKind } from "../lib/interaction/scope"
import { useEditor } from "../store/use-editor"
import { useEffect, useLayoutEffect, useRef, type ComponentRef, type RefObject } from "react"
import type { Point2D } from "../../core/lib/geometry-2d"
import { getScope, useInteractionScope } from "../store/use-interaction-scope"
import { isClosingClick, isCommittablePolygon, toPolygonTuples } from "../lib/interaction/polygon-draft"
import { useScene } from "../../core/store/use-scene"
import { isClickGesture } from "../../viewer/lib/pointer-gesture"
import { eventToGround } from "../../viewer/lib/pointer-plane"
import { snapToGrid } from "../../core/schema/snap-2d"
import { Line } from "@react-three/drei"

const PREVIEW_Y = 0.02

const MAX_PREVIEW_POINTS = 64
const PREVIEW_INIT: [number, number, number][] = Array.from(
  { length: MAX_PREVIEW_POINTS },
  () => [0, PREVIEW_Y, 0] as [number, number, number],
)

export function PolygonTool({ tool }: { tool: PolygonToolKind }) {
  const activeTool = useEditor((s) => s.activeTool)
  const { gl, camera } = useThree()

  const cursorRef = useRef<Point2D | null>(null)
  const active = activeTool === tool

  useEffect(() => {
    if (!active) return
    useInteractionScope.getState().begin({ kind: 'drafting', tool, points: [] })
    return () => {
      useInteractionScope.getState().endIf((s) => s.kind === 'drafting' && s.tool === tool)
      cursorRef.current = null
    }
  }, [active, tool])

  useEffect(() => {
    if (!active) return
    const el = gl.domElement

    const currentPoints = (): readonly Point2D[] => {
      const scope = getScope()
      return scope.kind === 'drafting' && scope.tool === tool ? scope.points : []
    }

    const reset = () => {
      useInteractionScope.getState().update('drafting', { points: [] })
      cursorRef.current = null
    }

    const commit = () => {
      const points = currentPoints()
      if (!isCommittablePolygon(points)) return

      useScene.getState().addNode({ type: tool, polygon: toPolygonTuples(points) })
      reset()
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return
      if (!isClickGesture(e)) return

      const raw = eventToGround(e, el, camera)
      if (!raw) return
      const point = snapToGrid(raw)

      const points = currentPoints()
      if (isClosingClick(points, point)) {
        commit()
        return
      }

      useInteractionScope.getState().update('drafting', { points: [...points, point] })
    }

    const onPointerMove = (e: PointerEvent) => {
      cursorRef.current = eventToGround(e, el, camera)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') reset()
      if (e.key === 'Enter') {
        e.preventDefault()
        commit()
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
  }, [active, tool, gl, camera])

  if (!active) return null
  return <PolygonDraftPreview tool={tool} cursorRef={cursorRef} />
}

function PolygonDraftPreview({
  tool,
  cursorRef,
}: {
  tool: PolygonToolKind,
  cursorRef: RefObject<Point2D | null>
}) {

  const lineRef = useRef<ComponentRef<typeof Line>>(null)
  const bufferRef = useRef<number[]>(new Array(MAX_PREVIEW_POINTS * 3).fill(0))

  useLayoutEffect(() => {
    if (lineRef.current) lineRef.current.visible = false
  }, [])

  useFrame(() => {
    const line = lineRef.current
    if (!line) return

    const scope = getScope()
    const points = scope.kind === 'drafting' && scope.tool === tool ? scope.points : []
    const cursor = cursorRef.current

    if (points.length === 0 || !cursor) {
      line.visible = false
      return
    }

    const path = [...points, cursor, points[0]!].slice(0, MAX_PREVIEW_POINTS)
    const buffer = bufferRef.current

    for (let i = 0; i < path.length; i += 1) {
      const q = path[i]!
      buffer[i * 3] = q.x
      buffer[i * 3 + 1] = PREVIEW_Y
      buffer[i * 3 + 2] = q.y
    }

    const last = path[path.length - 1]!
    for (let i = path.length; i < MAX_PREVIEW_POINTS; i += 1) {
      buffer[i * 3] = last.x
      buffer[i * 3 + 1] = PREVIEW_Y
      buffer[i * 3 + 2] = last.y
    }

    line.visible = true
    line.geometry.setPositions(buffer)
    line.computeLineDistances()
  })

  return (
    <Line
      ref={lineRef}
      points={PREVIEW_INIT}
      color="#0b6e5f"
      lineWidth={2}
      dashed
      dashScale={20}
    />
  )
}