import type * as THREE from 'three'
import type { AnyNode, AnyNodeType } from '../schema/types'

export type NodeEventSuffix =
    | 'click' | 'pointerdown' | 'pointerup' | 'enter' | 'leave' | 'move'


export interface NodeEvent<N extends AnyNode = AnyNode> {
    node: N
    point: [number, number, number]
    object: THREE.Object3D
    stopPropagation: () => void
    nativeEvent: PointerEvent
}

export interface GridEvent {
    point: [number, number, number]
    nativeEvent: PointerEvent
}

export type NodeEventKey = `${AnyNodeType}:${NodeEventSuffix}`

export type EventMap =
    & { [K in NodeEventKey]: NodeEvent }
    & { 'grid:click': GridEvent }