import { useEffect, useRef, type RefObject } from "react";
import { DEFAULT_DOOR_HEIGHT, DEFAULT_DOOR_WIDTH, DEFAULT_WINDOW_HEIGHT, DEFAULT_WINDOW_SILL, DEFAULT_WINDOW_WIDTH, OpeningSide } from "../../core/schema/opening";
import { asNodeId, type AnyNode, type AnyNodeId } from "../../core/schema/types";
import type { WallNode } from "../../core/schema/wall";
import { useScene } from "../../core/store/use-scene";
import { useEditor } from "../store/use-editor";
import { useInteractionScope } from "../store/use-interaction-scope";
import type { NodeEvent } from "../../core/events/types";
import { resolveOpeningPlacement, sideFromHit, type WallHit } from "../lib/interaction/opening-placement";
import { emitter } from "../../core/events/bus";
import * as THREE from 'three'
import { useFrame } from "@react-three/fiber";
import { sceneRegistry } from "../../core/registry/scene-registry";
import { hostStoreyHeight, resolveWallTop } from "../../core/services/storey";

const NEVER_RAYCAST = () => null

export type OpeningKind = 'door' | 'window'

const SIZES: Record<OpeningKind, { width: number; height: number; sill: number }> = {
  door: { width: DEFAULT_DOOR_WIDTH, height: DEFAULT_DOOR_HEIGHT, sill: 0 },
  window: { width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT, sill: DEFAULT_WINDOW_SILL }
}

type Preview = {
  wallId: AnyNodeId,
  position: [number, number, number]
  side: OpeningSide
  valid: boolean
}

function openingsOn(wall: WallNode): AnyNode[] {
  const { nodes } = useScene.getState()
  const out: AnyNode[] = []
  for (const childId of wall.children) {
    const child = nodes[asNodeId(childId)]
    if (child && (child.type === 'door' || child.type === 'window')) out.push(child)
  }
  return out
}

function wallTopOf(wall: WallNode): number {
  const { nodes } = useScene.getState()
  return resolveWallTop(wall, hostStoreyHeight(wall.parentId, (id) => nodes[id]))
}

export function OpeningTool({ kind }: { kind: OpeningKind }) {
  const activeTool = useEditor((s) => s.activeTool)
  const active = activeTool === kind

  const previewRef = useRef<Preview | null>(null)

  useEffect(() => {
    if (!active) return
    useInteractionScope.getState().begin({ kind: 'placing', tool: kind })
    return () => {
      useInteractionScope.getState().endIf((s) => s.kind === 'placing')
      previewRef.current = null
    }
  }, [active, kind])

  useEffect(() => {
    if (!active) return
    const size = SIZES[kind]

    const hitFrom = (e: NodeEvent): WallHit | null => {
      if (e.node.type !== 'wall') return null
      return {
        wallId: e.node.id,
        u: e.localPoint[0],
        side: sideFromHit(e.normal, e.localPoint),
      }
    }

    const onWallMove = (e: NodeEvent) => {
      const hit = hitFrom(e)
      if (!hit) return
      // p1: 只认离鼠标最近的那面墙
      e.stopPropagation()
      const wall = e.node as WallNode

      const { position, valid } = resolveOpeningPlacement({
        hit,
        wall,
        wallHeight: wallTopOf(wall),
        size,
        sill: size.sill,
        siblings: openingsOn(wall),
      })

      previewRef.current = { wallId: hit.wallId, position, side: hit.side, valid }
    }

    const onWallLeave = (e: NodeEvent) => {
      if (previewRef.current?.wallId === e.node.id) previewRef.current = null
    }


    const onWallClick = (e: NodeEvent) => {
      const preview = previewRef.current
      if (!preview || !preview.valid) return
      if (e.node.type !== 'wall' || e.node.id !== preview.wallId) return

      e.stopPropagation()
      useScene.getState().addNode({
        type: kind,
        parentId: preview.wallId,
        position: preview.position,
        side: preview.side,
      })
    }

    emitter.on('wall:move', onWallMove)
    emitter.on('wall:leave', onWallLeave)
    emitter.on('wall:click', onWallClick)

    return () => {
      emitter.off('wall:move', onWallMove)
      emitter.off('wall:leave', onWallLeave)
      emitter.off('wall:click', onWallClick)
    }
  }, [active, kind])

  if (!active) return null
  return <OpeingGhost kind={kind} previewRef={previewRef} />
}

const scratch = new THREE.Vector3()

function OpeingGhost({
  kind,
  previewRef,
}: {
  kind: OpeningKind
  previewRef: RefObject<Preview | null>
}) {
  const groupRef = useRef<THREE.Group>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const size = SIZES[kind]

  useFrame(() => {
    const group = groupRef.current
    if (!group) return

    const preview = previewRef.current
    if (!preview) {
      group.visible = false
      return
    }

    const host = sceneRegistry.nodes.get(preview.wallId)
    if (!host) {
      group.visible = false
      return
    }

    group.visible = true
    group.position.copy(host.localToWorld(scratch.set(...preview.position)))
    group.rotation.y = host.rotation.y + (preview.side === 'left' ? 0 : Math.PI)

    const material = materialRef.current
    if (material) material.color.set(preview.valid ? '#0b6e5f' : '#9e4520')
  })

  return (
    <group ref={groupRef} visible={false}>
      <mesh raycast={NEVER_RAYCAST}>
        <boxGeometry args={[size.width, size.height, 0.14]} />
        <meshStandardMaterial
          ref={materialRef}
          color="#0b6e5f"
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}