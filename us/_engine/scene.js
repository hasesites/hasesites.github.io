// 3D stage: studio car whose finish is restored as the visitor scrolls.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const range = (p, a, b) => smooth(clamp((p - a) / (b - a)));

// Camera path, keyed to the stage scroll progress (0..1).
const KEYS = [
  { p: 0.00, pos: [7.6, 1.95, 8.2], tgt: [0, 0.5, 0.1], fov: 27 },
  { p: 0.16, pos: [10.8, 1.35, 0.7], tgt: [0, 0.55, 0.15], fov: 25 },
  { p: 0.36, pos: [3.6, 0.8, 6.4], tgt: [0.1, 0.5, 1.3], fov: 29 },
  { p: 0.56, pos: [2.6, 3.6, 4.8], tgt: [0, 0.7, 0.8], fov: 29 },
  { p: 0.78, pos: [-7.0, 1.75, -6.6], tgt: [0, 0.5, 0.1], fov: 27 },
  { p: 1.00, pos: [-0.01, 14, 0.3], tgt: [0, 0, 0.25], fov: 25 },
];

function sampleKeys(p) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = smooth(clamp((p - a.p) / (b.p - a.p)));
  return {
    pos: a.pos.map((v, k) => lerp(v, b.pos[k], t)),
    tgt: a.tgt.map((v, k) => lerp(v, b.tgt[k], t)),
    fov: lerp(a.fov, b.fov, t),
  };
}

export async function createStage({ canvas, base, paint = '#1c2a44', accent = '#d9c29a', bg = '#0b0b0c', mobile = false, onProgress = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  scene.fog = new THREE.Fog(bg, 9, 20);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  // Lights: soft key from above, a rim in the accent tint, a sweep light that travels during polishing.
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 8, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 512 : 1024, mobile ? 512 : 1024);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
  key.shadow.radius = 6;
  key.shadow.bias = -0.0005;
  scene.add(key);

  const rim = new THREE.SpotLight(new THREE.Color(accent), 30, 18, Math.PI / 5, 0.8, 1.6);
  rim.position.set(-5, 3.5, -4);
  scene.add(rim, rim.target);

  const sweep = new THREE.PointLight(0xffffff, 0, 6, 1.4);
  scene.add(sweep);

  // Floor: soft mirror (desktop) + shadow catcher + a vignette disc that fades to the page background.
  const floorGroup = new THREE.Group();
  scene.add(floorGroup);
  if (!mobile) {
    const mirror = new Reflector(new THREE.CircleGeometry(9, 64), {
      textureWidth: Math.round(window.innerWidth * 0.5),
      textureHeight: Math.round(window.innerHeight * 0.5),
      color: 0x2a2a2e,
    });
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.y = -0.002;
    floorGroup.add(mirror);
  }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.55 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.receiveShadow = true;
  floorGroup.add(shadow);

  const fadeMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uCol: { value: new THREE.Color(bg) }, uGlow: { value: new THREE.Color(accent) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform vec3 uCol; uniform vec3 uGlow;
      void main(){ float d = distance(vUv, vec2(.5));
        float a = smoothstep(.05, .23, d);
        vec3 c = mix(uCol, uGlow*.018 + uCol, smoothstep(.2,.0,d));
        gl_FragColor = vec4(c, mix(.45, 1., a));
        #include <colorspace_fragment>
      }`,
  });
  const fade = new THREE.Mesh(new THREE.CircleGeometry(18, 64), fadeMat);
  fade.rotation.x = -Math.PI / 2;
  fade.position.y = 0.001;
  floorGroup.add(fade);

  // Car
  const draco = new DRACOLoader().setDecoderPath(base + 'vendor/draco/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const gltf = await new Promise((res, rej) =>
    loader.load(base + 'models/car.glb', res, (e) => e.total && onProgress(e.loaded / e.total), rej));
  const car = gltf.scene;

  const paintColor = new THREE.Color(paint);
  const paintMat = new THREE.MeshPhysicalMaterial({
    color: paintColor.clone(), metalness: 0.7, roughness: 0.2,
    clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.25,
  });
  const trimMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#0d0d0f'), metalness: 0.4, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.05,
  });
  const leatherMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(accent).multiplyScalar(0.55), roughness: 0.6 });

  car.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    const n = (o.material && o.material.name) || '';
    if (/License/i.test(o.name)) { o.visible = false; return; }
    if (/^Paint 1/i.test(n)) { const m = paintMat; if (o.material.normalMap) {} o.material = m; }
    else if (/^Paint 2/i.test(n)) o.material = trimMat;
    else if (/^Interior 3/i.test(n)) o.material = leatherMat;
    // Strip printed logos / text from emissive maps (keeps the model unbranded).
    if (o.material.emissiveMap && !/light/i.test(n)) { o.material.emissiveMap = null; o.material.emissive?.set(0x000000); }
    if (/Headlight/i.test(n)) { o.material.emissive = new THREE.Color('#f4f1ea'); o.material.emissiveIntensity = 2.2; }
    if (/Brakelight/i.test(n)) { o.material.emissive = new THREE.Color('#ff2a2a'); o.material.emissiveIntensity = 1.4; }
  });
  // Model is authored on the ground plane, nose toward +Z; centre it (bbox: x ±1.27, y 0..1.15, z -1.94..2.42).
  car.position.set(0, 0, -0.24);
  const pivot = new THREE.Group();
  pivot.add(car);
  scene.add(pivot);

  // Dust / water particles that drift through the light (only visible in the "protect" act).
  const pCount = mobile ? 220 : 520;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 9;
    pPos[i * 3 + 1] = Math.random() * 3.5;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 9;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ color: new THREE.Color(accent), size: 0.022, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  // State
  let progress = 0, target = 0;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  let running = false, raf = 0, last = performance.now(), t = 0;
  const dull = new THREE.Color(paint).lerp(new THREE.Color('#6d6a66'), 0.45).multiplyScalar(0.7);
  const tmpV = new THREE.Vector3();

  let W = 1, H = 1, shift = 0;
  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    if (!W || !H) return;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  // Horizontal framing: in the hero the car sits right of centre so the headline has room.
  function frameView(p) {
    const wide = W / H > 1.1;
    const s = wide ? -0.15 * (1 - range(p, 0.04, 0.16)) + 0.13 * (range(p, 0.12, 0.22) - range(p, 0.88, 0.97)) : 0;
    const v = wide ? 0 : 0.12 * (1 - range(p, 0.04, 0.16));
    if (Math.abs(s - shift) > 1e-4 || v) { shift = s; camera.setViewOffset(W, H, s * W, v * H, W, H); }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    progress += (target - progress) * Math.min(1, dt * 6);
    pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 3);
    pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 3);
    const p = progress;

    // Finish: glossy in the hero, goes flat & dusty, then is restored act by act.
    const gloss = p < 0.2
      ? 1 - range(p, 0.06, 0.2)
      : 0.15 * range(p, 0.28, 0.42) + 0.5 * range(p, 0.46, 0.62) + 0.35 * range(p, 0.66, 0.8);
    paintMat.roughness = lerp(0.8, 0.16, gloss);
    paintMat.clearcoat = lerp(0.0, 1.0, gloss);
    paintMat.clearcoatRoughness = lerp(0.6, 0.025, gloss);
    paintMat.color.copy(dull).lerp(paintColor, gloss);
    paintMat.envMapIntensity = lerp(0.4, 1.6, gloss);

    // Car turntable in the hero, settles once the story starts.
    const idle = 1 - range(p, 0.02, 0.14);
    pivot.rotation.y = idle * (Math.sin(t * 0.18) * 0.32) + (1 - idle) * 0;

    // Camera
    const k = sampleKeys(p);
    const ox = pointer.sx * 0.45 * (1 - range(p, 0.9, 1)), oy = pointer.sy * 0.25;
    camera.position.set(k.pos[0] + ox, k.pos[1] + oy, k.pos[2]);
    tmpV.set(k.tgt[0], k.tgt[1], k.tgt[2]);
    camera.lookAt(tmpV);
    let fov = k.fov;
    if (camera.aspect < 1.1) fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(k.fov) / 2) * Math.min(2.1, 1.3 / camera.aspect)));
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    frameView(p);

    // Polishing light sweep across the hood during "Correct".
    const s = range(p, 0.46, 0.66);
    sweep.intensity = Math.sin(s * Math.PI) * 9;
    sweep.position.set(lerp(-1.6, 1.6, s), 1.6, lerp(2.2, 0.4, s));
    rim.intensity = lerp(18, 42, range(p, 0.66, 0.8));
    pMat.opacity = 0.55 * range(p, 0.68, 0.8) * (1 - range(p, 0.92, 1));
    points.rotation.y = t * 0.02;
    const arr = pGeo.attributes.position.array;
    for (let i = 1; i < arr.length; i += 3) { arr[i] += dt * 0.06; if (arr[i] > 3.5) arr[i] = 0; }
    pGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  }

  resize();
  renderer.compile(scene, camera);
  frame(performance.now());

  return {
    setProgress(v) { target = clamp(v); },
    jump(v) { target = progress = clamp(v); },
    setPointer(x, y) { pointer.x = x; pointer.y = y; },
    resize,
    start() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}
