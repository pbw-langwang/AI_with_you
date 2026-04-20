<template>
  <div ref="root" class="route-floor-3d"></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { appState } from "../stores/app";
defineProps<{ durationSec?: number }>();

const root = ref<HTMLDivElement | null>(null);
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let arrow: THREE.Mesh | null = null;
let walker: THREE.Group | null = null;
let controls: OrbitControls | null = null;
let rafId = 0;
let segs: { a: THREE.Vector3; b: THREE.Vector3 }[] | null = null;
let segLens: number[] = [];
let sentenceActive = false;
let sentenceStart = 0;
let sentenceEstimatedMs = 0;
let travelAccum = 0;
let segmentStartTravel = 0;
let blockTargetIdx = 0;
let blockTargetTravel = 0;
let step1EndIdx = 0;
let step2EndIdx = 0;
let step3EndIdx = 0;
let step4EndIdx = 0;
const travelOfIdx = (idx: number) =>
  segLens
    .slice(0, Math.max(0, Math.min(idx + 1, segLens.length)))
    .reduce((a, b) => a + b, 0);
let lastSubtitle = "";
let lastStepIdx = 0;
function detectStepIdx(text: string): number {
  const guide = appState.ui.routeGuide?.steps ?? [];
  const cleaned = text.replace(/^\s*\d+[、\.]/, "").replace(/\s+/g, "");
  for (let i = 0; i < guide.length; i++) {
    const g = guide[i].replace(/\s+/g, "");
    if (cleaned.includes(g) || text.includes(guide[i])) return i + 1;
  }

  const t = cleaned;
  if (/入口/.test(t)) return 1;
  if (/按照图中/.test(t)) return 2;
  if (/乘电梯/.test(t)) return 3;
  if (/走廊/.test(t)) return 4;
  return 0;
}

function buildScene(el: HTMLDivElement) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf7fbff);

  const width = el.clientWidth;
  const height = el.clientHeight || 220;
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(120, 100, 180);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  el.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 60;
  controls.maxDistance = 400;
  controls.target.set(0, 10, 0);
  controls.update();

  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.5);
  dir.position.set(50, 100, 50);
  scene.add(dir);

  // 仅保留路径
  const pathWidth = 3.5;
  const pathThicknessY = 0.6;
  const pathColor = 0x0a84ff;

  segs = [
    // 1F - “5”字型路径
    { a: new THREE.Vector3(-60, 2, -20), b: new THREE.Vector3(0, 2, -20) }, // 顶横
    { a: new THREE.Vector3(0, 2, -20), b: new THREE.Vector3(0, 2, 0) }, // 下竖
    { a: new THREE.Vector3(0, 2, 0), b: new THREE.Vector3(-60, 2, 0) }, // 中横
    { a: new THREE.Vector3(-60, 2, 0), b: new THREE.Vector3(-60, 2, 20) }, // 下竖
    { a: new THREE.Vector3(-60, 2, 20), b: new THREE.Vector3(40, 2, 20) }, // 底横到右侧
    { a: new THREE.Vector3(40, 2, 20), b: new THREE.Vector3(40, 2, 0) }, // 回到电梯口
    // 电梯上升段
    { a: new THREE.Vector3(40, 2, 0), b: new THREE.Vector3(40, 18, 0) },
    // 2F - 一条直线到终点
    { a: new THREE.Vector3(40, 18, 0), b: new THREE.Vector3(-25, 18, 0) },
  ];

  function addFloorPlane(yLevel: number) {
    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    for (const s of segs!) {
      const ay = s.a.y,
        by = s.b.y;
      if (Math.abs(ay - yLevel) < 1e-3 && Math.abs(by - yLevel) < 1e-3) {
        minX = Math.min(minX, s.a.x, s.b.x);
        maxX = Math.max(maxX, s.a.x, s.b.x);
        minZ = Math.min(minZ, s.a.z, s.b.z);
        maxZ = Math.max(maxZ, s.a.z, s.b.z);
      }
    }
    if (!isFinite(minX) || !isFinite(minZ)) return;
    const outward = pathWidth / 2 + pathWidth + 12 + 3;
    const w = Math.max(1, maxX - minX + outward * 2);
    const h = Math.max(1, maxZ - minZ + outward * 2);
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x99b6ff,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set((minX + maxX) / 2, yLevel - 1, (minZ + maxZ) / 2);
    scene!.add(plane);
  }

  function addRectPath(seg: { a: THREE.Vector3; b: THREE.Vector3 }) {
    const dx = seg.b.x - seg.a.x;
    const dy = seg.b.y - seg.a.y;
    const dz = seg.b.z - seg.a.z;
    const isVertical =
      Math.abs(dy) > 0 && Math.abs(dx) === 0 && Math.abs(dz) === 0;
    if (isVertical) {
      const len = Math.abs(dy);
      const geo = new THREE.BoxGeometry(pathWidth, len, pathWidth);
      const mat = new THREE.MeshPhongMaterial({ color: pathColor });
      const pillar = new THREE.Mesh(geo, mat);
      pillar.position.set(seg.a.x, (seg.a.y + seg.b.y) / 2, seg.a.z);
      scene!.add(pillar);
      return;
    }
    const len = Math.sqrt(dx * dx + dz * dz);
    const isAlongX = Math.abs(dx) > 0 && Math.abs(dz) === 0;
    const join = Math.max(0.5, pathWidth * 0.125);
    const geo = new THREE.BoxGeometry(
      isAlongX ? len + join : pathWidth,
      pathThicknessY,
      isAlongX ? pathWidth : len + join,
    );
    const mat = new THREE.MeshPhongMaterial({ color: pathColor });
    const box = new THREE.Mesh(geo, mat);
    box.position.set(
      (seg.a.x + seg.b.x) / 2,
      seg.a.y + 0.1,
      (seg.a.z + seg.b.z) / 2,
    );
    scene!.add(box);
  }
  function addCornerPlug(curr: { a: THREE.Vector3; b: THREE.Vector3 }) {
    const joinPos = curr.a;
    const geo = new THREE.BoxGeometry(pathWidth, pathThicknessY, pathWidth);
    const mat = new THREE.MeshPhongMaterial({ color: pathColor });
    const plug = new THREE.Mesh(geo, mat);
    plug.position.set(joinPos.x, joinPos.y + 0.1, joinPos.z);
    scene!.add(plug);
  }
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    addRectPath(s);
    if (i > 0) addCornerPlug(s);
  }
  addFloorPlane(2);
  addFloorPlane(18);
  segLens = segs.map((s) => s.a.distanceTo(s.b));
  step1EndIdx = 0;
  step2EndIdx = 5;
  step3EndIdx = 6;
  step4EndIdx = (segs?.length ?? 1) - 1;
  blockTargetIdx = 0;
  blockTargetTravel = travelOfIdx(0);
  sentenceActive = false;
  travelAccum = appState.ui.routeTravel || 0;
  segmentStartTravel = travelAccum;

  const startMarker = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 16, 16),
    new THREE.MeshPhongMaterial({ color: 0xff0000 }),
  );
  startMarker.position.copy(segs[0].a);
  scene.add(startMarker);

  const endMarker = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 16, 16),
    new THREE.MeshPhongMaterial({ color: 0xff0000 }),
  );
  endMarker.position.copy(segs[segs.length - 1].b);
  scene.add(endMarker);

  // 仅保留路径与箭头
  arrow = new THREE.Mesh(
    new THREE.ConeGeometry(3, 8, 16),
    new THREE.MeshPhongMaterial({ color: 0x0a84ff }),
  );
  arrow.rotation.x = Math.PI / 2;

  // 初始位置按持久化路程设置
  {
    let acc = 0;
    let idx = 0;
    while (idx < segs.length && acc + segLens[idx] < travelAccum) {
      acc += segLens[idx];
      idx++;
    }
    const seg = segs[Math.min(idx, segs.length - 1)];
    const segProg = idx >= segs.length ? 1 : (travelAccum - acc) / segLens[idx];
    const pos = new THREE.Vector3().lerpVectors(
      seg.a,
      seg.b,
      isFinite(segProg) ? Math.max(0, Math.min(1, segProg)) : 0,
    );
    arrow.position.copy(pos);
    const dirVec = new THREE.Vector3().subVectors(seg.b, seg.a).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, dirVec);
    arrow.quaternion.copy(q);
  }
  scene.add(arrow);

  // 恢复小人
  {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2, 6, 16),
      new THREE.MeshPhongMaterial({ color: 0x333333 }),
    );
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 16, 16),
      new THREE.MeshPhongMaterial({ color: 0x555555 }),
    );
    head.position.y = 4.5;
    walker = new THREE.Group();
    walker.add(body);
    walker.add(head);
    walker.position.copy(
      arrow.position.clone().add(new THREE.Vector3(0, 3, 0)),
    );
    scene.add(walker);
  }

  // 路径附近少量白方块（两侧少量，表现走廊感）
  let feePlaced = false;
  let roomCount1F = 0;
  let labCount2F = 0;
  const blockH = 8;
  const lateralThick = 12;
  const leaveGap = pathWidth; // 保留与路径、科室之间的空隙等于路径宽
  function createEdgeBlock(
    text: string,
    pos: THREE.Vector3,
    dims: { w: number; h: number; d: number },
  ) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(dims.w, dims.h, dims.d),
      new THREE.MeshPhongMaterial({ color: 0xffffff }),
    );
    box.position.copy(pos);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const font = "bold 16px sans-serif";
    ctx.font = font;
    const paddingX = 6;
    const paddingY = 4;
    const tW = Math.ceil(ctx.measureText(text).width);
    const tH = 20;
    canvas.width = tW + paddingX * 2;
    canvas.height = tH + paddingY * 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#222";
    ctx.textBaseline = "middle";
    ctx.font = font;
    ctx.fillText(text, (canvas.width - tW) / 2, canvas.height / 2);
    const tex = new THREE.CanvasTexture(canvas);
    const labelW = 22;
    const labelD = 12;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(labelW, labelD),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(pos.x, pos.y + dims.h / 2 + 0.05, pos.z);
    const group = new THREE.Group();
    group.add(box);
    group.add(plane);
    scene!.add(group);
  }
  const minLenForBlock = pathWidth * 8;
  const placedAABBs: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    y: number;
  }[] = [];
  segs!.forEach((s) => {
    const dx = s.b.x - s.a.x;
    const dy = s.b.y - s.a.y;
    const dz = s.b.z - s.a.z;
    const isVertical =
      Math.abs(dy) > 0 && Math.abs(dx) === 0 && Math.abs(dz) === 0;
    if (isVertical) return;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < minLenForBlock) return;
    const isAlongX = Math.abs(dx) > 0 && Math.abs(dz) === 0;
    const cy = s.a.y;
    const is2F = cy > 10;
    const placeFeeLeft = !is2F && !feePlaced;
    if (placeFeeLeft) feePlaced = true;
    const tryTs = [0.35, 0.65, 0.5];
    function intersects(
      minX: number,
      maxX: number,
      minZ: number,
      maxZ: number,
      y: number,
    ) {
      for (const b of placedAABBs) {
        if (Math.abs(b.y - y) > 0.5) continue;
        if (
          minX <= b.maxX &&
          maxX >= b.minX &&
          minZ <= b.maxZ &&
          maxZ >= b.minZ
        )
          return true;
      }
      return false;
    }
    if (isAlongX) {
      const blockLen = Math.max(4, (len - 2 * leaveGap) * 0.9);
      const dims = { w: blockLen, h: blockH, d: lateralThick };
      const offset = pathWidth / 2 + leaveGap + dims.d / 2;
      for (const t of tryTs) {
        const cx = s.a.x + dx * t;
        const czL = s.a.z + dz * t + offset;
        const minXL = cx - dims.w / 2,
          maxXL = cx + dims.w / 2;
        const minZL = czL - dims.d / 2,
          maxZL = czL + dims.d / 2;
        if (!intersects(minXL, maxXL, minZL, maxZL, cy)) {
          const textL = placeFeeLeft
            ? "收费室"
            : is2F
              ? `化验室${++labCount2F}`
              : `科室${++roomCount1F}`;
          createEdgeBlock(textL, new THREE.Vector3(cx, cy, czL), dims);
          placedAABBs.push({
            minX: minXL,
            maxX: maxXL,
            minZ: minZL,
            maxZ: maxZL,
            y: cy,
          });
          break;
        }
      }
      if (!placeFeeLeft) {
        for (const t of tryTs) {
          const cx = s.a.x + dx * t;
          const czR = s.a.z + dz * t - offset;
          const minXR = cx - dims.w / 2,
            maxXR = cx + dims.w / 2;
          const minZR = czR - dims.d / 2,
            maxZR = czR + dims.d / 2;
          if (!intersects(minXR, maxXR, minZR, maxZR, cy)) {
            const textR = is2F
              ? `化验室${++labCount2F}`
              : `科室${++roomCount1F}`;
            createEdgeBlock(textR, new THREE.Vector3(cx, cy, czR), dims);
            placedAABBs.push({
              minX: minXR,
              maxX: maxXR,
              minZ: minZR,
              maxZ: maxZR,
              y: cy,
            });
            break;
          }
        }
      }
    } else {
      const blockLen = Math.max(4, (len - 2 * leaveGap) * 0.9);
      const dims = { w: lateralThick, h: blockH, d: blockLen };
      const offset = pathWidth / 2 + leaveGap + dims.w / 2;
      for (const t of tryTs) {
        const cz = s.a.z + dz * t;
        const cxL = s.a.x + dx * t + offset;
        const minXL = cxL - dims.w / 2,
          maxXL = cxL + dims.w / 2;
        const minZL = cz - dims.d / 2,
          maxZL = cz + dims.d / 2;
        if (!intersects(minXL, maxXL, minZL, maxZL, cy)) {
          const textL = placeFeeLeft
            ? "收费室"
            : is2F
              ? `化验室${++labCount2F}`
              : `科室${++roomCount1F}`;
          createEdgeBlock(textL, new THREE.Vector3(cxL, cy, cz), dims);
          placedAABBs.push({
            minX: minXL,
            maxX: maxXL,
            minZ: minZL,
            maxZ: maxZL,
            y: cy,
          });
          break;
        }
      }
      if (!placeFeeLeft) {
        for (const t of tryTs) {
          const cz = s.a.z + dz * t;
          const cxR = s.a.x + dx * t - offset;
          const minXR = cxR - dims.w / 2,
            maxXR = cxR + dims.w / 2;
          const minZR = cz - dims.d / 2,
            maxZR = cz + dims.d / 2;
          if (!intersects(minXR, maxXR, minZR, maxZR, cy)) {
            const textR = is2F
              ? `化验室${++labCount2F}`
              : `科室${++roomCount1F}`;
            createEdgeBlock(textR, new THREE.Vector3(cxR, cy, cz), dims);
            placedAABBs.push({
              minX: minXR,
              maxX: maxXR,
              minZ: minZR,
              maxZ: maxZR,
              y: cy,
            });
            break;
          }
        }
      }
    }
  });
  animate();
}

watch(
  () => appState.ui.subTitleText,
  (text) => {
    const now = performance.now();
    if (text && text.length > 0) {
      // 仅在编号段落时推进；前导“好的...”不推进
      const stepIdx = detectStepIdx(text);
      if (stepIdx === 0) {
        sentenceActive = false;
        lastSubtitle = text;
        return;
      }
      if (lastSubtitle && text !== lastSubtitle && lastStepIdx > 0) {
        travelAccum = blockTargetTravel;
        segmentStartTravel = travelAccum;
      }
      if (stepIdx === 1) blockTargetIdx = step1EndIdx;
      else if (stepIdx === 2) blockTargetIdx = step2EndIdx;
      else if (stepIdx === 3) blockTargetIdx = step3EndIdx;
      else blockTargetIdx = step4EndIdx;
      blockTargetTravel = travelOfIdx(blockTargetIdx);
      if (blockTargetTravel < segmentStartTravel) {
        blockTargetTravel = segmentStartTravel;
      }
      sentenceActive = true;
      sentenceStart = now;
      const len = text.length;
      let speechMul = 1;
      let speedUPS = 25;
      if (stepIdx === 1) {
        speechMul = 1.8;
        speedUPS = 18;
      } else if (stepIdx === 2) {
        speechMul = 0.8;
        speedUPS = 60;
      } else if (stepIdx === 3) {
        speechMul = 2.0;
        speedUPS = 18;
      } else if (stepIdx === 4) {
        speechMul = 1.4;
        speedUPS = 26;
      }
      const deltaTravel = Math.max(0, blockTargetTravel - segmentStartTravel);
      const distanceMs = (deltaTravel / Math.max(1, speedUPS)) * 1000;
      const textMs = len * 120 * speechMul;
      const estimate = Math.max(distanceMs, textMs);
      sentenceEstimatedMs = Math.max(1200, Math.min(12000, estimate));
      segmentStartTravel = travelAccum;
      lastSubtitle = text;
      lastStepIdx = stepIdx;
    } else {
      if (sentenceActive) {
        sentenceActive = false;
        travelAccum = blockTargetTravel;
        segmentStartTravel = travelAccum;
      }
      lastSubtitle = "";
      lastStepIdx = 0;
    }
  },
);

function animate() {
  if (!renderer || !scene || !camera || !arrow) return;
  const t = performance.now();
  let travel = travelAccum;
  if (segs && sentenceActive) {
    const p = Math.min(
      1,
      (t - sentenceStart) / Math.max(1, sentenceEstimatedMs),
    );
    travel = segmentStartTravel + (blockTargetTravel - segmentStartTravel) * p;
  }
  if (segs && segs.length) {
    let acc = 0;
    let idx = 0;
    while (idx < segs.length && acc + segLens[idx] < travel) {
      acc += segLens[idx];
      idx++;
    }
    const seg = segs[Math.min(idx, segs.length - 1)];
    const segProg = idx >= segs.length ? 1 : (travel - acc) / segLens[idx];
    const pos = new THREE.Vector3().lerpVectors(seg.a, seg.b, segProg);
    arrow.position.copy(pos);
    const dirVec = new THREE.Vector3().subVectors(seg.b, seg.a).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, dirVec);
    arrow.quaternion.copy(q);
    if (walker) {
      walker.position.copy(pos.clone().add(new THREE.Vector3(0, 3, 0)));
      const yaw = Math.atan2(dirVec.x, dirVec.z);
      walker.rotation.set(0, yaw, 0);
    }
  }

  controls && controls.update();
  renderer.render(scene, camera);
  rafId = requestAnimationFrame(animate);
  // 持久化当前路程，保证再次发送时从当前位置继续
  appState.ui.routeTravel = travel;
  travelAccum = travel;
}

onMounted(() => {
  if (root.value) buildScene(root.value);
});

watch(
  () => appState.ui.routeResetToken,
  () => {
    // 重置到起点
    travelAccum = 0;
    segmentStartTravel = 0;
    sentenceActive = false;
    blockTargetIdx = 0;
    blockTargetTravel = 0;
    lastSubtitle = "";
    lastStepIdx = 0;
    appState.ui.routeTravel = 0;
    if (segs && segs.length && arrow) {
      const pos = segs[0].a.clone();
      arrow.position.copy(pos);
      const dirVec = new THREE.Vector3()
        .subVectors(segs[0].b, segs[0].a)
        .normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(up, dirVec);
      arrow.quaternion.copy(q);
      if (walker) {
        walker.position.copy(pos.clone().add(new THREE.Vector3(0, 3, 0)));
        walker.rotation.set(0, Math.atan2(dirVec.x, dirVec.z), 0);
      }
    }
  },
);

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId);
  if (renderer) {
    renderer.dispose();
  }
  scene = null;
  camera = null;
  arrow = null;
  controls = null;
});
</script>

<style scoped>
.route-floor-3d {
  position: absolute;
  top: 64px;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
}
</style>
