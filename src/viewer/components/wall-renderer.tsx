import { useEffect, useMemo, useRef } from "react";
import type { WallNode } from "../../core/schema/wall";
import type * as THREE from 'three'
import { useRegistry } from "../../core/registry/scene-registry";
import { buildWallGeometry, wallTransform } from "../lib/wall-geometry";


export function WallRenderer({node}: { node: WallNode }) {
    const ref = useRef<THREE.Mesh>(null)
    useRegistry(node.id, 'wall', ref)

    const geometry = useMemo(
        () => buildWallGeometry(node),
        [node.start[0], node.start[1], node.end[0], node.end[1], node.thickness, node.height],
    )

    useEffect(() => () => geometry.dispose(), [geometry])

    const { position, rotationY } = useMemo(
        () => wallTransform(node),
        [node.start[0], node.start[1], node.end[0], node.end[1], node.height],
    )

    return (
        <mesh
            ref={ref}
            geometry={geometry}
            position={position}
            rotation-y={rotationY}
            visible={node.visible !== false}
            castShadow
            receiveShadow
            onClick={(e) => {
                e.stopPropagation()
                console.log('[pick]', node.id)
            }}
        >
            <meshStandardMaterial color="#e8e8e8" roughness={0.9} metalness={0} />
        </mesh>
    )
}