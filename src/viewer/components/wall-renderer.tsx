import { useContext, useEffect, useMemo, useRef } from "react";
import type { WallNode } from "../../core/schema/wall";
import type * as THREE from 'three'
import { useRegistry } from "../../core/registry/scene-registry";
import { buildWallGeometry, wallTransform } from "../lib/wall-geometry";
import { MiterContext } from "./node-renderer";


export function WallRenderer({node}: { node: WallNode }) {
    const ref = useRef<THREE.Mesh>(null)
    useRegistry(node.id, 'wall', ref)

    const miter = useContext(MiterContext)

    const geometry = useMemo(
        () => buildWallGeometry(node, miter),
        // miter 必须在依赖里：邻居变了这堵墙的墙角也要重算。
        // 代价是 miter 每次都是新对象 → 这个 memo 实际从不命中。
        // 这就是 M2 §06 那条「改一堵墙 → 所有墙重建几何」的缺陷，M4 用脏传播修。
        [node.start[0], node.start[1], node.end[0], node.end[1], node.thickness, node.height, miter],
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