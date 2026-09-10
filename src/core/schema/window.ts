import z from "zod";
import { BaseNode, nodeType, objectId } from "./base";
import { DEFAULT_WINDOW_HEIGHT, DEFAULT_WINDOW_SILL, DEFAULT_WINDOW_WIDHT, OpeningPlacement, OpeningSide } from "./opening";

export const WindowNode = BaseNode.extend({
  id: objectId('window'),
  type: nodeType('window'),

  parentId: z.string(),

  position: OpeningPlacement.default([
    0,
    DEFAULT_WINDOW_SILL + DEFAULT_WINDOW_HEIGHT / 2,
    0,
  ]),

  width: z.number().positive().default(DEFAULT_WINDOW_WIDHT),
  height: z.number().positive().default(DEFAULT_WINDOW_HEIGHT),

  side: OpeningSide.default('left'),
})

export type WindowNode = z.infer<typeof WindowNode>