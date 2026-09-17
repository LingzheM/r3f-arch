const base = { object: 'node', parentId: null, visible: true, metadata: {} }

export const M1_FLAT_SCENE = {
  nodes: {
    wall_0a1b2c3d4e5a6b7c: { ...base, id: 'wall_0a1b2c3d4e5a6b7c', type: 'wall', start: [0, 0], end: [4, 0] },
    wall_1b2c3d4e5a6b7c8d: { ...base, id: 'wall_1b2c3d4e5a6b7c8d', type: 'wall', start: [4, 0], end: [4, 3] },
    // 控制台里设过高度的一堵
    wall_2c3d4e5a6b7c8d9e: { ...base, id: 'wall_2c3d4e5a6b7c8d9e', type: 'wall', start: [4, 3], end: [0, 3], height: 3 },
  },
  rootNodeIds: ['wall_0a1b2c3d4e5a6b7c', 'wall_1b2c3d4e5a6b7c8d', 'wall_2c3d4e5a6b7c8d9e'],
}