import type * as THREE from 'three'
import { useContext, useLayoutEffect, useRef } from "react";
import type { AnyNode } from "../../core/schema/types";
import { useRegistry } from '../../core/registry/scene-registry';
import { useNodeEvents } from '../hooks/use-node-events';
import { useLiveOverrides } from '../../core/store/use-live-overrides';
import { SelectionContext } from './scene-context';
import { useScene } from '../../core/store/use-scene';

export function ParametricNodeRenderer({ node }: { node: AnyNode }) {
    const ref = useRef<THREE.Group>(null)
    useRegistry(node.id, node.type, ref)

    const events = useNodeEvents(node, node.type)

    const override = useLiveOverrides((s) => s.overrides.get(node.id))

    const isSelected = useContext(SelectionContext) === node.id

    useLayoutEffect(() => {
        useScene.getState().makeDirty(node.id)
    }, [node, override, isSelected])

    return <group ref={ref} visible={node.visible !== false} {...events} />
}