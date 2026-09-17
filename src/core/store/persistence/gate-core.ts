import type { AnyNodeId } from "../../schema/types";
import type { SceneSnapshot } from "../history-control";

export type LoadReport = {
  droppedNodeIds: AnyNodeId[]
}

export function loadSceneDocument(raw: unknown): { snapshot: SceneSnapshot; report: LoadReport } {
  throw new Error('not implemented')
}