/* The cast visitors choose from: realistic people from Microsoft Rocketbox
   (MIT licence, github.com/microsoft/Microsoft-Rocketbox), converted to
   compressed GLB in assets/people/. Each model is fetched once and cloned per
   visitor; humans.js gives them the same walk / wave / look as the guide. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { makeRig, poseWalk } from './humans.js';

export const CAST = [
  { id: 'f02', body: 'f', label: 'Cream knit' }, { id: 'f03', body: 'f', label: 'Violet top' },
  { id: 'f08', body: 'f', label: 'Graphic tee' }, { id: 'f12', body: 'f', label: 'Zip hoodie' },
  { id: 'f15', body: 'f', label: 'Blue shirt' }, { id: 'fp02', body: 'f', label: 'Print dress' },
  { id: 'm04', body: 'm', label: 'Leather jacket' }, { id: 'm06', body: 'm', label: 'Red henley' },
  { id: 'm08', body: 'm', label: 'Sky shirt' }, { id: 'm09', body: 'm', label: 'Black tee' },
  { id: 'm12', body: 'm', label: 'Denim jacket' }, { id: 'm17', body: 'm', label: 'Track jacket' }
];
const IDS = new Set(CAST.map(c => c.id));
export const castOf = look => {
  const id = look && look.char;
  if (IDS.has(id)) return id;
  return look && look.body === 1 ? 'm08' : 'f02';   // older looks from the figurine days
};
export const thumbOf = id => `assets/people/thumbs/${IDS.has(id) ? id : 'f02'}.jpg`;

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();
function load(id) {
  if (!cache.has(id)) cache.set(id, loader.loadAsync(`assets/people/${id}.glb`));
  return cache.get(id);
}
export const preload = id => load(id).catch(() => {});

/* A person in the scene. `group` can be placed straight away; the body
   appears when the model has loaded. */
export function makePerson(id) {
  const group = new THREE.Group();
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.28, 24), new THREE.MeshBasicMaterial({ color: '#2a241c', transparent: true, opacity: 0.13, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.01; group.add(blob);
  const p = { group, rig: null, id, waveT: -1, disposed: false };
  p.ready = load(id).then(g => {
    if (p.disposed) return;
    const model = SkeletonUtils.clone(g.scene);
    p.rig = makeRig(model, id[0] === 'm' ? 1.78 : 1.66);
    group.add(p.rig.wrap);
  }).catch(err => console.warn('Visitor model unavailable:', id, err));
  p.wave = () => { p.waveT = 0; };
  p.pose = (walk, phase, headYaw, t, dt) => { if (p.rig) p.waveT = poseWalk(p.rig, { phase, walk, waveT: p.waveT, headYaw, t }, dt, 0.05); };
  p.dispose = () => {
    p.disposed = true;
    blob.geometry.dispose(); blob.material.dispose();
  };
  return p;
}
