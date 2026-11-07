// Engineering comparison; real native update/math with a clear, flat test track.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname,'..');
const file = 'bkcore/hexgl/ShipControls.js';

function exercise(source) {
  const context = {console,setTimeout,clearTimeout,window:{setTimeout,clearTimeout},self:{},navigator:{userAgent:'fixture'}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'libs/Three.dev.js'),'utf8'),context);
  vm.runInContext(source,context);
  context.bkcore.Audio = {play() {},stop() {},setListenerPos() {},setListenerVelocity() {}};
  const controls = new context.bkcore.hexgl.ShipControls({document:{addEventListener() {}},controlType:0});
  controls.control(new context.THREE.Object3D());
  const reset = () => controls.reset(new context.THREE.Vector3(),new context.THREE.Vector3());
  reset();
  const clear = {r:255,g:255,b:255};
  controls.collisionDetection = true;
  controls.collisionMap = {loaded:true,pixels:{width:100,height:100},getPixel:()=>clear,getPixelBilinear:()=>clear};
  controls.key.forward = true;
  for(let frame=0;frame<39;frame++) controls.update(1);
  assert.ok(controls.speed<.8);
  assert.equal(controls.shield,1);
  controls.update(1);
  assert.ok(controls.speed>=.8 && controls.speed<1);
  assert.equal(controls.collision.front,false);
  assert.equal(controls.collision.left,false);
  assert.equal(controls.collision.right,false);
  const threshold = controls.shield;
  for(let frame=0;frame<100;frame++) controls.update(1);
  const sustained = controls.shield;
  const speed = controls.speed;
  reset(); controls.key.forward=false; controls.speed=1; controls.update(1);
  assert.equal(controls.shield,1);
  reset(); controls.active=false; controls.key.forward=true; controls.speed=1; controls.update(1);
  assert.equal(controls.shield,1);
  reset(); controls.active=true; controls.key.forward=true;
  for(let frame=0;frame<40;frame++) controls.update(1);
  return {threshold,sustained,speed,freshThreshold:controls.shield};
}

const healthy = exercise(execFileSync('git',['show',`d4db89d:${file}`],{cwd:root,encoding:'utf8'}));
const planted = exercise(fs.readFileSync(path.join(root,file),'utf8'));
assert.equal(healthy.threshold,1);
assert.equal(healthy.sustained,1);
assert.equal(healthy.freshThreshold,1);
assert.equal(planted.threshold,.8);
assert.equal(planted.sustained,.8);
assert.equal(planted.freshThreshold,.8);
assert.equal(healthy.speed,planted.speed);
console.log(JSON.stringify({healthy,planted},null,2));
