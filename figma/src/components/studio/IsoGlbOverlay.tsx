import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MODEL_GLB_PATHS, DEFAULT_MODEL_ID } from './siteVisualizerModels';

// ── Isometric projection helpers ──
// Standard isometric: x-axis 30° right-down, y-axis 30° left-down, z-axis up
const ISO_COS = Math.cos(Math.PI / 6); // cos(30°) ≈ 0.866
const ISO_SIN = Math.sin(Math.PI / 6); // sin(30°) = 0.5

export function IsoGlbOverlay({
  enabled,
  modelId,
  canvasW,
  canvasH,
  isoSceneParams,
  orbitYawDeg,
  orbitPitchDeg,
  aduCenterLocal,
  aduRotationDeg,
  lotRotationDeg,
  hasBalcony,
  endAddon,
  showRoof,
  onHasRoofChange,
  targetW,
  targetD,
  onReadyChange,
  onProgressChange,
  onPickApiChange,
}: {
  enabled: boolean;
  modelId: string;
  canvasW: number;
  canvasH: number;
  isoSceneParams: null | { tx: number; ty: number; s: number; pivotX: number; pivotY: number };
  orbitYawDeg: number;
  orbitPitchDeg: number;
  aduCenterLocal: null | { x: number; y: number };
  aduRotationDeg: number;
  lotRotationDeg: number;
  hasBalcony: boolean;
  endAddon: 'none' | 'end-right' | 'end-left' | 'end-both';
  showRoof: boolean;
  onHasRoofChange?: (hasRoof: boolean) => void;
  targetW: number;
  targetD: number;
  onReadyChange?: (ready: boolean) => void;
  onProgressChange?: (p: { loaded: number; total: number | null; progress: number | null }) => void;
  onPickApiChange?: (api: null | { pick: (clientX: number, clientY: number) => null | { x: number; y: number; z: number; snapped: boolean; kind: 'vertex' | 'edge' | 'surface' } }) => void;
}) {
  const glbYawOffsetRad = 0;
  const hostRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rootRef = useRef<THREE.Group | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const modelRootRef = useRef<THREE.Object3D | null>(null);
  const uniformsRef = useRef<any>(null);
  const modelReadyRef = useRef(false);
  const targetWRef = useRef(targetW);
  const targetDRef = useRef(targetD);
  const endAddonRef = useRef(endAddon);
  const hasBalconyRef = useRef(hasBalcony);
  const showRoofRef = useRef(showRoof);
  const applyModelRef = useRef<null | ((modelRoot: THREE.Object3D) => void)>(null);

  useEffect(() => {
    targetWRef.current = targetW;
    targetDRef.current = targetD;
    endAddonRef.current = endAddon;
    hasBalconyRef.current = hasBalcony;
    showRoofRef.current = showRoof;
  }, [targetW, targetD, endAddon, hasBalcony, showRoof]);

  const setReady = (v: boolean) => {
    if (modelReadyRef.current === v) return;
    modelReadyRef.current = v;
    if (onReadyChange) onReadyChange(v);
  };

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      if (onProgressChange) onProgressChange({ loaded: 0, total: null, progress: null });
      return;
    }
    const canvas = hostRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(canvasW * dpr));
    canvas.height = Math.max(1, Math.round(canvasH * dpr));

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(dpr);
    renderer.setSize(canvasW, canvasH, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-100000, 100000, 100000, -100000, -100000, 100000);
    cam.position.set(0, 0, 1);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();

    const root = new THREE.Group();
    const modelGroup = new THREE.Group();
    root.add(modelGroup);
    scene.add(root);

    const uniforms = {
      uCanvasW: { value: canvasW },
      uCanvasH: { value: canvasH },
      uTx: { value: 0 },
      uTy: { value: 0 },
      uScale: { value: 1 },
      uPivotIsoX: { value: 0 },
      uPivotIsoY: { value: 0 },
      uYawDeg: { value: 0 },
      uPitchDeg: { value: 0 },
      uPivotX: { value: 0 },
      uPivotY: { value: 0 },
      uDepthScale: { value: 12000 },
      uColor: { value: new THREE.Color('#ffffff') },
      uOpacity: { value: 0.98 },
      uLightDirA: { value: new THREE.Vector3(0.65, 1.0, 0.35).normalize() },
      uLightDirB: { value: new THREE.Vector3(-0.25, 1.0, -0.55).normalize() },
      uAmbient: { value: 0.8 },
      uDiffuseA: { value: 0.9 },
      uDiffuseB: { value: 0.55 },
      uSkyColor: { value: new THREE.Color('#f8fafc') },
      uGroundColor: { value: new THREE.Color('#cbd5e1') },
      uHemi: { value: 0.45 },
      uExposure: { value: 1.25 },
      uIndirectFloor: { value: 0.18 },
      uMinLight: { value: 0.02 },
    };
    uniformsRef.current = uniforms;

    const materialCache = new Map<string, THREE.ShaderMaterial>();
    const whiteTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    whiteTex.needsUpdate = true;
    const makeMat = (key: string, color: THREE.Color, map: THREE.Texture | null) => {
      const cached = materialCache.get(key);
      if (cached) return cached;
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthTest: true,
        depthWrite: true,
        side: THREE.DoubleSide,
        uniforms: {
          ...uniforms,
          uColor: { value: color },
          uMap: { value: map ?? whiteTex },
          uUseMap: { value: map ? 1 : 0 },
        },
        vertexShader: `
          uniform float uCanvasW;
          uniform float uCanvasH;
          uniform float uTx;
          uniform float uTy;
          uniform float uScale;
          uniform float uPivotIsoX;
          uniform float uPivotIsoY;
          uniform float uYawDeg;
          uniform float uPitchDeg;
          uniform float uPivotX;
          uniform float uPivotY;
          uniform float uDepthScale;
          varying vec2 vUv;
          varying vec3 vN;
          const float ISO_COS = ${ISO_COS.toFixed(10)};
          const float ISO_SIN = ${ISO_SIN.toFixed(10)};
          const float SQRT1_2 = ${Math.SQRT1_2.toFixed(10)};
          void main() {
            vUv = uv;
            vN = normalize(normalMatrix * normal);
            vec4 w = modelMatrix * vec4(position, 1.0);
            float x0 = w.x;
            float y0 = w.z;
            float z0 = w.y;

            float yaw = radians(uYawDeg);
            float cy = cos(yaw);
            float sy = sin(yaw);
            float dx = x0 - uPivotX;
            float dy = y0 - uPivotY;
            float xYaw = uPivotX + dx * cy - dy * sy;
            float yYaw = uPivotY + dx * sy + dy * cy;

            float p = radians(uPitchDeg);
            float cp = cos(p);
            float sp = sin(p);
            float ax = SQRT1_2;
            float ay = -SQRT1_2;
            float az = 0.0;
            float dotv = ax * xYaw + ay * yYaw + az * z0;
            float cxv = ay * z0 - az * yYaw;
            float cyv = az * xYaw - ax * z0;
            float czv = ax * yYaw - ay * xYaw;

            float x1 = xYaw * cp + cxv * sp + ax * dotv * (1.0 - cp);
            float y1 = yYaw * cp + cyv * sp + ay * dotv * (1.0 - cp);
            float z1 = z0 * cp + czv * sp + az * dotv * (1.0 - cp);

            float isoX = (x1 - y1) * ISO_COS;
            float isoY = (x1 + y1) * ISO_SIN - z1;

            float sx = uTx + uScale * (isoX - uPivotIsoX);
            float sy2 = uTy + uScale * (isoY - uPivotIsoY);
            float clipX = (sx / uCanvasW) * 2.0 - 1.0;
            float clipY = 1.0 - (sy2 / uCanvasH) * 2.0;
            float depth = clamp(-(x1 + y1 + z1) / uDepthScale, -1.0, 1.0);
            gl_Position = vec4(clipX, clipY, depth, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          uniform sampler2D uMap;
          uniform float uUseMap;
          uniform vec3 uLightDirA;
          uniform vec3 uLightDirB;
          uniform float uAmbient;
          uniform float uDiffuseA;
          uniform float uDiffuseB;
          uniform vec3 uSkyColor;
          uniform vec3 uGroundColor;
          uniform float uHemi;
          uniform float uExposure;
          uniform float uIndirectFloor;
          uniform float uMinLight;
          varying vec2 vUv;
          varying vec3 vN;
          vec3 srgbToLinear(vec3 c) { return pow(c, vec3(2.2)); }
          vec3 linearToSrgb(vec3 c) { return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2)); }
          void main() {
            vec4 tex = texture2D(uMap, vUv);
            vec3 baseSrgb = mix(vec3(1.0), tex.rgb, uUseMap);
            vec3 base = srgbToLinear(baseSrgb);
            vec3 albedo = base * uColor;
            vec3 n = normalize(vN);
            vec3 lA = normalize(uLightDirA);
            vec3 lB = normalize(uLightDirB);
            float ndlA = max(dot(n, lA), 0.0);
            float ndlB = max(dot(n, lB), 0.0);
            float hemiT = clamp(n.y * 0.5 + 0.5, 0.0, 1.0);
            vec3 hemiSrgb = mix(uGroundColor, uSkyColor, hemiT);
            vec3 hemi = srgbToLinear(hemiSrgb);
            vec3 direct = albedo * (uAmbient + uDiffuseA * ndlA + uDiffuseB * ndlB);
            vec3 indirect = hemi * uHemi * (vec3(uIndirectFloor) + (1.0 - uIndirectFloor) * albedo);
            vec3 litLin = direct + indirect;
            litLin *= uExposure;
            litLin = min(litLin, vec3(1.1));
            litLin = max(litLin, vec3(uMinLight));
            vec3 rgb = linearToSrgb(litLin);
            float a = uOpacity * mix(1.0, tex.a, uUseMap);
            gl_FragColor = vec4(rgb, a);
          }
        `,
      });
      materialCache.set(key, mat);
      return mat;
    };

    const modelPath = MODEL_GLB_PATHS[modelId] ?? MODEL_GLB_PATHS[DEFAULT_MODEL_ID];
    const url = `${import.meta.env.BASE_URL}${modelPath}`;
    const loader = new GLTFLoader();
    let active = true;
    const abort = new AbortController();
    const basePathFromUrl = (u: string) => {
      const s = String(u || '');
      const i = s.lastIndexOf('/');
      return i >= 0 ? s.slice(0, i + 1) : './';
    };
    const fetchArrayBufferWithProgress = async (res: Response, onProgress?: (loaded: number, total: number | null) => void) => {
      const totalRaw = Number(res.headers.get('content-length'));
      const total = Number.isFinite(totalRaw) && totalRaw > 0 ? totalRaw : null;
      const body: any = (res as any).body;
      if (!body || typeof body.getReader !== 'function') {
        if (onProgress) onProgress(1, total);
        const ab = await res.arrayBuffer();
        if (onProgress) onProgress(ab.byteLength, total ?? ab.byteLength);
        return ab;
      }
      const reader = body.getReader();
      let loaded = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = value as Uint8Array;
        chunks.push(chunk);
        loaded += chunk.byteLength;
        if (onProgress) onProgress(loaded, total);
      }
      const out = new Uint8Array(loaded);
      let off = 0;
      for (const c of chunks) {
        out.set(c, off);
        off += c.byteLength;
      }
      return out.buffer;
    };

    const applyModel = (modelRoot: THREE.Object3D) => {
      modelRootRef.current = modelRoot;
      const tW = targetWRef.current;
      const tD = targetDRef.current;
      const addon = endAddonRef.current;
      const balcony = hasBalconyRef.current;
      const roofOn = showRoofRef.current;
      const walls = modelRoot.getObjectByName('墙体');
      const floor = modelRoot.getObjectByName('地板');
      const alignBase = walls ?? modelRoot;

      let detectedRoof = false;
      modelRoot.traverse((obj) => {
        if (obj.name === '屋顶' || obj.name.startsWith('屋顶')) detectedRoof = true;
      });
      if (onHasRoofChange) onHasRoofChange(detectedRoof);

      const rotCandidates = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
      let best = { cost: Infinity, rot: 0, sx: 1, sy: 1, sz: 1 };
      const tmpV = new THREE.Vector3();
      const tmpV2 = new THREE.Vector3();
      const tmpV3 = new THREE.Vector3();

      for (const rot of rotCandidates) {
        modelRoot.position.set(0, 0, 0);
        modelRoot.rotation.set(0, rot, 0);
        modelRoot.scale.set(1, 1, 1);
        modelRoot.updateMatrixWorld(true);

        const box0 = new THREE.Box3().setFromObject(alignBase);
        const size0 = box0.getSize(tmpV);
        const sizeX = Math.max(1e-6, Math.abs(size0.x));
        const sizeZ = Math.max(1e-6, Math.abs(size0.z));
        const sx = tW / sizeX;
        const sz = tD / sizeZ;
        const sy = (sx + sz) / 2;

        modelRoot.scale.set(sx, sy, sz);
        modelRoot.updateMatrixWorld(true);

        let cost = Math.abs(Math.log(Math.max(1e-6, sx) / Math.max(1e-6, sz)));
        if (floor && walls) {
          const cw = new THREE.Box3().setFromObject(walls).getCenter(tmpV2);
          const cf = new THREE.Box3().setFromObject(floor).getCenter(tmpV3);
          const dx = cf.x - cw.x;
          const dz = cf.z - cw.z;
          const len = Math.hypot(dx, dz);
          if (len > 1e-6) {
            const dot = (-dx / len);
            cost += (1 - dot) * 1.25;
          }
        }
        if (cost < best.cost) best = { cost, rot, sx, sy, sz };
      }

      modelRoot.position.set(0, 0, 0);
      modelRoot.rotation.set(0, best.rot, 0);
      modelRoot.scale.set(best.sx, best.sy, best.sz);

      modelRoot.updateMatrixWorld(true);
      const alignedBox = new THREE.Box3().setFromObject(alignBase);
      const c = alignedBox.getCenter(new THREE.Vector3());
      const minY = alignedBox.min.y;
      modelRoot.position.set(-c.x, -minY, -c.z);
      modelRoot.updateMatrixWorld(true);

      modelRoot.traverse((obj) => {
        if (obj.name === '建筑1' || obj.name === '建筑2') obj.visible = false;
        const rightOn = addon === 'end-right' || addon === 'end-both';
        const leftOn = addon === 'end-left' || addon === 'end-both';
        if (!rightOn && obj.name === '建筑3') obj.visible = false;
        if (!leftOn && obj.name === '建筑4') obj.visible = false;
        if (!balcony) {
          if (obj.name === '地板' || obj.name === '椅子') obj.visible = false;
        }
        const isRoof = obj.name === '屋顶' || obj.name.startsWith('屋顶');
        const isDeckRoof = obj.name === '屋顶001';
        if (isRoof) obj.visible = roofOn && (balcony || !isDeckRoof);
      });

      modelRoot.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const m = obj.material as any;
          const color = m?.color?.isColor ? (m.color as THREE.Color).clone() : new THREE.Color(0xffffff);
          const map = (m?.map && m.map.isTexture) ? (m.map as THREE.Texture) : null;
          const mapKey = map ? (map.uuid ?? 'map') : 'nomap';
          const mat = makeMat(`${color.getHexString()}-${mapKey}`, color, map);
          obj.material = mat;
          obj.frustumCulled = false;
        }
        obj.frustumCulled = false;
      });

      modelGroup.clear();
      modelGroup.add(modelRoot);
      setReady(true);
      if (onProgressChange) onProgressChange({ loaded: 1, total: 1, progress: 1 });
      renderer.render(scene, cam);
    };
    applyModelRef.current = applyModel;

    const load = async () => {
      setReady(false);
      if (onProgressChange) onProgressChange({ loaded: 0, total: null, progress: null });
      try {
        const cacheKey = new Request(url, { method: 'GET' });
        let cached: Response | null = null;
        if ('caches' in window) {
          try {
            const cache = await caches.open('xhomes-glb-v1');
            cached = (await cache.match(cacheKey)) ?? null;
          } catch {
            cached = null;
          }
        }

        const cachedEtag = cached?.headers.get('etag') ?? null;
        const cachedLm = cached?.headers.get('last-modified') ?? null;
        const condHeaders = new Headers();
        let hasCondHeaders = false;
        if (cachedEtag) {
          condHeaders.set('If-None-Match', cachedEtag);
          hasCondHeaders = true;
        } else if (cachedLm) {
          condHeaders.set('If-Modified-Since', cachedLm);
          hasCondHeaders = true;
        }

        let res: Response;
        if (cached && hasCondHeaders) {
          const net = await fetch(url, { signal: abort.signal, cache: 'no-cache', headers: condHeaders });
          if (!active) return;
          if (net.status === 304) res = cached.clone();
          else if (net.ok) {
            res = net;
            if ('caches' in window) {
              try {
                const cache = await caches.open('xhomes-glb-v1');
                await cache.put(cacheKey, net.clone());
              } catch {
              }
            }
          } else {
            throw new Error(`HTTP ${net.status} ${net.statusText}`);
          }
        } else if (cached) {
          res = cached.clone();
        } else {
          const net = await fetch(url, { signal: abort.signal, cache: 'force-cache' });
          if (!active) return;
          if (!net.ok) throw new Error(`HTTP ${net.status} ${net.statusText}`);
          res = net;
          if ('caches' in window) {
            try {
              const cache = await caches.open('xhomes-glb-v1');
              await cache.put(cacheKey, net.clone());
            } catch {
            }
          }
        }

        const ab = await fetchArrayBufferWithProgress(res, (loaded, total) => {
          if (!active) return;
          const progress = total ? Math.max(0, Math.min(1, loaded / total)) : null;
          if (onProgressChange) onProgressChange({ loaded, total, progress });
        });
        if (!active) return;

        loader.parse(
          ab,
          basePathFromUrl(url),
          (gltf) => {
            if (!active) return;
            applyModel(gltf.scene);
          },
          () => {
            if (!active) return;
            setReady(false);
            if (onProgressChange) onProgressChange({ loaded: 0, total: null, progress: null });
          }
        );
      } catch (err: any) {
        if (!active) return;
        if (err?.name === 'AbortError') return;
        setReady(false);
        if (onProgressChange) onProgressChange({ loaded: 0, total: null, progress: null });
      }
    };

    void load();

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = cam;
    rootRef.current = root;
    modelGroupRef.current = modelGroup;

    return () => {
      active = false;
      setReady(false);
      if (onProgressChange) onProgressChange({ loaded: 0, total: null, progress: null });
      try {
        abort.abort();
      } catch {
      }
      renderer.dispose();
      materialCache.forEach((m) => m.dispose());
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      rootRef.current = null;
      modelGroupRef.current = null;
      modelRootRef.current = null;
      uniformsRef.current = null;
      applyModelRef.current = null;
    };
  }, [enabled, modelId, canvasW, canvasH]);

  useEffect(() => {
    if (!enabled) return;
    const rootNow = modelRootRef.current;
    if (!rootNow) return;
    rootNow.traverse((obj) => {
      const isRoof = obj.name === '屋顶' || obj.name.startsWith('屋顶');
      const isDeckRoof = obj.name === '屋顶001';
      if (obj.name === '建筑1' || obj.name === '建筑2') {
        obj.visible = false;
        return;
      }
      const rightOn = endAddon === 'end-right' || endAddon === 'end-both';
      const leftOn = endAddon === 'end-left' || endAddon === 'end-both';
      if (obj.name === '建筑3') obj.visible = rightOn;
      if (obj.name === '建筑4') obj.visible = leftOn;
      if (!hasBalcony) {
        if (obj.name === '地板' || obj.name === '椅子') obj.visible = false;
      }
      if (isRoof) obj.visible = showRoof && (hasBalcony || !isDeckRoof);
    });
    const r = rendererRef.current;
    const s = sceneRef.current;
    const c = cameraRef.current;
    if (r && s && c) r.render(s, c);
  }, [enabled, endAddon, hasBalcony, showRoof]);

  useEffect(() => {
    if (!enabled) return;
    const uniforms = uniformsRef.current;
    if (!uniforms) return;
    if (!isoSceneParams) return;
    if (!aduCenterLocal) return;

    uniforms.uCanvasW.value = canvasW;
    uniforms.uCanvasH.value = canvasH;
    uniforms.uTx.value = isoSceneParams.tx;
    uniforms.uTy.value = isoSceneParams.ty;
    uniforms.uScale.value = isoSceneParams.s;
    uniforms.uPivotIsoX.value = isoSceneParams.pivotX;
    uniforms.uPivotIsoY.value = isoSceneParams.pivotY;
    uniforms.uYawDeg.value = orbitYawDeg;
    uniforms.uPitchDeg.value = orbitPitchDeg;
    uniforms.uPivotX.value = aduCenterLocal.x;
    uniforms.uPivotY.value = aduCenterLocal.y;
    uniforms.uDepthScale.value = Math.max(800, Math.max(canvasW, canvasH) * 2.5);

    const modelGroup = modelGroupRef.current;
    if (modelGroup) {
      modelGroup.position.set(aduCenterLocal.x, 0, aduCenterLocal.y);
      modelGroup.rotation.y = (-(aduRotationDeg + lotRotationDeg) * Math.PI) / 180 + glbYawOffsetRad;
    }

    const r = rendererRef.current;
    const s = sceneRef.current;
    const c = cameraRef.current;
    if (r && s && c) r.render(s, c);
  }, [enabled, canvasW, canvasH, isoSceneParams, orbitYawDeg, orbitPitchDeg, aduCenterLocal, aduRotationDeg, lotRotationDeg]);

  useEffect(() => {
    if (!onPickApiChange) return;
    if (!enabled) {
      onPickApiChange(null);
      return;
    }
    onPickApiChange({
      pick: (clientX: number, clientY: number) => {
        const canvas = hostRef.current;
        const camera = cameraRef.current;
        const model = modelGroupRef.current;
        if (!canvas || !camera || !model) return null;
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(1, rect.width);
        const h = Math.max(1, rect.height);
        const nx = ((clientX - rect.left) / w) * 2 - 1;
        const ny = -(((clientY - rect.top) / h) * 2 - 1);
        if (!Number.isFinite(nx) || !Number.isFinite(ny)) return null;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
        const hits = raycaster.intersectObject(model, true);
        const hit = hits.find((x) => x && x.point) as any;
        if (!hit) return null;
        const p = hit.point as THREE.Vector3;

        const toClient = (vWorld: THREE.Vector3) => {
          const ndc = vWorld.clone().project(camera);
          return {
            x: rect.left + ((ndc.x + 1) / 2) * w,
            y: rect.top + ((-ndc.y + 1) / 2) * h,
          };
        };
        const distToSeg2d = (p0: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
          const abx = b.x - a.x;
          const aby = b.y - a.y;
          const apx = p0.x - a.x;
          const apy = p0.y - a.y;
          const ab2 = abx * abx + aby * aby;
          const t = ab2 < 1e-9 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
          const cx = a.x + abx * t;
          const cy = a.y + aby * t;
          const dx = p0.x - cx;
          const dy = p0.y - cy;
          return { d: Math.hypot(dx, dy), t };
        };

        const cornerRadiusPx = 7;
        const edgeRadiusPx = 6;
        const cursor = { x: clientX, y: clientY };

        try {
          const obj = hit.object as THREE.Object3D | undefined;
          const face = hit.face as any;
          const geom = (obj as any)?.geometry as THREE.BufferGeometry | undefined;
          const pos = geom?.attributes?.position as THREE.BufferAttribute | undefined;
          if (obj && geom && pos && face && Number.isFinite(face.a) && Number.isFinite(face.b) && Number.isFinite(face.c)) {
            const iA = Number(face.a) | 0;
            const iB = Number(face.b) | 0;
            const iC = Number(face.c) | 0;
            const vA = new THREE.Vector3().fromBufferAttribute(pos, iA).applyMatrix4(obj.matrixWorld);
            const vB = new THREE.Vector3().fromBufferAttribute(pos, iB).applyMatrix4(obj.matrixWorld);
            const vC = new THREE.Vector3().fromBufferAttribute(pos, iC).applyMatrix4(obj.matrixWorld);

            const sA = toClient(vA);
            const sB = toClient(vB);
            const sC = toClient(vC);

            const dA = Math.hypot(cursor.x - sA.x, cursor.y - sA.y);
            const dB = Math.hypot(cursor.x - sB.x, cursor.y - sB.y);
            const dC = Math.hypot(cursor.x - sC.x, cursor.y - sC.y);
            const dMin = Math.min(dA, dB, dC);
            if (dMin <= cornerRadiusPx) {
              const v = dMin === dA ? vA : (dMin === dB ? vB : vC);
              return { x: v.x, y: v.z, z: v.y, snapped: true, kind: 'vertex' };
            }

            const eAB = distToSeg2d(cursor, sA, sB);
            const eBC = distToSeg2d(cursor, sB, sC);
            const eCA = distToSeg2d(cursor, sC, sA);
            let best = eAB;
            let p0 = vA;
            let p1 = vB;
            if (eBC.d < best.d) { best = eBC; p0 = vB; p1 = vC; }
            if (eCA.d < best.d) { best = eCA; p0 = vC; p1 = vA; }
            if (best.d <= edgeRadiusPx) {
              const t = best.t;
              const v = new THREE.Vector3(
                p0.x + (p1.x - p0.x) * t,
                p0.y + (p1.y - p0.y) * t,
                p0.z + (p1.z - p0.z) * t
              );
              return { x: v.x, y: v.z, z: v.y, snapped: true, kind: 'edge' };
            }
          }
        } catch {
        }

        return { x: p.x, y: p.z, z: p.y, snapped: false, kind: 'surface' };
      }
    });
    return () => onPickApiChange(null);
  }, [enabled, onPickApiChange]);

  if (!enabled) return null;
  return (
    <canvas
      ref={hostRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
    />
  );
}
