import { z } from "zod";
import { BaseNode, nodeType, objectId } from "./base";

export const SiteNode = BaseNode.extend({
  id: objectId('site'),
  type: nodeType('site'),
})

export type SiteNode = z.infer<typeof SiteNode>