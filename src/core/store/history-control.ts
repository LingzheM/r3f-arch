import type { AnyNode, AnyNodeId } from "../schema/types"

export type SceneSnapshot = {
    nodes: Record<AnyNodeId, AnyNode>
    rootNodeIds: AnyNodeId[]
}

export function areSemanticValuesEqual(left: unknown, right: unknown): boolean {
    if (Object.is(left, right)) return true
    if (typeof left !== typeof right || left === null || right === null) return false

    if (Array.isArray(left) || Array.isArray(right)) {
        if (!(Array.isArray(left) && Array.isArray(right)) || left.length !== right.length) return false
        return left.every((value, index) => areSemanticValuesEqual(value, right[index]))
    }

    if (typeof left !== 'object' || typeof right !== 'object') return false

    const l = left as Record<string, unknown>
    const r = right as Record<string, unknown>
    const lKeys = Object.keys(l)
    if (lKeys.length !== Object.keys(r).length) return false

    for (const key of lKeys) {
        if (!(key in r) || !areSemanticValuesEqual(l[key], r[key])) return false
    }
    return true
}

export function areSceneSnapshotsEqual(left: SceneSnapshot, right: SceneSnapshot): boolean {
    return (
        areSemanticValuesEqual(left.nodes, right.nodes) &&
        areSemanticValuesEqual(left.rootNodeIds, right.rootNodeIds)
    )
}

type PausableStore = {
    temporal: { getState(): { pause(): void; resume(): void } }
}

const pauseLeases = new Set<symbol>()

export function getSceneHistoryPauseDepth(): number {
    return pauseLeases.size
}

export function acquireSceneHistoryPause(store: PausableStore): () => void {
    if (pauseLeases.size === 0) store.temporal.getState().pause()

    const lease = Symbol('scene-history-pause')
    pauseLeases.add(lease)

    let released = false
    return () => {
        if (released) return
        released = true
        pauseLeases.delete(lease)
        if (pauseLeases.size === 0) store.temporal.getState().resume()
    }
}

export function resetSceneHistoryPause(store: PausableStore): void {
    const hadLeases = pauseLeases.size > 0
    pauseLeases.clear()
    if (hadLeases) store.temporal.getState().resume()
}

type HistoryStore<TPast> = {
    temporal: {
        getState(): { pastStates: TPast[] }
        setState(partial: { pastStates: TPast[] }): void
    }
}

function retainedPastStateCount<TPast>(before: readonly TPast[], after: readonly TPast[]): number {
    for (let start = 0; start < before.length; start += 1) {
        const retained = before.length - start
        if (retained > after.length) continue

        let matches = true
        for (let index = 0; index < retained; index += 1) {
            if (before[start + index] !== after[index]) { matches = false; break }
        }
        if (matches) return retained
    }
    return 0
}

export function runAsSingleSceneHistoryStep<TPast, TResult>(
    store: HistoryStore<TPast>,
    run: () => TResult,
): TResult {

    const before = [...store.temporal.getState().pastStates]

    const result = run()

    const after = store.temporal.getState().pastStates
    const retained = retainedPastStateCount(before, after)
    const added = after.length - retained

    if (added > 1) {
        const firstAdded = after[retained]
        if (firstAdded !== undefined) {
            store.temporal.setState({ pastStates: [...after.slice(0, retained), firstAdded] })
        }
    }

    return result
}