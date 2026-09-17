import { describe, expect, it } from "vitest";
import { asNodeId } from "../../schema/types";
import type { SlabNode } from "../../schema/slab";
import { loadSceneDocument } from "./gate-core";

describe('loadSceneDocument', () => {
  it('v0 文档： 楼板 elevation 0.05 迁移成 0', () => {
    const v0FlatDoc = {
      nodes: [
        {
          object: 'node', id: 'wall_1', type: 'wall', parentId: null, children: [],
          visible: true, metadata: {}, start: [0, 0], end: [4, 0],
        },
        {
          object: 'node', id: 'slab_1', type: 'slab', parentId: null, children: [],
          visible: true, metadata: {}, polygon: [[0, 0], [4, 0], [4, 4], [0, 4]],
          elevation: 0.05,
        },
      ],
      rootNodeIds: ['wall_1', 'slab_1'],
    }

    const { snapshot } = loadSceneDocument(v0FlatDoc)
    const slab = snapshot.nodes[asNodeId('slab_1')] as SlabNode
    expect(slab.elevation).toBe(0)
  })
})