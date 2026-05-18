import React, { useEffect, useMemo, useRef, useState } from 'react'

const CLASSIC_MODULE_GLB_URL = '/modules/classic/style2/open.glb'

type LngLat = { lng: number, lat: number }
type Pt = { x: number, y: number }
type Bounds = { minX: number, maxX: number, minY: number, maxY: number }
type ModuleSpec = { id: 'm1' | 'm2' | 'm3', name: string, wFt: number, hFt: number }
type ModuleResult = { id: ModuleSpec['id'], name: string, wFt: number, hFt: number, ok: boolean, angleDeg?: number, center?: LngLat }
type ModulePose = { cx: number, cy: number, angleDeg: number }
type ThreeState = {
  THREE: typeof import('three'),
  renderer: import('three').WebGLRenderer,
  scene: import('three').Scene,
  camera: import('three').PerspectiveCamera,
  controls: any,
  cameraLight: import('three').PointLight | null,
  parcelMesh: import('three').Mesh | null,
  roadGroup: import('three').Group | null,
  dimGroup: import('three').Group | null,
  dimLabelMeta: Array<{ sprite: import('three').Sprite, a: import('three').Vector3, b: import('three').Vector3 }>,
  buildingGroup: import('three').Group | null,
  moduleGroup: import('three').Group | null,
  moduleOutline: import('three').Line | null,
  originM: { x: number, y: number } | null,
  baseModule: import('three').Object3D | null
}

function toMeters(ft: number) { return ft * 0.3048 }

function lngLatToMercatorMeters(lng: number, lat: number) {
  const R = 6378137
  const x = R * (lng * Math.PI / 180)
  const y = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2))
  return { x, y }
}

function ringBounds(ring: Pt[]): Bounds {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of ring) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { minX, maxX, minY, maxY }
}

function polygonSegmentsWrap(poly: Pt[]) {
  const segs: Array<{ a: Pt, b: Pt }> = []
  for (let i = 0; i < poly.length; i++) {
    segs.push({ a: poly[i], b: poly[(i + 1) % poly.length] })
  }
  return segs
}

function cross2(ax: number, ay: number, bx: number, by: number) { return ax * by - ay * bx }

function segIntersect(a1: Pt, a2: Pt, b1: Pt, b2: Pt) {
  const ax = a2.x - a1.x, ay = a2.y - a1.y
  const bx = b2.x - b1.x, by = b2.y - b1.y
  const cx = b1.x - a1.x, cy = b1.y - a1.y
  const d = cross2(ax, ay, bx, by)
  const t = cross2(cx, cy, bx, by)
  const u = cross2(cx, cy, ax, ay)
  const eps = 1e-12
  if (Math.abs(d) < eps) return false
  const tt = t / d
  const uu = u / d
  return tt > -eps && tt < 1 + eps && uu > -eps && uu < 1 + eps
}

function pointInPolygon(p: Pt, poly: Pt[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    const intersect = ((a.y > p.y) !== (b.y > p.y)) && (p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y + 1e-20) + a.x)
    if (intersect) inside = !inside
  }
  return inside
}

function polyIntersects(a: Pt[], b: Pt[]) {
  const sa = polygonSegmentsWrap(a)
  const sb = polygonSegmentsWrap(b)
  for (const ea of sa) for (const eb of sb) if (segIntersect(ea.a, ea.b, eb.a, eb.b)) return true
  if (pointInPolygon(a[0], b)) return true
  if (pointInPolygon(b[0], a)) return true
  return false
}

function rectInsidePolygon(rect: Pt[], poly: Pt[]) {
  for (const p of rect) if (!pointInPolygon(p, poly)) return false
  const rp = polygonSegmentsWrap(rect)
  const pp = polygonSegmentsWrap(poly)
  for (const e1 of rp) for (const e2 of pp) if (segIntersect(e1.a, e1.b, e2.a, e2.b)) return false
  return true
}

function pointSegDist(p: Pt, a: Pt, b: Pt) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const l2 = dx * dx + dy * dy
  let t = 0
  if (l2 > 1e-12) t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2
  t = Math.max(0, Math.min(1, t))
  const px = a.x + dx * t
  const py = a.y + dy * t
  return Math.hypot(p.x - px, p.y - py)
}

function rectanglePoly(cx: number, cy: number, wM: number, hM: number, ang: number) {
  const hw = wM / 2
  const hh = hM / 2
  const c = Math.cos(ang)
  const s = Math.sin(ang)
  const pts = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh }
  ]
  return pts.map(p => ({ x: cx + p.x * c - p.y * s, y: cy + p.x * s + p.y * c }))
}

function validateModulePose(pose: ModulePose, wFt: number, hFt: number, parcelRingM: Pt[], buildingsPolysM: Pt[][]) {
  const wM = toMeters(wFt)
  const hM = toMeters(hFt)
  const ang = (pose.angleDeg * Math.PI) / 180
  const rect = rectanglePoly(pose.cx, pose.cy, wM, hM, ang)
  if (!rectInsidePolygon(rect, parcelRingM)) return false
  for (const bp of buildingsPolysM) {
    if (bp.length >= 3 && polyIntersects(rect, bp)) return false
  }

  const boundaryMarginM = toMeters(0.5)
  const polySegs = polygonSegmentsWrap(parcelRingM)
  const samples: Pt[] = [
    rect[0], rect[1], rect[2], rect[3],
    { x: (rect[0].x + rect[1].x) / 2, y: (rect[0].y + rect[1].y) / 2 },
    { x: (rect[1].x + rect[2].x) / 2, y: (rect[1].y + rect[2].y) / 2 },
    { x: (rect[2].x + rect[3].x) / 2, y: (rect[2].y + rect[3].y) / 2 },
    { x: (rect[3].x + rect[0].x) / 2, y: (rect[3].y + rect[0].y) / 2 }
  ]
  let minEdgeDist = Infinity
  for (const p of samples) {
    for (const s of polySegs) minEdgeDist = Math.min(minEdgeDist, pointSegDist(p, s.a, s.b))
  }
  if (minEdgeDist < boundaryMarginM - 1e-6) return false
  return true
}

function applyRhinoLook(THREE: any, root: any) {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.96, metalness: 0, side: THREE.DoubleSide })
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.98, metalness: 0, side: THREE.DoubleSide })
  const scratchBox = new THREE.Box3()
  const scratchSize = new THREE.Vector3()

  root.traverse((obj: any) => {
    if (!obj?.isMesh) return
    const mat = obj.material
    const mats = Array.isArray(mat) ? mat : [mat]
    const shouldSkip = mats.some((m: any) => {
      if (!m) return false
      if (m.transparent && (m.opacity ?? 1) < 0.98) return true
      if (typeof m.transmission === 'number' && m.transmission > 0) return true
      return false
    })
    if (shouldSkip) return

    scratchBox.setFromObject(obj)
    scratchBox.getSize(scratchSize)
    const dims = [scratchSize.x, scratchSize.y, scratchSize.z].sort((a: number, b: number) => a - b)
    const minD = dims[0]
    const midD = dims[1]
    const maxD = dims[2]
    if (!(maxD > 1.4 && midD > 0.6 && minD < 0.8)) return

    const isFloorLike = scratchSize.y < 0.55 && (scratchSize.x * scratchSize.z) > 4
    const isWallLike = scratchSize.y >= Math.max(scratchSize.x, scratchSize.z) && scratchSize.y > 1.6 && Math.min(scratchSize.x, scratchSize.z) < 0.9
    if (!isFloorLike && !isWallLike) return
    obj.material = isFloorLike ? floorMat : wallMat
  })
}

function parseParcelFirstRingMercator(parcelGeoJson: any) {
  const geom = (() => {
    if (!parcelGeoJson) return null
    if (parcelGeoJson.type === 'Feature') return parcelGeoJson.geometry
    if (parcelGeoJson.type === 'FeatureCollection') return parcelGeoJson.features?.[0]?.geometry ?? null
    if (parcelGeoJson.type && parcelGeoJson.coordinates) return parcelGeoJson
    return null
  })()
  if (!geom) return null
  if (geom.type === 'Polygon') {
    const ring = geom.coordinates?.[0]
    if (!Array.isArray(ring)) return null
    return ring.map((p: any) => {
      const ll = Array.isArray(p) ? { lng: Number(p[0]), lat: Number(p[1]) } : { lng: Number(p.lng), lat: Number(p.lat) }
      const m = lngLatToMercatorMeters(ll.lng, ll.lat)
      return { x: m.x, y: m.y }
    })
  }
  if (geom.type === 'MultiPolygon') {
    const ring = geom.coordinates?.[0]?.[0]
    if (!Array.isArray(ring)) return null
    return ring.map((p: any) => {
      const ll = Array.isArray(p) ? { lng: Number(p[0]), lat: Number(p[1]) } : { lng: Number(p.lng), lat: Number(p.lat) }
      const m = lngLatToMercatorMeters(ll.lng, ll.lat)
      return { x: m.x, y: m.y }
    })
  }
  return null
}

function parseBuildingPolysMercator(buildingsGeoJson: any) {
  if (!buildingsGeoJson) return []
  const feats: any[] = buildingsGeoJson.type === 'FeatureCollection'
    ? (Array.isArray(buildingsGeoJson.features) ? buildingsGeoJson.features : [])
    : buildingsGeoJson.type === 'Feature'
      ? [buildingsGeoJson]
      : []

  const out: Pt[][] = []
  for (const f of feats) {
    const g = f?.geometry
    if (!g) continue
    const addRing = (ring: any) => {
      if (!Array.isArray(ring) || ring.length < 3) return
      out.push(ring.map((p: any) => {
        const ll = Array.isArray(p) ? { lng: Number(p[0]), lat: Number(p[1]) } : { lng: Number(p.lng), lat: Number(p.lat) }
        const m = lngLatToMercatorMeters(ll.lng, ll.lat)
        return { x: m.x, y: m.y }
      }))
    }
    if (g.type === 'Polygon') addRing(g.coordinates?.[0])
    if (g.type === 'MultiPolygon') addRing(g.coordinates?.[0]?.[0])
  }
  return out
}

function haversineMeters(a: { lng: number, lat: number }, b: { lng: number, lat: number }) {
  const R = 6371008.8
  const phi1 = a.lat * Math.PI / 180
  const phi2 = b.lat * Math.PI / 180
  const dphi = (b.lat - a.lat) * Math.PI / 180
  const dl = (b.lng - a.lng) * Math.PI / 180
  const s = Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dl / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

function parseParcelFirstRingLngLat(parcelGeoJson: any): LngLat[] | null {
  const geom = (() => {
    if (!parcelGeoJson) return null
    if (parcelGeoJson.type === 'Feature') return parcelGeoJson.geometry
    if (parcelGeoJson.type === 'FeatureCollection') return parcelGeoJson.features?.[0]?.geometry ?? null
    if (parcelGeoJson.type && parcelGeoJson.coordinates) return parcelGeoJson
    return null
  })()
  if (!geom) return null
  const toRing = (ring: any) => {
    if (!Array.isArray(ring)) return null
    return ring.map((p: any) => {
      if (Array.isArray(p)) return { lng: Number(p[0]), lat: Number(p[1]) }
      return { lng: Number(p.lng), lat: Number(p.lat) }
    })
  }
  if (geom.type === 'Polygon') return toRing(geom.coordinates?.[0])
  if (geom.type === 'MultiPolygon') return toRing(geom.coordinates?.[0]?.[0])
  return null
}

function normalizeRingLngLat(ring: LngLat[]) {
  if (ring.length < 2) return ring
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (Math.abs(first.lng - last.lng) < 1e-12 && Math.abs(first.lat - last.lat) < 1e-12) return ring.slice(0, -1)
  return ring
}

async function pickRoadAdjacencyFromOverpass(parcelGeoJson: any, signal: AbortSignal) {
  const ring0 = parseParcelFirstRingLngLat(parcelGeoJson)
  if (!ring0 || ring0.length < 3) return null
  const ring = normalizeRingLngLat(ring0)
  if (ring.length < 3) return null

  let minLng = ring[0].lng, maxLng = ring[0].lng, minLat = ring[0].lat, maxLat = ring[0].lat
  for (const p of ring) {
    minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng)
    minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat)
  }
  const pad = Math.max(0.0008, Math.max(maxLat - minLat, maxLng - minLng) * 0.35)
  const bbox = { minLng: minLng - pad, minLat: minLat - pad, maxLng: maxLng + pad, maxLat: maxLat + pad }

  const q = `[out:json][timeout:12];(way["highway"]["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service)$"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}););out geom;`
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.nchc.org.tw/api/interpreter'
  ]

  let data: any = null
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: `data=${encodeURIComponent(q)}`,
        signal
      })
      if (!res.ok) continue
      data = await res.json()
      break
    } catch (e: any) {
      if (e?.name === 'AbortError') return null
    }
  }
  if (!data?.elements?.length) return null

  const ringM = ring.map(p => lngLatToMercatorMeters(p.lng, p.lat))
  if (ringM.length < 3) return null

  const roadSegs: Array<{ a: Pt, b: Pt }> = []
  for (const el of data.elements) {
    if (el?.type !== 'way') continue
    const geom = el?.geometry
    if (!Array.isArray(geom) || geom.length < 2) continue
    const pts = geom.map((p: any) => lngLatToMercatorMeters(p.lon, p.lat))
    for (let i = 0; i < pts.length - 1; i++) roadSegs.push({ a: pts[i], b: pts[i + 1] })
  }
  if (!roadSegs.length) return null

  const segSegDist = (a1: Pt, a2: Pt, b1: Pt, b2: Pt) => {
    if (segIntersect(a1, a2, b1, b2)) return 0
    return Math.min(
      pointSegDist(a1, b1, b2),
      pointSegDist(a2, b1, b2),
      pointSegDist(b1, a1, a2),
      pointSegDist(b2, a1, a2)
    )
  }

  const edgeMinDistAnyM = Array.from({ length: ringM.length }, () => Infinity)
  const edgeMinDistParallelM = Array.from({ length: ringM.length }, () => Infinity)
  const edgeDir = (a: Pt, b: Pt) => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.max(1e-9, Math.hypot(dx, dy))
    return { x: dx / len, y: dy / len }
  }
  const inwardNormal = (a: Pt, b: Pt) => {
    const ex = b.x - a.x
    const ey = b.y - a.y
    const len = Math.max(1e-9, Math.hypot(ex, ey))
    const n1 = { x: -ey / len, y: ex / len }
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    const t1 = { x: mid.x + n1.x * 1.0, y: mid.y + n1.y * 1.0 }
    if (pointInPolygon(t1, ringM)) return n1
    return { x: -n1.x, y: -n1.y }
  }
  const angleDiffAbs = (u: { x: number, y: number }, v: { x: number, y: number }) => {
    const dot = Math.max(-1, Math.min(1, Math.abs(u.x * v.x + u.y * v.y)))
    return Math.acos(dot)
  }
  const roadDirs = roadSegs.map(s => edgeDir(s.a, s.b))
  const edgeDirs = ringM.map((_, i) => edgeDir(ringM[i], ringM[(i + 1) % ringM.length]))
  const parallelTol = (25 * Math.PI) / 180

  for (let i = 0; i < ringM.length; i++) {
    const a = ringM[i]
    const b = ringM[(i + 1) % ringM.length]
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    const nIn = inwardNormal(a, b)
    const nOut = { x: -nIn.x, y: -nIn.y }
    let minD = Infinity
    let minParallelD = Infinity
    for (let j = 0; j < roadSegs.length; j++) {
      const rs = roadSegs[j]
      const roadMid = { x: (rs.a.x + rs.b.x) / 2, y: (rs.a.y + rs.b.y) / 2 }
      if (pointInPolygon(roadMid, ringM)) continue
      const side = (roadMid.x - mid.x) * nOut.x + (roadMid.y - mid.y) * nOut.y
      if (side <= 0) continue
      const d = segSegDist(a, b, rs.a, rs.b)
      if (d < minD) minD = d
      if (angleDiffAbs(edgeDirs[i], roadDirs[j]) <= parallelTol) {
        if (d < minParallelD) minParallelD = d
      }
    }
    edgeMinDistAnyM[i] = minD
    edgeMinDistParallelM[i] = minParallelD
  }

  const thresholdM = 10
  const toleranceM = 1.8
  const finiteParallel = edgeMinDistParallelM.filter(d => isFinite(d))
  const roadEdgeIdx: number[] = []
  if (finiteParallel.length) {
    const minP = Math.min(...finiteParallel)
    const cut = Math.min(thresholdM, Math.min(8, minP + toleranceM))
    for (let i = 0; i < edgeMinDistParallelM.length; i++) {
      const d = edgeMinDistParallelM[i]
      if (isFinite(d) && d <= cut) roadEdgeIdx.push(i)
    }
  } else {
    const finiteAny = edgeMinDistAnyM.filter(d => isFinite(d))
    const minA = finiteAny.length ? Math.min(...finiteAny) : Infinity
    const cut = Math.min(8, minA + toleranceM)
    for (let i = 0; i < edgeMinDistAnyM.length; i++) {
      const d = edgeMinDistAnyM[i]
      if (isFinite(d) && d <= cut) roadEdgeIdx.push(i)
    }
  }

  return { roadEdgeIdx }
}

function buildRoadFrontGroup(THREE: typeof import('three'), ringM: Pt[], originM: { x: number, y: number }, roadEdgeIdx: number[]) {
  const group = new THREE.Group()
  const bandW = toMeters(10)
  const mat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false, depthTest: false })

  const toLocal2 = (p: Pt) => ({ x: p.x - originM.x, y: -(p.y - originM.y) })
  const unitInwardNormal = (a: Pt, b: Pt) => {
    const ex = b.x - a.x
    const ey = b.y - a.y
    const len = Math.max(1e-9, Math.hypot(ex, ey))
    const n1 = { x: -ey / len, y: ex / len }
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    const t1 = { x: mid.x + n1.x * 1.0, y: mid.y + n1.y * 1.0 }
    if (pointInPolygon(t1, ringM)) return n1
    return { x: -n1.x, y: -n1.y }
  }

  for (const idx of roadEdgeIdx) {
    const a = ringM[idx]
    const b = ringM[(idx + 1) % ringM.length]
    const n = unitInwardNormal(a, b)
    const a2 = { x: a.x + n.x * bandW, y: a.y + n.y * bandW }
    const b2 = { x: b.x + n.x * bandW, y: b.y + n.y * bandW }
    const shape = new THREE.Shape([
      new THREE.Vector2(toLocal2(a).x, toLocal2(a).y),
      new THREE.Vector2(toLocal2(b).x, toLocal2(b).y),
      new THREE.Vector2(toLocal2(b2).x, toLocal2(b2).y),
      new THREE.Vector2(toLocal2(a2).x, toLocal2(a2).y)
    ])
    const geo = new THREE.ShapeGeometry(shape)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotateX(-Math.PI / 2)
    mesh.position.y = 0.08
    mesh.renderOrder = 5
    group.add(mesh)
  }
  return group
}

function buildParcelDimensionGroup(
  THREE: typeof import('three'),
  ringLL: LngLat[],
  ringM: Pt[],
  originM: { x: number, y: number }
) {
  const ringNoCloseLL = normalizeRingLngLat(ringLL)
  const ringNoCloseM = (() => {
    if (ringM.length < 2) return ringM
    const a = ringM[0]
    const b = ringM[ringM.length - 1]
    if (Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9) return ringM.slice(0, -1)
    return ringM
  })()

  if (ringNoCloseLL.length < 3 || ringNoCloseM.length < 3) {
    return { group: new THREE.Group(), labels: [] as string[], meta: [] as Array<{ sprite: import('three').Sprite, a: import('three').Vector3, b: import('three').Vector3 }> }
  }

  const ptsM = ringNoCloseM
  const segs = Array.from({ length: ptsM.length }, (_, i) => {
    const a = ptsM[i]
    const b = ptsM[(i + 1) % ptsM.length]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    return { i, a, b, dx, dy, len, lenFt: len / 0.3048 }
  })

  const angBetween = (ax: number, ay: number, bx: number, by: number) => {
    const al = Math.max(1e-9, Math.hypot(ax, ay))
    const bl = Math.max(1e-9, Math.hypot(bx, by))
    const dot = (ax * bx + ay * by) / (al * bl)
    return Math.acos(Math.max(-1, Math.min(1, dot)))
  }

  const edgeDir = (a: Pt, b: Pt) => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.max(1e-9, Math.hypot(dx, dy))
    return { x: dx / len, y: dy / len }
  }

  const collinearTol = (20 * Math.PI) / 180
  const chamferTol = (18 * Math.PI) / 180
  const minTurnSegFt = 10

  const skip = new Array<boolean>(segs.length).fill(false)
  for (let i = 0; i < segs.length; i++) {
    if (segs[i].lenFt >= minTurnSegFt) continue
    const p = segs[(i - 1 + segs.length) % segs.length]
    const n = segs[(i + 1) % segs.length]
    const turn = angBetween(p.dx, p.dy, n.dx, n.dy)
    if (turn >= chamferTol) skip[i] = true
  }

  type Group = { startIdx: number, endIdx: number, totalM: number, segIdx: number[], dirX: number, dirY: number }
  const groups: Group[] = []
  let cur: Group | null = null
  for (let k = 0; k < segs.length; k++) {
    if (segs[k].len < 1e-6) continue
    if (skip[k]) continue
    if (!cur) {
      const d = edgeDir(segs[k].a, segs[k].b)
      cur = { startIdx: k, endIdx: k, totalM: segs[k].len, segIdx: [k], dirX: d.x, dirY: d.y }
      continue
    }
    const ang = angBetween(cur.dirX, cur.dirY, segs[k].dx, segs[k].dy)
    if (ang <= collinearTol) {
      cur.endIdx = k
      const nextTotal = cur.totalM + segs[k].len
      cur.segIdx.push(k)
      const d = edgeDir(segs[k].a, segs[k].b)
      const mx = cur.dirX * cur.totalM + d.x * segs[k].len
      const my = cur.dirY * cur.totalM + d.y * segs[k].len
      const ml = Math.max(1e-9, Math.hypot(mx, my))
      cur.dirX = mx / ml
      cur.dirY = my / ml
      cur.totalM = nextTotal
    } else {
      groups.push(cur)
      const d = edgeDir(segs[k].a, segs[k].b)
      cur = { startIdx: k, endIdx: k, totalM: segs[k].len, segIdx: [k], dirX: d.x, dirY: d.y }
    }
  }
  if (cur) groups.push(cur)

  const pickMidpoint = (g: Group) => {
    const half = g.totalM / 2
    let acc = 0
    for (const idx of g.segIdx) {
      const s = segs[idx]
      if (acc + s.len >= half) {
        const t = (half - acc) / Math.max(1e-9, s.len)
        return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t }
      }
      acc += s.len
    }
    const last = segs[g.segIdx[g.segIdx.length - 1]]
    return { x: (last.a.x + last.b.x) / 2, y: (last.a.y + last.b.y) / 2 }
  }

  const makeLabelCanvas = (text: string) => {
    const canvas = document.createElement('canvas')
    const dpr = Math.min(2, (window as any).devicePixelRatio || 1)
    const fontPx = 12
    const r = 5
    const padX = 6
    const padY = 4
    const ctx = canvas.getContext('2d')!
    ctx.font = `${fontPx}px sans-serif`
    const tw = Math.ceil(ctx.measureText(text).width)
    const w = tw + padX * 2
    const h = fontPx + padY * 2
    canvas.width = Math.max(1, Math.round(w * dpr))
    canvas.height = Math.max(1, Math.round(h * dpr))
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    const tx = w / 2
    const ty = h / 2
    const bw = w
    const bh = h
    ctx.beginPath()
    ctx.moveTo(tx - bw / 2 + r, ty - bh / 2)
    ctx.lineTo(tx + bw / 2 - r, ty - bh / 2)
    ctx.quadraticCurveTo(tx + bw / 2, ty - bh / 2, tx + bw / 2, ty - bh / 2 + r)
    ctx.lineTo(tx + bw / 2, ty + bh / 2 - r)
    ctx.quadraticCurveTo(tx + bw / 2, ty + bh / 2, tx + bw / 2 - r, ty + bh / 2)
    ctx.lineTo(tx - bw / 2 + r, ty + bh / 2)
    ctx.quadraticCurveTo(tx - bw / 2, ty + bh / 2, tx - bw / 2, ty + bh / 2 - r)
    ctx.lineTo(tx - bw / 2, ty - bh / 2 + r)
    ctx.quadraticCurveTo(tx - bw / 2, ty - bh / 2, tx - bw / 2 + r, ty - bh / 2)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255,255,255,0.96)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'
    ctx.stroke()
    ctx.fillStyle = '#111'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.font = `${fontPx}px sans-serif`
    ctx.fillText(text, tx, ty + 0.5)
    return { canvas, w, h }
  }

  const inwardNormal = (a: Pt, b: Pt) => {
    const ex = b.x - a.x
    const ey = b.y - a.y
    const len = Math.max(1e-9, Math.hypot(ex, ey))
    const n1 = { x: -ey / len, y: ex / len }
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    const t1 = { x: mid.x + n1.x * 1.0, y: mid.y + n1.y * 1.0 }
    const isIn = pointInPolygon(t1, ptsM)
    return isIn ? n1 : { x: -n1.x, y: -n1.y }
  }

  const group = new THREE.Group()
  const labels: string[] = []
  const meta: Array<{ sprite: import('three').Sprite, a: import('three').Vector3, b: import('three').Vector3 }> = []
  const lineMat = new THREE.LineBasicMaterial({ color: 0x333333 })

  const offsetM = toMeters(6)
  const extOverhangM = toMeters(1)
  const arrowLenM = toMeters(3)
  const arrowHalfWidthM = toMeters(1.5) / 2
  const yLine = 0.08
  const yLabel = 0.18

  const toLocal3 = (p: Pt, y: number) => new THREE.Vector3(p.x - originM.x, y, (p.y - originM.y))

  for (const g of groups) {
    let totalFt = 0
    for (const idx of g.segIdx) {
      const p = ringNoCloseLL[idx]
      const q = ringNoCloseLL[(idx + 1) % ringNoCloseLL.length]
      totalFt += haversineMeters(p, q) / 0.3048
    }
    if (totalFt < minTurnSegFt) continue
    const text = `${Math.round(totalFt * 10) / 10} ft`
    labels.push(text)

    const midM = pickMidpoint(g)
    const aM = ptsM[g.startIdx]
    const bM = ptsM[(g.endIdx + 1) % ptsM.length]
    const nIn = inwardNormal(aM, bM)
    const nOut = { x: -nIn.x, y: -nIn.y }
    const aOf = { x: aM.x + nOut.x * offsetM, y: aM.y + nOut.y * offsetM }
    const bOf = { x: bM.x + nOut.x * offsetM, y: bM.y + nOut.y * offsetM }
    const aExt = { x: aOf.x + nOut.x * extOverhangM, y: aOf.y + nOut.y * extOverhangM }
    const bExt = { x: bOf.x + nOut.x * extOverhangM, y: bOf.y + nOut.y * extOverhangM }

    const dimPathM: Pt[] = []
    for (const idx of g.segIdx) {
      const p0 = ptsM[idx]
      const p1 = ptsM[(idx + 1) % ptsM.length]
      const o0 = { x: p0.x + nOut.x * offsetM, y: p0.y + nOut.y * offsetM }
      const o1 = { x: p1.x + nOut.x * offsetM, y: p1.y + nOut.y * offsetM }
      if (!dimPathM.length) dimPathM.push(o0)
      dimPathM.push(o1)
    }

    const dimLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(dimPathM.map(p => toLocal3(p, yLine))),
      lineMat
    )
    group.add(dimLine)
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([toLocal3(aM, yLine), toLocal3(aExt, yLine)]), lineMat))
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([toLocal3(bM, yLine), toLocal3(bExt, yLine)]), lineMat))

    const dx = bOf.x - aOf.x
    const dy = bOf.y - aOf.y
    const dLen = Math.max(1e-9, Math.hypot(dx, dy))
    const ux = dx / dLen
    const uy = dy / dLen
    const px = -uy
    const py = ux
    const addArrow = (tip: Pt, dirSign: 1 | -1) => {
      const bx = tip.x + ux * arrowLenM * dirSign
      const by = tip.y + uy * arrowLenM * dirSign
      const l = { x: bx + px * arrowHalfWidthM, y: by + py * arrowHalfWidthM }
      const r = { x: bx - px * arrowHalfWidthM, y: by - py * arrowHalfWidthM }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([toLocal3(tip, yLine), toLocal3(l, yLine)]), lineMat))
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([toLocal3(tip, yLine), toLocal3(r, yLine)]), lineMat))
    }
    addArrow(aOf, 1)
    addArrow(bOf, -1)

    const { canvas, w, h } = makeLabelCanvas(text)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
    const sprite = new THREE.Sprite(mat)
    const unit = 0.02
    sprite.scale.set(w * unit, h * unit, 1)
    const midOf = { x: (aOf.x + bOf.x) / 2, y: (aOf.y + bOf.y) / 2 }
    sprite.position.copy(toLocal3(midOf, yLabel))
    ;(sprite.material as any).rotation = 0
    group.add(sprite)
    meta.push({ sprite, a: toLocal3(aOf, yLabel), b: toLocal3(bOf, yLabel) })

    const midDot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0x333333 }))
    midDot.position.copy(toLocal3(midM, yLine))
    midDot.visible = false
    group.add(midDot)
  }

  return { group, labels, meta }
}

function pickBestModuleId(results: Array<{ id: string, wFt: number, hFt: number, ok: boolean }>) {
  let bestId: string | null = null
  let bestArea = -Infinity
  for (const r of results) {
    if (!r.ok) continue
    const area = r.wFt * r.hFt
    if (area > bestArea) { bestArea = area; bestId = r.id }
  }
  return bestId
}

function solveModulePlacement(parcelGeoJson: any, buildingsGeoJson: any) {
  const ringM = parseParcelFirstRingMercator(parcelGeoJson)
  if (!ringM || ringM.length < 3) return []
  const bounds = ringBounds(ringM)
  const buildingPolysM = parseBuildingPolysMercator(buildingsGeoJson)
  const polySegs = polygonSegmentsWrap(ringM)
  const boundaryMarginM = toMeters(4)

  const angleSteps = (() => {
    const bins = new Map<number, number>()
    const minLenM = Math.max(2, boundaryMarginM)
    for (const s of polySegs) {
      const dx = s.b.x - s.a.x
      const dy = s.b.y - s.a.y
      const len = Math.hypot(dx, dy)
      if (len < minLenM) continue
      const base = ((Math.atan2(dy, dx) % Math.PI) + Math.PI) % Math.PI
      const deg = Math.round((base * 180) / Math.PI) % 180
      bins.set(deg, (bins.get(deg) ?? 0) + len)
    }
    const ranked = Array.from(bins.entries()).sort((a, b) => b[1] - a[1]).map(x => x[0])
    const picked = ranked.slice(0, 2)
    const uniq = new Map<number, number>()
    for (const deg of picked) {
      const d0 = ((deg % 180) + 180) % 180
      const d90 = (d0 + 90) % 180
      uniq.set(d0, (d0 * Math.PI) / 180)
      uniq.set(d90, (d90 * Math.PI) / 180)
    }
    const out = Array.from(uniq.values())
    if (out.length) return out
    return [0, Math.PI / 2]
  })()

  const modules: ModuleSpec[] = [
    { id: 'm1', name: 'Classic small 2B2B (600 sqft)', wFt: 37.5, hFt: 16 },
    { id: 'm2', name: 'Single-sided external hanging (720 sqft)', wFt: 45, hFt: 16 },
    { id: 'm3', name: 'Bilateral external hanging (840 sqft)', wFt: 52.5, hFt: 16 }
  ]
  const results: ModuleResult[] = []

  for (const m of modules) {
    const wM = toMeters(m.wFt)
    const hM = toMeters(m.hFt)
    const step = Math.max(1.5, Math.min(wM, hM) / 6)
    let best: { score: number, cx: number, cy: number, ang: number } | null = null

    for (const ang of angleSteps) {
      const pad = Math.max(wM, hM) / 2 + 1
      for (let x = bounds.minX + pad; x <= bounds.maxX - pad; x += step) {
        for (let y = bounds.minY + pad; y <= bounds.maxY - pad; y += step) {
          const rect = rectanglePoly(x, y, wM, hM, ang)
          if (!rectInsidePolygon(rect, ringM)) continue
          let blocked = false
          for (const bp of buildingPolysM) {
            if (polyIntersects(rect, bp)) { blocked = true; break }
          }
          if (blocked) continue

          let minBldgDist = Infinity
          const samples = [
            rect[0], rect[1], rect[2], rect[3],
            { x: (rect[0].x + rect[1].x) / 2, y: (rect[0].y + rect[1].y) / 2 },
            { x: (rect[1].x + rect[2].x) / 2, y: (rect[1].y + rect[2].y) / 2 },
            { x: (rect[2].x + rect[3].x) / 2, y: (rect[2].y + rect[3].y) / 2 },
            { x: (rect[3].x + rect[0].x) / 2, y: (rect[3].y + rect[0].y) / 2 }
          ]

          for (const p of samples) {
            for (const bp of buildingPolysM) {
              const segs = polygonSegmentsWrap(bp)
              for (const s of segs) {
                const dx = s.b.x - s.a.x
                const dy = s.b.y - s.a.y
                const l2 = dx * dx + dy * dy
                let t = 0
                if (l2 > 1e-12) t = ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / l2
                t = Math.max(0, Math.min(1, t))
                const px = s.a.x + dx * t
                const py = s.a.y + dy * t
                minBldgDist = Math.min(minBldgDist, Math.hypot(p.x - px, p.y - py))
              }
            }
          }
          if (!isFinite(minBldgDist)) minBldgDist = 999999

          let minEdgeDist = Infinity
          for (const p of samples) {
            for (const s of polySegs) {
              const dx = s.b.x - s.a.x
              const dy = s.b.y - s.a.y
              const l2 = dx * dx + dy * dy
              let t = 0
              if (l2 > 1e-12) t = ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / l2
              t = Math.max(0, Math.min(1, t))
              const px = s.a.x + dx * t
              const py = s.a.y + dy * t
              minEdgeDist = Math.min(minEdgeDist, Math.hypot(p.x - px, p.y - py))
            }
          }
          if (minEdgeDist < boundaryMarginM - 1e-6) continue

          const score = Math.min(minBldgDist, 50)
          if (!best || score > best.score) best = { score, cx: x, cy: y, ang }
        }
      }
    }

    if (!best) {
      results.push({ ...m, ok: false })
    } else {
      const mx = best.cx
      const my = best.cy
      const ll = (() => {
        const R = 6378137
        const lng = (mx / R) * 180 / Math.PI
        const lat = (2 * Math.atan(Math.exp(my / R)) - Math.PI / 2) * 180 / Math.PI
        return { lng, lat }
      })()
      results.push({ ...m, ok: true, angleDeg: Math.round((best.ang * 180) / Math.PI), center: ll })
    }
  }

  return results
}

export default function ThreeApp() {
  const divRef = useRef<HTMLDivElement | null>(null)
  const disposeRef = useRef<(() => void) | null>(null)

  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [parcel, setParcel] = useState<any>(null)
  const [buildings, setBuildings] = useState<any>(null)
  const [moduleResults, setModuleResults] = useState<ModuleResult[]>([])
  const [selectedModuleId, setSelectedModuleId] = useState<ModuleSpec['id']>('m1')
  const [parcelDims, setParcelDims] = useState<string[]>([])
  const [roadEdgeIdx, setRoadEdgeIdx] = useState<number[]>([])
  const [editModule, setEditModule] = useState(false)
  const [poseVersion, setPoseVersion] = useState(0)
  const [walkEnabled, setWalkEnabled] = useState(false)
  const [walkSpeed, setWalkSpeed] = useState(12)
  const [rhinoLook, setRhinoLook] = useState(true)

  const threeRef = useRef<ThreeState | null>(null)
  const parcelRingMRef = useRef<Pt[] | null>(null)
  const buildingPolysMRef = useRef<Pt[][]>([])
  const roadAbortRef = useRef<AbortController | null>(null)
  const roadReqIdRef = useRef(0)
  const modulePoseByIdRef = useRef<Record<string, ModulePose>>({})
  const moduleResultsRef = useRef<ModuleResult[]>([])
  const selectedModuleIdRef = useRef<ModuleSpec['id']>(selectedModuleId)
  const editModuleRef = useRef(false)
  const walkEnabledRef = useRef(false)
  const walkKeysRef = useRef<{ w: boolean, a: boolean, s: boolean, d: boolean, shift: boolean }>({ w: false, a: false, s: false, d: false, shift: false })
  const walkYawRef = useRef(0)
  const walkPitchRef = useRef(0)
  const walkLastTsRef = useRef<number>(0)
  const walkLockedRef = useRef(false)
  const walkPrevRef = useRef(false)
  const dragRef = useRef<null | {
    kind: 'move' | 'rotate',
    id: ModuleSpec['id'],
    wFt: number,
    hFt: number,
    startPose: ModulePose,
    lastOkPose: ModulePose,
    startHit: { x: number, z: number },
    startCenter: { x: number, z: number },
    startVec?: { x: number, z: number }
  }>(null)
  const handleRef = useRef<{ move: any, rotate: any }>({ move: null, rotate: null })
  const raycasterRef = useRef<any>(null)
  const planeRef = useRef<any>(null)

  useEffect(() => { moduleResultsRef.current = moduleResults }, [moduleResults])
  useEffect(() => { selectedModuleIdRef.current = selectedModuleId }, [selectedModuleId])
  useEffect(() => { editModuleRef.current = editModule }, [editModule])
  useEffect(() => { walkEnabledRef.current = walkEnabled }, [walkEnabled])

  const search = async () => {
    if (!address) return
    setLoading(true)
    try {
      const res = await fetch(`/api/lookup`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address })
      })
      if (!res.ok) {
        let msg = `查询失败（${res.status}）`
        try {
          const body = await res.json()
          if (body?.detail) msg = body.detail
        } catch {}
        alert(msg)
        return
      }
      const data = await res.json()
      setParcel(data.SubjectParcel)
      setBuildings(data.SubjectBuildings)
    } finally {
      setLoading(false)
    }
  }

  const resultsForUi = useMemo(() => moduleResults, [moduleResults])

  useEffect(() => {
    ;(async () => {
      const THREE = await import('three')
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js')
      const div = divRef.current
      if (!div) return

      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(div.clientWidth, div.clientHeight)
      renderer.setPixelRatio(Math.min(2, (window as any).devicePixelRatio || 1))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      ;(renderer as any).physicallyCorrectLights = false
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.55
      div.innerHTML = ''
      div.appendChild(renderer.domElement)
      renderer.domElement.tabIndex = 0
      renderer.domElement.style.outline = 'none'

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0xf7f7f7)
      const pmrem = new THREE.PMREMGenerator(renderer)
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
      const camera = new THREE.PerspectiveCamera(45, div.clientWidth / div.clientHeight, 0.1, 5000)
      camera.near = 0.02
      camera.updateProjectionMatrix()
      camera.rotation.order = 'YXZ'
      camera.position.set(60, 50, 60)
      camera.lookAt(0, 0, 0)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.target.set(0, 0, 0)
      controls.maxPolarAngle = Math.PI / 2 - 0.08
      controls.minDistance = 0.05

      const dl = new THREE.DirectionalLight(0xffffff, 1.1)
      dl.position.set(50, 120, 30)
      scene.add(dl)
      scene.add(new THREE.AmbientLight(0xffffff, 0.85))
      scene.add(new THREE.HemisphereLight(0xffffff, 0x808080, 0.55))

      const cameraLight = new THREE.PointLight(0xffffff, 6.0, 0, 0)
      cameraLight.position.copy(camera.position)
      scene.add(cameraLight)

      const grid = new THREE.GridHelper(200, 40, 0xcccccc, 0xeeeeee)
      ;(grid.material as any).opacity = 0.35
      ;(grid.material as any).transparent = true
      scene.add(grid)

      let raf = 0
      const animate = () => {
        raf = requestAnimationFrame(animate)
        if (!walkEnabledRef.current) controls.update()
        const s = threeRef.current
        if (walkEnabledRef.current && s) {
          const now = performance.now()
          const last = walkLastTsRef.current || now
          const dt = Math.max(0, Math.min(0.12, (now - last) / 1000))
          walkLastTsRef.current = now

          const keys = walkKeysRef.current
          const f = (keys.w ? 1 : 0) + (keys.s ? -1 : 0)
          const r = (keys.d ? 1 : 0) + (keys.a ? -1 : 0)
          if (f !== 0 || r !== 0) {
            const yaw = walkYawRef.current
            const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
            const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
            const move = new THREE.Vector3()
            move.addScaledVector(forward, f)
            move.addScaledVector(right, r)
            if (move.lengthSq() > 1e-9) move.normalize()
            const speed = walkSpeed * (keys.shift ? 2 : 1)
            camera.position.addScaledVector(move, speed * dt)
          }
          const eye = 1.7
          camera.position.y = eye
          camera.rotation.set(walkPitchRef.current, walkYawRef.current, 0)
        }
        if (s?.cameraLight) {
          s.cameraLight.position.copy(camera.position)
        }
        if (s?.dimLabelMeta?.length) {
          for (const m of s.dimLabelMeta) {
            const a = m.a.clone().project(camera)
            const b = m.b.clone().project(camera)
            const theta = Math.atan2(b.y - a.y, b.x - a.x)
            let rot = theta
            if (rot > Math.PI / 2) rot -= Math.PI
            if (rot < -Math.PI / 2) rot += Math.PI
            ;(m.sprite.material as any).rotation = rot
          }
        }
        renderer.render(scene, camera)
      }
      animate()

      const onResize = () => {
        const w = div.clientWidth, h = div.clientHeight
        renderer.setSize(w, h)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }
      window.addEventListener('resize', onResize)

      const state: ThreeState = {
        THREE,
        renderer,
        scene,
        camera,
        controls,
        cameraLight,
        parcelMesh: null,
        roadGroup: null,
        dimGroup: null,
        dimLabelMeta: [],
        buildingGroup: null,
        moduleGroup: null,
        moduleOutline: null,
        originM: null,
        baseModule: null
      }
      threeRef.current = state
      raycasterRef.current = new THREE.Raycaster()
      planeRef.current = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.02)

      const shouldIgnoreKeys = () => {
        if (walkEnabledRef.current) return false
        const el = document.activeElement as HTMLElement | null
        if (!el) return false
        const tag = (el.tagName || '').toLowerCase()
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
        if ((el as any).isContentEditable) return true
        return false
      }

      const onKeyDown = (e: KeyboardEvent) => {
        if (!walkEnabledRef.current) return
        if (shouldIgnoreKeys()) return
        const k = e.key.toLowerCase()
        if (k === 'w') { walkKeysRef.current.w = true; e.preventDefault() }
        if (k === 'a') { walkKeysRef.current.a = true; e.preventDefault() }
        if (k === 's') { walkKeysRef.current.s = true; e.preventDefault() }
        if (k === 'd') { walkKeysRef.current.d = true; e.preventDefault() }
        if (k === 'shift') { walkKeysRef.current.shift = true; e.preventDefault() }
      }
      const onKeyUp = (e: KeyboardEvent) => {
        const k = e.key.toLowerCase()
        if (k === 'w') walkKeysRef.current.w = false
        if (k === 'a') walkKeysRef.current.a = false
        if (k === 's') walkKeysRef.current.s = false
        if (k === 'd') walkKeysRef.current.d = false
        if (k === 'shift') walkKeysRef.current.shift = false
      }

      const onPointerLockChange = () => {
        walkLockedRef.current = document.pointerLockElement === renderer.domElement
      }
      const onMouseMove = (e: MouseEvent) => {
        if (!walkEnabledRef.current) return
        if (!walkLockedRef.current) return
        const sens = 0.0022
        walkYawRef.current -= e.movementX * sens
        walkPitchRef.current -= e.movementY * sens
        const lim = Math.PI / 2 - 0.08
        if (walkPitchRef.current > lim) walkPitchRef.current = lim
        if (walkPitchRef.current < -lim) walkPitchRef.current = -lim
        e.preventDefault()
      }

      const onCanvasClick = () => {
        if (!walkEnabledRef.current) return
        if (document.pointerLockElement !== renderer.domElement) {
          try { renderer.domElement.requestPointerLock() } catch {}
        }
      }

      window.addEventListener('keydown', onKeyDown, { passive: false, capture: true })
      window.addEventListener('keyup', onKeyUp, { capture: true })
      document.addEventListener('pointerlockchange', onPointerLockChange)
      document.addEventListener('mousemove', onMouseMove, { passive: false })
      renderer.domElement.addEventListener('click', onCanvasClick)

      const getPointerNdc = (e: PointerEvent) => {
        const r = renderer.domElement.getBoundingClientRect()
        const x = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1
        const y = -(((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1)
        return new THREE.Vector2(x, y)
      }

      const pickGroundPoint = (e: PointerEvent) => {
        const rc = raycasterRef.current
        const plane = planeRef.current
        if (!rc || !plane) return null
        const ndc = getPointerNdc(e)
        rc.setFromCamera(ndc, camera)
        const p = new THREE.Vector3()
        const ok = rc.ray.intersectPlane(plane, p)
        if (!ok) return null
        return { x: p.x, z: p.z }
      }

      const pickHandle = (e: PointerEvent) => {
        const rc = raycasterRef.current
        if (!rc) return null
        const ndc = getPointerNdc(e)
        rc.setFromCamera(ndc, camera)
        const handles: any[] = []
        if (handleRef.current.move) handles.push(handleRef.current.move)
        if (handleRef.current.rotate) handles.push(handleRef.current.rotate)
        if (!handles.length) return null
        const hits = rc.intersectObjects(handles, true)
        const h = hits[0]?.object
        if (!h) return null
        let cur: any = h
        while (cur && !cur.userData?.handleKind && cur.parent) cur = cur.parent
        const kind = cur?.userData?.handleKind
        if (kind !== 'move' && kind !== 'rotate') return null
        return kind as 'move' | 'rotate'
      }

      const onPointerDown = (e: PointerEvent) => {
        if (!editModuleRef.current) return
        const kind = pickHandle(e)
        if (!kind) return
        const s = threeRef.current
        if (!s || !s.originM || !s.moduleGroup) return
        const ground = pickGroundPoint(e)
        if (!ground) return
        const id = selectedModuleIdRef.current
        const r = moduleResultsRef.current.find(x => x.id === id)
        if (!r || !r.ok) return
        const pose = modulePoseByIdRef.current[id]
        if (!pose) return
        const startCenter = { x: s.moduleGroup.position.x, z: s.moduleGroup.position.z }
        const startPose = { ...pose }
        const startHit = { ...ground }
        const lastOkPose = { ...pose }

        if (kind === 'rotate') {
          const vx = ground.x - startCenter.x
          const vz = ground.z - startCenter.z
          const vl = Math.max(1e-9, Math.hypot(vx, vz))
          dragRef.current = {
            kind,
            id,
            wFt: r.wFt,
            hFt: r.hFt,
            startPose,
            lastOkPose,
            startHit,
            startCenter,
            startVec: { x: vx / vl, z: vz / vl }
          }
        } else {
          dragRef.current = {
            kind,
            id,
            wFt: r.wFt,
            hFt: r.hFt,
            startPose,
            lastOkPose,
            startHit,
            startCenter
          }
        }

        s.controls.enabled = false
        try { renderer.domElement.setPointerCapture(e.pointerId) } catch {}
        e.preventDefault()
        e.stopPropagation()
      }

      const onPointerMove = (e: PointerEvent) => {
        const d = dragRef.current
        if (!d) return
        const s = threeRef.current
        const ringM = parcelRingMRef.current
        const bldg = buildingPolysMRef.current
        if (!s || !s.originM || !ringM) return
        const ground = pickGroundPoint(e)
        if (!ground) return

        let next: ModulePose = { ...d.lastOkPose }
        if (d.kind === 'move') {
          const dx = d.startHit.x - d.startCenter.x
          const dz = d.startHit.z - d.startCenter.z
          const cxLocal = ground.x - dx
          const czLocal = ground.z - dz
          next = { cx: s.originM.x + cxLocal, cy: s.originM.y + czLocal, angleDeg: d.startPose.angleDeg }
        } else {
          const sv = d.startVec
          if (!sv) return
          const vx = ground.x - d.startCenter.x
          const vz = ground.z - d.startCenter.z
          const vl = Math.max(1e-9, Math.hypot(vx, vz))
          const cv = { x: vx / vl, z: vz / vl }
          const cross = sv.x * cv.z - sv.z * cv.x
          const dot = sv.x * cv.x + sv.z * cv.z
          const delta = Math.atan2(cross, dot)
          next = { cx: d.startPose.cx, cy: d.startPose.cy, angleDeg: d.startPose.angleDeg + (delta * 180) / Math.PI }
        }

        if (validateModulePose(next, d.wFt, d.hFt, ringM, bldg)) {
          d.lastOkPose = next
          modulePoseByIdRef.current[d.id] = next
          setPoseVersion(v => v + 1)
        }

        e.preventDefault()
        e.stopPropagation()
      }

      const onPointerUp = (e: PointerEvent) => {
        const s = threeRef.current
        if (dragRef.current) {
          dragRef.current = null
          if (s) s.controls.enabled = true
        }
        try { renderer.domElement.releasePointerCapture(e.pointerId) } catch {}
      }

      renderer.domElement.addEventListener('pointerdown', onPointerDown, { capture: true })
      window.addEventListener('pointermove', onPointerMove, { passive: false })
      window.addEventListener('pointerup', onPointerUp)
      window.addEventListener('pointercancel', onPointerUp)

      try {
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
        const loader = new GLTFLoader()
        const gltf = await loader.loadAsync(CLASSIC_MODULE_GLB_URL)
        gltf.scene.traverse((n: any) => {
          if (!n?.isMesh) return
          const m = n.material
          if (Array.isArray(m)) {
            for (const mm of m) {
              if (!mm) continue
              mm.side = THREE.DoubleSide
              if (typeof mm.envMapIntensity === 'number') mm.envMapIntensity = Math.max(mm.envMapIntensity ?? 0, 0.9)
              if (mm.emissive && mm.emissive.isColor) {
                mm.emissive.setHex(0x111111)
                mm.emissiveIntensity = Math.max(mm.emissiveIntensity ?? 0, 0.14)
              }
            }
          } else if (m) {
            m.side = THREE.DoubleSide
            if (typeof (m as any).envMapIntensity === 'number') (m as any).envMapIntensity = Math.max((m as any).envMapIntensity ?? 0, 0.9)
            if ((m as any).emissive && (m as any).emissive.isColor) {
              ;(m as any).emissive.setHex(0x111111)
              ;(m as any).emissiveIntensity = Math.max((m as any).emissiveIntensity ?? 0, 0.14)
            }
          }
        })
        state.baseModule = gltf.scene
      } catch {
        state.baseModule = null
      }

      disposeRef.current = () => {
        cancelAnimationFrame(raf)
        renderer.domElement.removeEventListener('pointerdown', onPointerDown as any, true)
        renderer.domElement.removeEventListener('click', onCanvasClick as any)
        window.removeEventListener('pointermove', onPointerMove as any)
        window.removeEventListener('pointerup', onPointerUp as any)
        window.removeEventListener('pointercancel', onPointerUp as any)
        window.removeEventListener('keydown', onKeyDown as any)
        window.removeEventListener('keyup', onKeyUp as any)
        document.removeEventListener('pointerlockchange', onPointerLockChange as any)
        document.removeEventListener('mousemove', onMouseMove as any)
        window.removeEventListener('resize', onResize)
        try { pmrem.dispose() } catch {}
        renderer.dispose()
        div.innerHTML = ''
        threeRef.current = null
      }
    })()

    return () => {
      if (disposeRef.current) {
        disposeRef.current()
        disposeRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const s = threeRef.current
    if (!s) return
    const { THREE, scene } = s

    const clearMeshes = () => {
      if (s.parcelMesh) { scene.remove(s.parcelMesh); s.parcelMesh.geometry.dispose(); (s.parcelMesh.material as any).dispose?.(); s.parcelMesh = null }
      if (s.roadGroup) {
        scene.remove(s.roadGroup)
        s.roadGroup.traverse((obj: any) => {
          if (obj?.geometry?.dispose) obj.geometry.dispose()
          if (obj?.material?.dispose) obj.material.dispose()
        })
        s.roadGroup = null
      }
      if (s.dimGroup) {
        scene.remove(s.dimGroup)
        s.dimGroup.traverse((obj: any) => {
          if (obj?.geometry?.dispose) obj.geometry.dispose()
          if (obj?.material?.dispose) obj.material.dispose()
          if (obj?.material?.map?.dispose) obj.material.map.dispose()
          if (obj?.material?.dispose) obj.material.dispose()
        })
        s.dimGroup = null
      }
      s.dimLabelMeta = []
      if (s.buildingGroup) {
        scene.remove(s.buildingGroup)
        s.buildingGroup.traverse((obj: any) => {
          if (obj?.geometry?.dispose) obj.geometry.dispose()
          if (obj?.material?.dispose) obj.material.dispose()
        })
        s.buildingGroup = null
      }
      if (s.moduleGroup) { scene.remove(s.moduleGroup); s.moduleGroup = null }
      if (s.moduleOutline) { scene.remove(s.moduleOutline); (s.moduleOutline.geometry as any).dispose?.(); (s.moduleOutline.material as any).dispose?.(); s.moduleOutline = null }
      s.originM = null
      parcelRingMRef.current = null
      buildingPolysMRef.current = []
      modulePoseByIdRef.current = {}
      roadAbortRef.current?.abort()
      roadAbortRef.current = null
    }

    if (!parcel) {
      clearMeshes()
      setModuleResults([])
      setParcelDims([])
      setRoadEdgeIdx([])
      return
    }

    const ringM = parseParcelFirstRingMercator(parcel)
    if (!ringM || ringM.length < 3) {
      clearMeshes()
      setModuleResults([])
      setParcelDims([])
      setRoadEdgeIdx([])
      return
    }

    const ringNoCloseM = (() => {
      if (ringM.length < 2) return ringM
      const first = ringM[0]
      const last = ringM[ringM.length - 1]
      if (Math.abs(first.x - last.x) < 1e-9 && Math.abs(first.y - last.y) < 1e-9) return ringM.slice(0, -1)
      return ringM
    })()
    if (ringNoCloseM.length < 3) {
      clearMeshes()
      setModuleResults([])
      setParcelDims([])
      setRoadEdgeIdx([])
      return
    }

    clearMeshes()

    const b = ringBounds(ringNoCloseM)
    const originM = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }
    s.originM = originM

    const toLocal2 = (p: Pt) => ({ x: p.x - originM.x, y: -(p.y - originM.y) })
    const parcelShape = new THREE.Shape(ringNoCloseM.map(p => new THREE.Vector2(toLocal2(p).x, toLocal2(p).y)))
    const parcelGeo = new THREE.ShapeGeometry(parcelShape)
    const parcelMat = new THREE.MeshPhongMaterial({ color: 0x22c55e, opacity: 0.16, transparent: true, side: THREE.DoubleSide, depthWrite: false })
    const parcelMesh = new THREE.Mesh(parcelGeo, parcelMat)
    parcelMesh.rotateX(-Math.PI / 2)
    parcelMesh.position.y = 0.02
    scene.add(parcelMesh)
    s.parcelMesh = parcelMesh
    parcelRingMRef.current = ringNoCloseM

    setRoadEdgeIdx([])
    roadAbortRef.current?.abort()
    const ac = new AbortController()
    roadAbortRef.current = ac
    const reqId = ++roadReqIdRef.current
    ;(async () => {
      const adj = await pickRoadAdjacencyFromOverpass(parcel, ac.signal)
      if (reqId !== roadReqIdRef.current) return
      const idx = adj?.roadEdgeIdx ?? []
      if (idx.length) {
        setRoadEdgeIdx(idx)
        return
      }
      let bestI = -1
      let bestLen = -Infinity
      for (let i = 0; i < ringNoCloseM.length; i++) {
        const a = ringNoCloseM[i]
        const b = ringNoCloseM[(i + 1) % ringNoCloseM.length]
        const len = Math.hypot(b.x - a.x, b.y - a.y)
        if (len > bestLen) { bestLen = len; bestI = i }
      }
      setRoadEdgeIdx(bestI >= 0 ? [bestI] : [])
    })()

    const ringLL = parseParcelFirstRingLngLat(parcel)
    if (ringLL) {
      const { group, labels, meta } = buildParcelDimensionGroup(THREE, ringLL, ringNoCloseM, originM)
      scene.add(group)
      s.dimGroup = group
      s.dimLabelMeta = meta
      setParcelDims(labels)
    } else {
      s.dimLabelMeta = []
      setParcelDims([])
    }

    const buildingGroup = new THREE.Group()
    const buildingPolysM = parseBuildingPolysMercator(buildings)
    buildingPolysMRef.current = buildingPolysM
    for (const polyM of buildingPolysM) {
      const polyNoClose = (() => {
        if (polyM.length < 2) return polyM
        const first = polyM[0]
        const last = polyM[polyM.length - 1]
        if (Math.abs(first.x - last.x) < 1e-9 && Math.abs(first.y - last.y) < 1e-9) return polyM.slice(0, -1)
        return polyM
      })()
      if (polyNoClose.length < 3) continue
      const shape = new THREE.Shape(polyNoClose.map(p => new THREE.Vector2(toLocal2(p).x, toLocal2(p).y)))
      const h = 6
      const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false })
      const mat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.02, roughness: 0.95, transparent: true, opacity: 0.45, depthWrite: false })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.rotateX(-Math.PI / 2)
      mesh.position.y = 0.02
      buildingGroup.add(mesh)
    }
    scene.add(buildingGroup)
    s.buildingGroup = buildingGroup

    const results = solveModulePlacement(parcel, buildings)
    setModuleResults(results)
    const bestId = (pickBestModuleId(results) as ModuleSpec['id'] | null) ?? 'm1'
    setSelectedModuleId(bestId)
    modulePoseByIdRef.current = {}
    for (const m of results) {
      if (!m.ok || !m.center || m.angleDeg == null) continue
      const c = lngLatToMercatorMeters(m.center.lng, m.center.lat)
      modulePoseByIdRef.current[m.id] = { cx: c.x, cy: c.y, angleDeg: m.angleDeg }
    }
    setPoseVersion(v => v + 1)

    const size = Math.max(1, Math.hypot(b.maxX - b.minX, b.maxY - b.minY))
    s.controls.target.set(0, 0, 0)
    s.camera.position.set(size * 0.45, size * 0.35, size * 0.45)
    s.camera.lookAt(0, 0, 0)
  }, [parcel, buildings])

  useEffect(() => {
    const s = threeRef.current
    if (!s) return
    const ringM = parcelRingMRef.current
    if (s.roadGroup) {
      s.scene.remove(s.roadGroup)
      s.roadGroup.traverse((obj: any) => {
        if (obj?.geometry?.dispose) obj.geometry.dispose()
        if (obj?.material?.dispose) obj.material.dispose()
      })
      s.roadGroup = null
    }
    if (!roadEdgeIdx.length || !ringM || !s.originM) return
    const group = buildRoadFrontGroup(s.THREE, ringM, s.originM, roadEdgeIdx)
    s.scene.add(group)
    s.roadGroup = group
  }, [roadEdgeIdx])

  useEffect(() => {
    const s = threeRef.current
    if (!s) return
    const { THREE, scene } = s
    const ringM = parcelRingMRef.current
    if (!parcel || !s.originM || !ringM) return
    const r = moduleResults.find(x => x.id === selectedModuleId)
    if (!r || !r.ok || !r.center || r.angleDeg == null) {
      if (s.moduleGroup) { scene.remove(s.moduleGroup); s.moduleGroup = null }
      if (s.moduleOutline) { scene.remove(s.moduleOutline); (s.moduleOutline.geometry as any).dispose?.(); (s.moduleOutline.material as any).dispose?.(); s.moduleOutline = null }
      handleRef.current.move = null
      handleRef.current.rotate = null
      return
    }

    if (!modulePoseByIdRef.current[r.id]) {
      const c = lngLatToMercatorMeters(r.center.lng, r.center.lat)
      modulePoseByIdRef.current[r.id] = { cx: c.x, cy: c.y, angleDeg: r.angleDeg }
    }
    const pose = modulePoseByIdRef.current[r.id]
    const wM = toMeters(r.wFt)
    const hM = toMeters(r.hFt)
    const x = pose.cx - s.originM.x
    const z = pose.cy - s.originM.y
    const ang = (pose.angleDeg * Math.PI) / 180

    const rectLocal = rectanglePoly(pose.cx, pose.cy, wM, hM, ang).map(p => ({
      x: p.x - s.originM!.x,
      y: p.y - s.originM!.y
    }))

    if (s.moduleOutline) {
      scene.remove(s.moduleOutline)
      ;(s.moduleOutline.geometry as any).dispose?.()
      ;(s.moduleOutline.material as any).dispose?.()
      s.moduleOutline = null
    }
    {
      const pts = rectLocal.map(p => new THREE.Vector3(p.x, 0.06, p.y))
      const geo = new THREE.BufferGeometry().setFromPoints([...pts, pts[0]])
      const mat = new THREE.LineBasicMaterial({ color: 0x10b981 })
      const line = new THREE.Line(geo, mat)
      scene.add(line)
      s.moduleOutline = line
    }

    const curId = (s.moduleGroup as any)?.userData?.moduleId as string | undefined
    const curRhinoLook = (s.moduleGroup as any)?.userData?.rhinoLook as boolean | undefined
    const needsRecreate = !s.moduleGroup || curId !== r.id || curRhinoLook !== rhinoLook
    if (needsRecreate) {
      if (s.moduleGroup) { scene.remove(s.moduleGroup); s.moduleGroup = null }
      handleRef.current.move = null
      handleRef.current.rotate = null

      const group = new THREE.Group()
      ;(group as any).userData = { moduleId: r.id, rhinoLook }
      group.position.set(x, 0.02, z)
      group.rotation.y = -ang

      if (s.baseModule) {
        const obj = s.baseModule.clone(true)
        obj.traverse((n: any) => {
          if (n?.isMesh) {
            n.castShadow = false
            n.receiveShadow = false
          }
        })
        const box0 = new THREE.Box3().setFromObject(obj)
        const size0 = new THREE.Vector3()
        box0.getSize(size0)
        const sx = size0.x > 1e-6 ? wM / size0.x : 1
        const sz = size0.z > 1e-6 ? hM / size0.z : 1
        const scale = Math.min(sx, sz) * 0.98
        obj.scale.setScalar(scale)
        obj.updateMatrixWorld(true)
        const box1 = new THREE.Box3().setFromObject(obj)
        const center0 = new THREE.Vector3()
        box1.getCenter(center0)
        obj.position.x -= center0.x
        obj.position.z -= center0.z
        obj.updateMatrixWorld(true)
        const box2 = new THREE.Box3().setFromObject(obj)
        obj.position.y += -box2.min.y
        if (rhinoLook) applyRhinoLook(THREE, obj)
        group.add(obj)
      } else {
        const geo = new THREE.BoxGeometry(wM, 3, hM)
        const mat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95 })
        const box = new THREE.Mesh(geo, mat)
        box.position.y = 1.5
        group.add(box)
      }

      const handleY = 0.12
      const moveHandle = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.95, depthTest: false })
      )
      moveHandle.position.set(0, handleY, 0)
      ;(moveHandle as any).userData = { handleKind: 'move' }
      moveHandle.renderOrder = 10
      group.add(moveHandle)

      const rotateHandle = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthTest: false })
      )
      rotateHandle.position.set(0, handleY, hM / 2 + toMeters(6))
      ;(rotateHandle as any).userData = { handleKind: 'rotate' }
      rotateHandle.renderOrder = 10
      group.add(rotateHandle)

      handleRef.current.move = moveHandle
      handleRef.current.rotate = rotateHandle

      scene.add(group)
      s.moduleGroup = group
    } else if (s.moduleGroup) {
      s.moduleGroup.position.set(x, 0.02, z)
      s.moduleGroup.rotation.y = -ang
      if (handleRef.current.rotate) handleRef.current.rotate.position.z = hM / 2 + toMeters(6)
    }

    const handlesVisible = !!editModule
    if (handleRef.current.move) handleRef.current.move.visible = handlesVisible
    if (handleRef.current.rotate) handleRef.current.rotate.visible = handlesVisible
  }, [parcel, moduleResults, selectedModuleId, poseVersion, editModule, rhinoLook])

  useEffect(() => {
    const s = threeRef.current
    if (!s) return
    const prev = walkPrevRef.current
    walkPrevRef.current = walkEnabled

    if (walkEnabled && !prev) {
      setEditModule(false)
      s.controls.enabled = false
      walkKeysRef.current = { w: false, a: false, s: false, d: false, shift: false }
      walkLastTsRef.current = 0
      try { (document.activeElement as any)?.blur?.() } catch {}

      const eye = 1.7
      let center = new s.THREE.Vector3(0, eye, 0)
      let startPos = new s.THREE.Vector3(0, eye, 8)

      const id = selectedModuleIdRef.current
      const r = moduleResultsRef.current.find(x => x.id === id)
      if (r?.ok && s.moduleGroup) {
        center = s.moduleGroup.position.clone()
        center.y = eye
        const forward = new s.THREE.Vector3(0, 0, -1).applyAxisAngle(new s.THREE.Vector3(0, 1, 0), s.moduleGroup.rotation.y)
        const dist = Math.max(2.5, toMeters(r.hFt) / 2 + 2.0)
        startPos = center.clone().addScaledVector(forward, dist)
      }

      startPos.y = eye
      s.camera.position.copy(startPos)

      const dir = center.clone().sub(startPos)
      const horiz = Math.max(1e-9, Math.hypot(dir.x, dir.z))
      walkYawRef.current = Math.atan2(-dir.x, -dir.z)
      walkPitchRef.current = -Math.atan2(dir.y, horiz)
      s.camera.rotation.set(walkPitchRef.current, walkYawRef.current, 0)
    }

    if (!walkEnabled && prev) {
      s.controls.enabled = true
      walkKeysRef.current = { w: false, a: false, s: false, d: false, shift: false }
      walkLastTsRef.current = 0
      try {
        if (document.pointerLockElement === s.renderer.domElement) document.exitPointerLock()
      } catch {}
    }
  }, [walkEnabled, walkSpeed])

  return (
    <div style={{ height: '100vh' }}>
      <div style={{ position: 'absolute', zIndex: 999, top: 10, left: 10, background: 'rgba(255,255,255,.96)', padding: 10, borderRadius: 10, boxShadow: '0 10px 28px rgba(0,0,0,.12)', width: 520 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            style={{ flex: '1 1 260px', minWidth: 220, padding: '6px 8px' }}
            value={address}
            placeholder='Please enter an address and search ...'
            onChange={e => setAddress(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') search() }}
          />
          <button style={{ padding: '6px 10px' }} onClick={search} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: '#111' }}>
          {parcelDims.length ? (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Parcel:</div>
              <div style={{ color: '#444' }}>{parcelDims.join(' / ')}</div>
            </div>
          ) : null}
          {resultsForUi.length ? (
            <>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Modules:</div>
              {resultsForUi.map(m => (
                <label key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', marginBottom: 4 }}>
                  <input type="radio" name="module" checked={selectedModuleId === m.id} onChange={() => { setSelectedModuleId(m.id) }} />
                  <span style={{ lineHeight: 1.2 }}>
                    {m.name} {m.wFt}×{m.hFt}ft {m.ok ? `(OK, ${m.angleDeg}°)` : '(NOT)'}
                  </span>
                </label>
              ))}
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,.08)' }}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editModule} onChange={e => setEditModule(e.target.checked)} />
                  <span>Edit Module (drag green=Move, white=Rotate)</span>
                </label>
              </div>
              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={rhinoLook} onChange={e => setRhinoLook(e.target.checked)} />
                  <span>Rhino Look (white walls)</span>
                </label>
              </div>
              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={walkEnabled}
                    onChange={e => {
                      const next = e.target.checked
                      walkEnabledRef.current = next
                      setWalkEnabled(next)
                      if (next) setEditModule(false)
                      try { (document.activeElement as any)?.blur?.() } catch {}
                      const s = threeRef.current
                      if (next && s) {
                        try { s.renderer.domElement.focus() } catch {}
                        try { s.renderer.domElement.requestPointerLock() } catch {}
                      }
                    }}
                  />
                  <span>Walk (Eye height, WASD + Mouse)</span>
                </label>
              </div>
              {walkEnabled ? (
                <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '56px 1fr 44px', gap: 8, alignItems: 'center' }}>
                  <span>Speed</span>
                  <input type="range" min={2} max={18} step={0.5} value={walkSpeed} onChange={e => setWalkSpeed(Number(e.target.value))} />
                  <span style={{ textAlign: 'right' }}>{walkSpeed.toFixed(1)}</span>
                </div>
              ) : null}
            </>
          ) : (
            null
          )}
        </div>
      </div>
      <div ref={divRef} style={{ height: '100%' }} />
    </div>
  )
}
