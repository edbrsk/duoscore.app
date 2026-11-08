// Adapted from https://github.com/chuspeeism/iphone-duo (MIT, see fold/LICENSE).
// Shows DuoScore's screenshots on the inner and cover screens and unfolds the phone once on load.
import * as THREE from 'three';
import { USDLoader } from 'three/addons/loaders/USDLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const viewport = document.querySelector('[data-fold-viewport]');
const toggle = document.querySelector('[data-fold-toggle]');
const toggleLabel = document.querySelector('[data-fold-label]');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const OPEN = 180;
const CLOSED = 0;

if (viewport) {
  start().catch(error => {
    viewport.classList.add('is-failed');
    console.error(error);
  });
}

async function loadScreen(src, width, height, label) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext('2d');
  c.fillStyle = '#1E2128';
  c.fillRect(0, 0, width, height);
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    const scale = Math.max(width / img.width, height / img.height);
    c.drawImage(img, (width - img.width * scale) / 2, (height - img.height * scale) / 2, img.width * scale, img.height * scale);
  } catch {
    const glow = c.createRadialGradient(width / 2, height * .42, 0, width / 2, height * .42, width * .6);
    glow.addColorStop(0, 'rgba(178, 197, 255, .16)');
    glow.addColorStop(1, 'rgba(178, 197, 255, .00)');
    c.fillStyle = glow;
    c.fillRect(0, 0, width, height);
    c.fillStyle = '#E2E2E9';
    c.textAlign = 'center';
    c.font = `700 ${Math.round(height * .045)}px Montserrat, Inter, sans-serif`;
    c.fillText(label, width / 2, height * .48);
    c.fillStyle = '#AEB2BF';
    c.font = `${Math.round(height * .028)}px "JetBrains Mono", monospace`;
    c.fillText(src, width / 2, height * .54);
  }
  return canvas;
}

async function loadModel() {
  const loader = new USDLoader();
  const plain = () => loader.loadAsync('assets/iPhone_Duo_Render.usdc');
  if (!('DecompressionStream' in window)) return plain();
  try {
    const response = await fetch('assets/iPhone_Duo_Render.usdc.gz');
    if (!response.ok) throw new Error(`model: ${response.status}`);
    const bytes = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    return await new Promise((resolve, reject) => loader.parse(bytes, 'assets/', resolve, reject));
  } catch {
    return plain();
  }
}

async function start() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 250);
  camera.position.set(0, 0, 40);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  viewport.appendChild(renderer.domElement);

  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(environment, .04).texture;
  environment.dispose();
  pmrem.dispose();
  scene.environmentIntensity = 1.35;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb5baa8, 1.8));
  const key = new THREE.DirectionalLight(0xfffcf5, 2.6);
  key.position.set(-15, 25, 30);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe8edf5, 2);
  rim.position.set(15, 5, -15);
  scene.add(rim);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  // The page must keep scrolling over the hero, so no wheel zoom and no touch rotation.
  controls.enableZoom = false;
  controls.enabled = !matchMedia('(pointer: coarse)').matches;
  renderer.domElement.style.touchAction = 'pan-y';
  controls.minAzimuthAngle = -Math.PI / 3;
  controls.maxAzimuthAngle = Math.PI / 3;
  controls.minPolarAngle = Math.PI / 3;
  controls.maxPolarAngle = Math.PI * 2 / 3;
  controls.target.set(0, 0, .275454);
  controls.update();

  const phone = new THREE.Group();
  scene.add(phone);
  const bend = { value: 0 };
  let angle = OPEN;
  let transition = null;

  const uiReferenceEye = new THREE.Vector3(0, 0, 40);
  const innerUIFrame = new THREE.Vector4(-7.89935, .34562 - 5.8974, 15.7987, 11.1035);
  const outerUIFrame = new THREE.Vector4(.23396, .27173 - 5.8974, 7.73936, 11.2513)
    .multiplyScalar((uiReferenceEye.z - .24948) / (uiReferenceEye.z - .825538));
  const [innerCanvas, outerCanvas] = await Promise.all([
    loadScreen('screens/web/open-1600.jpg', 1600, 1125, 'Open · inner screen'),
    loadScreen('screens/web/closed-800.jpg', 774, 1125, 'Closed · cover screen'),
  ]);
  const screens = {};
  for (const [kind, canvas, frame] of [['inner', innerCanvas, innerUIFrame], ['outer', outerCanvas, outerUIFrame]]) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    screens[kind] = {
      material: new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
      frame: { value: frame.clone() },
      gradient: { value: new THREE.Vector2(kind === 'inner' ? .5 : 0, kind === 'inner' ? 0 : 1) },
      pixel: { value: new THREE.Vector2(1 / canvas.width, 1 / canvas.height) },
    };
  }

  function setAngle(value) {
    angle = value;
    bend.value = (OPEN - value) / OPEN * Math.PI;
    // Closed, the phone sits on the camera half; slide it so it stays centred in the hero.
    phone.position.x = -3.95 * (1 - value / OPEN);
    screens.outer.material.color.setScalar(value >= OPEN ? 0 : 1);
  }

  function foldTo(target, duration = 1.4) {
    transition = { from: angle, to: target, elapsed: 0, duration };
    toggleLabel.textContent = target === OPEN ? 'Fold' : 'Unfold';
    toggle.setAttribute('aria-label', target === OPEN ? 'Fold the phone' : 'Unfold the phone');
  }

  function resize() {
    const { width, height } = viewport.getBoundingClientRect();
    renderer.setSize(width, height);
    camera.aspect = width / height;
    const pixelsPerUnit = Math.min(width / 18.5, height / 13.5);
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(height / pixelsPerUnit / 2 / 40));
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(viewport);

  const screenShader = `
uniform float foldAngle;
uniform vec2 uiPixel;
uniform vec4 uiFrame;
uniform vec2 uiGradient;
uniform vec3 uiReferenceEye;
varying vec3 vUIPosition;
vec3 screenColor() {
  // Intersect the fixed front-view ray with the unfolded inner-screen plane.
  float depth = (0.24948 - uiReferenceEye.z) / (vUIPosition.z - uiReferenceEye.z);
  vec2 projected = uiReferenceEye.xy + (vUIPosition.xy - uiReferenceEye.xy) * depth;
  vec2 sourceUV = (projected - uiFrame.xy) / uiFrame.zw;
  #ifdef INNER_UI
    float progress = clamp(foldAngle / 1.570796327, 0.0, 1.0);
  #else
    // Anchor the image to the projected hinge-side edge of the outer screen.
    float c = cos(foldAngle), s = sin(foldAngle);
    vec2 hingeEdge = vec2(-0.23396, -0.27463 - 0.275454);
    vec2 foldedEdge = vec2(c * hingeEdge.x + s * hingeEdge.y,
      -s * hingeEdge.x + c * hingeEdge.y + 0.275454);
    float edgeDepth = (0.24948 - uiReferenceEye.z) / (foldedEdge.y - uiReferenceEye.z);
    float anchorX = uiReferenceEye.x + (foldedEdge.x - uiReferenceEye.x) * edgeDepth;
    sourceUV.x = uiGradient.x + (projected.x - anchorX) / uiFrame.z;
    float progress = clamp((3.141592654 - foldAngle) / 1.570796327, 0.0, 1.0);
  #endif
  float edge = (sourceUV.x - uiGradient.x) / (uiGradient.y - uiGradient.x);
  float motion = smoothstep(0.0, 1.0, progress);
  float blurGradient = clamp(edge, 0.0, 1.0);
  float darkenGradient = clamp((edge - 0.2) / 0.8, 0.0, 1.0);
  float effect = motion * pow(darkenGradient, 1.35);
  float radius = 72.0 * motion * pow(blurGradient, 1.35);
  vec2 aa = max(fwidth(sourceUV), uiPixel * 0.5);
  vec2 dx = dFdx(sourceUV) / uiPixel;
  vec2 dy = dFdy(sourceUV) / uiPixel;
  float baseLod = log2(max(1.0, max(length(dx), length(dy))));
  vec2 coverage = smoothstep(-aa, aa, sourceUV)
    * (1.0 - smoothstep(vec2(1.0) - aa, vec2(1.0) + aa, sourceUV));
  vec3 color = textureLod(map, clamp(sourceUV, vec2(0.0), vec2(1.0)), baseLod).rgb * coverage.x * coverage.y;
  if (radius > 0.0) {
    // Use the same mip level at zero blur, then increase it continuously.
    float lod = max(baseLod, log2(max(1.0, radius)));
    vec2 footprint = max(aa, uiPixel * radius * 0.75);
    color = vec3(0.0);
    for (int y = -2; y <= 2; y++) {
      for (int x = -2; x <= 2; x++) {
        float wx = x == 0 ? 6.0 : (abs(x) == 1 ? 4.0 : 1.0);
        float wy = y == 0 ? 6.0 : (abs(y) == 1 ? 4.0 : 1.0);
        vec2 sampleUV = sourceUV + vec2(float(x), float(y)) * uiPixel * radius;
        // Blur the image and its coverage together so color spreads into the black margin.
        vec2 coverage = smoothstep(-footprint, footprint, sampleUV)
          * (1.0 - smoothstep(vec2(1.0) - footprint, vec2(1.0) + footprint, sampleUV));
        color += textureLod(map, clamp(sampleUV, vec2(0.0), vec2(1.0)), lod).rgb
          * coverage.x * coverage.y * wx * wy / 256.0;
      }
    }
  }
  return color * (1.0 - min(1.0, effect * 2.0));
}
`;

  // The camera half stays in its original transform. Only the cover half rotates.
  const foldShader = `
uniform float foldAngle;
vec2 rotateHinge(vec2 p) {
  float c = cos(foldAngle), s = sin(foldAngle);
  p.y -= 0.275454;
  return vec2(c * p.x + s * p.y, -s * p.x + c * p.y + 0.275454);
}
#ifdef FLEXIBLE_SCREEN
vec4 bendStrip(vec3 p) {
  float halfWidth = 0.35;
  if (p.x >= halfWidth) return vec4(p.x, p.z, 1.0, 0.0);
  if (p.x <= -halfWidth) return vec4(rotateHinge(p.xz), cos(foldAngle), -sin(foldAngle));
  float t = (p.x + halfWidth) / (2.0 * halfWidth);
  float t2 = t*t, t3 = t2*t;
  vec2 a = rotateHinge(vec2(-halfWidth, p.z));
  vec2 b = vec2(halfWidth, p.z);
  vec2 ta = 2.0 * halfWidth * vec2(cos(foldAngle), -sin(foldAngle));
  vec2 tb = vec2(2.0 * halfWidth, 0.0);
  vec2 point = (2.0*t3-3.0*t2+1.0)*a + (t3-2.0*t2+t)*ta + (-2.0*t3+3.0*t2)*b + (t3-t2)*tb;
  vec2 tangent = normalize((6.0*t2-6.0*t)*a + (3.0*t2-4.0*t+1.0)*ta + (-6.0*t2+6.0*t)*b + (3.0*t2-2.0*t)*tb);
  return vec4(point, tangent);
}
#endif
`;

  const model = await loadModel();
  model.scale.multiplyScalar(100);
  model.updateMatrixWorld(true);
  model.traverse(object => {
    if (!object.isMesh) return;
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
    geometry.translate(0, -5.8974, 0);
    let ancestor = object;
    while (ancestor && !['upTUAKvMVkPOMKq', 'SiftyleUEEZwLhF'].includes(ancestor.name)) ancestor = ancestor.parent;
    const moving = ancestor?.name === 'upTUAKvMVkPOMKq';
    const flexible = ['JnJdTkxbQgUtLwU', 'xdyyaajWsatVNxN', 'UXtsBZYlaUvHoEh', 'MvKPXGSdYDVvSpk'].includes(object.name);
    const kind = object.name === 'UXtsBZYlaUvHoEh' ? 'inner' : object.name === 'hhgAIoCGsHXeDPY' ? 'outer' : null;
    const material = kind ? screens[kind].material : object.material.clone();
    if (kind) {
      const p = geometry.attributes.position;
      const uv = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) {
        uv[i * 2] = kind === 'inner' ? (p.getX(i) + 7.89935) / 15.7987 : (-.23396 - p.getX(i)) / 7.73936;
        uv[i * 2 + 1] = kind === 'inner' ? (p.getY(i) + 5.8974 - .34562) / 11.1035 : (p.getY(i) + 5.8974 - .27173) / 11.2513;
      }
      geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    if (moving || flexible) {
      material.onBeforeCompile = shader => {
        shader.uniforms.foldAngle = bend;
        if (kind) {
          shader.uniforms.uiFrame = screens[kind].frame;
          shader.uniforms.uiGradient = screens[kind].gradient;
          shader.uniforms.uiReferenceEye = { value: uiReferenceEye };
          shader.uniforms.uiPixel = screens[kind].pixel;
          shader.fragmentShader = shader.fragmentShader.replace('#include <map_pars_fragment>', `
            #include <map_pars_fragment>
            ${kind === 'inner' ? '#define INNER_UI' : ''}
            ${screenShader}
          `).replace('#include <map_fragment>', 'diffuseColor.rgb *= screenColor();');
          shader.vertexShader = `varying vec3 vUIPosition;\n${shader.vertexShader}`;
          shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
            vUIPosition = transformed;
            #include <project_vertex>
          `);
        }
        shader.vertexShader = `${flexible ? '#define FLEXIBLE_SCREEN\n' : ''}${foldShader}\n${shader.vertexShader}`;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', flexible ? `
          vec4 folded = bendStrip(position);
          vec3 transformed = vec3(folded.x, position.y, folded.y);
        ` : `
          vec2 folded = rotateHinge(position.xz);
          vec3 transformed = vec3(folded.x, position.y, folded.y);
        `);
        shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
          vec3 objectNormal = vec3(normal);
          ${flexible ? 'vec4 strip = bendStrip(position); float a = atan(-strip.w, strip.z);' : 'float a = foldAngle;'}
          objectNormal.x = cos(a) * normal.x + sin(a) * normal.z;
          objectNormal.z = -sin(a) * normal.x + cos(a) * normal.z;
        `);
      };
      material.customProgramCacheKey = () => `${flexible ? 'fold-flexible' : 'fold-cover'}-${kind || 'body'}`;
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = object.name;
    mesh.frustumCulled = false;
    phone.add(mesh);
  });

  setAngle(reduceMotion ? OPEN : CLOSED);
  toggleLabel.textContent = reduceMotion ? 'Fold' : 'Unfold';
  viewport.classList.add('is-ready');
  toggle.hidden = false;
  toggle.addEventListener('click', () => foldTo(angle >= OPEN / 2 ? CLOSED : OPEN));
  if (!reduceMotion) setTimeout(() => foldTo(OPEN, 2.2), 600);

  let lastTime = performance.now();
  function frame(now) {
    const delta = Math.min((now - lastTime) / 1000, .05);
    lastTime = now;
    if (transition) {
      transition.elapsed += delta;
      const progress = Math.min(transition.elapsed / transition.duration, 1);
      const ease = progress * progress * (3 - 2 * progress);
      setAngle(THREE.MathUtils.lerp(transition.from, transition.to, ease));
      if (progress === 1) transition = null;
    }
    controls.update();
    renderer.render(scene, camera);
  }
  // Stop rendering while the hero is scrolled out of view.
  new IntersectionObserver(([entry]) => {
    lastTime = performance.now();
    renderer.setAnimationLoop(entry.isIntersecting ? frame : null);
  }).observe(viewport);
}
