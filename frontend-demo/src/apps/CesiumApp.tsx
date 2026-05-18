import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as Cesium from 'cesium'

function lngLatToMercatorMeters(lng: number, lat: number) {
  const R = 6378137
  const x = R * (lng * Math.PI / 180)
  const y = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2))
  return { x, y }
}

function mercatorMetersToLngLat(x: number, y: number) {
  const R = 6378137
  const lng = (x / R) * 180 / Math.PI
  const lat = (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * 180 / Math.PI
  return { lng, lat }
}

function dayOfYearToMmDd(dayOfYear: number) {
  const d = Math.max(1, Math.min(365, Math.round(dayOfYear)))
  const dt = new Date(Date.UTC(2001, 0, 1))
  dt.setUTCDate(dt.getUTCDate() + (d - 1))
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${mm}-${dd}`
}

function hourToHhMm(hour: number) {
  const h = Math.max(0, Math.min(24, hour))
  const totalMin = Math.round(h * 60)
  const hh = String(Math.floor((totalMin % (24 * 60)) / 60)).padStart(2, '0')
  const mm = String(totalMin % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

function todayDayOfYear365() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const doy = Math.floor((now.getTime() - start.getTime()) / 86400000) + 1
  return Math.max(1, Math.min(365, doy))
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x))
}

function smoothstep01(x: number) {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}

function computeSunDeclinationRad(dayOfYear: number) {
  const n = Math.max(1, Math.min(365, Math.round(dayOfYear)))
  const g = (2 * Math.PI * (n - 1)) / 365
  return 0.006918
    - 0.399912 * Math.cos(g)
    + 0.070257 * Math.sin(g)
    - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g)
    - 0.002697 * Math.cos(3 * g)
    + 0.00148 * Math.sin(3 * g)
}

function computeSunriseSunsetHours(latitudeRad: number, declinationRad: number) {
  const phi = latitudeRad
  const dec = declinationRad
  const cosH0 = -Math.tan(phi) * Math.tan(dec)
  if (cosH0 >= 1) return { sunrise: NaN, sunset: NaN, polar: 'night' as const }
  if (cosH0 <= -1) return { sunrise: 0, sunset: 24, polar: 'day' as const }
  const h0 = Math.acos(cosH0)
  const dayLen = (2 * Cesium.Math.toDegrees(h0)) / 15
  const sunrise = 12 - dayLen / 2
  const sunset = 12 + dayLen / 2
  return { sunrise, sunset, polar: null as ('day' | 'night' | null) }
}

function parseGlbJsonChunk(buf: ArrayBuffer) {
  const dv = new DataView(buf)
  if (dv.byteLength < 20) return null
  const magic = dv.getUint32(0, true)
  if (magic !== 0x46546c67) return null
  const jsonChunkLength = dv.getUint32(12, true)
  const jsonChunkType = dv.getUint32(16, true)
  if (jsonChunkType !== 0x4e4f534a) return null
  const jsonBytes = new Uint8Array(buf, 20, jsonChunkLength)
  const text = new TextDecoder().decode(jsonBytes)
  try { return JSON.parse(text) } catch { return null }
}

function parseGlbBinChunk(buf: ArrayBuffer) {
  const dv = new DataView(buf)
  if (dv.byteLength < 28) return null
  const jsonChunkLength = dv.getUint32(12, true)
  const binHeader = 20 + jsonChunkLength
  if (binHeader + 8 > dv.byteLength) return null
  const binLength = dv.getUint32(binHeader, true)
  const binType = dv.getUint32(binHeader + 4, true)
  if (binType !== 0x004e4942) return null
  const start = binHeader + 8
  if (start + binLength > dv.byteLength) return null
  return new Uint8Array(buf, start, binLength)
}

function readAccessorVec3(gltf: any, bin: Uint8Array, accessorIndex: number) {
  const accessors = gltf?.accessors
  const bufferViews = gltf?.bufferViews
  if (!Array.isArray(accessors) || !Array.isArray(bufferViews)) return null
  const acc = accessors[accessorIndex]
  if (!acc) return null
  const bv = bufferViews[acc.bufferView]
  if (!bv) return null
  if (acc.componentType !== 5126) return null
  if (acc.type !== 'VEC3') return null
  const byteOffset = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0)
  const byteStride = bv.byteStride ?? 12
  const count = acc.count ?? 0
  if (!count) return null
  if (byteOffset + (count - 1) * byteStride + 12 > bin.byteLength) return null
  return { byteOffset, byteStride, count }
}

function nodeLocalMatrix(node: any) {
  if (Array.isArray(node?.matrix) && node.matrix.length === 16) {
    return Cesium.Matrix4.fromArray(node.matrix)
  }
  const t = node?.translation ? new Cesium.Cartesian3(node.translation[0] ?? 0, node.translation[1] ?? 0, node.translation[2] ?? 0) : Cesium.Cartesian3.ZERO
  const s = node?.scale ? new Cesium.Cartesian3(node.scale[0] ?? 1, node.scale[1] ?? 1, node.scale[2] ?? 1) : new Cesium.Cartesian3(1, 1, 1)
  const r = node?.rotation ? new Cesium.Quaternion(node.rotation[0] ?? 0, node.rotation[1] ?? 0, node.rotation[2] ?? 0, node.rotation[3] ?? 1) : Cesium.Quaternion.IDENTITY
  return Cesium.Matrix4.fromTranslationQuaternionRotationScale(t, r, s)
}

function collectMeshNodes(gltf: any) {
  const nodes: any[] = Array.isArray(gltf?.nodes) ? gltf.nodes : []
  const scenes: any[] = Array.isArray(gltf?.scenes) ? gltf.scenes : []
  const sceneIndex = gltf?.scene ?? 0
  const rootIds: number[] = Array.isArray(scenes[sceneIndex]?.nodes) ? scenes[sceneIndex].nodes : []
  const out: Array<{ mesh: number, matrix: Cesium.Matrix4 }> = []
  const visit = (id: number, parent: Cesium.Matrix4) => {
    const n = nodes[id]
    if (!n) return
    const local = nodeLocalMatrix(n)
    const world = Cesium.Matrix4.multiply(parent, local, new Cesium.Matrix4())
    if (typeof n.mesh === 'number') out.push({ mesh: n.mesh, matrix: world })
    const kids: number[] = Array.isArray(n.children) ? n.children : []
    for (const k of kids) visit(k, world)
  }
  for (const rid of rootIds) visit(rid, Cesium.Matrix4.IDENTITY)
  return out
}

async function computeGlbFootprintBounds(glbUrl: string) {
  const resp = await fetch(glbUrl)
  if (!resp.ok) return null
  const buf = await resp.arrayBuffer()
  const gltf = parseGlbJsonChunk(buf)
  if (!gltf) return null
  const bin = parseGlbBinChunk(buf)
  if (!bin) return null

  const meshes: any[] = Array.isArray(gltf.meshes) ? gltf.meshes : []
  const meshNodes = collectMeshNodes(gltf)
  const axisFix = Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.fromRotationX(Cesium.Math.PI_OVER_TWO))

  let minZ = Infinity
  let maxZ = -Infinity
  const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength)
  for (const mn of meshNodes) {
    const m = meshes[mn.mesh]
    const prims: any[] = Array.isArray(m?.primitives) ? m.primitives : []
    for (const p of prims) {
      const ai = p?.attributes?.POSITION
      if (ai == null) continue
      const meta = readAccessorVec3(gltf, bin, ai)
      if (!meta) continue
      for (let i = 0; i < meta.count; i++) {
        const o = meta.byteOffset + i * meta.byteStride
        const x = dv.getFloat32(o, true)
        const y = dv.getFloat32(o + 4, true)
        const z = dv.getFloat32(o + 8, true)
        const v0 = Cesium.Matrix4.multiplyByPoint(mn.matrix, new Cesium.Cartesian3(x, y, z), new Cesium.Cartesian3())
        const v = Cesium.Matrix4.multiplyByPoint(axisFix, v0, new Cesium.Cartesian3())
        minZ = Math.min(minZ, v.z)
        maxZ = Math.max(maxZ, v.z)
      }
    }
  }

  if (!isFinite(minZ) || !isFinite(maxZ)) return null

  const groundBand = 0.4
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  let groundCount = 0
  for (const mn of meshNodes) {
    const m = meshes[mn.mesh]
    const prims: any[] = Array.isArray(m?.primitives) ? m.primitives : []
    for (const p of prims) {
      const ai = p?.attributes?.POSITION
      if (ai == null) continue
      const meta = readAccessorVec3(gltf, bin, ai)
      if (!meta) continue
      for (let i = 0; i < meta.count; i++) {
        const o = meta.byteOffset + i * meta.byteStride
        const x = dv.getFloat32(o, true)
        const y = dv.getFloat32(o + 4, true)
        const z = dv.getFloat32(o + 8, true)
        const v0 = Cesium.Matrix4.multiplyByPoint(mn.matrix, new Cesium.Cartesian3(x, y, z), new Cesium.Cartesian3())
        const v = Cesium.Matrix4.multiplyByPoint(axisFix, v0, new Cesium.Cartesian3())
        if (v.z > minZ + groundBand) continue
        groundCount++
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x)
        minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y)
      }
    }
  }

  if (groundCount < 200 || !isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) {
    minX = Infinity; maxX = -Infinity
    minY = Infinity; maxY = -Infinity
    for (const mn of meshNodes) {
      const m = meshes[mn.mesh]
      const prims: any[] = Array.isArray(m?.primitives) ? m.primitives : []
      for (const p of prims) {
        const ai = p?.attributes?.POSITION
        if (ai == null) continue
        const meta = readAccessorVec3(gltf, bin, ai)
        if (!meta) continue
        for (let i = 0; i < meta.count; i++) {
          const o = meta.byteOffset + i * meta.byteStride
          const x = dv.getFloat32(o, true)
          const y = dv.getFloat32(o + 4, true)
          const z = dv.getFloat32(o + 8, true)
          const v0 = Cesium.Matrix4.multiplyByPoint(mn.matrix, new Cesium.Cartesian3(x, y, z), new Cesium.Cartesian3())
          const v = Cesium.Matrix4.multiplyByPoint(axisFix, v0, new Cesium.Cartesian3())
          minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x)
          minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y)
        }
      }
    }
    if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) return null
  }

  return {
    offX: (minX + maxX) / 2,
    offY: (minY + maxY) / 2,
    offZ: minZ,
    sizeX: maxX - minX,
    sizeY: maxY - minY,
    maxZ
  }
}

const CLASSIC_TILESET_JSON_URL = '/modules/classic/style2/tileset.json'
const CLASSIC_MODULE_GLB_URL = '/modules/classic/style2/open.glb'

export default function CesiumApp() {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [moduleResults, setModuleResults] = useState<Array<{ id: string, name: string, wFt: number, hFt: number, ok: boolean, angleDeg?: number, center?: { lat: number, lng: number } }>>([])
  const [selectedModuleId, setSelectedModuleId] = useState<string>('m1')
  const [editModule, setEditModule] = useState(false)
  const [moduleAngleDeg, setModuleAngleDeg] = useState(0)
  const [moduleEditHint, setModuleEditHint] = useState<string | null>(null)
  const [pitch, setPitch] = useState(0)
  const [bearing, setBearing] = useState(0)
  const [viewerReady, setViewerReady] = useState(false)
  const [sunEnabled, setSunEnabled] = useState(true)
  const [sunIntensity, setSunIntensity] = useState(1.2)
  const [sunDayOfYear, setSunDayOfYear] = useState(() => todayDayOfYear365())
  const [sunHour, setSunHour] = useState(12)
  const [sunShadows, setSunShadows] = useState(true)
  const [sunriseSunset, setSunriseSunset] = useState<{ sunrise: number, sunset: number, polar: 'day' | 'night' | null }>({ sunrise: NaN, sunset: NaN, polar: null })
  const [sunPowerNow, setSunPowerNow] = useState(0)

  const viewerRef = useRef<Cesium.Viewer | null>(null)
  const parcelCenterRef = useRef<{ lat: number, lng: number } | null>(null)
  const parcelSourceDataRef = useRef<any>(null)
  const buildingsSourceDataRef = useRef<any>(null)
  const parcelRingMRef = useRef<Array<{ x: number, y: number }> | null>(null)
  const buildingsPolysMRef = useRef<Array<Array<{ x: number, y: number }>>>([])
  const setbackRulesRef = useRef<null | { frontFt: number, rearFt: number, sideFt: number }>(null)
  const setbackConstraintsRef = useRef<Array<{ a: { x: number, y: number }, b: { x: number, y: number }, n: { x: number, y: number }, distM: number, kind: 'front' | 'rear' | 'side' }>>([])
  const roadEdgeAbortRef = useRef<AbortController | null>(null)
  const roadEdgeReqIdRef = useRef(0)

  const parcelEntityRef = useRef<Cesium.Entity | null>(null)
  const parcelOutlineEntityRef = useRef<Cesium.Entity | null>(null)
  const buildingEntitiesRef = useRef<Cesium.Entity[]>([])
  const roadEdgeEntitiesRef = useRef<Cesium.Entity[]>([])
  const setbackLineEntitiesRef = useRef<Cesium.Entity[]>([])
  const edgeLabelEntitiesRef = useRef<Cesium.Entity[]>([])
  const edgeLabelMetaRef = useRef<Array<{ entity: Cesium.Entity, a: Cesium.Cartesian3, b: Cesium.Cartesian3, e0: Cesium.Cartesian3, e1: Cesium.Cartesian3 }>>([])
  const edgeDimLineEntitiesRef = useRef<Cesium.Entity[]>([])
  const edgeExtLineEntitiesRef = useRef<Cesium.Entity[]>([])
  const edgeArrowEntitiesRef = useRef<Cesium.Entity[]>([])
  const pendingDrawRef = useRef<null | (() => void)>(null)
  const modulePoseByIdRef = useRef<Record<string, { cx: number, cy: number, angleDeg: number }>>({})
  const moduleGeomRef = useRef<null | { polyPositions: Cesium.Cartesian3[], outlinePositions: Cesium.Cartesian3[] }>(null)
  const dragStateRef = useRef<null | { kind: 'move' | 'rotate', id: string, start: Cesium.Cartesian2, centerM: { x: number, y: number }, startPose: { cx: number, cy: number, angleDeg: number }, lastOkAngleDeg: number, wFt: number, hFt: number }>(null)
  const editModuleRef = useRef(false)
  const selectedModuleIdRef = useRef(selectedModuleId)
  const moduleTilesetRef = useRef<Cesium.Cesium3DTileset | null>(null)
  const moduleTilesetStateRef = useRef<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const moduleTilesetBaseRadiusRef = useRef<number | null>(null)
  const moduleTilesetJsonBlobUrlRef = useRef<string | null>(null)
  const moduleTilesetLocalOffsetRef = useRef<Cesium.Cartesian3 | null>(null)
  const moduleTilesetBaseDimsMRef = useRef<{ x: number, y: number } | null>(null)
  const moduleTilesetMaxZRef = useRef<number | null>(null)
  const moduleTilesetAxisFixRef = useRef<Cesium.Matrix4 | null>(null)
  const moduleTilesetBaseModelRef = useRef<Cesium.Matrix4 | null>(null)
  const moduleTilesetLastGroundFixRef = useRef<number>(0)
  const moduleTilesetAnchorPosRef = useRef<Cesium.Cartesian3 | null>(null)
  const moduleTilesetLocalRef = useRef<Cesium.Matrix4 | null>(null)
  const moduleTilesetEnuRef = useRef<Cesium.Matrix4 | null>(null)
  const moduleTilesetGroundOffsetUpMRef = useRef<number>(0)
  const moduleEdgeLabelEntitiesRef = useRef<Cesium.Entity[]>([])
  const moduleMoveHandleEntityRef = useRef<Cesium.Entity | null>(null)
  const moduleRotateHandleEntityRef = useRef<Cesium.Entity | null>(null)
  const handlerRef = useRef<Cesium.ScreenSpaceEventHandler | null>(null)
  const cameraMovingRef = useRef(false)
  const rightDragCameraRef = useRef<null | { start: Cesium.Cartesian2, target: Cesium.Cartesian3 | null, range: number, startHeading: number, startPitch: number }>(null)
  const savedCamCtrlRef = useRef<null | { rotate: boolean, translate: boolean, zoom: boolean, tilt: boolean, look: boolean }>(null)
  const moduleRenderRafRef = useRef(0)
  const pendingModuleRenderRef = useRef<any>(null)

  useEffect(() => { selectedModuleIdRef.current = selectedModuleId }, [selectedModuleId])

  useEffect(() => { editModuleRef.current = editModule }, [editModule])

  useEffect(() => {
    const viewer = new Cesium.Viewer('map', {
      animation: false,
      timeline: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      baseLayerPicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      shouldAnimate: false
    })

    viewer.imageryLayers.removeAll()
    viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
      url: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      maximumLevel: 20,
      credit: '© OpenStreetMap contributors © CARTO'
    }))

    viewer.scene.globe.enableLighting = false
    viewer.scene.globe.depthTestAgainstTerrain = true
    viewer.scene.screenSpaceCameraController.enableTilt = true
    viewer.scene.screenSpaceCameraController.enableLook = true
    viewer.scene.screenSpaceCameraController.enableRotate = true
    viewer.scene.screenSpaceCameraController.enableZoom = true

    viewer.scene.postProcessStages.fxaa.enabled = true
    try { ;(viewer.scene as any).msaaSamples = 8 } catch {}
    const dpr = (window as any).devicePixelRatio || 1
    viewer.resolutionScale = Math.min(2, dpr)

    viewerRef.current = viewer
    mapLoadedRef.current = true
    setViewerReady(true)

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    handlerRef.current = handler

    const syncFromCamera = () => {
      if (cameraMovingRef.current) return
      setBearing(Math.round(Cesium.Math.toDegrees(viewer.camera.heading)))
    }

    viewer.camera.changed.addEventListener(syncFromCamera)

    const scratchUp = new Cesium.Cartesian3()
    const scratchBottom = new Cesium.Cartesian3()
    const scratchDelta = new Cesium.Cartesian3()
    const scratchTranslate = new Cesium.Matrix4()
    const scratchModel = new Cesium.Matrix4()
    const onPostRender = () => {
      if (dragStateRef.current) return
      const tileset = moduleTilesetRef.current
      if (!tileset) return
      if (moduleTilesetStateRef.current !== 'ready') return
      const mm = tileset.modelMatrix
      if (!mm) return
      const floorWorld = Cesium.Matrix4.multiplyByPoint(mm, Cesium.Cartesian3.ZERO, scratchBottom)
      const floorCarto = Cesium.Cartographic.fromCartesian(floorWorld)
      const h = floorCarto?.height
      if (!isFinite(h)) return
      const targetH = 0.02
      const dh = h - targetH
      if (Math.abs(dh) < 0.001 || Math.abs(dh) > 10000) return
      Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(floorWorld, scratchUp)
      Cesium.Cartesian3.multiplyByScalar(scratchUp, -dh, scratchDelta)
      Cesium.Matrix4.fromTranslation(scratchDelta, scratchTranslate)
      tileset.modelMatrix = Cesium.Matrix4.multiply(scratchTranslate, mm, scratchModel)
      viewer.scene.requestRender()
    }
    viewer.scene.postRender.addEventListener(onPostRender)

    return () => {
      mapLoadedRef.current = false
      pendingDrawRef.current = null
      handlerRef.current?.destroy()
      handlerRef.current = null
      viewer.camera.changed.removeEventListener(syncFromCamera)
      viewer.scene.postRender.removeEventListener(onPostRender)
      viewer.destroy()
      viewerRef.current = null
    }
  }, [])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    if (cameraMovingRef.current) return

    viewer.camera.setView({
      destination: viewer.camera.positionWC,
      orientation: {
        heading: viewer.camera.heading,
        pitch: Cesium.Math.toRadians(pitch - 90),
        roll: 0
      }
    })
  }, [pitch, bearing])

  useEffect(() => {
    if (!viewerReady) return
    const viewer = viewerRef.current
    if (!viewer) return

    if (!sunEnabled) {
      viewer.scene.light = new Cesium.SunLight()
      viewer.scene.globe.enableLighting = false
      viewer.shadows = false
      viewer.scene.shadowMap.enabled = false
      if (moduleTilesetRef.current) moduleTilesetRef.current.shadows = Cesium.ShadowMode.DISABLED
      setSunriseSunset({ sunrise: NaN, sunset: NaN, polar: null })
      setSunPowerNow(0)
      if (viewer.scene.sun) viewer.scene.sun.show = false
      viewer.scene.requestRender()
      return
    }

    const anchor = moduleTilesetAnchorPosRef.current ?? viewer.camera.positionWC
    const carto = Cesium.Cartographic.fromCartesian(anchor)
    const phi = carto?.latitude ?? 0
    const lonDeg = Cesium.Math.toDegrees(carto?.longitude ?? 0)
    const decl = computeSunDeclinationRad(sunDayOfYear)
    const ss = computeSunriseSunsetHours(phi, decl)
    setSunriseSunset(ss)
    const hour = Math.max(0, Math.min(24, sunHour))
    const hourAngle = Cesium.Math.toRadians(15 * (hour - 12))
    const sinAlt = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(hourAngle)
    const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)))

    const altDeg = Cesium.Math.toDegrees(alt)
    const twilight = 6
    const daylightFactor = smoothstep01((altDeg + twilight) / (90 + twilight))
    const powerNow = Math.max(0, Math.min(5, sunIntensity)) * daylightFactor
    setSunPowerNow(powerNow)

    const utcHour = ((hour - lonDeg / 15) % 24 + 24) % 24
    const utcMs = Date.UTC(2023, 0, 1) + (Math.max(1, Math.min(365, Math.round(sunDayOfYear))) - 1) * 24 * 3600 * 1000 + utcHour * 3600 * 1000
    viewer.clock.shouldAnimate = false
    viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date(utcMs))

    viewer.scene.light = new Cesium.SunLight()
    try {
      ;(viewer.scene.light as any).color = Cesium.Color.multiplyByScalar(Cesium.Color.WHITE, powerNow, new Cesium.Color())
    } catch {}
    viewer.scene.globe.enableLighting = true
    if (viewer.scene.sun) viewer.scene.sun.show = true

    viewer.shadows = sunShadows
    viewer.scene.shadowMap.enabled = sunShadows
    viewer.scene.shadowMap.softShadows = sunShadows
    viewer.scene.shadowMap.darkness = 0.25
    viewer.scene.shadowMap.maximumDistance = 900
    viewer.scene.shadowMap.size = 4096
    try {
      ;(viewer.scene.shadowMap as any).normalOffset = true
      ;(viewer.scene.shadowMap as any).normalOffsetScale = 0.5
      ;(viewer.scene.shadowMap as any).penumbraRatio = 0.2
    } catch {}
    if (moduleTilesetRef.current) moduleTilesetRef.current.shadows = sunShadows && alt > 0 ? Cesium.ShadowMode.ENABLED : Cesium.ShadowMode.DISABLED
    viewer.scene.requestRender()
  }, [viewerReady, sunEnabled, sunIntensity, sunDayOfYear, sunHour, sunShadows])

  const mapLoadedRef = useRef(false)

  const clear = () => {
    const viewer = viewerRef.current
    if (!viewer) return
    if (parcelEntityRef.current) viewer.entities.remove(parcelEntityRef.current)
    parcelEntityRef.current = null
    if (parcelOutlineEntityRef.current) viewer.entities.remove(parcelOutlineEntityRef.current)
    parcelOutlineEntityRef.current = null
    buildingEntitiesRef.current.forEach(e => viewer.entities.remove(e))
    buildingEntitiesRef.current = []
    roadEdgeEntitiesRef.current.forEach(e => viewer.entities.remove(e))
    roadEdgeEntitiesRef.current = []
    setbackLineEntitiesRef.current.forEach(e => viewer.entities.remove(e))
    setbackLineEntitiesRef.current = []
    edgeLabelEntitiesRef.current.forEach(e => viewer.entities.remove(e))
    edgeLabelEntitiesRef.current = []
    edgeLabelMetaRef.current = []
    edgeDimLineEntitiesRef.current.forEach(e => viewer.entities.remove(e))
    edgeDimLineEntitiesRef.current = []
    edgeExtLineEntitiesRef.current.forEach(e => viewer.entities.remove(e))
    edgeExtLineEntitiesRef.current = []
    edgeArrowEntitiesRef.current.forEach(e => viewer.entities.remove(e))
    edgeArrowEntitiesRef.current = []
    if (moduleTilesetRef.current) viewer.scene.primitives.remove(moduleTilesetRef.current)
    moduleTilesetRef.current = null
    moduleTilesetStateRef.current = 'idle'
    moduleTilesetBaseRadiusRef.current = null
    moduleTilesetLocalOffsetRef.current = null
    moduleTilesetBaseDimsMRef.current = null
    moduleTilesetMaxZRef.current = null
    moduleTilesetAxisFixRef.current = null
    moduleTilesetBaseModelRef.current = null
    moduleTilesetLastGroundFixRef.current = 0
    moduleTilesetAnchorPosRef.current = null
    if (moduleTilesetJsonBlobUrlRef.current) URL.revokeObjectURL(moduleTilesetJsonBlobUrlRef.current)
    moduleTilesetJsonBlobUrlRef.current = null
    moduleEntityRef.current && viewer.entities.remove(moduleEntityRef.current)
    moduleEntityRef.current = null
    moduleOutlineEntityRef.current && viewer.entities.remove(moduleOutlineEntityRef.current)
    moduleOutlineEntityRef.current = null
    moduleEdgeLabelEntitiesRef.current.forEach(e => viewer.entities.remove(e))
    moduleEdgeLabelEntitiesRef.current = []
    if (moduleMoveHandleEntityRef.current) viewer.entities.remove(moduleMoveHandleEntityRef.current)
    moduleMoveHandleEntityRef.current = null
    if (moduleRotateHandleEntityRef.current) viewer.entities.remove(moduleRotateHandleEntityRef.current)
    moduleRotateHandleEntityRef.current = null
    parcelCenterRef.current = null
    parcelSourceDataRef.current = null
    buildingsSourceDataRef.current = null
    roadEdgeAbortRef.current?.abort()
    roadEdgeAbortRef.current = null
    roadEdgeReqIdRef.current++
    parcelRingMRef.current = null
    buildingsPolysMRef.current = []
    setbackRulesRef.current = null
    setbackConstraintsRef.current = []
    modulePoseByIdRef.current = {}
    moduleGeomRef.current = null
    dragStateRef.current = null
    edgeLabelMetaRef.current = []
    setModuleResults([])
    setEditModule(false)
    setModuleAngleDeg(0)
    setModuleEditHint(null)
  }

  const formatDistance = (meters: number) => {
    const feet = meters * 3.280839895
    if (feet >= 1000) return `${Math.round(feet)} ft`
    if (feet >= 100) return `${feet.toFixed(0)} ft`
    return `${feet.toFixed(1)} ft`
  }

  const edgeLabelElement = useMemo(() => {
    const el = document.createElement('div')
    el.className = 'edge-label'
    return el
  }, [])

  const getFirstRing = (geo: any): Array<[number, number]> | null => {
    let g = geo
    if (!g) return null
    if (g.type === 'FeatureCollection') g = g.features?.[0]
    if (g?.type === 'Feature') g = g.geometry
    if (!g) return null
    if (g.type === 'Polygon') return (g.coordinates?.[0] ?? null) as Array<[number, number]> | null
    if (g.type === 'MultiPolygon') return (g.coordinates?.[0]?.[0] ?? null) as Array<[number, number]> | null
    return null
  }

  const getFirstRingLatLng = (geo: any): Array<{ lng: number, lat: number }> | null => {
    const ring = getFirstRing(geo)
    if (!ring) return null
    return ring.map(([lng, lat]) => ({ lng, lat }))
  }

  const bboxFromRing = (ring: Array<{ lng: number, lat: number }>) => {
    let minLng = ring[0].lng, maxLng = ring[0].lng, minLat = ring[0].lat, maxLat = ring[0].lat
    for (const p of ring) {
      minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng)
      minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat)
    }
    return { minLng, minLat, maxLng, maxLat }
  }

  const extractSetbackRulesFt = (parcelGeoJson: any, zoningGeoJson: any) => {
    const candidates: any[] = []
    if (zoningGeoJson?.type === 'FeatureCollection') candidates.push(zoningGeoJson.features?.[0]?.properties)
    if (zoningGeoJson?.type === 'Feature') candidates.push(zoningGeoJson.properties)
    const parcelFeat = parcelGeoJson?.type === 'FeatureCollection' ? parcelGeoJson.features?.[0] : parcelGeoJson
    if (parcelFeat?.type === 'Feature') {
      candidates.push(parcelFeat.properties?.fields)
      candidates.push(parcelFeat.properties)
    }
    let front = 0
    let rear = 0
    let side = 0
    for (const c of candidates) {
      if (!c) continue
      const f = Number(c.min_front_setback_ft)
      const r = Number(c.min_rear_setback_ft)
      const s = Number(c.min_side_setback_ft)
      if (isFinite(f) && f > 0) front = Math.max(front, f)
      if (isFinite(r) && r > 0) rear = Math.max(rear, r)
      if (isFinite(s) && s > 0) side = Math.max(side, s)
    }
    if (front <= 0 && rear <= 0 && side <= 0) return null
    return { frontFt: front, rearFt: rear, sideFt: side }
  }

  const toMeters = (feet: number) => feet * 0.3048

  const normalizeRing = (ring: Array<{ x: number, y: number }>) => {
    if (!ring.length) return ring
    const a = ring[0]
    const b = ring[ring.length - 1]
    if (Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9) return ring.slice(0, -1)
    return ring
  }

  const pointInRing = (pt: { x: number, y: number }, ring: Array<{ x: number, y: number }>) => {
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i].x, yi = ring[i].y
      const xj = ring[j].x, yj = ring[j].y
      const intersect = ((yi > pt.y) !== (yj > pt.y)) && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi + 1e-18) + xi)
      if (intersect) inside = !inside
    }
    return inside
  }

  const segIntersect = (a: { x: number, y: number }, b: { x: number, y: number }, c: { x: number, y: number }, d: { x: number, y: number }) => {
    const orient = (p: any, q: any, r: any) => (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y)
    const onSeg = (p: any, q: any, r: any) => Math.min(p.x, r.x) <= q.x && q.x <= Math.max(p.x, r.x) && Math.min(p.y, r.y) <= q.y && q.y <= Math.max(p.y, r.y)
    const o1 = orient(a, b, c)
    const o2 = orient(a, b, d)
    const o3 = orient(c, d, a)
    const o4 = orient(c, d, b)
    if ((o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0)) return true
    if (Math.abs(o1) < 1e-12 && onSeg(a, c, b)) return true
    if (Math.abs(o2) < 1e-12 && onSeg(a, d, b)) return true
    if (Math.abs(o3) < 1e-12 && onSeg(c, a, d)) return true
    if (Math.abs(o4) < 1e-12 && onSeg(c, b, d)) return true
    return false
  }

  const pointSegDist = (p: { x: number, y: number }, a: { x: number, y: number }, b: { x: number, y: number }) => {
    const vx = b.x - a.x, vy = b.y - a.y
    const wx = p.x - a.x, wy = p.y - a.y
    const c1 = vx * wx + vy * wy
    if (c1 <= 0) return Math.hypot(p.x - a.x, p.y - a.y)
    const c2 = vx * vx + vy * vy
    if (c2 <= c1) return Math.hypot(p.x - b.x, p.y - b.y)
    const t = c1 / c2
    const px = a.x + t * vx, py = a.y + t * vy
    return Math.hypot(p.x - px, p.y - py)
  }

  const ringSegmentsWrap = (ring: Array<{ x: number, y: number }>) => {
    const r = normalizeRing(ring)
    const segs: Array<{ a: { x: number, y: number }, b: { x: number, y: number } }> = []
    for (let i = 0; i < r.length; i++) {
      segs.push({ a: r[i], b: r[(i + 1) % r.length] })
    }
    return segs
  }

  const rectInsidePolygonWrap = (rect: Array<{ x: number, y: number }>, polyRing: Array<{ x: number, y: number }>) => {
    const poly = normalizeRing(polyRing)
    for (const p of rect) if (!pointInRing(p, poly)) return false
    const polySegs = ringSegmentsWrap(poly)
    for (let i = 0; i < rect.length; i++) {
      const a = rect[i]
      const b = rect[(i + 1) % rect.length]
      for (const s of polySegs) {
        if (segIntersect(a, b, s.a, s.b)) return false
      }
    }
    return true
  }

  const polygonIntersectsWrap = (polyA: Array<{ x: number, y: number }>, polyB: Array<{ x: number, y: number }>) => {
    const a = normalizeRing(polyA)
    const b = normalizeRing(polyB)
    for (let i = 0; i < a.length; i++) {
      const a1 = a[i]
      const a2 = a[(i + 1) % a.length]
      for (let j = 0; j < b.length; j++) {
        const b1 = b[j]
        const b2 = b[(j + 1) % b.length]
        if (segIntersect(a1, a2, b1, b2)) return true
      }
    }
    if (pointInRing(a[0], b)) return true
    if (pointInRing(b[0], a)) return true
    return false
  }

  const rectanglePoly = (cx: number, cy: number, w: number, h: number, angleRad: number) => {
    const hw = w / 2
    const hh = h / 2
    const c = Math.cos(angleRad)
    const s = Math.sin(angleRad)
    const pts = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh }
    ]
    return pts.map(p => ({ x: cx + p.x * c - p.y * s, y: cy + p.x * s + p.y * c }))
  }

  const parseFirstRingMercatorMeters = (geo: any): Array<{ x: number, y: number }> | null => {
    const ring = getFirstRing(geo)
    if (!ring || ring.length < 3) return null
    const pts = ring.map(([lng, lat]) => lngLatToMercatorMeters(lng, lat))
    if (pts.length >= 2) {
      const a = pts[0]
      const b = pts[pts.length - 1]
      if (a.x !== b.x || a.y !== b.y) pts.push(a)
    }
    return pts
  }

  const parseBuildingPolysMercatorMeters = (buildingsGeoJson: any) => {
    const polys: Array<Array<{ x: number, y: number }>> = []
    const fc = buildingsGeoJson?.type === 'FeatureCollection' ? buildingsGeoJson : buildingsGeoJson?.buildings
    const feats = fc?.features ?? []
    for (const f of feats) {
      const g = f?.geometry
      if (!g) continue
      if (g.type === 'Polygon') {
        const ring = g.coordinates?.[0]
        if (!ring || ring.length < 3) continue
        polys.push(ring.map(([lng, lat]: any) => lngLatToMercatorMeters(lng, lat)))
      } else if (g.type === 'MultiPolygon') {
        const ring = g.coordinates?.[0]?.[0]
        if (!ring || ring.length < 3) continue
        polys.push(ring.map(([lng, lat]: any) => lngLatToMercatorMeters(lng, lat)))
      }
    }
    return polys
  }

  const ringBounds = (pts: Array<{ x: number, y: number }>) => {
    let minX = pts[0].x, minY = pts[0].y, maxX = pts[0].x, maxY = pts[0].y
    for (const p of pts) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y)
    }
    return { minX, minY, maxX, maxY }
  }

  const ensureFeatureCollection = (x: any) => {
    if (!x) return { type: 'FeatureCollection', features: [] }
    if (x.type === 'FeatureCollection') return x
    if (x.type === 'Feature') return { type: 'FeatureCollection', features: [x] }
    return { type: 'FeatureCollection', features: [] }
  }

  const pickRoadAdjacencyFromOverpass = async (parcelGeoJson: any) => {
    const ring = getFirstRingLatLng(parcelGeoJson)
    if (!ring || ring.length < 3) return null
    const bbox0 = bboxFromRing(ring)
    const pad = Math.max(0.0008, Math.max(bbox0.maxLat - bbox0.minLat, bbox0.maxLng - bbox0.minLng) * 0.35)
    const bbox = {
      minLng: bbox0.minLng - pad,
      minLat: bbox0.minLat - pad,
      maxLng: bbox0.maxLng + pad,
      maxLat: bbox0.maxLat + pad
    }

    roadEdgeAbortRef.current?.abort()
    const ac = new AbortController()
    roadEdgeAbortRef.current = ac
    const reqId = ++roadEdgeReqIdRef.current

    const q = `[out:json][timeout:12];(way["highway"]["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street)$"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}););out geom;`
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
          signal: ac.signal
        })
        if (!res.ok) continue
        data = await res.json()
        break
      } catch (e: any) {
        if (e?.name === 'AbortError') return null
      }
    }

    if (reqId !== roadEdgeReqIdRef.current) return null
    if (!data?.elements?.length) return null

    const ringNoClose = (() => {
      const last = ring[ring.length - 1]
      const first = ring[0]
      if (Math.abs(last.lng - first.lng) < 1e-12 && Math.abs(last.lat - first.lat) < 1e-12) return ring.slice(0, -1)
      return ring
    })()

    const ringM = ringNoClose.map(p => lngLatToMercatorMeters(p.lng, p.lat))
    if (ringM.length < 3) return null

    const roadSegs: Array<{ a: { x: number, y: number }, b: { x: number, y: number } }> = []
    for (const el of data.elements) {
      if (el?.type !== 'way') continue
      const geom = el?.geometry
      if (!Array.isArray(geom) || geom.length < 2) continue
      const pts = geom.map((p: any) => lngLatToMercatorMeters(p.lon, p.lat))
      for (let i = 0; i < pts.length - 1; i++) {
        roadSegs.push({ a: pts[i], b: pts[i + 1] })
      }
    }
    if (!roadSegs.length) return null

    const segSegDist = (a1: any, a2: any, b1: any, b2: any) => {
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
    const edgeDir = (a: { x: number, y: number }, b: { x: number, y: number }) => {
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.max(1e-9, Math.hypot(dx, dy))
      return { x: dx / len, y: dy / len }
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
      let minD = Infinity
      let minParallelD = Infinity
      for (let j = 0; j < roadSegs.length; j++) {
        const rs = roadSegs[j]
        const d = segSegDist(a, b, rs.a, rs.b)
        if (d < minD) minD = d
        if (angleDiffAbs(edgeDirs[i], roadDirs[j]) <= parallelTol) {
          if (d < minParallelD) minParallelD = d
        }
      }
      edgeMinDistAnyM[i] = minD
      edgeMinDistParallelM[i] = minParallelD
    }

    const thresholdM = 12
    const toleranceM = 3.5
    const finiteParallel = edgeMinDistParallelM.filter(d => isFinite(d))
    const roadEdgeIdx: number[] = []
    if (finiteParallel.length) {
      const minP = Math.min(...finiteParallel)
      const cut = Math.min(thresholdM, minP + toleranceM)
      for (let i = 0; i < edgeMinDistParallelM.length; i++) {
        const d = edgeMinDistParallelM[i]
        if (isFinite(d) && d <= cut) roadEdgeIdx.push(i)
      }
    } else {
      const finiteAny = edgeMinDistAnyM.filter(d => isFinite(d))
      const minA = finiteAny.length ? Math.min(...finiteAny) : Infinity
      const cut = Math.min(10, minA + toleranceM)
      for (let i = 0; i < edgeMinDistAnyM.length; i++) {
        const d = edgeMinDistAnyM[i]
        if (isFinite(d) && d <= cut) roadEdgeIdx.push(i)
      }
    }

    return { ringNoCloseLL: ringNoClose, roadEdgeIdx, edgeMinDistAnyM }
  }

  const computeSetbackConstraints = (parcelGeoJson: any, roadAdj: null | { ringNoCloseLL: Array<{ lng: number, lat: number }>, roadEdgeIdx: number[], edgeMinDistAnyM: number[] }) => {
    const rules = setbackRulesRef.current
    const ringM = parcelRingMRef.current
    const ringLL = getFirstRingLatLng(parcelGeoJson)
    if (!rules || !ringM || !ringLL || ringLL.length < 3) {
      setbackConstraintsRef.current = []
      return { lines: [] as Array<Array<[number, number]>>, constraints: [] as typeof setbackConstraintsRef.current }
    }

    const ringNoCloseLL = roadAdj?.ringNoCloseLL ?? (() => {
      const last = ringLL[ringLL.length - 1]
      const first = ringLL[0]
      if (Math.abs(last.lng - first.lng) < 1e-12 && Math.abs(last.lat - first.lat) < 1e-12) return ringLL.slice(0, -1)
      return ringLL
    })()
    const ringNoCloseM = normalizeRing(ringM)

    const roadEdgeIdxSet = new Set<number>(roadAdj?.roadEdgeIdx ?? [])

    let rearIdx = -1
    if (roadAdj?.edgeMinDistAnyM?.length) {
      let best: { idx: number, d: number } | null = null
      for (let i = 0; i < ringNoCloseM.length; i++) {
        if (roadEdgeIdxSet.has(i)) continue
        const d = roadAdj.edgeMinDistAnyM[i] ?? 0
        if (!best || d > best.d) best = { idx: i, d }
      }
      rearIdx = best?.idx ?? -1
    }

    const getDistFt = (kind: 'front' | 'rear' | 'side') => {
      if (kind === 'front') return rules.frontFt
      if (kind === 'rear') return rules.rearFt
      return rules.sideFt
    }

    const unitInwardNormal = (a: { x: number, y: number }, b: { x: number, y: number }) => {
      const ex = b.x - a.x
      const ey = b.y - a.y
      const len = Math.max(1e-9, Math.hypot(ex, ey))
      const n1 = { x: -ey / len, y: ex / len }
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const t1 = { x: mid.x + n1.x * 1.0, y: mid.y + n1.y * 1.0 }
      if (pointInRing(t1, ringNoCloseM)) return n1
      return { x: -n1.x, y: -n1.y }
    }

    const constraints: Array<{ a: { x: number, y: number }, b: { x: number, y: number }, n: { x: number, y: number }, distM: number, kind: 'front' | 'rear' | 'side' }> = []
    const lines: Array<Array<[number, number]>> = []

    for (let i = 0; i < ringNoCloseM.length; i++) {
      let kind: 'front' | 'rear' | 'side' = 'side'
      if (roadEdgeIdxSet.has(i)) kind = 'front'
      else if (rearIdx >= 0 && i === rearIdx) kind = 'rear'
      const distFt = getDistFt(kind)
      if (!(distFt > 0)) continue

      const a = ringNoCloseM[i]
      const b = ringNoCloseM[(i + 1) % ringNoCloseM.length]
      const n = unitInwardNormal(a, b)
      const distM = toMeters(distFt)
      constraints.push({ a, b, n, distM, kind })
      const oa = { x: a.x + n.x * distM, y: a.y + n.y * distM }
      const ob = { x: b.x + n.x * distM, y: b.y + n.y * distM }
      const oaLL = mercatorMetersToLngLat(oa.x, oa.y)
      const obLL = mercatorMetersToLngLat(ob.x, ob.y)
      lines.push([[oaLL.lng, oaLL.lat], [obLL.lng, obLL.lat]])
    }

    setbackConstraintsRef.current = constraints
    return { lines, constraints }
  }

  const haversineMeters = (a: { lng: number, lat: number }, b: { lng: number, lat: number }) => {
    const R = 6371008.8
    const phi1 = a.lat * Math.PI / 180
    const phi2 = b.lat * Math.PI / 180
    const dphi = (b.lat - a.lat) * Math.PI / 180
    const dl = (b.lng - a.lng) * Math.PI / 180
    const s = Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dl / 2) ** 2
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
  }

  const addEdgeLabels = (parcelGeoJson: any) => {
    const viewer = viewerRef.current
    if (!viewer) return
    edgeLabelEntitiesRef.current.forEach(e => viewer.entities.remove(e))
    edgeLabelEntitiesRef.current = []
    edgeLabelMetaRef.current = []
    edgeDimLineEntitiesRef.current.forEach(e => viewer.entities.remove(e))
    edgeDimLineEntitiesRef.current = []
    edgeExtLineEntitiesRef.current.forEach(e => viewer.entities.remove(e))
    edgeExtLineEntitiesRef.current = []
    edgeArrowEntitiesRef.current.forEach(e => viewer.entities.remove(e))
    edgeArrowEntitiesRef.current = []
    const ring = getFirstRingLatLng(parcelGeoJson)
    if (!ring || ring.length < 2) return
    const ringNoClose = (() => {
      const last = ring[ring.length - 1]
      const first = ring[0]
      if (Math.abs(last.lng - first.lng) < 1e-12 && Math.abs(last.lat - first.lat) < 1e-12) return ring.slice(0, -1)
      return ring
    })()
    if (ringNoClose.length < 3) return

    const ptsM = ringNoClose.map(p => lngLatToMercatorMeters(p.lng, p.lat))
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

    const edgeDir = (a: { x: number, y: number }, b: { x: number, y: number }) => {
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

    const makeLabelImage = (text: string) => {
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
      return canvas
    }

    const inwardNormal = (a: { x: number, y: number }, b: { x: number, y: number }) => {
      const ex = b.x - a.x
      const ey = b.y - a.y
      const len = Math.max(1e-9, Math.hypot(ex, ey))
      const n1 = { x: -ey / len, y: ex / len }
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const t1 = { x: mid.x + n1.x * 1.0, y: mid.y + n1.y * 1.0 }
      const ptIn = (p: { x: number, y: number }) => {
        let wn = 0
        for (let i = 0; i < ptsM.length; i++) {
          const p1 = ptsM[i]
          const p2 = ptsM[(i + 1) % ptsM.length]
          if (p1.y <= p.y) {
            if (p2.y > p.y && ((p2.x - p1.x) * (p.y - p1.y) - (p.x - p1.x) * (p2.y - p1.y)) > 0) wn++
          } else {
            if (p2.y <= p.y && ((p2.x - p1.x) * (p.y - p1.y) - (p.x - p1.x) * (p2.y - p1.y)) < 0) wn--
          }
        }
        return wn !== 0
      }
      const isIn = ptIn(t1)
      return isIn ? n1 : { x: -n1.x, y: -n1.y }
    }

    const offsetM = toMeters(6)
    const extOverhangM = toMeters(1)
    const arrowLenM = toMeters(3)
    const arrowHalfWidthM = toMeters(1.5) / 2

    for (const g of groups) {
      let totalFt = 0
      for (const idx of g.segIdx) {
        const p = ringNoClose[idx]
        const q = ringNoClose[(idx + 1) % ringNoClose.length]
        totalFt += haversineMeters(p, q) / 0.3048
      }
      if (totalFt < minTurnSegFt) continue
      const text = `${Math.round(totalFt * 10) / 10} ft`
      const midM = pickMidpoint(g)
      const aM = ptsM[g.startIdx]
      const bM = ptsM[(g.endIdx + 1) % ptsM.length]
      const nIn = inwardNormal(aM, bM)
      const nOut = { x: -nIn.x, y: -nIn.y }
      const aOf = { x: aM.x + nOut.x * offsetM, y: aM.y + nOut.y * offsetM }
      const bOf = { x: bM.x + nOut.x * offsetM, y: bM.y + nOut.y * offsetM }
      const aExt = { x: aOf.x + nOut.x * extOverhangM, y: aOf.y + nOut.y * extOverhangM }
      const bExt = { x: bOf.x + nOut.x * extOverhangM, y: bOf.y + nOut.y * extOverhangM }
      const aOfLL = mercatorMetersToLngLat(aOf.x, aOf.y)
      const bOfLL = mercatorMetersToLngLat(bOf.x, bOf.y)
      const aExtLL = mercatorMetersToLngLat(aExt.x, aExt.y)
      const bExtLL = mercatorMetersToLngLat(bExt.x, bExt.y)
      const aLL = mercatorMetersToLngLat(aM.x, aM.y)
      const bLL = mercatorMetersToLngLat(bM.x, bM.y)
      const aCart = Cesium.Cartesian3.fromDegrees(aOfLL.lng, aOfLL.lat)
      const bCart = Cesium.Cartesian3.fromDegrees(bOfLL.lng, bOfLL.lat)
      const e0Cart = Cesium.Cartesian3.fromDegrees(aLL.lng, aLL.lat)
      const e1Cart = Cesium.Cartesian3.fromDegrees(aOfLL.lng, aOfLL.lat)
      const img = makeLabelImage(text)

      edgeDimLineEntitiesRef.current.push(viewer.entities.add({
        polyline: {
          positions: new Cesium.ConstantProperty(Cesium.Cartesian3.fromDegreesArray([aOfLL.lng, aOfLL.lat, bOfLL.lng, bOfLL.lat])),
          width: 1,
          material: new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString('#333'))
        }
      }))
      edgeExtLineEntitiesRef.current.push(viewer.entities.add({
        polyline: {
          positions: new Cesium.ConstantProperty(Cesium.Cartesian3.fromDegreesArray([aLL.lng, aLL.lat, aExtLL.lng, aExtLL.lat])),
          width: 1,
          material: new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString('#333'))
        }
      }))
      edgeExtLineEntitiesRef.current.push(viewer.entities.add({
        polyline: {
          positions: new Cesium.ConstantProperty(Cesium.Cartesian3.fromDegreesArray([bLL.lng, bLL.lat, bExtLL.lng, bExtLL.lat])),
          width: 1,
          material: new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString('#333'))
        }
      }))
      const dx = bOf.x - aOf.x
      const dy = bOf.y - aOf.y
      const dLen = Math.max(1e-9, Math.hypot(dx, dy))
      const ux = dx / dLen
      const uy = dy / dLen
      const px = -uy
      const py = ux

      const addArrow = (tip: { x: number, y: number }, dirSign: 1 | -1) => {
        const bx = tip.x + ux * arrowLenM * dirSign
        const by = tip.y + uy * arrowLenM * dirSign
        const l = { x: bx + px * arrowHalfWidthM, y: by + py * arrowHalfWidthM }
        const r = { x: bx - px * arrowHalfWidthM, y: by - py * arrowHalfWidthM }
        const tipLL = mercatorMetersToLngLat(tip.x, tip.y)
        const lLL = mercatorMetersToLngLat(l.x, l.y)
        const rLL = mercatorMetersToLngLat(r.x, r.y)
        edgeArrowEntitiesRef.current.push(viewer.entities.add({
          polyline: {
            positions: new Cesium.ConstantProperty(Cesium.Cartesian3.fromDegreesArray([tipLL.lng, tipLL.lat, lLL.lng, lLL.lat])),
            width: 1,
            material: new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString('#333'))
          }
        }))
        edgeArrowEntitiesRef.current.push(viewer.entities.add({
          polyline: {
            positions: new Cesium.ConstantProperty(Cesium.Cartesian3.fromDegreesArray([tipLL.lng, tipLL.lat, rLL.lng, rLL.lat])),
            width: 1,
            material: new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString('#333'))
          }
        }))
      }

      addArrow(aOf, 1)
      addArrow(bOf, -1)

      const entity = viewer.entities.add({
        position: new Cesium.ConstantPositionProperty(Cesium.Cartesian3.fromDegrees((aOfLL.lng + bOfLL.lng) / 2, (aOfLL.lat + bOfLL.lat) / 2)),
        billboard: {
          image: new Cesium.ConstantProperty(img),
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          alignedAxis: new Cesium.ConstantProperty(Cesium.Cartesian3.ZERO),
          pixelOffset: new Cesium.ConstantProperty(new Cesium.Cartesian2(0, 0)),
          disableDepthTestDistance: new Cesium.ConstantProperty(Number.POSITIVE_INFINITY)
        }
      })
      edgeLabelEntitiesRef.current.push(entity)
      edgeLabelMetaRef.current.push({ entity, a: aCart, b: bCart, e0: e0Cart, e1: e1Cart })
    }

    const scene = viewer.scene
    for (let i = 0; i < edgeLabelMetaRef.current.length; i++) {
      const m = edgeLabelMetaRef.current[i]
      const p1 = Cesium.SceneTransforms.worldToWindowCoordinates(scene, m.a)
      const p2 = Cesium.SceneTransforms.worldToWindowCoordinates(scene, m.b)
      if (!p1 || !p2) continue
      const theta = -Math.atan2(p2.y - p1.y, p2.x - p1.x)
      let labelRot = theta
      if (Math.cos(theta) < 0) labelRot += Math.PI
      if (m.entity.billboard) {
        m.entity.billboard.rotation = new Cesium.ConstantProperty(labelRot)
      }
    }
  }

  const solveModulePlacement = (parcelGeoJson: any, buildingsGeoJson: any) => {
    const ringM = parseFirstRingMercatorMeters(parcelGeoJson)
    if (!ringM || ringM.length < 3) return []
    const bounds = ringBounds(ringM)
    const buildingPolysM = parseBuildingPolysMercatorMeters(buildingsGeoJson)
    const polySegs = ringSegmentsWrap(ringM)
    const constraints = setbackConstraintsRef.current
    const boundaryMarginM = toMeters(4)

    const segSegDist = (a1: { x: number, y: number }, a2: { x: number, y: number }, b1: { x: number, y: number }, b2: { x: number, y: number }) => {
      if (segIntersect(a1, a2, b1, b2)) return 0
      return Math.min(
        pointSegDist(a1, b1, b2),
        pointSegDist(a2, b1, b2),
        pointSegDist(b1, a1, a2),
        pointSegDist(b2, a1, a2)
      )
    }

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

    const modules = [
      { id: 'm1', name: 'Classic small 2B2B (600 sqft)', wFt: 37.5, hFt: 16 },
      { id: 'm2', name: 'Single-sided external hanging (720 sqft)', wFt: 45, hFt: 16 },
      { id: 'm3', name: 'Bilateral external hanging (840 sqft)', wFt: 52.5, hFt: 16 }
    ]
    const results: Array<{ id: string, name: string, wFt: number, hFt: number, ok: boolean, angleDeg?: number, center?: { lat: number, lng: number } }> = []

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
            if (!rectInsidePolygonWrap(rect, ringM)) continue

            let minSetbackMargin = Infinity
            if (constraints.length) {
              let okSetback = true
              for (const p of rect) {
                for (const c of constraints) {
                  const d = (p.x - c.a.x) * c.n.x + (p.y - c.a.y) * c.n.y
                  const margin = d - c.distM
                  if (margin < 0) { okSetback = false; break }
                  minSetbackMargin = Math.min(minSetbackMargin, margin)
                }
                if (!okSetback) break
              }
              if (!okSetback) continue
              if (!isFinite(minSetbackMargin)) minSetbackMargin = 0
            }

            let blocked = false
            for (const bp of buildingPolysM) {
              if (polygonIntersectsWrap(rect, bp)) { blocked = true; break }
            }
            if (blocked) continue

            const rectSamples = [
              rect[0],
              rect[1],
              rect[2],
              rect[3],
              { x: (rect[0].x + rect[1].x) / 2, y: (rect[0].y + rect[1].y) / 2 },
              { x: (rect[1].x + rect[2].x) / 2, y: (rect[1].y + rect[2].y) / 2 },
              { x: (rect[2].x + rect[3].x) / 2, y: (rect[2].y + rect[3].y) / 2 },
              { x: (rect[3].x + rect[0].x) / 2, y: (rect[3].y + rect[0].y) / 2 }
            ]

            let minEdgeDist = Infinity
            for (const p of rectSamples) {
              for (const s of polySegs) {
                minEdgeDist = Math.min(minEdgeDist, pointSegDist(p, s.a, s.b))
              }
            }
            if (minEdgeDist < boundaryMarginM - 1e-6) continue

            let minBldgDist = Infinity
            for (const p of rectSamples) {
              for (const bp of buildingPolysM) {
                for (let i = 0; i < bp.length; i++) {
                  const a = bp[i]
                  const b = bp[(i + 1) % bp.length]
                  minBldgDist = Math.min(minBldgDist, pointSegDist(p, a, b))
                }
              }
            }
            if (!isFinite(minBldgDist)) minBldgDist = 999999

            const longEdges = wM >= hM
              ? [{ a: rect[0], b: rect[1] }, { a: rect[2], b: rect[3] }]
              : [{ a: rect[1], b: rect[2] }, { a: rect[3], b: rect[0] }]

            let bestLongAdj = Infinity
            let bestLongDist = Infinity
            let bestLongParallel = 0
            for (const e of longEdges) {
              const ex = e.b.x - e.a.x
              const ey = e.b.y - e.a.y
              const el = Math.max(1e-9, Math.hypot(ex, ey))
              const parallelTol = 0.965
              let foundParallel = false
              for (const s of polySegs) {
                const sx = s.b.x - s.a.x
                const sy = s.b.y - s.a.y
                const sl = Math.max(1e-9, Math.hypot(sx, sy))
                const parallel = Math.abs((ex * sx + ey * sy) / (el * sl))
                if (parallel < parallelTol) continue
                foundParallel = true
                const dist = segSegDist(e.a, e.b, s.a, s.b)
                const adj = dist
                if (adj < bestLongAdj) {
                  bestLongAdj = adj
                  bestLongDist = dist
                  bestLongParallel = parallel
                }
              }
              if (!foundParallel) {
                for (const s of polySegs) {
                  const sx = s.b.x - s.a.x
                  const sy = s.b.y - s.a.y
                  const sl = Math.max(1e-9, Math.hypot(sx, sy))
                  const parallel = Math.abs((ex * sx + ey * sy) / (el * sl))
                  const dist = segSegDist(e.a, e.b, s.a, s.b)
                  const adj = dist + (1 - parallel) * boundaryMarginM * 5
                  if (adj < bestLongAdj) {
                    bestLongAdj = adj
                    bestLongDist = dist
                    bestLongParallel = parallel
                  }
                }
              }
            }

            const longEdgeDeltaM = Math.max(0, bestLongDist - boundaryMarginM)
            let score = -longEdgeDeltaM * 1000 - (1 - bestLongParallel) * 200 + Math.min(minBldgDist, 50)
            if (constraints.length) score -= minSetbackMargin
            if (!best || score > best.score) best = { score, cx: x, cy: y, ang }
          }
        }
      }

      if (!best) {
        results.push({ ...m, ok: false })
      } else {
        const center = mercatorMetersToLngLat(best.cx, best.cy)
        results.push({ ...m, ok: true, angleDeg: Math.round((best.ang * 180) / Math.PI), center: { lat: center.lat, lng: center.lng } })
      }
    }

    return results
  }

  const validateModulePose = (pose: { cx: number, cy: number, angleDeg: number }, wFt: number, hFt: number) => {
    const parcelRingM = parcelRingMRef.current
    if (!parcelRingM || parcelRingM.length < 3) return false
    const rectM = rectanglePoly(pose.cx, pose.cy, toMeters(wFt), toMeters(hFt), (pose.angleDeg * Math.PI) / 180)
    if (!rectInsidePolygonWrap(rectM, parcelRingM)) return false
    const constraints = setbackConstraintsRef.current
    if (constraints.length) {
      for (const p of rectM) {
        for (const c of constraints) {
          const d = (p.x - c.a.x) * c.n.x + (p.y - c.a.y) * c.n.y
          if (d < c.distM - 1e-6) return false
        }
      }
    }
    for (const bp of buildingsPolysMRef.current) {
      if (polygonIntersectsWrap(rectM, bp)) return false
    }
    return true
  }

  const clampPoseRotate = (id: string, center: { cx: number, cy: number }, fromAngleDeg: number, candAngleDeg: number, wFt: number, hFt: number) => {
    const start = { cx: center.cx, cy: center.cy, angleDeg: fromAngleDeg }
    const target = { cx: center.cx, cy: center.cy, angleDeg: candAngleDeg }
    if (validateModulePose(target, wFt, hFt)) return candAngleDeg
    if (!validateModulePose(start, wFt, hFt)) return null
    let lo = 0
    let hi = 1
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2
      const test = { cx: center.cx, cy: center.cy, angleDeg: fromAngleDeg + (candAngleDeg - fromAngleDeg) * mid }
      if (validateModulePose(test, wFt, hFt)) lo = mid
      else hi = mid
    }
    return fromAngleDeg + (candAngleDeg - fromAngleDeg) * lo
  }

  const clampPoseMove = (id: string, fromCenterM: { x: number, y: number }, cand: { cx: number, cy: number, angleDeg: number }, wFt: number, hFt: number, lastOkAngleDeg: number) => {
    const start = { cx: fromCenterM.x, cy: fromCenterM.y, angleDeg: lastOkAngleDeg }
    const target = { cx: cand.cx, cy: cand.cy, angleDeg: lastOkAngleDeg }
    if (validateModulePose(target, wFt, hFt)) return target
    if (!validateModulePose(start, wFt, hFt)) return null
    let lo = 0
    let hi = 1
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2
      const test = {
        cx: start.cx + (target.cx - start.cx) * mid,
        cy: start.cy + (target.cy - start.cy) * mid,
        angleDeg: lastOkAngleDeg
      }
      if (validateModulePose(test, wFt, hFt)) lo = mid
      else hi = mid
    }
    return {
      cx: start.cx + (target.cx - start.cx) * lo,
      cy: start.cy + (target.cy - start.cy) * lo,
      angleDeg: lastOkAngleDeg
    }
  }

  const moduleResultsRef = useRef(moduleResults)
  useEffect(() => { moduleResultsRef.current = moduleResults }, [moduleResults])

  const scheduleRenderModuleFromPose = (id: string, wFt: number, hFt: number) => {
    const viewer = viewerRef.current
    if (!viewer || !mapLoadedRef.current) return
    if (dragStateRef.current && moduleRenderRafRef.current) {
      window.cancelAnimationFrame(moduleRenderRafRef.current)
      moduleRenderRafRef.current = 0
      pendingModuleRenderRef.current = null
    }
    const pose = modulePoseByIdRef.current[id]
    if (!pose) return
    const rectM = rectanglePoly(pose.cx, pose.cy, toMeters(wFt), toMeters(hFt), (pose.angleDeg * Math.PI) / 180)
    const rectLngLat = rectM.map(p => mercatorMetersToLngLat(p.x, p.y))
    const coords: Array<[number, number]> = rectLngLat.map(p => [p.lng, p.lat])
    coords.push(coords[0])

    const labels = [
      `${wFt} ft`,
      `${hFt} ft`,
      `${wFt} ft`,
      `${hFt} ft`
    ]

    const centerLngLat = {
      lng: (rectLngLat[0].lng + rectLngLat[1].lng + rectLngLat[2].lng + rectLngLat[3].lng) / 4,
      lat: (rectLngLat[0].lat + rectLngLat[1].lat + rectLngLat[2].lat + rectLngLat[3].lat) / 4
    }
    const topMidM = {
      x: (rectM[0].x + rectM[1].x) / 2,
      y: (rectM[0].y + rectM[1].y) / 2
    }
    const vx = topMidM.x - pose.cx
    const vy = topMidM.y - pose.cy
    const vLen = Math.max(1e-9, Math.hypot(vx, vy))
    const handleOffsetM = Math.max(2, toMeters(hFt) * 0.35)
    const rotateHandleM = { x: topMidM.x + (vx / vLen) * handleOffsetM, y: topMidM.y + (vy / vLen) * handleOffsetM }
    const rotateLngLat = mercatorMetersToLngLat(rotateHandleM.x, rotateHandleM.y)

    const applyRender = (pending: { id: string, coords: Array<[number, number]>, wFt: number, hFt: number, angleDeg: number, centerLngLat: { lng: number, lat: number }, rotateLngLat: { lng: number, lat: number } }) => {
      const heightM = toMeters(15)
      const ring = pending.coords.slice(0, 4).flat()
      const polyPositions = Cesium.Cartesian3.fromDegreesArray(ring)
      const outlinePositions = Cesium.Cartesian3.fromDegreesArray([...ring, pending.coords[0][0], pending.coords[0][1]])
      moduleGeomRef.current = { polyPositions, outlinePositions }

      if (!moduleTilesetRef.current && moduleTilesetStateRef.current === 'idle') {
        moduleTilesetStateRef.current = 'loading'
        void (async () => {
          try {
            try {
              const b = await computeGlbFootprintBounds(CLASSIC_MODULE_GLB_URL)
              if (b) {
                moduleTilesetLocalOffsetRef.current = new Cesium.Cartesian3(b.offX, b.offY, b.offZ)
                moduleTilesetBaseDimsMRef.current = { x: b.sizeX, y: b.sizeY }
                moduleTilesetMaxZRef.current = b.maxZ ?? null
                moduleTilesetAxisFixRef.current = null
              } else {
                const srcResp = await fetch(CLASSIC_TILESET_JSON_URL)
                if (srcResp.ok) {
                  const tilesetJson = await srcResp.json()
                  const box: number[] | undefined = tilesetJson?.root?.boundingVolume?.box
                  if (Array.isArray(box) && box.length === 12) {
                    const cx = Number(box[0])
                    const cy = Number(box[1])
                    const cz = Number(box[2])
                    const hx = Math.hypot(Number(box[3]), Number(box[4]), Number(box[5]))
                    const hy = Math.hypot(Number(box[6]), Number(box[7]), Number(box[8]))
                    const hz = Math.hypot(Number(box[9]), Number(box[10]), Number(box[11]))
                    const minZ = cz - hz
                    moduleTilesetLocalOffsetRef.current = new Cesium.Cartesian3(cx, cy, minZ)
                    moduleTilesetBaseDimsMRef.current = { x: hx * 2, y: hy * 2 }
                    moduleTilesetMaxZRef.current = cz + hz
                    moduleTilesetAxisFixRef.current = null
                  }
                }
              }
            } catch {}

            const tileset = await Cesium.Cesium3DTileset.fromUrl(CLASSIC_TILESET_JSON_URL, {
              maximumScreenSpaceError: 2,
              maximumMemoryUsage: 256
            } as any)
            if (!viewerRef.current || !mapLoadedRef.current) return
            try {
              tileset.shadows = Cesium.ShadowMode.ENABLED
              ;(tileset as any).imageBasedLightingFactor = new Cesium.Cartesian2(1.0, 1.0)
              ;(tileset as any).debugWireframe = false
              ;(tileset as any).debugShowBoundingVolume = false
            } catch {}
            viewerRef.current.scene.primitives.add(tileset)
            moduleTilesetRef.current = tileset
            moduleTilesetStateRef.current = 'ready'
            moduleTilesetBaseRadiusRef.current = tileset.boundingSphere?.radius ?? null
            viewerRef.current.scene.requestRender()
          } catch {
            moduleTilesetStateRef.current = 'error'
          }
        })()
      }

      if (!moduleEntityRef.current) {
        moduleEntityRef.current = viewer.entities.add({
          polygon: {
            hierarchy: new Cesium.CallbackProperty(() => {
              const g = moduleGeomRef.current
              return new Cesium.PolygonHierarchy(g ? g.polyPositions : [])
            }, false),
            material: new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString('#10b981').withAlpha(0.22)),
            outline: false,
            extrudedHeight: new Cesium.ConstantProperty(heightM),
            height: new Cesium.ConstantProperty(0)
          }
        })
      } else if (moduleEntityRef.current.polygon) {
        moduleEntityRef.current.polygon.hierarchy = new Cesium.CallbackProperty(() => {
          const g = moduleGeomRef.current
          return new Cesium.PolygonHierarchy(g ? g.polyPositions : [])
        }, false)
        moduleEntityRef.current.polygon.extrudedHeight = new Cesium.ConstantProperty(heightM)
      }
      if (moduleEntityRef.current) moduleEntityRef.current.show = !dragStateRef.current && moduleTilesetStateRef.current !== 'ready'

      if (!moduleOutlineEntityRef.current) {
        moduleOutlineEntityRef.current = viewer.entities.add({
          polyline: {
            positions: new Cesium.CallbackProperty(() => moduleGeomRef.current?.outlinePositions ?? [], false),
            width: 2,
            material: new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString('#10b981'))
          }
        })
      } else if (moduleOutlineEntityRef.current.polyline) {
        moduleOutlineEntityRef.current.polyline.positions = new Cesium.CallbackProperty(() => moduleGeomRef.current?.outlinePositions ?? [], false)
      }

      if (moduleEdgeLabelEntitiesRef.current.length !== 4) {
        moduleEdgeLabelEntitiesRef.current.forEach(e => viewer.entities.remove(e))
        moduleEdgeLabelEntitiesRef.current = []
        for (let i = 0; i < 4; i++) {
          moduleEdgeLabelEntitiesRef.current.push(viewer.entities.add({
            position: new Cesium.ConstantPositionProperty(Cesium.Cartesian3.fromDegrees(pending.centerLngLat.lng, pending.centerLngLat.lat)),
            label: {
              text: new Cesium.ConstantProperty(labels[i]),
              font: '14px sans-serif',
              fillColor: Cesium.Color.fromCssColorString('#111'),
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
              showBackground: true,
              backgroundColor: Cesium.Color.WHITE.withAlpha(0.9),
              pixelOffset: new Cesium.Cartesian2(0, -14),
              disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
          }))
        }
      }

      const rectLL = pending.coords.slice(0, 4).map(([lng, lat]) => ({ lng, lat }))
      for (let i = 0; i < 4; i++) {
        const a = rectLL[i]
        const b = rectLL[(i + 1) % 4]
        const mid = { lng: (a.lng + b.lng) / 2, lat: (a.lat + b.lat) / 2 }
        moduleEdgeLabelEntitiesRef.current[i].position = new Cesium.ConstantPositionProperty(Cesium.Cartesian3.fromDegrees(mid.lng, mid.lat))
        if (moduleEdgeLabelEntitiesRef.current[i].label) {
          moduleEdgeLabelEntitiesRef.current[i].label!.text = new Cesium.ConstantProperty(labels[i])
        }
      }

      if (moduleTilesetRef.current && moduleTilesetStateRef.current === 'ready') {
        const position = Cesium.Cartesian3.fromDegrees(pending.centerLngLat.lng, pending.centerLngLat.lat, 0)
        const enu = Cesium.Transforms.eastNorthUpToFixedFrame(position)
        const baseDims = moduleTilesetBaseDimsMRef.current
        const targetW = toMeters(pending.wFt)
        const targetH = toMeters(pending.hFt)
        const baseA = Math.max(1e-9, baseDims?.x ?? 1)
        const baseB = Math.max(1e-9, baseDims?.y ?? 1)
        const s0 = Math.min(targetW / baseA, targetH / baseB)
        const s90 = Math.min(targetW / baseB, targetH / baseA)
        const yawDeg = s90 > s0 ? 90 : 0
        const uniformScale = Math.max(1e-9, Math.max(s0, s90) * 0.84)
        const rot = Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(pending.angleDeg + yawDeg)))
        const s = Cesium.Matrix4.fromUniformScale(uniformScale)
        const off = moduleTilesetLocalOffsetRef.current
        const t = off ? Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(-off.x, -off.y, -off.z)) : Cesium.Matrix4.IDENTITY
        const st = Cesium.Matrix4.multiply(s, t, new Cesium.Matrix4())
        const local = Cesium.Matrix4.multiply(rot, st, new Cesium.Matrix4())
        moduleTilesetAnchorPosRef.current = Cesium.Cartesian3.clone(position)
        const baseModel = Cesium.Matrix4.multiply(enu, local, new Cesium.Matrix4())
        moduleTilesetBaseModelRef.current = Cesium.Matrix4.clone(baseModel, moduleTilesetBaseModelRef.current as any)
        moduleTilesetRef.current.modelMatrix = baseModel
        const scratchBottom = new Cesium.Cartesian3()
        const scratchUp = new Cesium.Cartesian3()
        const scratchDelta = new Cesium.Cartesian3()
        const scratchTranslate = new Cesium.Matrix4()
        const scratchModel = new Cesium.Matrix4()
        const targetH0 = 0.02
        for (let guard = 0; guard < 6; guard++) {
          const mm = moduleTilesetRef.current.modelMatrix
          const floorWorld = Cesium.Matrix4.multiplyByPoint(mm, Cesium.Cartesian3.ZERO, scratchBottom)
          const floorCarto = Cesium.Cartographic.fromCartesian(floorWorld)
          const h = floorCarto?.height
          if (!isFinite(h)) break
          const dh = h - targetH0
          if (Math.abs(dh) < 0.001 || Math.abs(dh) > 10000) break
          Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(floorWorld, scratchUp)
          Cesium.Cartesian3.multiplyByScalar(scratchUp, -dh, scratchDelta)
          Cesium.Matrix4.fromTranslation(scratchDelta, scratchTranslate)
          moduleTilesetRef.current.modelMatrix = Cesium.Matrix4.multiply(scratchTranslate, mm, scratchModel)
        }
        moduleTilesetRef.current.show = true
      }

      viewer.scene.requestRender()
    }

    const pending = { id, coords, wFt, hFt, angleDeg: pose.angleDeg, centerLngLat, rotateLngLat }
    if (dragStateRef.current) {
      applyRender(pending)
      viewer.scene.requestRender()
      return
    }
    pendingModuleRenderRef.current = pending
    if (moduleRenderRafRef.current) return
    moduleRenderRafRef.current = window.requestAnimationFrame(() => {
      moduleRenderRafRef.current = 0
      const p = pendingModuleRenderRef.current
      pendingModuleRenderRef.current = null
      if (!p) return
      applyRender(p)
    })
  }

  const moduleEntityRef = useRef<Cesium.Entity | null>(null)
  const moduleOutlineEntityRef = useRef<Cesium.Entity | null>(null)

  const renderSelectedModule = (id: string, results: Array<{ id: string, name: string, wFt: number, hFt: number, ok: boolean, angleDeg?: number, center?: { lat: number, lng: number } }>) => {
    const r = results.find(x => x.id === id)
    if (!r || !r.ok || !r.center || r.angleDeg == null) return
    if (!modulePoseByIdRef.current[id]) {
      const c = lngLatToMercatorMeters(r.center.lng, r.center.lat)
      modulePoseByIdRef.current[id] = { cx: c.x, cy: c.y, angleDeg: r.angleDeg }
    }
    const pose = modulePoseByIdRef.current[id]
    if (id === selectedModuleIdRef.current) setModuleAngleDeg(Math.round(pose.angleDeg))
    scheduleRenderModuleFromPose(id, r.wFt, r.hFt)
  }

  useEffect(() => {
    if (!moduleResults.length) return
    renderSelectedModule(selectedModuleId, moduleResults)
  }, [selectedModuleId, moduleResults])

  useEffect(() => {
    if (!moduleResults.length) return
    const id = selectedModuleId
    const r = moduleResults.find(x => x.id === id)
    if (!r || !r.ok) return
    const pose = modulePoseByIdRef.current[id]
    if (!pose) return
    const cand = { cx: pose.cx, cy: pose.cy, angleDeg: moduleAngleDeg }
    const ok = validateModulePose(cand, r.wFt, r.hFt)
    if (!ok) {
      const clamped = clampPoseRotate(id, { cx: pose.cx, cy: pose.cy }, pose.angleDeg, moduleAngleDeg, r.wFt, r.hFt)
      if (clamped != null) {
        modulePoseByIdRef.current[id] = { cx: pose.cx, cy: pose.cy, angleDeg: clamped }
        setModuleAngleDeg(Math.round(clamped))
        scheduleRenderModuleFromPose(id, r.wFt, r.hFt)
      }
      return
    }
    modulePoseByIdRef.current[id] = { cx: pose.cx, cy: pose.cy, angleDeg: moduleAngleDeg }
    scheduleRenderModuleFromPose(id, r.wFt, r.hFt)
  }, [moduleAngleDeg, moduleResults, selectedModuleId])

  const draw = (parcelGeoJson: any, buildingsGeoJson: any, zoningGeoJson?: any) => {
    const viewer = viewerRef.current
    if (!viewer) {
      pendingDrawRef.current = () => draw(parcelGeoJson, buildingsGeoJson, zoningGeoJson)
      return
    }
    const ring = getFirstRingLatLng(parcelGeoJson)
    if (!ring || ring.length < 3) return
    const bbox = bboxFromRing(ring)
    const parcelFc = ensureFeatureCollection(parcelGeoJson.type === 'FeatureCollection' ? parcelGeoJson : (parcelGeoJson.parcels ?? parcelGeoJson.parcel ?? parcelGeoJson))
    const buildingsFc = ensureFeatureCollection(buildingsGeoJson)
    const center = { lat: (bbox.minLat + bbox.maxLat) / 2, lng: (bbox.minLng + bbox.maxLng) / 2 }
    parcelCenterRef.current = center
    parcelSourceDataRef.current = parcelFc
    buildingsSourceDataRef.current = buildingsFc

    clear()

    const ringNoClose = (() => {
      const last = ring[ring.length - 1]
      const first = ring[0]
      if (Math.abs(last.lng - first.lng) < 1e-12 && Math.abs(last.lat - first.lat) < 1e-12) return ring.slice(0, -1)
      return ring
    })()

    const polyPositions = Cesium.Cartesian3.fromDegreesArray(ringNoClose.flatMap(p => [p.lng, p.lat]))
    parcelEntityRef.current = viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.ConstantProperty(new Cesium.PolygonHierarchy(polyPositions)),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        perPositionHeight: false,
        classificationType: Cesium.ClassificationType.TERRAIN,
        material: new Cesium.ColorMaterialProperty(Cesium.Color.RED.withAlpha(0.08)),
        outline: true,
        outlineColor: Cesium.Color.RED
      }
    })

    const parcelOutlinePositions = Cesium.Cartesian3.fromDegreesArray([...ringNoClose.flatMap(p => [p.lng, p.lat]), ringNoClose[0].lng, ringNoClose[0].lat])
    parcelOutlineEntityRef.current = viewer.entities.add({
      polyline: {
        positions: new Cesium.ConstantProperty(parcelOutlinePositions),
        clampToGround: true,
        width: 2,
        material: new Cesium.ColorMaterialProperty(Cesium.Color.RED)
      }
    })

    const feats = buildingsFc?.features ?? []
    for (const f of feats) {
      const g = f?.geometry
      if (!g) continue
      const addRing = (ringCoords: any[]) => {
        if (!ringCoords || ringCoords.length < 3) return
        const ll = ringCoords.map(([lng, lat]) => ({ lng, lat }))
        const llNoClose = (() => {
          const last = ll[ll.length - 1]
          const first = ll[0]
          if (Math.abs(last.lng - first.lng) < 1e-12 && Math.abs(last.lat - first.lat) < 1e-12) return ll.slice(0, -1)
          return ll
        })()
        const positions = Cesium.Cartesian3.fromDegreesArray([...llNoClose.flatMap(p => [p.lng, p.lat]), llNoClose[0].lng, llNoClose[0].lat])
        buildingEntitiesRef.current.push(viewer.entities.add({
          polyline: {
            positions: new Cesium.ConstantProperty(positions),
            width: 3,
            material: new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString('#1e90ff'))
          }
        }))
      }
      if (g.type === 'Polygon') addRing(g.coordinates?.[0])
      else if (g.type === 'MultiPolygon') addRing(g.coordinates?.[0]?.[0])
    }

    addEdgeLabels(parcelGeoJson)
    parcelRingMRef.current = parseFirstRingMercatorMeters(parcelGeoJson)
    buildingsPolysMRef.current = parseBuildingPolysMercatorMeters(buildingsFc)
    setbackRulesRef.current = extractSetbackRulesFt(parcelGeoJson, zoningGeoJson)
    setbackConstraintsRef.current = []

    viewer.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat),
      duration: 0.8
    })

    const pickBestModuleId = (results: Array<{ id: string, wFt: number, hFt: number, ok: boolean }>) => {
      let bestId: string | null = null
      let bestArea = -Infinity
      for (const r of results) {
        if (!r.ok) continue
        const area = r.wFt * r.hFt
        if (area > bestArea) { bestArea = area; bestId = r.id }
      }
      return bestId
    }

    const initialResults = solveModulePlacement(parcelGeoJson, buildingsGeoJson)
    setModuleResults(initialResults)
    for (const m of initialResults) {
      if (!m.ok || !m.center || m.angleDeg == null) continue
      const c = lngLatToMercatorMeters(m.center.lng, m.center.lat)
      modulePoseByIdRef.current[m.id] = { cx: c.x, cy: c.y, angleDeg: m.angleDeg }
    }
    const bestId0 = pickBestModuleId(initialResults) ?? selectedModuleIdRef.current
    selectedModuleIdRef.current = bestId0
    setSelectedModuleId(bestId0)
    renderSelectedModule(bestId0, initialResults)

    void (async () => {
      const roadAdj = await pickRoadAdjacencyFromOverpass(parcelGeoJson)
      const v = viewerRef.current
      if (!v || v !== viewer || !mapLoadedRef.current) return

      roadEdgeEntitiesRef.current.forEach(e => v.entities.remove(e))
      roadEdgeEntitiesRef.current = []
      setbackLineEntitiesRef.current.forEach(e => v.entities.remove(e))
      setbackLineEntitiesRef.current = []

      if (roadAdj?.roadEdgeIdx?.length) {
        const ringLL = roadAdj.ringNoCloseLL
        for (const idx of roadAdj.roadEdgeIdx) {
          const a = ringLL[idx]
          const b = ringLL[(idx + 1) % ringLL.length]
          roadEdgeEntitiesRef.current.push(v.entities.add({
            polyline: {
              positions: new Cesium.ConstantProperty(Cesium.Cartesian3.fromDegreesArray([a.lng, a.lat, b.lng, b.lat])),
              width: 5,
              material: new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString('#f59e0b'))
            }
          }))
        }
      }

      const r = computeSetbackConstraints(parcelGeoJson, roadAdj)
      for (const line of r.lines) {
        const flat = line.flat()
        setbackLineEntitiesRef.current.push(v.entities.add({
          polyline: {
            positions: new Cesium.ConstantProperty(Cesium.Cartesian3.fromDegreesArray(flat)),
            width: 2,
            material: new Cesium.PolylineDashMaterialProperty({
              color: Cesium.Color.fromCssColorString('#f59e0b')
            })
          }
        }))
      }

      const results = solveModulePlacement(parcelGeoJson, buildingsGeoJson)
      setModuleResults(results)
      for (const m of results) {
        if (!m.ok || !m.center || m.angleDeg == null) continue
        const c = lngLatToMercatorMeters(m.center.lng, m.center.lat)
        modulePoseByIdRef.current[m.id] = { cx: c.x, cy: c.y, angleDeg: m.angleDeg }
      }
      const bestId1 = pickBestModuleId(results) ?? selectedModuleIdRef.current
      selectedModuleIdRef.current = bestId1
      setSelectedModuleId(bestId1)
      renderSelectedModule(bestId1, results)
    })()
  }

  const search = async () => {
    if (!address) return
    setLoading(true)
    try {
      clear()
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
      draw(data.SubjectParcel, data.SubjectBuildings, data.ParcelInfo?.Zoning)
    } finally {
      setLoading(false)
    }
  }

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
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Perspective:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr 44px auto', gap: 8, alignItems: 'center' }}>
            <span>Pitch</span>
            <input type="range" min={0} max={60} value={pitch} onChange={e => setPitch(Number(e.target.value))} />
            <span style={{ textAlign: 'right' }}>{pitch}°</span>
            <span />

            <span>Bearing</span>
            <input type="range" min={-180} max={180} value={bearing} onChange={e => setBearing(Number(e.target.value))} />
            <span style={{ textAlign: 'right' }}>{bearing}°</span>
            <button style={{ padding: '4px 10px' }} onClick={() => { setPitch(0); setBearing(0) }}>RESET</button>
          </div>
          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '56px 1fr 44px auto', gap: 8, alignItems: 'center' }}>
            <span>Sun</span>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={sunEnabled} onChange={e => setSunEnabled(e.target.checked)} />
              <span>Enable</span>
              <input type="checkbox" checked={sunShadows} onChange={e => setSunShadows(e.target.checked)} disabled={!sunEnabled} />
              <span>Shadows</span>
            </label>
            <span style={{ textAlign: 'right' }}>{sunPowerNow.toFixed(2)}</span>
            <span />

            <span>Power</span>
            <input type="range" min={0} max={3} step={0.05} value={sunIntensity} onChange={e => setSunIntensity(Number(e.target.value))} disabled={!sunEnabled} />
            <span style={{ textAlign: 'right' }}>{sunIntensity.toFixed(1)}</span>
            <span />

            <span>Day</span>
            <input type="range" min={1} max={365} step={1} value={sunDayOfYear} onChange={e => setSunDayOfYear(Number(e.target.value))} disabled={!sunEnabled} />
            <span style={{ textAlign: 'right' }}>{dayOfYearToMmDd(sunDayOfYear)}</span>
            <span />

            <span>Hour</span>
            <input type="range" min={0} max={24} step={0.25} value={sunHour} onChange={e => setSunHour(Number(e.target.value))} disabled={!sunEnabled} />
            <span style={{ textAlign: 'right' }}>{hourToHhMm(sunHour)}</span>
            <span />

            <span>Rise</span>
            <span style={{ gridColumn: '2 / span 2', color: '#444' }}>
              {sunriseSunset.polar === 'day'
                ? 'Polar Day'
                : sunriseSunset.polar === 'night'
                  ? 'Polar Night'
                  : `${hourToHhMm(sunriseSunset.sunrise)} ~ ${hourToHhMm(sunriseSunset.sunset)}`}
            </span>
            <span />
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: '#111' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Modules:</div>
          {moduleResults.length ? moduleResults.map(m => (
            <label key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', marginBottom: 4 }}>
              <input type="radio" name="module" checked={selectedModuleId === m.id} onChange={() => { setSelectedModuleId(m.id) }} />
              <span style={{ lineHeight: 1.2 }}>
                {m.name} {m.wFt}×{m.hFt}ft {m.ok ? `(OK, ${m.angleDeg}°)` : '(NOT)'}
              </span>
            </label>
          )) : (
            <div style={{ color: '#666' }}>Click “Search” to caculate</div>
          )}
          {moduleResults.length ? (() => {
            const cur = moduleResults.find(m => m.id === selectedModuleId)
            const disabled = !cur?.ok
            return (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,.08)' }}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1 }}>
                  <input type="checkbox" checked={editModule} disabled={disabled} onChange={e => setEditModule(e.target.checked)} />
                  <span>Edit Module (drag green=Move, white=Rotate)</span>
                </label>
                {editModule && cur?.ok ? (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr 44px', gap: 8, alignItems: 'center' }}>
                      <span>角度</span>
                      <input type="range" min={-180} max={180} value={moduleAngleDeg} onChange={e => setModuleAngleDeg(Number(e.target.value))} />
                      <span style={{ textAlign: 'right' }}>{moduleAngleDeg}°</span>
                    </div>
                    {moduleEditHint ? <div style={{ marginTop: 4, color: '#0f766e' }}>{moduleEditHint}</div> : null}
                  </div>
                ) : null}
              </div>
            )
          })() : null}
        </div>
      </div>
      <div
        style={{ position: 'absolute', zIndex: 999, top: 10, right: 10, width: 54, height: 54, borderRadius: 999, background: 'rgba(255,255,255,.92)', boxShadow: '0 8px 18px rgba(0,0,0,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none', cursor: 'pointer' }}
        onClick={() => {
          setBearing(0)
          const v = viewerRef.current
          if (v) {
            v.camera.setView({
              destination: v.camera.position,
              orientation: { heading: 0, pitch: v.camera.pitch, roll: v.camera.roll }
            })
            v.scene.requestRender()
          }
        }}
      >
        <div style={{ position: 'relative', width: 40, height: 40, borderRadius: 999, border: '1px solid rgba(0,0,0,.18)' }}>
          <div style={{ position: 'absolute', inset: 0, transform: `rotate(${-bearing}deg)` }}>
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: 2, height: 18, background: '#ef4444', transform: 'translate(-50%, -100%)' }} />
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: 2, height: 12, background: '#111', opacity: 0.35, transform: 'translate(-50%, 0%)' }} />
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, calc(-100% - 12px))', fontSize: 11, fontWeight: 700, color: '#111', zIndex: 2, pointerEvents: 'none' }}>N</div>
          </div>
        </div>
      </div>
      <div id="map" style={{ height: '100%' }} />
    </div>
  )
}
