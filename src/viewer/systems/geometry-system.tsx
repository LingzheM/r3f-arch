import type * as THREE from 'three'
import { useContext, useRef } from "react";
import { useScene } from "../../core/store/use-scene";
import { SelectionContext } from "../components/scene-context";
import { useFrame } from "@react-three/fiber";
import type { AnyNodeId } from "../../core/schema/types";
import { nodeRegistry } from "../../core/registry/node-registry";
import { getEffectiveNode } from "../../core/store/use-live-overrides";
import { sceneRegistry } from '../../core/registry/scene-registry';
import type { GeometryContext } from '../../core/registry/node-definition';
import { computeSiblingGroups, siblingGroupKey } from './sibling-groups';

export function GeometrySystem(): null {
    const dirtyNodes = useScene((s) => s.dirtyNodes)

    const selectId = useContext(SelectionContext)
    const selectIdRef = useRef(selectId)
    selectIdRef.current = selectId

    useFrame(() => {
        if (dirtyNodes.size === 0) return

        const { nodes, clearDirty } = useScene.getState()
        const dirtyIds = [...dirtyNodes] as AnyNodeId[]

        const groups = computeSiblingGroups(
            dirtyIds,
            nodes,
            (kind) => nodeRegistry.get(kind),
            getEffectiveNode,
        )

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
            const key = siblingGroupKey(node)

            const ctx: GeometryContext = {
                resolve: (target) => nodes[target],
                siblings: groups.siblings.get(key) ?? [],
                levelData: groups.levelData.get(key),
            }

            const built = def.geometry(node, ctx, { selected: selectIdRef.current === id })

            disposeGeometryChildren(group)
            for (const child of [...built.children]) {
                child.userData.__fromGeometry = true
                group.add(child)
            }
            clearDirty(id)
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