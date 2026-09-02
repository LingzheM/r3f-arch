'use client'
import { create } from 'zustand'
import { temporal } from 'zundo'

import { type AnyNodeId, AnyNode } from "../schema/types"
import { areSceneSnapshotsEqual, type SceneSnapshot } from './history-control'

type SceneState = {
    nodes: Record<AnyNodeId, AnyNode>
    rootNodeIds: AnyNodeId[]

    dirtyNodes: Set<AnyNodeId>

    addNode: (input: unknown) => AnyNodeId
    updateNode: (id: AnyNodeId, patch: Partial<AnyNode>) => void
    removeNode: (id: AnyNodeId) => void
    getNode: (id: AnyNodeId) => AnyNode | undefined

    makeDirty: (id: AnyNodeId) => void
    clearDirty: (id: AnyNodeId) => void
    markAllDirty: () => void
}

export const useScene = create<SceneState>()(
    temporal(
        (set, get) => ({
            nodes: {},
            rootNodeIds: [],
            dirtyNodes: new Set<AnyNodeId>(),

            addNode: (input) => {
                // parse 一次同时完成三件事：填 id，填默认值，挡住非法数据。
                const node = AnyNode.parse(input)
                set((s) => ({
                    nodes: { ...s.nodes, [node.id]: node },
                    rootNodeIds: [...s.rootNodeIds, node.id],
                }))
                get().makeDirty(node.id)
                return node.id
            },

            updateNode: (id, patch) => {
                set((s) => {
                    const prev = s.nodes[id]
                    if (!prev) return s
                    return { nodes: { ...s.nodes, [id]: { ...prev, ...patch } as AnyNode } }
                })
                if (get().nodes[id]) get().makeDirty(id)
            },

            removeNode: (id) => {
                set((s) => {
                    if (!s.nodes[id]) return s
                    const nodes = { ...s.nodes }
                    delete nodes[id]
                    return { nodes, rootNodeIds: s.rootNodeIds.filter((n) => n !== id) }
                })
                get().clearDirty(id)
            },

            getNode: (id) => get().nodes[id],

            makeDirty: (id) => { get().dirtyNodes.add(id) },
            clearDirty: (id) => { get().dirtyNodes.delete(id) },

            markAllDirty: () => {
                const dirty = get().dirtyNodes
                for (const id of Object.keys(get().nodes) as AnyNodeId[]) dirty.add(id)
            },
        }),
        {
            partialize: (s): SceneSnapshot => ({ nodes: s.nodes, rootNodeIds: s.rootNodeIds }),
            equality: (past, current) => areSceneSnapshotsEqual(past, current),
            limit: 50
        },
    )
)