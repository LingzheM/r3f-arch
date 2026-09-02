import type { AnyNodeId } from "../../core/schema/types"
import { useScene } from "../../core/store/use-scene"
import { nodeRegistry } from "../nodes/register"
import { ParametricNodeRenderer } from "./parametric-node-renderer"

export const SceneRenderer = () => {
    const rootNodeIds = useScene((state) => state.rootNodeIds)

    return (
        <group name="scene-renderer">
            {rootNodeIds.map((nodeId) => <NodeRenderer key={nodeId} nodeId={nodeId}/>)}
        </group>
    )
}

export const NodeRenderer = ({ nodeId }: { nodeId: AnyNodeId }) => {
    const node = useScene((state) => state.nodes[nodeId])
    if (!node) return null

    const def = nodeRegistry.get(node.type)
    if (!def) return null

    if (def.renderer) {
        const Renderer = def.renderer
        return <Renderer node={node} />
    }
    
    if (def.geometry) return <ParametricNodeRenderer node={node} />

    return null
}