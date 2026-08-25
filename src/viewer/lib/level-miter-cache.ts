import type { WallNode } from "../../core/schema/wall";
import { calculateLevelMiters, type MiterData } from "../../core/systems/wall/wall-mitering";

type CacheEntry = { walls: readonly WallNode[]; data: MiterData }

let cache: CacheEntry | null = null

export function sameMiterInputs(a: readonly WallNode[], b: readonly WallNode[]): boolean {
    if (a.length !== b.length) return false

    for (let i = 0; i < a.length; i += 1) {
        const x = a[i]
        const y = b[i]
        if (x === y) continue
        if (!x || !y) return false
        if (
            x.id !== y.id ||
            x.start[0] !== y.start[0] ||
            x.start[1] !== y.start[1] ||
            x.end[0] !== y.end[0] ||
            x.end[1] !== y.end[1] ||
            x.thickness !== y.thickness
        ) {
            return false
        }
    }

    return true
}

export function getCachedLevelMiters(walls: readonly WallNode[]): MiterData {
    if (cache && sameMiterInputs(cache.walls, walls)) return cache.data

    const data = calculateLevelMiters([...walls])
    cache = { walls, data }
    return data
}

export function clearLevelMiterCache(): void {
    cache = null
}