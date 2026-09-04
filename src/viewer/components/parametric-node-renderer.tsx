import type * as THREE from 'three'
import { useContext, useLayoutEffect, useRef } from "react";
import type { AnyNode } from "../../core/schema/types";
import { useRegistry } from '../../core/registry/scene-registry';
import { useNodeEvents } from '../hooks/use-node-events';
import { useLiveOverrides, type NodeOverride } from '../../core/store/use-live-overrides';
import { SelectionContext } from './scene-context';
import { useScene } from '../../core/store/use-scene';

const ORIGIN: [number, number, number] = [0, 0, 0]

function positionOf(
    source: AnyNode | NodeOverride | undefined,
): [number, number, number] | undefined {
    if (!source) return undefined
    return 'position' in source ? source.position : undefined
}

export function ParametricNodeRenderer({ node }: { node: AnyNode }) {
    const ref = useRef<THREE.Group>(null)
    useRegistry(node.id, node.type, ref)

    const events = useNodeEvents(node, node.type)

    const override = useLiveOverrides((s) => s.overrides.get(node.id))

    const isSelected = useContext(SelectionContext) === node.id

    const position = positionOf(override) ?? positionOf(node) ?? ORIGIN

    useLayoutEffect(() => {
        useScene.getState().makeDirty(node.id)
    }, [node, override, isSelected])

    return (
        <group
            ref={ref}
            position={position}
            visible={node.visible !== false}
            {...events}
        />
    )
}