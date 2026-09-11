import type * as THREE from 'three'
import { useContext, useLayoutEffect, useRef } from "react";
import { asNodeId, type AnyNode } from "../../core/schema/types";
import { useRegistry } from '../../core/registry/scene-registry';
import { useNodeEvents } from '../hooks/use-node-events';
import { SelectionContext } from './scene-context';
import { useScene } from '../../core/store/use-scene';
import { useEffectiveNode } from '../hooks/use-effective-node';
import { nodeRegistry } from '../nodes/register';
import { IDENTITY_FRAME, type NodeFrame } from '../../core/registry/node-definition';
import { NodeRenderer } from './node-renderer';

export function ParametricNodeRenderer({
    node,
    frame,
}: {
    node: AnyNode;
    frame?: NodeFrame
}) {
    const ref = useRef<THREE.Group>(null)
    useRegistry(node.id, node.type, ref)

    const effective = useEffectiveNode(node)

    const events = useNodeEvents(node, node.type)

    const isSelected = useContext(SelectionContext) === node.id

    const def = nodeRegistry.get(node.type)

    const appliedFrame = frame ?? def?.frame?.(effective) ?? IDENTITY_FRAME
    const interactive = def?.selectable !== false

    useLayoutEffect(() => {
        useScene.getState().makeDirty(node.id)
    }, [node.id, effective, isSelected])

    return (
        <group
            ref={ref}
            position={appliedFrame.position}
            rotation-y={appliedFrame.rotationY}
            visible={node.visible !== false}
            {...(interactive ? events : [])}
        >
            {node.children.map((childId) => (
                <NodeRenderer key={childId} nodeId={asNodeId(childId)} />
            ))}
        </group>
    )
}