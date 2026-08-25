import { useThree } from "@react-three/fiber"
import { midpoint, type Point2D } from "../../core/lib/geometry-2d"
import { wallEnd, wallStart, type WallNode } from "../../core/schema/wall"
import { useEditor } from "../store/use-editor"
import { useEffect, useRef } from "react"
import * as THREE from 'three'
import { startDragSession, type DragSession } from "../lib/interaction/drag-session"
import { documentWalls, linkedWallOverrides, type OverrideEntry } from "../lib/interaction/wall-linking"
import { runAsSingleSceneHistoryStep } from "../../core/store/history-control"
import { useScene } from "../../core/store/use-scene"
import { useLiveOverrides } from "../../core/store/use-live-overrides"
import { getScope, useInteractionScope } from "../store/use-interaction-scope"
import { eventToGround } from "../../viewer/lib/pointer-plane"
import { snapToGrid } from "../../core/schema/snap-2d"
import { isClickGesture } from "../../viewer/lib/pointer-gesture"
import { useViewer } from "../../viewer/store/use-viewer"
import type { NodeEvent } from "../../core/events/types"
import { emitter } from "../../core/events/bus"


type Candidate = {
    wall: WallNode
    anchor: Point2D
    center: Point2D
    walls: WallNode[]
}

export function MoveTool(): null {
    const activeTool = useEditor((s) => s.activeTool)
    const { gl, camera } = useThree()

    const candidateRef = useRef<Candidate | null>(null)
    const sessionRef = useRef<DragSession | null>(null)
    const entriesRef = useRef<OverrideEntry[]>([])

    useEffect(() => {
        if (activeTool !== 'select') return
        const el = gl.domElement

        const commit = () => {
            const entries = entriesRef.current
            runAsSingleSceneHistoryStep(useScene, () => {
                const { updateNode }  = useScene.getState()
                for (const [id, patch] of entries) updateNode(id, patch)
            })
        teardown()
        }

        const cancel = () => {
            teardown()
        }

        const teardown = () => {
            entriesRef.current = []
            candidateRef.current = null
            sessionRef.current = null
            useLiveOverrides.getState().clearAll()
            useInteractionScope.getState().end()
        }

        const onDragMove = (event: PointerEvent) => {
            const candidate = candidateRef.current
            if (!candidate) return

            const cursor = eventToGround(event, el, camera)
            if (!cursor) return

            const rawDelta = {
                x: cursor.x - candidate.anchor.x,
                y: cursor.y - candidate.anchor.y,
            }

            const target = snapToGrid({
                x: candidate.center.x + rawDelta.x,
                y: candidate.center.y + rawDelta.y,
            })
            const delta = { x: target.x - candidate.center.x, y: target.y - candidate.center.y }

            const originalStart = wallStart(candidate.wall)
            const originalEnd = wallEnd(candidate.wall)
            const nextStart = { x: originalStart.x + delta.x, y: originalStart.y + delta.y }
            const nextEnd = { x: originalEnd.x + delta.x, y: originalEnd.y + delta.y }

            const self: OverrideEntry = [
                candidate.wall.id,
                { start: [nextStart.x, nextStart.y], end: [nextEnd.x, nextEnd.y] }
                
            ]

            const linked = linkedWallOverrides(
                candidate.walls,
                [
                    { from: originalStart, to: nextStart },
                    { from: originalEnd, to: nextEnd },
                ],
                new Set([candidate.wall.id]),
            )

            entriesRef.current = [self, ...linked]
            useLiveOverrides.getState().setMany(entriesRef.current)
        }

        const promote = (event: PointerEvent) => {
            const candidate = candidateRef.current
            if (!candidate) return

            window.removeEventListener('pointermove', onCandidateMove)
            window.removeEventListener('pointerup', onCandidateUp)

            useInteractionScope.getState().begin({
                kind: 'moving',
                nodeId: candidate.wall.id,
                origin: candidate.anchor,
            })
            sessionRef.current = startDragSession({ onMove: onDragMove, onCommit: commit, onCancel: cancel })
            onDragMove(event)
        }

        const onCandidateMove = (event: PointerEvent) => {
            if (isClickGesture(event)) return
            promote(event)
        }

        const onCandidateUp = () => {
            window.removeEventListener('pointermove', onCandidateMove)
            window.removeEventListener('pointerup', onCandidateUp)
            candidateRef.current = null
            useViewer.getState().setInputDragging(false)
        }

        const onWallPointerDown = (e: NodeEvent) => {
            if (getScope().kind !== 'idle') return
            const wall = e.node
            if (wall.type !== 'wall') return

            const anchor = eventToGround(e.nativeEvent, el, camera)
            if (!anchor) return

            candidateRef.current = {
                wall,
                anchor,
                center: midpoint(wallStart(wall), wallEnd(wall)),
                walls: documentWalls(),
            }

            useViewer.getState().setInputDragging(true)

            window.addEventListener('pointermove', onCandidateMove)
            window.addEventListener('pointerup', onCandidateUp)
        }

        emitter.on('wall:pointerdown', onWallPointerDown)

        return () => {
            emitter.off('wall:pointerdown', onWallPointerDown)
            window.removeEventListener('pointermove', onCandidateMove)
            window.removeEventListener('pointerup', onCandidateUp)

            sessionRef.current?.end('cancel')
            useViewer.getState().setInputDragging(false)
        }
    }, [activeTool, gl, camera])

    return null
}