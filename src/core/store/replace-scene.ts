import type { AnyNodeId } from "../schema/types";
import type { SceneSnapshot } from "./history-control";
import { useScene } from "./use-scene";

export function replaceScene(snapshot: SceneSnapshot): void {
  useScene.setState({
    nodes: snapshot.nodes,
    rootNodeIds: snapshot.rootNodeIds,
    dirtyNodes: new Set(Object.keys(snapshot.nodes) as AnyNodeId[]),
  })
  useScene.temporal.getState().clear()
}