const base = { object: 'node', parentId: null, visible: true, metadata: {} }

/** 8281cd2（2026-08-16「M1 core」）：BaseNode 没有 children；WallNode = start / end / thickness? / height? */
export const M1_FLAT_SCENE = {
  nodes: {
    wall_0a1b2c3d4e5a6b7c: { ...base, id: 'wall_0a1b2c3d4e5a6b7c', type: 'wall', start: [0, 0], end: [4, 0] },
    wall_1b2c3d4e5a6b7c8d: { ...base, id: 'wall_1b2c3d4e5a6b7c8d', type: 'wall', start: [4, 0], end: [4, 3] },
    // 控制台里设过高度的一堵
    wall_2c3d4e5a6b7c8d9e: { ...base, id: 'wall_2c3d4e5a6b7c8d9e', type: 'wall', start: [4, 3], end: [0, 3], height: 3 },
  },
  rootNodeIds: ['wall_0a1b2c3d4e5a6b7c', 'wall_1b2c3d4e5a6b7c8d', 'wall_2c3d4e5a6b7c8d9e'],
}

/** a5e4ee6（2026-09-04 M6 验收）：楼板 elevation 默认 0.05 被物化；天花 height 缺席 = 当时的常量 2.5；仍无 children */
export const M6_FLAT_SCENE = {
  nodes: {
    wall_3d4e5a6b7c8d9e0a: { ...base, id: 'wall_3d4e5a6b7c8d9e0a', type: 'wall', start: [0, 0], end: [4, 0] },
    slab_4e5a6b7c8d9e0a1b: {
      ...base, id: 'slab_4e5a6b7c8d9e0a1b', type: 'slab',
      polygon: [[0, 0], [4, 0], [4, 3], [0, 3]], elevation: 0.05,
    },
    ceiling_5a6b7c8d9e0a1b2c: {
      ...base, id: 'ceiling_5a6b7c8d9e0a1b2c', type: 'ceiling',
      polygon: [[0, 0], [4, 0], [4, 3], [0, 3]],
    },
    column_6b7c8d9e0a1b2c3d: {
      ...base, id: 'column_6b7c8d9e0a1b2c3d', type: 'column', position: [2, 0, 1.5], crossSection: 'round',
    },
  },
  rootNodeIds: ['wall_3d4e5a6b7c8d9e0a', 'slab_4e5a6b7c8d9e0a1b', 'ceiling_5a6b7c8d9e0a1b2c', 'column_6b7c8d9e0a1b2c3d'],
}

/** 224db5e（2026-09-10 M7）：BaseNode 有 children；门窗挂在墙上、不在根里 */
export const M7_FLAT_SCENE = {
  nodes: {
    wall_7c8d9e0a1b2c3d4e: {
      ...base, id: 'wall_7c8d9e0a1b2c3d4e', type: 'wall', start: [0, 0], end: [5, 0],
      children: ['door_8d9e0a1b2c3d4e5a', 'window_9e0a1b2c3d4e5a6b'],
    },
    door_8d9e0a1b2c3d4e5a: {
      ...base, id: 'door_8d9e0a1b2c3d4e5a', type: 'door', parentId: 'wall_7c8d9e0a1b2c3d4e', children: [],
      position: [1.5, 1.05, 0], width: 0.9, height: 2.1, side: 'left',
    },
    window_9e0a1b2c3d4e5a6b: {
      ...base, id: 'window_9e0a1b2c3d4e5a6b', type: 'window', parentId: 'wall_7c8d9e0a1b2c3d4e', children: [],
      position: [3.5, 1.5, 0], width: 1.2, height: 1.2, side: 'right',
    },
    slab_0a1b2c3d4e5a6b7d: {
      ...base, id: 'slab_0a1b2c3d4e5a6b7d', type: 'slab', children: [],
      polygon: [[0, 0], [5, 0], [5, 4], [0, 4]], elevation: 0.05,
    },
  },
  rootNodeIds: ['wall_7c8d9e0a1b2c3d4e', 'slab_0a1b2c3d4e5a6b7d'],
}