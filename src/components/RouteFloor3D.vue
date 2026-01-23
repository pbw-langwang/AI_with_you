<template>
  <div ref="root" class="route-floor-3d"></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { appState } from "../stores/app";

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
  if (/起点位置/.test(text)) return 1;
  if (/大厅.*电梯间|电梯间/.test(text)) return 2;
  if (/电梯/.test(text)) return 3;
  if (/走廊|目的地|科室/.test(text)) return 4;
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

  const matFloor = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
  });
  const floorGeo = new THREE.PlaneGeometry(220, 140);
  const floor1 = new THREE.Mesh(floorGeo, matFloor);
  floor1.rotation.x = -Math.PI / 2;
  floor1.position.set(0, 0, 0);
  scene.add(floor1);

  const floor2 = new THREE.Mesh(floorGeo, matFloor);
  floor2.rotation.x = -Math.PI / 2;
  floor2.position.set(0, 20, 0);
  scene.add(floor2);

  const elevatorMat = new THREE.MeshPhongMaterial({
    color: 0x9fb0c2,
    transparent: true,
    opacity: 0.25,
  });
  const elevator = new THREE.Mesh(new THREE.BoxGeometry(6, 30, 6), elevatorMat);
  elevator.position.set(40, 15, 0);
  scene.add(elevator);

  const corridorWidth = 18;
  const pathWidth = 8;
  const wallHeight = 12;
  const pathThicknessY = 0.6;
  const pathColor = 0x0a84ff;
  const wallMat = new THREE.MeshPhongMaterial({
    color: 0x7fa8d2,
    transparent: true,
    opacity: 0.25,
  });

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

  function addRectPath(seg: { a: THREE.Vector3; b: THREE.Vector3 }) {
    const dx = seg.b.x - seg.a.x;
    const dy = seg.b.y - seg.a.y;
    const dz = seg.b.z - seg.a.z;
    const isVertical =
      Math.abs(dy) > 0 && Math.abs(dx) === 0 && Math.abs(dz) === 0;
    if (isVertical) {
      const len = Math.abs(dy);
      const geo = new THREE.CylinderGeometry(
        pathWidth / 6,
        pathWidth / 6,
        len,
        12,
      );
      const mat = new THREE.MeshPhongMaterial({ color: pathColor });
      const cyl = new THREE.Mesh(geo, mat);
      cyl.position.set(seg.a.x, (seg.a.y + seg.b.y) / 2, seg.a.z);
      scene!.add(cyl);
      return;
    }
    const len = Math.sqrt(dx * dx + dz * dz);
    const isAlongX = Math.abs(dx) > 0 && Math.abs(dz) === 0;
    const geo = new THREE.BoxGeometry(
      isAlongX ? len : pathWidth,
      pathThicknessY,
      isAlongX ? pathWidth : len,
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
  function addWalls(seg: { a: THREE.Vector3; b: THREE.Vector3 }) {
    const dx = seg.b.x - seg.a.x;
    const dy = seg.b.y - seg.a.y;
    const dz = seg.b.z - seg.a.z;
    const isVertical =
      Math.abs(dy) > 0 && Math.abs(dx) === 0 && Math.abs(dz) === 0;
    if (isVertical) return;
    const len = Math.sqrt(dx * dx + dz * dz);
    const isAlongX = Math.abs(dx) > 0 && Math.abs(dz) === 0;
    const wallLen = len;
    const wallThick = 1.2;
    const offset = corridorWidth / 2;
    const wallGeo = new THREE.BoxGeometry(
      isAlongX ? wallLen : wallThick,
      wallHeight,
      isAlongX ? wallThick : wallLen,
    );
    const midX = (seg.a.x + seg.b.x) / 2;
    const midY = seg.a.y + wallHeight / 2;
    const midZ = (seg.a.z + seg.b.z) / 2;
    const w1 = new THREE.Mesh(wallGeo, wallMat);
    const w2 = new THREE.Mesh(wallGeo, wallMat);
    if (isAlongX) {
      w1.position.set(midX, midY, midZ + offset);
      w2.position.set(midX, midY, midZ - offset);
    } else {
      w1.position.set(midX + offset, midY, midZ);
      w2.position.set(midX - offset, midY, midZ);
    }
    scene!.add(w1);
    scene!.add(w2);
  }
  function createTextSprite(text: string) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = 512;
    canvas.height = 128;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#222";
    ctx.font = "bold 48px sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 32, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(64, 16, 1);
    return sprite;
  }
  segs.forEach((s) => {
    addRectPath(s);
    addWalls(s);
  });
  const deptA = createTextSprite("挂号处");
  deptA.position.set(-50, 6, -20);
  scene.add(deptA);
  const deptB = createTextSprite("诊室A");
  deptB.position.set(50, 24, 32);
  scene.add(deptB);
  const deptC = createTextSprite("化验室");
  deptC.position.set(-25, 24, -8);
  scene.add(deptC);
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
    if (walker) {
      walker.position.copy(pos.clone().add(new THREE.Vector3(0, 3, 0)));
      const yaw = Math.atan2(dirVec.x, dirVec.z);
      walker.rotation.set(0, yaw, 0);
    }
  }
  scene.add(arrow);

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
  // walker 初始位置已在上面根据 travelAccum 设置过
  scene.add(walker);

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
    if (segs && segs.length && arrow && walker) {
      const pos = segs[0].a.clone();
      arrow.position.copy(pos);
      const dirVec = new THREE.Vector3()
        .subVectors(segs[0].b, segs[0].a)
        .normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(up, dirVec);
      arrow.quaternion.copy(q);
      walker.position.copy(pos.clone().add(new THREE.Vector3(0, 3, 0)));
      walker.rotation.set(0, Math.atan2(dirVec.x, dirVec.z), 0);
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
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
