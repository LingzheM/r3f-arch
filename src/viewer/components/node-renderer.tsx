import type { AnyNodeId } from "../../core/schema/types"
import { useScene } from "../../core/store/use-scene"
import { WallRenderer } from "./wall-renderer"

export const SceneRenderer = () => {
    const rootNodeIds = useScene((state) => state.rootNodeIds)

    return (
        <group name="scene-renderer">
            {rootNodeIds.map((nodeId) => <NodeRenderer key={nodeId} nodeId={nodeId} />)}
        </group>
    )
}

export const NodeRenderer = ({ nodeId }: { nodeId: AnyNodeId }) => {
    const node = useScene((state) => state.nodes[nodeId])
    if (!node) return null
    switch (node.type) {
        case 'wall': return <WallRenderer node={node} />
        default: return null
    }
}