import { useLayoutEffect, type RefObject } from "react"
import type * as THREE from 'three'
import type { AnyNodeId } from "../schema/types"

export const sceneRegistry = {
    nodes: new Map<AnyNodeId, THREE.Object3D>(),
    byType: {} as Record<string, Set<AnyNodeId>>
}

export function useRegistry(
    id: AnyNodeId, 
    type: string, 
    ref: RefObject<THREE.Object3D | null>
) {
    useLayoutEffect(() => {
        const obj = ref.current
        if (!obj) return

        obj.userData.nodeId = id
        sceneRegistry.nodes.set(id, obj)
        ;(sceneRegistry.byType[type] ?? = new Set()).add(id)

        return () => {
            sceneRegistry.nodes.delete(id)
            sceneRegistry.byType[type]?.delete(id)
            delete obj.userData.nodeId
        }
    }, [id, type, ref])
}

export function nodeIdFromObject(obj: THREE.Object3D | null): AnyNodeId | null {
    let cur: THREE.Object3D | null = obj
    while (cur) {
        const id = cur.userData?.nodeId
        if (typeof id === 'string') return id as AnyNodeId
        cur = cur.parent
    }
    return null
}