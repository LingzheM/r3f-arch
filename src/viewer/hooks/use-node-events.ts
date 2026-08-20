import type { ThreeEvent } from "@react-three/fiber";
import type { NodeEvent, NodeEventKey, NodeEventSuffix } from "../../core/events/types";
import type { AnyNode, AnyNodeType } from "../../core/schema/types";
import { emitter } from "../../core/events/bus";
import { useViewer } from "../store/use-viewer";
import { isClickGesture } from "../lib/pointer-gesture";

type NodeByKind<K extends AnyNodeType> = Extract<AnyNode, { type: K }>


export function useNodeEvents<K extends AnyNodeType>(node: NodeByKind<K>, type: K) {
    const emit = (suffix: NodeEventSuffix, e: ThreeEvent<PointerEvent>) => {
        const payload: NodeEvent<NodeByKind<K>> = {
            node,
            point: [e.point.x, e.point.y, e.point.z],
            object: e.object,
            stopPropagation: () => e.stopPropagation(),
        }

        emitter.emit(`${type}:${suffix}` as NodeEventKey, payload as NodeEvent)
    }

    const hoverSuppressed = () => useViewer.getState().cameraDragging

    return {
        onPointerDown: (e: ThreeEvent<PointerEvent>) => {
            if (e.button !== 0) return
            emit('pointerdown', e)
        },
        onPointerUp: (e: ThreeEvent<PointerEvent>) => {
            if (e.button !== 0) return
            emit('pointerup', e)
            if (isClickGesture(e.nativeEvent)) emit('click', e)
        },
        onClick: (_e: ThreeEvent<MouseEvent>) => {},
        onPointerEnter: (e: ThreeEvent<PointerEvent>) => {
            if (!hoverSuppressed()) emit('enter', e)
        },
        onPointerLeave: (e: ThreeEvent<PointerEvent>) => {
            if (!hoverSuppressed()) emit('leave', e)
        },
        onPointerMove: (e: ThreeEvent<PointerEvent>) => {
            if (!hoverSuppressed()) emit('move', e)
        },
    }
}