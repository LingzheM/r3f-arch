import type { NodeDefinition } from "../../../core/registry/node-definition";
import type { SiteNode } from "../../../core/schema/site";

export const siteDefinition: NodeDefinition<SiteNode> = {
  kind: 'site',
  selectable: false,
}