import type { LevelNode } from "../../../core/schema/level";
import { levelBaseY } from "../../../core/services/storey";
import { useScene } from "../../../core/store/use-scene";
import { ParametricNodeRenderer } from "../../components/parametric-node-renderer";

export function LevelRenderer({ node }: { node: LevelNode }) {
  const baseY = useScene((s) => levelBaseY(node.id, s.nodes))

  return (
    <ParametricNodeRenderer node={node} frame={{ position: [0, baseY, 0], rotationY: 0 }} />
  )
}