const NEVER_RAYCAST = () => null

export function Ground({
    size = 100,
    divisions = 200,
    gridColor = '#d8dcda',
    centerLineColor = '#b4bcb9',
}: {
    size?: number,
    divisions?: number,
    gridColor?: string,
    centerLineColor?: string
}) {
    return (
        <group name="ground">
            {/** 网格线 */}
            <gridHelper
                args={[size, divisions, centerLineColor, gridColor]}
                position={[0, 0.001, 0]}
                raycast={NEVER_RAYCAST}
            />

            {/** 地面。接收阴影，让 3D 视角下墙有立体感 */}
            <mesh rotation-x={-Math.PI / 2} receiveShadow raycast={NEVER_RAYCAST}>
                <planeGeometry args={[size, size]} />
                <meshStandardMaterial color="#f0f2f1" roughness={1} metalness={0} />
            </mesh>
        </group>
    )
}