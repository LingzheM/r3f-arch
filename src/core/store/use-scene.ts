'use client'
import { create } from 'zustand'

import { AnyNodeId, AnyNode } from "../schema/types"

type SceneState = {
    nodes: Record<AnyNodeId, AnyNode>
    rootNodeIds: AnyNodeId[]

    addNode(input: unknown): AnyNodeId
    updateNode(id: AnyNodeId, patch:Partial<AnyNode>): void
    removeNode(id: AnyNodeId): void
    getNode(id: AnyNodeId): AnyNode | undefined
}

export const useScene = create<SceneState>()(
    // nodes 用 Record 不用 Map

    // rootNodeIds 单独存一份顺序。

    // addNode 里做一次 AnyNode.parse(input)

    // updateNode 浅合并

    // removeNode 只删除自己 从 rootNodeIds 摘掉
    temporal(
        (set, get) => ({
            // 1. Flat dictionary of all nodes
            nodes: {}

            // 2. Root node IDs
            rootNodeIds: []
        })
    )

)