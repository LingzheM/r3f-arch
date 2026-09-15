import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { BuildingNode } from '../../../core/schema/building'
import { LevelNode } from '../../../core/schema/level'
import type { AnyNode, AnyNodeId } from '../../../core/schema/types'
import {
  applyLevelDisplay,
  GHOST_OPACITY,
  HIDDEN_LEVEL_LAYER,
  levelDisplayMode,
} from './level-display'

// three 在 Node 里建得出 Object3D / 材质 / 射线，不需要 GL 上下文。
// 所以「灰显是不是真的半透明」「隐藏的层还挡不挡鼠标」这两件事，在这里能测。

const asId = (id: string) => id as AnyNodeId

const level = (id: string, ordinal: number, parentId = 'building_a') =>
  LevelNode.parse({ id, type: 'level', level: ordinal, height: 2.5, parentId })

const byId = (...nodes: AnyNode[]) =>
  Object.fromEntries(nodes.map((n) => [n.id, n])) as Record<AnyNodeId, AnyNode>

describe('levelDisplayMode', () => {
  const nodes = byId(
    BuildingNode.parse({ id: 'building_a', type: 'building' }),
    level('level_0', 0),
    level('level_1', 1),
    level('level_2', 2),
    level('level_other1', 1, 'building_b'),
  )

  it('就是当前层 → current', () => {
    expect(levelDisplayMode(asId('level_1'), asId('level_1'), nodes)).toBe('current')
  })

  it('序数更低 → below', () => {
    expect(levelDisplayMode(asId('level_0'), asId('level_1'), nodes)).toBe('below')
  })

  it('序数更高 → above', () => {
    expect(levelDisplayMode(asId('level_2'), asId('level_1'), nodes)).toBe('above')
  })

  it('没有当前层 → 什么都不藏', () => {
    expect(levelDisplayMode(asId('level_2'), null, nodes)).toBe('current')
  })

  it('别栋楼的同序数层 → current', () => {
    expect(levelDisplayMode(asId('level_other1'), asId('level_1'), nodes)).toBe('current')
  })
})

/** 一层楼的缩影：一面墙（不透明）、墙上一扇窗（玻璃本来就半透明）、嵌套一层 group。 */
function buildLevel() {
  const root = new THREE.Group()

  const wallMaterial = new THREE.MeshStandardMaterial({ color: '#e8e8e8' })
  const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 0.1), wallMaterial)
  const wallGroup = new THREE.Group()
  wallGroup.add(wall)
  root.add(wallGroup)

  const glassMaterial = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.35 })
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.01), glassMaterial)
  const windowGroup = new THREE.Group()
  windowGroup.add(glass)
  wallGroup.add(windowGroup) // 窗挂在墙下面：真父子，嵌套两层

  root.updateMatrixWorld(true)
  return { root, wall, wallMaterial, glass, glassMaterial }
}

/** 从墙正前方往里射一条线。 */
const hits = (root: THREE.Object3D) =>
  new THREE.Raycaster(new THREE.Vector3(0, 0, 5), new THREE.Vector3(0, 0, -1)).intersectObject(root, true)

describe('applyLevelDisplay · 灰显', () => {
  it('不透明材质 → 半透明、不写深度', () => {
    const { root, wallMaterial } = buildLevel()
    applyLevelDisplay(root, 'below')

    expect(wallMaterial.transparent).toBe(true)
    expect(wallMaterial.opacity).toBeCloseTo(GHOST_OPACITY, 10)
    expect(wallMaterial.depthWrite).toBe(false)
  })

  it('本来就半透明的玻璃：透明度按比例降，不是一刀切成 0.25', () => {
    const { root, glassMaterial } = buildLevel()
    applyLevelDisplay(root, 'below')

    expect(glassMaterial.opacity).toBeCloseTo(0.35 * GHOST_OPACITY, 10)
  })

  it('切透明时置了 needsUpdate（version +1）—— 否则 #define OPAQUE 让灰显画成实心', () => {
    const { root, wallMaterial } = buildLevel()
    const before = wallMaterial.version

    applyLevelDisplay(root, 'below')

    expect(wallMaterial.version).toBe(before + 1)
  })

  it('每帧重复调用，version 不再涨 —— 不是每帧重算一次着色器程序', () => {
    const { root, wallMaterial, glassMaterial } = buildLevel()
    applyLevelDisplay(root, 'below')
    const wallVersion = wallMaterial.version
    const glassVersion = glassMaterial.version

    for (let i = 0; i < 5; i += 1) applyLevelDisplay(root, 'below')

    expect(wallMaterial.version).toBe(wallVersion)
    // 玻璃本来就 transparent，从头到尾不该触发任何一次重编译
    expect(glassVersion).toBe(new THREE.MeshStandardMaterial().version)
    expect(glassMaterial.version).toBe(glassVersion)
  })

  it('连续灰显很多帧，透明度不会一帧帧叠乘下去', () => {
    // 备份必须只在第一次写。每帧都重新备份的话，第二帧备份到的是已经灰过的 0.25，
    // 再乘一次 → 0.0625 → 0.0156 …… 下层几帧之内就淡没了，而且 version 一次都不涨。
    const { root, wallMaterial } = buildLevel()
    for (let i = 0; i < 10; i += 1) applyLevelDisplay(root, 'below')

    expect(wallMaterial.opacity).toBeCloseTo(GHOST_OPACITY, 10)
  })

  it('灰了很多帧再还原，仍然回到最初的原值', () => {
    const { root, wallMaterial, glassMaterial } = buildLevel()
    for (let i = 0; i < 10; i += 1) applyLevelDisplay(root, 'below')
    applyLevelDisplay(root, 'current')

    expect(wallMaterial.transparent).toBe(false)
    expect(wallMaterial.opacity).toBe(1)
    expect(glassMaterial.opacity).toBeCloseTo(0.35, 10)
  })

  it('灰显期间材质被整个换掉（GeometrySystem 重建）→ 下一帧照样把新材质灰掉', () => {
    const { root, wall } = buildLevel()
    applyLevelDisplay(root, 'below')

    const rebuilt = new THREE.MeshStandardMaterial({ color: '#e8e8e8' })
    wall.material = rebuilt
    applyLevelDisplay(root, 'below')

    expect(rebuilt.transparent).toBe(true)
    expect(rebuilt.opacity).toBeCloseTo(GHOST_OPACITY, 10)
  })

  it('多材质数组也处理', () => {
    const a = new THREE.MeshStandardMaterial()
    const b = new THREE.MeshStandardMaterial()
    const root = new THREE.Group()
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), [a, b]))

    applyLevelDisplay(root, 'below')

    expect(a.transparent && b.transparent).toBe(true)
  })

  it('灰显的层仍然点得到（批 H 假设下层可编辑）', () => {
    const { root } = buildLevel()
    applyLevelDisplay(root, 'below')
    expect(hits(root).length).toBeGreaterThan(0)
  })
})

describe('applyLevelDisplay · 还原', () => {
  it('below → current：三个属性回到原值，备份删掉，version 再 +1', () => {
    const { root, wallMaterial } = buildLevel()
    applyLevelDisplay(root, 'below')
    const ghosted = wallMaterial.version

    applyLevelDisplay(root, 'current')

    expect(wallMaterial.transparent).toBe(false)
    expect(wallMaterial.opacity).toBe(1)
    expect(wallMaterial.depthWrite).toBe(true)
    expect(wallMaterial.userData).not.toHaveProperty('__levelGhost')
    expect(wallMaterial.version).toBe(ghosted + 1)
  })

  it('玻璃还原回 0.35、仍然透明 —— 不是被「还原」成不透明', () => {
    const { root, glassMaterial } = buildLevel()
    applyLevelDisplay(root, 'below')
    applyLevelDisplay(root, 'current')

    expect(glassMaterial.transparent).toBe(true)
    expect(glassMaterial.opacity).toBeCloseTo(0.35, 10)
  })

  it('从没灰过的材质，current 什么都不做（version 不动）', () => {
    const { root, wallMaterial } = buildLevel()
    const before = wallMaterial.version
    applyLevelDisplay(root, 'current')
    expect(wallMaterial.version).toBe(before)
  })
})

describe('applyLevelDisplay · 隐藏', () => {
  it('对照组：只设 visible = false，射线照样打中 —— 这就是为什么要用图层', () => {
    const { root } = buildLevel()
    root.visible = false
    root.traverse((o) => { o.visible = false })

    expect(hits(root).length).toBeGreaterThan(0)
  })

  it('above → 整棵子树（含嵌套两层的窗）都搬到隐藏图层', () => {
    const { root, wall, glass } = buildLevel()
    applyLevelDisplay(root, 'above')

    for (const o of [root, wall, glass]) {
      expect(o.layers.isEnabled(HIDDEN_LEVEL_LAYER)).toBe(true)
      expect(o.layers.isEnabled(0)).toBe(false)
    }
  })

  it('above → 射线打不中（看不见的上层不再挡鼠标）', () => {
    const { root } = buildLevel()
    expect(hits(root).length).toBeGreaterThan(0)

    applyLevelDisplay(root, 'above')

    expect(hits(root)).toHaveLength(0)
  })

  it('above → current：回到图层 0，又打得中', () => {
    const { root } = buildLevel()
    applyLevelDisplay(root, 'above')
    applyLevelDisplay(root, 'current')

    expect(hits(root).length).toBeGreaterThan(0)
  })

  it('below → above：隐藏时顺手把灰显还原，之后再切回 current 不留脏状态', () => {
    const { root, wallMaterial } = buildLevel()
    applyLevelDisplay(root, 'below')
    applyLevelDisplay(root, 'above')

    expect(wallMaterial.transparent).toBe(false)
    expect(wallMaterial.userData).not.toHaveProperty('__levelGhost')
  })
})