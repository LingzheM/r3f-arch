import type { NodeEventKey } from "../../../core/events/types";
import type { AnyNodeType } from "../../../core/schema/types";

export function nodeClickKeys(kinds: readonly AnyNodeType[]): NodeEventKey[] {
  return kinds.map((kind): NodeEventKey => `${kind}:click`)
}