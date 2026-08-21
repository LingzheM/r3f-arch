import type { Point2D } from "../../../core/lib/geometry-2d";

export type InteractionScope = 
    | { kind: 'idle' }
    | { kind: 'drafting'; tool: 'wall'; points: Point2D[] }


export type InteractionScopeKind = InteractionScope['kind']
export type ActiveInteractionScope = Exclude<InteractionScope, { kind: 'idle' }>

export const IDLE_SCOPE: InteractionScope = { kind: 'idle' }

const NO_POINTS: readonly Point2D[] = Object.freeze([])

export function isIdle(s: InteractionScope): s is { kind: 'idle' } {
    return s.kind === 'idle'   
}

export function isActive(s: InteractionScope): s is ActiveInteractionScope {
    return s.kind !== 'idle'
}

export function selectionEnabled(s: InteractionScope): boolean {
    return s.kind === 'idle'
}

export function draftPoints(s: InteractionScope): readonly Point2D[] {
    return s.kind === 'drafting' ? s.points : NO_POINTS
}

export function lastDraftPoint(s: InteractionScope): Point2D | null {
    const pts = draftPoints(s)
    return pts.length > 0 ? pts[pts.length - 1]! : null
}