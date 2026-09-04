import { z } from 'zod'
import { WallNode } from './wall'
import { SlabNode } from './slab'
import { CeilingNode } from './ceiling'
import { ColumnNode } from './column'

export const AnyNode = z.discriminatedUnion('type', [WallNode, SlabNode, CeilingNode, ColumnNode])

export type AnyNode = z.infer<typeof AnyNode>
export type AnyNodeId = AnyNode['id']
export type AnyNodeType = AnyNode['type']