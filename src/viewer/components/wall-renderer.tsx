import { useContext, useEffect, useMemo, useRef } from "react";
import type { WallNode } from "../../core/schema/wall";
import type * as THREE from 'three'
import { useRegistry } from "../../core/registry/scene-registry";
import { buildWallGeometry, wallTransform } from "../lib/wall-geometry";
import { MiterContext, SelectionContext } from "./scene-context";
import { events } from "@react-three/fiber";


const WALL_COLOR = '#e8e8e8'
const WALL_SELECTED_COLOR = '#7dd3c0'

export function WallRenderer({node}: { node: WallNode }) {
    const ref = useRef<THREE.Mesh>(null)
    useRegistry(node.id, 'wall', ref)

    const miter = useContext(MiterContext)

    const selectId = useContext(SelectionContext)
    const isSelected = selectId === node.id

    const geometry = useMemo(
        () => buildWallGeometry(node, miter),
        [node.start[0], node.start[1], node.end[0], node.end[1], node.thickness, node.height, miter],
    )

    useEffect(() => () => geometry.dispose(), [geometry])

    const { position, rotationY } = useMemo(
        () => wallTransform(node),
        [node.start[0], node.start[1], node.end[0], node.end[1]],
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
            {...events}
        >
            <meshStandardMaterial 
                color={isSelected ? WALL_SELECTED_COLOR : WALL_COLOR} 
                roughness={0.9} 
                metalness={0} 
            />
        </mesh>
    )
}