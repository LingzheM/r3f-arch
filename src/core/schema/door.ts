import { z } from 'zod'
import { BaseNode, nodeType, objectId } from "./base";
import { DEFAULT_DOOR_HEIGHT, DEFAULT_DOOR_WIDTH, OpeningPlacement, OpeningSide } from './opening';

export const DoorNode = BaseNode.extend({
  id: objectId('door'),
  type: nodeType('door'),

  parentId: z.string(),

  position: OpeningPlacement.default([0, DEFAULT_DOOR_HEIGHT / 2, 0]),

  width: z.number().positive().default(DEFAULT_DOOR_WIDTH),
  height: z.number().positive().default(DEFAULT_DOOR_HEIGHT),

  side: OpeningSide.default('left'),
})

export type DoorNode = z.infer<typeof DoorNode>