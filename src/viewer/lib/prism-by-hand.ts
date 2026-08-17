import * as THREE from 'three'
import type { Point2D } from '../../core/lib/geometry-2d';

function signedArea(fp: Point2D[]): number {
    let s = 0
    for (let i=0; i<fp.length;i++) {
        const a = fp[i]!
        const b = fp[(i+1) % fp.length]!
        s += a.x * b.y - b.x * a.y
    }
    return s / 2
}

const toClockwise = (fp: Point2D[]): Point2D[] =>
    signedArea(fp) > 0 ? [...fp].reverse() : fp

// Version A
export function buildPrismNaive(footprint: Point2D[], height: number):
THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()
    if (footprint.length < 3) return geometry

    const fp = toClockwise(footprint)
    const n = fp.length
    const halfH = height / 2

    const positions: number[] = []
    for (const p of fp) positions.push(p.x, -halfH, p.y)
    for (const p of fp) positions.push(p.x, halfH, p.y)

    const indices: number[] = []

    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n
        indices.push(i, j, n+j, i, n+j, n+i)
    }

    for (let i = 1; i < n - 1; i++) indices.push(n, n+i, n+i+1)
    
    for (let i = 1; i < n - 1; i++) indices.push(0, i+1, i)
    
    geometry.setAttribute('positions', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)

    //geometry.computeVertexNormals()
    
    return geometry
}

//export function buildPrismByHand(footprint: Point2D[], height: number):