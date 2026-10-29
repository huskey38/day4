import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ---------------------------------------------------------------- 기본 설정
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 3000);
const HOME_POS = new THREE.Vector3(0, 95, 130);
camera.position.copy(HOME_POS);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxDistance = 600;

scene.add(new THREE.AmbientLight(0x223048, 0.6));

// 별
{
  const n = 4000, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(900 + Math.random() * 600);
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false })));
}

// ---------------------------------------------------------------- 절차적 텍스처
function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function bandsTexture(colors, seed, noise = 14) {
  return canvasTex(512, 256, (g, w, h) => {
    const r = rnd(seed);
    for (let y = 0; y < h; y++) {
      const t = y / h * colors.length;
      const i = Math.min(colors.length - 1, Math.floor(t));
      g.fillStyle = colors[i];
      g.fillRect(0, y, w, 1);
    }
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(${r() > .5 ? 255 : 0},${r() > .5 ? 255 : 0},${r() > .5 ? 255 : 0},${0.03 + r() * 0.05})`;
      g.fillRect(0, r() * h, w, 1 + r() * noise / 3);
    }
  });
}
function rockyTexture(base, spot, seed, count = 500) {
  return canvasTex(512, 256, (g, w, h) => {
    const r = rnd(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < count; i++) {
      g.fillStyle = spot; g.globalAlpha = 0.05 + r() * 0.2;
      g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 14, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  });
}
function earthTexture() {
  return canvasTex(1024, 512, (g, w, h) => {
    const r = rnd(7);
    g.fillStyle = "#1c4f9c"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#2f8f4a";
    for (let i = 0; i < 26; i++) {
      const cx = r() * w, cy = h * 0.15 + r() * h * 0.7;
      for (let k = 0; k < 30; k++) {
        g.globalAlpha = 0.9;
        g.beginPath(); g.arc(cx + (r() - .5) * 120, cy + (r() - .5) * 60, 8 + r() * 26, 0, 7); g.fill();
      }
    }
    g.fillStyle = "#e9f3ff"; g.globalAlpha = 1;
    g.fillRect(0, 0, w, h * 0.07); g.fillRect(0, h * 0.93, w, h * 0.07);
    g.fillStyle = "rgba(255,255,255,.35)";
    for (let i = 0; i < 70; i++) { g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 50, 4 + r() * 8, 0, 0, 7); g.fill(); }
  });
}

// ---------------------------------------------------------------- 태양
const SUN_R = 6;
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(SUN_R, 64, 64),
  new THREE.MeshBasicMaterial({
    map: canvasTex(512, 256, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, "#ffb02e"); grd.addColorStop(.5, "#ffd24d"); grd.addColorStop(1, "#ffb02e");
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      const r = rnd(3);
      for (let i = 0; i < 700; i++) {
        g.fillStyle = `rgba(255,${120 + r() * 100 | 0},0,${0.05 + r() * 0.1})`;
        g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 12, 0, 7); g.fill();
      }
    }),
  })
);
scene.add(sun);
const glow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: canvasTex(256, 256, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, "rgba(255,220,120,1)"); grd.addColorStop(.25, "rgba(255,170,60,.55)");
    grd.addColorStop(1, "rgba(255,120,0,0)");
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  }),
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
}));
glow.scale.set(34, 34, 1);
scene.add(glow);
scene.add(new THREE.PointLight(0xfff1d0, 5, 0, 0));
scene.add(new THREE.HemisphereLight(0x6d86c8, 0x101018, 0.9));

// ---------------------------------------------------------------- 행성
// radius: 표시 반지름, orbit: 궤도 반지름, period: 공전 주기(지구년)
const DEFS = [
  { name: "수성", radius: 0.9, orbit: 12, period: 0.241, tex: rockyTexture("#8d8780", "#4a4540", 11), spin: 0.3 },
  { name: "금성", radius: 1.6, orbit: 18, period: 0.615, tex: bandsTexture(["#e6c98f", "#d8b377", "#e8d3a2", "#cfa965"], 12, 8), spin: -0.2 },
  { name: "지구", radius: 1.8, orbit: 25, period: 1.0, tex: earthTexture(), spin: 2.5 },
  { name: "화성", radius: 1.3, orbit: 33, period: 1.881, tex: rockyTexture("#b4552f", "#6e2c16", 14), spin: 2.4 },
  { name: "목성", radius: 4.4, orbit: 50, period: 11.86, tex: bandsTexture(["#d9b38c", "#b88a63", "#e8d2b4", "#a8744e", "#d9b38c", "#c79970", "#efe0c8", "#b07c55"], 15, 24), spin: 5 },
  { name: "토성", radius: 3.8, orbit: 66, period: 29.46, tex: bandsTexture(["#e8d6a0", "#d6bf86", "#eedfb2", "#cfb577"], 16, 10), spin: 4.6, ring: true },
  { name: "해왕성", radius: 2.5, orbit: 84, period: 164.8, tex: bandsTexture(["#2f55c9", "#3d6ae0", "#2a4bb3"], 17, 6), spin: 3.2 },
];

function labelSprite(text) {
  const t = canvasTex(256, 64, (g, w, h) => {
    g.font = "bold 34px 'Malgun Gothic', sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#cfe0ff"; g.fillText(text, w / 2, h / 2);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(9, 2.25, 1);
  return s;
}

const planets = DEFS.map((d, i) => {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(d.radius, 48, 48),
    new THREE.MeshStandardMaterial({ map: d.tex, roughness: 0.9, metalness: 0 })
  );
  mesh.rotation.z = THREE.MathUtils.degToRad(d.name === "지구" ? 23.4 : d.name === "토성" ? 26.7 : 5);
  const holder = new THREE.Group();
  holder.add(mesh);
  if (d.ring) {
    const inner = d.radius * 1.35, outer = d.radius * 2.3;
    const rg = new THREE.RingGeometry(inner, outer, 128, 1);
    const p = rg.attributes.position, uv = rg.attributes.uv, v = new THREE.Vector3();
    for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); uv.setXY(k, (v.length() - inner) / (outer - inner), 0.5); }
    const ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({
      map: canvasTex(256, 4, (g, w, h) => {
        for (let x = 0; x < w; x++) {
          const a = (Math.sin(x * 0.35) * .5 + .5) * .5 + .25;
          g.fillStyle = `rgba(214,190,140,${x > 90 && x < 100 ? 0.05 : a})`; g.fillRect(x, 0, 1, h);
        }
      }), side: THREE.DoubleSide, transparent: true, depthWrite: false,
    }));
    ring.rotation.x = -Math.PI / 2;
    mesh.add(ring);
    ring.rotation.x = Math.PI / 2;
  }
  const lab = labelSprite(d.name);
  lab.position.y = d.radius + 2.2;
  holder.add(lab);
  scene.add(holder);

  // 궤도선
  const pts = [];
  for (let k = 0; k <= 256; k++) { const a = k / 256 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * d.orbit, 0, Math.sin(a) * d.orbit)); }
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x4a5f90, transparent: true, opacity: 0.45 })));

  return { ...d, mesh, holder, phase0: i * 1.1 + 0.4 };
});
const earth = planets.find(p => p.name === "지구");
const mars = planets.find(p => p.name === "화성");
const angleOf = (p, t) => p.phase0 + 2 * Math.PI * t / p.period;
const posOf = (p, t) => { const a = angleOf(p, t); return new THREE.Vector3(Math.cos(a) * p.orbit, 0, Math.sin(a) * p.orbit); };

// ---------------------------------------------------------------- 우주선
const ship = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.9, 16), new THREE.MeshStandardMaterial({ color: 0xe9eef7, metalness: .6, roughness: .3 }));
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 16), new THREE.MeshStandardMaterial({ color: 0xd9412f, metalness: .3, roughness: .4 }));
  nose.position.y = 0.67;
  const finG = new THREE.BoxGeometry(0.04, 0.3, 0.3);
  const finM = new THREE.MeshStandardMaterial({ color: 0xd9412f });
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(finG, finM);
    const a = i * Math.PI * 2 / 3;
    f.position.set(Math.cos(a) * 0.24, -0.35, Math.sin(a) * 0.24);
    f.rotation.y = -a;
    ship.add(f);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.9, 12), new THREE.MeshBasicMaterial({ color: 0xffa640, transparent: true, opacity: .85, blending: THREE.AdditiveBlending }));
  flame.position.y = -0.9; flame.rotation.x = Math.PI;
  flame.name = "flame";
  ship.add(body, nose, flame);
  ship.add(new THREE.PointLight(0xffe0b0, 6, 8));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glow.material.map, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: 0x9fd0ff }));
  halo.scale.set(5, 5, 1);
  ship.add(halo);
  ship.scale.setScalar(2.4);
  ship.visible = false;
  scene.add(ship);
}
const TRAIL_MAX = 600;
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL_MAX * 3), 3));
trailGeo.setDrawRange(0, 0);
const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xffd27a }));
scene.add(trail);
let planned = null;  // 예정 궤적선
const plannedMat = new THREE.LineDashedMaterial({ color: 0x7fb2ff, dashSize: 1.2, gapSize: 0.8, transparent: true, opacity: 0.7 });

let flightYears = 0.8;          // 비행 시간 (지구년, 발사 때 계산)
const ARC_HEIGHT = 16;          // 포물선 정점 높이
let flight = null;              // {t0, A, rA, thA, thTotal, rB, ...}
const ease = s => s * s * (3 - 2 * s);

function transferPoint(f, s) {
  const e = ease(s);
  const th = f.thA + f.dth * e;
  const r = f.rA + (f.rB - f.rA) * e;
  return new THREE.Vector3(Math.cos(th) * r, ARC_HEIGHT * 4 * s * (1 - s), Math.sin(th) * r);
}

function launch() {
  if (flight && flight.state !== "done") return;
  const thA = angleOf(earth, simTime);
  // 전이 각도가 약 반 바퀴(호만 전이 궤도처럼)가 되도록 비행 시간을 고른다
  let best = null;
  for (let T = 0.5; T <= 1.5; T += 0.005) {
    let d = (angleOf(mars, simTime + T) - thA) % (Math.PI * 2);
    if (d < 0) d += Math.PI * 2;
    const err = Math.abs(d - (Math.PI + 0.1));
    if (!best || err < best.err) best = { T, d, err };
  }
  flightYears = best.T;
  flight = { t0: simTime, thA, dth: best.d, rA: earth.orbit, rB: mars.orbit, state: "fly", doneAt: 0 };
  // 예정 궤적 표시
  if (planned) scene.remove(planned);
  const pts = [];
  for (let k = 0; k <= 120; k++) pts.push(transferPoint(flight, k / 120));
  planned = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), plannedMat);
  planned.computeLineDistances();
  scene.add(planned);
  ship.visible = true;
  trailGeo.setDrawRange(0, 0);
  trailCount = 0;
  statusEl.textContent = "🚀 지구 출발 · 화성으로 비행 중";
}

let trailCount = 0;
function pushTrail(v) {
  if (trailCount >= TRAIL_MAX) return;
  trailGeo.attributes.position.setXYZ(trailCount++, v.x, v.y, v.z);
  trailGeo.attributes.position.needsUpdate = true;
  trailGeo.setDrawRange(0, trailCount);
}

const prevShip = new THREE.Vector3();
function updateShip() {
  if (!flight) return;
  if (flight.state === "fly") {
    const s = Math.min(1, (simTime - flight.t0) / flightYears);
    const p = transferPoint(flight, s);
    // 시작 순간에는 지구에, 도착 순간에는 화성에 붙도록 보정 (행성 이동 오차)
    const eP = posOf(earth, simTime), mP = posOf(mars, simTime);
    const toEarth = Math.max(0, 1 - s * 8), toMars = Math.max(0, (s - 0.88) / 0.12);
    p.lerp(eP.clone().add(new THREE.Vector3(0, 2.4, 0)), toEarth);
    p.lerp(mP.clone().add(new THREE.Vector3(0, 2.2, 0)), toMars * toMars);
    const dir = p.clone().sub(prevShip);
    if (dir.lengthSq() > 1e-8) {
      ship.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    }
    prevShip.copy(p);
    ship.position.copy(p);
    if (Math.floor(s * 400) > trailCount) pushTrail(p);
    ship.getObjectByName("flame").scale.set(1, 0.8 + Math.random() * 0.5, 1);
    if (s >= 1) { flight.state = "arrived"; flight.doneAt = performance.now(); statusEl.textContent = "🔴 화성 도착!"; }
  } else if (flight.state === "arrived") {
    const mP = posOf(mars, simTime);
    const a = performance.now() * 0.002;
    ship.position.copy(mP).add(new THREE.Vector3(Math.cos(a) * 3, 1.2, Math.sin(a) * 3));
    ship.getObjectByName("flame").scale.set(1, 0.001, 1);
    if (performance.now() - flight.doneAt > 6000) { flight.state = "done"; ship.visible = false; statusEl.textContent = "대기 중 (다시 발사 가능)"; }
  }
}

// ---------------------------------------------------------------- UI
const speedEl = document.getElementById("speed");
const statusEl = document.getElementById("status");
speedEl.oninput = () => (document.getElementById("sv").textContent = (+speedEl.value).toFixed(1) + "x");
document.getElementById("launch").onclick = launch;
let follow = false;
document.getElementById("follow").onclick = () => { follow = !follow; document.getElementById("follow").textContent = follow ? "따라가기 해제" : "우주선 따라가기"; };
document.getElementById("reset").onclick = () => { follow = false; document.getElementById("follow").textContent = "우주선 따라가기"; camera.position.copy(HOME_POS); controls.target.set(0, 0, 0); };
addEventListener("keydown", e => { if (e.code === "Space") { e.preventDefault(); launch(); } });
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// ---------------------------------------------------------------- 루프
const YEAR_SEC = 20;    // 속도 1x 에서 지구 1년 = 20초
let simTime = 0;
const clock = new THREE.Clock();
const camGoal = new THREE.Vector3();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.1);
  simTime += dt / YEAR_SEC * speedEl.value;

  for (const p of planets) {
    p.holder.position.copy(posOf(p, simTime));
    p.mesh.rotation.y += dt * p.spin * Math.max(0.2, +speedEl.value);
  }
  sun.rotation.y += dt * 0.05;
  updateShip();

  if (follow && ship.visible) {
    const offset = new THREE.Vector3(6, 4, 8);
    camGoal.copy(ship.position).add(offset);
    camera.position.lerp(camGoal, 0.06);
    controls.target.lerp(ship.position, 0.12);
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
window.__solar = { launch, get simTime() { return () => simTime; } };
