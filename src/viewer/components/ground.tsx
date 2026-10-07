import { Line } from "@react-three/drei"

const NEVER_RAYCAST = () => null

/** 顶视图要的是图纸：地面纯白，网格淡灰，墙一眼能找到 */
const PALETTE = {
    '3d': { ground: '#f0f2f1', grid: '#d8dcda', center: '#b4bcb9' },
    'plan': { ground: '#ffffff', grid: '#cfd4d2', center: '#9aa39f' },
} as const

const AXIS_Y = 0.002
const AXIS_LENGTH = 1

export function Ground({
    variant = '3d',
    size = 100,
    divisions = 200,
}: {
    variant?: keyof typeof PALETTE
    size?: number,
    divisions?: number,
}) {
    const palette = PALETTE[variant]
    return (
        <group name="ground">
            {/** 网格线 */}
            <gridHelper
                args={[size, divisions, palette.center, palette.grid]}
                position={[0, 0.001, 0]}
                raycast={NEVER_RAYCAST}
            />

            {/** 地面。接收阴影，让 3D 视角下墙有立体感 */}
            <mesh rotation-x={-Math.PI / 2} receiveShadow raycast={NEVER_RAYCAST}>
                <planeGeometry args={[size, size]} />
                <meshStandardMaterial color="#f0f2f1" roughness={1} metalness={0} />
            </mesh>
            {/** 
             * 原点轴：x红，z蓝，各1m。顶视图里没有这两根线就判断不出朝向
             * 网格是各向同性的，转90°看着一模一样。
             * depthTest 关掉：它们贴在地面上，深度几乎相同，
             */}
            <Line
                points={[[0, AXIS_Y, 0], [AXIS_LENGTH, AXIS_Y, 0]]}
                color="#d64545"
                lineWidth={2}
                depthTest={false}
                raycast={NEVER_RAYCAST}
            />
            <Line
                points={[[0, AXIS_Y, 0], [0, AXIS_Y, AXIS_LENGTH]]}
                color="#3b6fd6"
                lineWidth={2}
                depthTest={false}
                raycast={NEVER_RAYCAST}
            />
        </group>
    )
}