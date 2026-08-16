'use client'
import { create } from 'zustand'

import { type AnyNodeId, AnyNode } from "../schema/types"

type SceneState = {
    nodes: Record<AnyNodeId, AnyNode>
    rootNodeIds: AnyNodeId[]

    addNode: (input: unknown) => AnyNodeId
    updateNode: (id: AnyNodeId, patch:Partial<AnyNode>) => void
    removeNode: (id: AnyNodeId) => void
    getNode: (id: AnyNodeId) => AnyNode | undefined
}

export const useScene = create<SceneState>((set, get) =>({
    nodes: {},
    rootNodeIds: [],

    addNode: (input) => {
        // parse 一次同时完成三件事：填 id，填默认值，挡住非法数据。
        const node = AnyNode.parse(input)
        set((s) => ({
            nodes: { ...s.nodes, [node.id]: node },
            rootNodeIds: [...s.rootNodeIds, node.id],
        }))
        return node.id
    },

    updateNode: (id, patch) => set((s) => {
        const prev = s.nodes[id]
        if (!prev) return s
        return { nodes: { ...s.nodes, [id]: { ...prev, ...patch } as AnyNode } }
    }),

    removeNode: (id) => set((s) => {
        if (!s.nodes[id]) return s
        const nodes = { ...s.nodes }
        delete nodes[id]
        return { nodes, rootNodeIds: s.rootNodeIds.filter((n) => n !== id) }
    }),

    getNode: (id) => get().nodes[id],
}))