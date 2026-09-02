import type * as THREE from 'three'
import { useContext, useRef } from "react";
import { useScene } from "../../core/store/use-scene";
import { SelectionContext } from "../components/scene-context";
import { useFrame } from "@react-three/fiber";
import type { AnyNode, AnyNodeId, AnyNodeType } from "../../core/schema/types";
import { nodeRegistry } from "../../core/registry/node-registry";
import { getEffectiveNode } from "../../core/store/use-live-overrides";
import { sceneRegistry } from '../../core/registry/scene-registry';
import type { GeometryContext } from '../../core/registry/node-definition';

export function GeometrySystem(): null {
    const dirtyNodes = useScene((s) => s.dirtyNodes)

    const selectId = useContext(SelectionContext)
    const selectIdRef = useRef(selectId)
    selectIdRef.current = selectId

    useFrame(() => {
        if (dirtyNodes.size === 0) return

        const { nodes, clearDirty } = useScene.getState()
        const dirtyIds = [...dirtyNodes] as AnyNodeId[]

        const levelDataBykind = new Map<AnyNodeType, unknown>()
        const effectiveBykind = new Map<AnyNodeType, AnyNode[]>()

        for (const id of dirtyIds) {
            const node = nodes[id]
            if (!node) continue
            const def = nodeRegistry.get(node.type)
            if (!def?.computeLevelData || levelDataBykind.has(node.type)) continue

            const siblings = Object.values(nodes)
                .filter((n) => n.type === node.type)
                .map((n) => getEffectiveNode(n))
            effectiveBykind.set(node.type, siblings)
        }

        for (const id of dirtyIds) {
            const documentNode = nodes[id]
            if (!documentNode) {
                clearDirty(id)
                continue
            }

            const def = nodeRegistry.get(documentNode.type)
            if (!def?.geometry) {
                clearDirty(id)
                continue
            }

            const group = sceneRegistry.nodes.get(id) as THREE.Group | undefined
            if (!group) {
                continue
            }

            const node = getEffectiveNode(documentNode)
            const siblings =
                effectiveBykind.get(node.type) ??
                Object.values(nodes)
                    .filter((n) => n.type === node.type)
                    .map((n) => getEffectiveNode(n))

            const ctx: GeometryContext = {
                resolve: (target) => nodes[target],
                siblings,
                levelData: levelDataBykind.get(node.type),
            }

            const built = def.geometry(node, ctx, { selected: selectIdRef.current === id })

            disposeGeometryChildren(group)
            for (const child of [...built.children]) {
                child.userData.__fromGeometry = true
                group.add(child)
            }

        }
    })

    return null
}

function disposeGeometryChildren(group: THREE.Group): void {
    for (const child of [...group.children]) {
        if (child.userData.__fromGeometry !== true) continue
        group.remove(child)
        disposeSubtree(child)
        
    }
}

function disposeSubtree(object: THREE.Object3D): void {
    object.traverse((node) => {
        const mesh = node as Partial<THREE.Mesh>
        mesh.geometry?.dispose()
        const material = mesh.material
        if (Array.isArray(material)) for (const m of material) m.dispose()
        else material?.dispose()
    })
}