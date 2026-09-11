import { z } from 'zod'
import { WallNode } from './wall'
import { SlabNode } from './slab'
import { CeilingNode } from './ceiling'
import { ColumnNode } from './column'
import { DoorNode } from './door'
import { WindowNode } from './window'
import { SiteNode } from './site'
import { BuildingNode } from './building'
import { LevelNode } from './level'

export const AnyNode = z.discriminatedUnion('type', [
  WallNode,
  SlabNode,
  CeilingNode,
  ColumnNode,
  DoorNode,
  WindowNode,
  SiteNode,
  BuildingNode,
  LevelNode,
])

export type AnyNode = z.infer<typeof AnyNode>
export type AnyNodeId = AnyNode['id']
export type AnyNodeType = AnyNode['type']

export type OpeningNode = DoorNode | WindowNode

export const asNodeId = (id: string): AnyNodeId => id as AnyNodeId