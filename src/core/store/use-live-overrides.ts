'use client'
import { create } from "zustand"
import type { AnyNode, AnyNodeId } from "../schema/types"

export type NodeOverride = Partial<AnyNode>

type LiveOverrideState = {
    overrides: Map<AnyNodeId, NodeOverride>
    set: (id: AnyNodeId, values: NodeOverride) => void
    setMany: (entries: ReadonlyArray<readonly [AnyNodeId, NodeOverride]>) => void
    clear: (id: AnyNodeId) => void
    clearAll: () => void
}

export const useLiveOverrides = create<LiveOverrideState>((set, get) => ({
    overrides: new Map(),

    set: (id, values) =>
        set((state) => {
            const next = new Map(state.overrides)
            next.set(id, mergeOverride(next.get(id), values))
            return { overrides: next }
        }),

    setMany: (entries) =>
        set((state) => {
            if (entries.length === 0) return state
            const next = new Map(state.overrides)
            for (const [id, values] of entries) next.set(id, mergeOverride(next.get(id), values))
            return { overrides: next }
        }),

    clear: (id) =>
        set((state) => {
            if (!state.overrides.has(id)) return state
            const next = new Map(state.overrides)
            next.delete(id)
            return { overrides: next }
        }),

    clearAll: () => {
        if (get().overrides.size === 0) return
        set({ overrides: new Map() })
    },
}))

export function getEffectiveNode<T extends AnyNode>(node: T): T {
    const override = useLiveOverrides.getState().overrides.get(node.id)
    if (!override) return node
    return { ...node, ...override } as T
}


function mergeOverride(prev: NodeOverride | undefined, next: NodeOverride): NodeOverride {
    return { ...prev, ...next } as NodeOverride
}