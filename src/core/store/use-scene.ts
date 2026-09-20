'use client'
import { create } from 'zustand'
import { temporal } from 'zundo'

import { type AnyNodeId, AnyNode, asNodeId } from "../schema/types"
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

export function collectSubtree(
    nodes: Record<AnyNodeId, AnyNode>,
    rootId: AnyNodeId,
): AnyNodeId[] {
    const out: AnyNodeId[] = []
    const seen = new Set<AnyNodeId>()
    const stack: AnyNodeId[] = [rootId]

    while (stack.length > 0) {
        const id = stack.pop()!
        if (seen.has(id)) continue

        const node = nodes[id]
        if (!node) continue

        seen.add(id)
        out.push(id)

        for (const child of node.children) stack.push(asNodeId(child))
    }

    return out
}

function mergeNodePath(prev: AnyNode, patch: Partial<AnyNode>): AnyNode {
    const merged: Record<string, unknown> = { ...prev, ...patch }
    for (const key of Object.keys(patch)) {
        if ((patch as Record<string, unknown>)[key] === undefined) delete merged[key]
    }
    return merged as AnyNode
}

function validateMerged(prev: AnyNode, merged: AnyNode): AnyNode {
    if (merged.type !== prev.type || merged.id !== prev.id) {
        throw new Error(`[scene updateNode: ${prev.id} 不能改 type / id]`)
    }
    const result = AnyNode.safeParse(merged)
    if (!result.success) {
        throw new Error(`[scene] updateNode: ${prev.id} 改完不是合法的 ${prev.type}: ${result.error.issues[0]?.message ?? ''}`)
    }

    const stripped = Object.keys(merged).filter((k) => !Object.hasOwn(result.data, k))
    if (stripped.length > 0) {
        throw new Error(`[scene] ${prev.type} 没有字段 ${stripped.join(', ')}`)
    }
    return result.data
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
                const parentId = node.parentId === null ? null : asNodeId(node.parentId)

                if (parentId !== null && !get().nodes[parentId]) {
                    throw new Error(`[scene] addNode: 宿主 "${parentId}" 不存在`)
                }

                set((s) => {
                    const nodes: Record<AnyNodeId, AnyNode> = { ...s.nodes, [node.id]: node }

                    if (parentId === null) {
                        return { nodes, rootNodeIds: [...s.rootNodeIds, node.id] }
                    }

                    const parent = s.nodes[parentId]!
                    nodes[parentId] = { ...parent, children: [...parent.children, node.id] }
                    return { nodes, rootNodeIds: s.rootNodeIds }
                })

                get().makeDirty(node.id)
                if (parentId !== null) get().makeDirty(parentId)
                return node.id
            },

            updateNode: (id, patch) => {
                if ('parentId' in patch || 'children' in patch) {
                    throw new Error('[scene] updateNode: parentId / children 不可 patch')
                }
                const prev = get().nodes[id]
                if (!prev) return
                const validated = validateMerged(prev, mergeNodePath(prev, patch))
                set((s) => ({ nodes: { ...s.nodes, [id]: validated } }))

                const next = get().nodes[id]
                if (!next) return

                get().makeDirty(id)

                const parentId = next.parentId === null ? null : asNodeId(next.parentId)
                if (parentId !== null && get().nodes[parentId]) get().makeDirty(parentId)
                for (const childId of next.children) {
                    const child = asNodeId(childId)
                    if (get().nodes[child]) get().makeDirty(child)
                }
            },

            removeNode: (id) => {
                const target = get().nodes[id]
                if (!target) return

                const doomed = collectSubtree(get().nodes, id)
                const removed = new Set<AnyNodeId>(doomed)
                const parentId = target.parentId === null ? null : asNodeId(target.parentId)

                set((s) => {
                    const nodes = { ...s.nodes }
                    for (const doomedId of doomed) delete nodes[doomedId]

                    if (parentId !== null) {
                        const parent = nodes[parentId]
                        if (parent) {
                            nodes[parentId] = {
                                ...parent,
                                children: parent.children.filter((c) => c !== id),
                            }
                        }
                    }
                    return { nodes, rootNodeIds: s.rootNodeIds.filter((n) => !removed.has(n)) }
                })

                for (const doomedId of doomed) get().clearDirty(doomedId)
                if (parentId !== null && get().nodes[parentId]) get().makeDirty(parentId)
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