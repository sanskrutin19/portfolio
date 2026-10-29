/* Realistic people: rigging helpers shared by the guide (Sanskruti's Avaturn
   avatar, Mixamo bone names) and the visitors (Microsoft Rocketbox characters,
   3ds Max "Bip01" bone names, MIT licence).
   - makeRig(): scale to a height, find the bones, relax a T-pose, remember the rest pose
   - drive(): rotate a bone by a rotation given in the figure's own frame
   - poseWalk(): procedural walk / idle / wave / head-turn on any rig */
import * as THREE from 'three';

const NAMES = {
  Hips: ['Hips', 'Bip01_Pelvis'], Spine: ['Spine', 'Bip01_Spine'],
  LeftUpLeg: ['LeftUpLeg', 'Bip01_L_Thigh'], LeftLeg: ['LeftLeg', 'Bip01_L_Calf'],
  RightUpLeg: ['RightUpLeg', 'Bip01_R_Thigh'], RightLeg: ['RightLeg', 'Bip01_R_Calf'],
  LeftArm: ['LeftArm', 'Bip01_L_UpperArm'], LeftForeArm: ['LeftForeArm', 'Bip01_L_Forearm'],
  RightArm: ['RightArm', 'Bip01_R_UpperArm'], RightForeArm: ['RightForeArm', 'Bip01_R_Forearm'],
  Neck: ['Neck', 'Bip01_Neck'], Head: ['Head', 'Bip01_Head']
};
const canon = n => n.replace(/^mixamorig:?/, '').replace(/\s+/g, '_');

export function makeRig(model, height = 1.7, { relax = true } = {}) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model, true), size = box.getSize(new THREE.Vector3());
  model.scale.multiplyScalar(height / size.y); model.updateMatrixWorld(true); box.setFromObject(model, true);
  model.position.set(model.position.x - (box.min.x + box.max.x) / 2, model.position.y - box.min.y, model.position.z - (box.min.z + box.max.z) / 2);
  const byName = {};
  model.traverse(o => {
    if (o.isBone) byName[canon(o.name)] = o;
    if (o.isMesh) { o.frustumCulled = false; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.envMapIntensity = 0.8; }); }
  });
  const bones = {};
  for (const [k, list] of Object.entries(NAMES)) for (const n of list) if (byName[n]) { bones[k] = byName[n]; break; }
  const wrap = new THREE.Group(); wrap.add(model);
  const rig = { model, wrap, bones, rest: new Map(), hips: bones.Hips || null, hipsRest: null };
  if (relax) relaxArms(rig);
  model.traverse(o => { if (o.isBone) rig.rest.set(o, o.quaternion.clone()); });
  rig.hipsRest = rig.hips ? rig.hips.position.clone() : null;
  return rig;
}

// bring T-posed arms down to the sides (only if they are near horizontal)
const _q = new THREE.Quaternion(), _p = new THREE.Quaternion(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
function aimBone(bone, child, target) {
  bone.parent.updateWorldMatrix(true, true);
  const from = child.getWorldPosition(_b).sub(bone.getWorldPosition(_a)).normalize();
  const turn = new THREE.Quaternion().setFromUnitVectors(from, target.clone().normalize());
  const world = bone.getWorldQuaternion(_q).premultiply(turn);
  bone.quaternion.copy(bone.parent.getWorldQuaternion(_p).invert().multiply(world));
  bone.updateWorldMatrix(false, true);
}
function relaxArms(rig) {
  const B = rig.bones;
  [['LeftArm', 'LeftForeArm'], ['RightArm', 'RightForeArm']].forEach(([a, f]) => {
    const arm = B[a], fore = B[f]; if (!arm || !fore) return;
    rig.wrap.updateWorldMatrix(true, true);
    const d = fore.getWorldPosition(new THREE.Vector3()).sub(arm.getWorldPosition(new THREE.Vector3())).normalize();
    if (Math.abs(d.y) > 0.9) return;                       // already relaxed (arms within ~25° of vertical)
    aimBone(arm, fore, new THREE.Vector3(Math.sign(d.x) * 0.16, -1, 0.02));
    const hand = fore.children.find(c => c.isBone);
    if (hand) aimBone(fore, hand, new THREE.Vector3(Math.sign(d.x) * 0.1, -1, 0.22));   // a soft elbow
  });
}

const A = new THREE.Quaternion(), Bq = new THREE.Quaternion(), C = new THREE.Quaternion();
export function drive(rig, name, q) {
  const bone = rig.bones[name]; if (!bone) return;
  const restQ = rig.rest.get(bone);
  bone.quaternion.copy(restQ); bone.parent.updateWorldMatrix(true, false);
  const qp = bone.parent.getWorldQuaternion(A), qr = rig.wrap.getWorldQuaternion(Bq);
  const dw = C.copy(qr).multiply(q).multiply(qr.clone().invert());
  bone.quaternion.copy(qp.clone().invert().multiply(dw).multiply(qp).multiply(restQ));
}
const E = new THREE.Euler(), Q = () => new THREE.Quaternion(), Z = new THREE.Vector3(0, 0, 1);
export const qx = a => Q().setFromAxisAngle(new THREE.Vector3(1, 0, 0), a);
export const qe = (x, y, z) => Q().setFromEuler(E.set(x, y, z));
export const conj = (o, i) => o.clone().multiply(i).multiply(o.clone().invert());

/* s = { phase, walk (0..1), waveT (-1 = none, else seconds), headYaw, t };
   returns the updated waveT. `armZ` is the shoulder's resting outward angle. */
export function poseWalk(rig, s, dt, armZ = 0.22) {
  for (const [b, q] of rig.rest) b.quaternion.copy(q);
  if (rig.hips && rig.hipsRest) rig.hips.position.copy(rig.hipsRest);
  const w = s.walk, sw = Math.sin(s.phase) * w;
  rig.wrap.position.y = Math.abs(Math.cos(s.phase)) * 0.03 * w + Math.sin(s.t * 2.1) * 0.003 * (1 - w);
  rig.wrap.rotation.set(0.04 * w, 0, Math.sin(s.t * 1.1) * 0.012 * (1 - w));
  const hipR = qx(-sw * 0.55), hipL = qx(sw * 0.55);
  drive(rig, 'RightUpLeg', hipR); drive(rig, 'RightLeg', conj(hipR, qx(Math.max(0, Math.sin(s.phase + 1.6)) * 0.9 * w)));
  drive(rig, 'LeftUpLeg', hipL); drive(rig, 'LeftLeg', conj(hipL, qx(Math.max(0, Math.sin(s.phase + 1.6 + Math.PI)) * 0.9 * w)));
  let lz = 0.1, lx = -sw * 0.45, lel = -0.15 - 0.25 * w, lelz = 0, waveT = s.waveT;
  if (waveT >= 0) {
    waveT += dt; const k = Math.min(1, waveT * 5) * Math.min(1, (2 - waveT) * 5);
    lz = 0.1 + k * 2.45; lx *= 1 - k; lel *= 1 - k; lelz = k * (0.35 + Math.sin(waveT * 13) * 0.45);
    if (waveT > 2) waveT = -1;
  }
  const shR = qe(sw * 0.45, 0, -0.1).multiply(Q().setFromAxisAngle(Z, armZ));
  const shL = qe(lx, 0, lz).multiply(Q().setFromAxisAngle(Z, -armZ));
  drive(rig, 'RightArm', shR); drive(rig, 'RightForeArm', conj(shR, qe(-0.15 - 0.25 * w, 0, 0)));
  drive(rig, 'LeftArm', shL); drive(rig, 'LeftForeArm', conj(shL, qe(lel, 0, lelz)));
  const hq = qe(0.05, s.headYaw || 0, 0), half = Q().slerp(hq, 0.45);
  drive(rig, 'Neck', half); drive(rig, 'Head', half.clone().invert().multiply(hq));
  return waveT;
}
