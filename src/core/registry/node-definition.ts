import type * as THREE from 'three'
import type { AnyNode, AnyNodeId, AnyNodeType } from "../schema/types"
import type { ComponentType } from 'react'

export type NodeFrame = {
    position: [number, number, number]
    rotationY: number
}

export const IDENTITY_FRAME: NodeFrame = { position: [0, 0, 0], rotationY: 0 }
/**
 * 
 */
export type GeometryContext<L = unknown> = {
    resolve: (id: AnyNodeId) => AnyNode | undefined
    siblings: readonly AnyNode[]
    levelData: L | undefined
}

export type NodeAppearance = { selected: boolean }

export type NodeDefinition<N extends AnyNode = AnyNode, L = unknown> = {
    kind: N['type']
    selectable?: boolean

    /**  */
    frame?: (node: N) => NodeFrame
    geometry?: (node: N, ctx: GeometryContext<L>, appearance: NodeAppearance) => THREE.Object3D

    computeLevelData?: (siblings: readonly N[]) => L

    renderer?: ComponentType<{ node: N }>

    system?: ComponentType
}

export type AnyNodeDefinition = NodeDefinition<AnyNode, unknown>

export function asAnyDefinition<N extends AnyNode, L>(
    def: NodeDefinition<N, L>,
): AnyNodeDefinition {
    return def as unknown as AnyNodeDefinition
}

export type { AnyNodeType }