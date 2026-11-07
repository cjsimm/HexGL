// Supervisor pause keeps the native RAF alive without advancing the race.
(function () {
  'use strict';
  if (new URLSearchParams(window.location.search).get('camera') === 'high') {
    var init = bkcore.hexgl.HexGL.prototype.init;
    bkcore.hexgl.HexGL.prototype.init = function () {
      init.call(this);
      this.components.cameraChase.yoffset = 18;
      this.components.cameraChase.zoffset = 25;
      this.components.cameraChase.viewOffset = 35;
      var badge = document.createElement('div');
      badge.textContent = 'High chase camera adaptation';
      badge.style.cssText = 'position:absolute;left:12px;top:90px;z-index:10000;pointer-events:none;padding:4px 8px;background:#111b;color:white;font:12px sans-serif';
      this.containers.main.appendChild(badge);
    };
  }
  var paused = false;
  var pausedAt = 0;
  var update = bkcore.hexgl.HexGL.prototype.update;
  bkcore.hexgl.HexGL.prototype.update = function () {
    if (!paused) update.call(this);
  };

  function releaseKeys() {
    var controls = window.hexGL && window.hexGL.components.shipControls;
    if (controls) Object.keys(controls.key).forEach(function (key) {
      controls.key[key] = false;
    });
  }

  window.setGamePaused = function (value) {
    if (typeof value !== 'boolean') throw new TypeError('Pause must be boolean');
    if (value === paused) return;
    var game = window.hexGL;
    var now = Date.now();
    releaseKeys();
    if (value) pausedAt = now;
    else if (game) {
      if (game.gameplay) {
        var time = game.gameplay.timer.time;
        // A race can be reset or loaded while the supervisor has it paused.
        var gap = now - Math.max(pausedAt, time.start);
        time.start += gap;
        time.current += gap;
        time.previous += gap;
      }
      if (game.manager) game.manager.time = window.perfNow();
    }
    paused = value;
  };

  document.addEventListener('keydown', function (event) {
    if (paused) event.stopImmediatePropagation();
  }, true);
  window.addEventListener('blur', releaseKeys);

  var controls = bkcore.hexgl.ShipControls.prototype;
  var reset = controls.reset;
  controls.reset = function (position, rotation) {
    this.falling = false;
    this.demoFallRemaining = 0;
    Object.keys(this.key).forEach(function (key) { this.key[key] = false; }, this);
    reset.call(this, position, rotation);
  };
  // The native fall timeout uses wall time; use simulation time so pause freezes it.
  controls.fall = function () {
    this.active = false;
    this.collision.front = this.collision.left = this.collision.right = false;
    this.falling = true;
    this.demoFallRemaining = 1500;
  };
  var controlUpdate = controls.update;
  controls.update = function (dt) {
    if (this.demoFallRemaining > 0) {
      this.demoFallRemaining -= dt * 16.6;
      if (this.demoFallRemaining <= 0) this.destroyed = true;
    }
    controlUpdate.call(this, dt);
  };
})();
