// Engineering comparison of the healthy revision and the intentional demo defect.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const file = 'bkcore/hexgl/ShipControls.js';

class Vector {
  constructor(x=0, y=0, z=0) { this.set(x,y,z); }
  set(x,y,z) { this.x=x; this.y=y; this.z=z; return this; }
  copy(value) { return this.set(value.x,value.y,value.z); }
}
class Quaternion {
  set() { return this; }
  normalize() { return this; }
  multiplySelf() { return this; }
}
class Matrix {
  identity() {}
  setPosition() {}
  setRotationFromQuaternion() {}
}
class Object3D {
  constructor() { this.position=new Vector(); this.quaternion=new Quaternion(); this.matrix=new Matrix(); }
}

function exercise(source) {
  const context = {THREE:{Vector3:Vector,Quaternion,Object3D}};
  vm.runInNewContext(source,context);
  context.bkcore.Audio = {play() {},stop() {}};
  const controls = new context.bkcore.hexgl.ShipControls({document:{addEventListener() {}},controlType:0});
  const mesh = {position:new Vector(),matrix:new Matrix(),applyMatrix() {}};
  controls.control(mesh);
  controls.reset(new Vector(),new Vector());
  let color = {r:255,g:255,b:255};
  controls.collisionMap = {loaded:true,pixels:{width:100,height:100},getPixel:()=>color,getPixelBilinear:()=>color};
  controls.boosterCheck(1);
  assert.equal(controls.shield,1);
  color = {r:255,g:0,b:0};
  controls.boosterCheck(1);
  assert.equal(controls.boost,controls.boosterSpeed);
  assert.equal(controls.collisionCheck(1),false);
  assert.equal(controls.collision.front,false);
  assert.equal(controls.collision.left,false);
  assert.equal(controls.collision.right,false);
  const entry = controls.shield;
  for (let frame=0; frame<120; frame++) controls.boosterCheck(1);
  const dwell = controls.shield;
  color = {r:255,g:255,b:255};
  controls.boosterCheck(1);
  assert.equal(controls.shield,dwell);
  assert.ok(controls.boost<controls.boosterSpeed);
  color = {r:255,g:0,b:0};
  controls.boosterCheck(1);
  const reentry = controls.shield;
  controls.reset(new Vector(),new Vector());
  assert.equal(controls.shield,1);
  controls.boosterCheck(1);
  const freshEntry = controls.shield;
  color = {r:255,g:255,b:255}; controls.boosterCheck(1);
  controls.shield=.1;
  color = {r:255,g:0,b:0}; controls.boosterCheck(1);
  return {entry,dwell,reentry,freshEntry,lowShieldEntry:controls.shield};
}

const healthy = exercise(execFileSync('git',['show',`d4db89d:${file}`],{cwd:root,encoding:'utf8'}));
const planted = exercise(fs.readFileSync(path.join(root,file),'utf8'));
assert.deepEqual(healthy,{entry:1,dwell:1,reentry:1,freshEntry:1,lowShieldEntry:.1});
assert.equal(planted.entry,.8);
assert.equal(planted.dwell,.8);
assert.ok(Math.abs(planted.reentry-.6)<1e-10);
assert.equal(planted.freshEntry,.8);
assert.equal(planted.lowShieldEntry,0);
console.log(JSON.stringify({healthy,planted},null,2));
