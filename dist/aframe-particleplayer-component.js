/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

/* global AFRAME */

if (typeof AFRAME === 'undefined') {
  throw new Error(
    'Component attempted to register before AFRAME was available.'
  );
}

const NUM_VERTICES = 6;

/**
 * Particle Player component for A-Frame.
 */
AFRAME.registerComponent('particleplayer', {
  schema: {
    blending: {
      default: 'additive',
      oneOf: ['normal', 'additive', 'multiply', 'substractive']
    },
    cache: {default: 5, type: 'int'}, // number of simultaneous particle systems
    color: {default: '#fff', type: 'color'},
    count: {default: '100%'},
    delay: {default: 0, type: 'int'},
    dur: {default: 1000, type: 'int'},
    img: {type: 'selector'},
    interpolate: {default: false},
    loop: {default: 'false'},
    on: {default: 'init'},
    protation: {type: 'vec3'},
    pscale: {default: 1.0, type: 'float'},
    scale: {default: 1.0, type: 'float'},
    shader: {
      default: 'flat',
      oneOf: ['flat', 'lambert', 'phong', 'standard']
    },
    src: {type: 'selector'}
  },

  multiple: true,

  init: function() {
    this.framedata = null;
    this.restPositions = null;  // position at first frame each particle is alive
    this.restRotations = null;
    this.numFrames = 0;
    this.numParticles = 0;  // total number of particles per system
    this.particleCount = 0;  // actual number of particles to spawn per event (data.count)
    this.systems = null;
    this.cache = null;
    this.material = null;
    this.geometry = null;
    this.frame = 0;
    this.lastFrame = 0;
    this.msPerFrame = 0;
    this.useRotation = false;
    this.sprite_rotation = false;
    this.protation = false;

    // temporal vars for preventing gc
    this.v = new THREE.Vector3();
    this.indexPool = null;
  },

  update: function(oldData) {
    var params;
    const BLENDINGS = {
      normal: THREE.NormalBlending,
      additive: THREE.AdditiveBlending,
      substractive: THREE.SubstractiveBlending,
      multiply: THREE.MultiplyBlending
    };
    const SHADERS = {
      flat: THREE.MeshBasicMaterial,
      lambert: THREE.MeshLambertMaterial,
      phong: THREE.MeshPhongMaterial,
      standard: THREE.MeshStandardMaterial
    };
    var data = this.data;

    if (oldData.on !== data.on) {
      if (oldData.on) {
        this.el.removeEventListener(oldData.on, this.start);
      }
      if (data.on !== 'play') {
        this.el.addEventListener(data.on, this.start.bind(this));
      }
    }

    this.loadParticlesJSON(data.src, data.scale);

    this.numFrames = this.framedata.length;
    this.numParticles = this.numFrames > 0 ? this.framedata[0].length : 0;

    if (data.count[data.count.length - 1] === '%') {
      this.particleCount = Math.floor(
        (parseInt(data.count) * this.numParticles) / 100.0
      );
    } else {
      this.particleCount = parseInt(data.count);
    }
    this.particleCount = Math.min(this.numParticles, Math.max(0, this.particleCount));

    this.msPerFrame = data.dur / this.numFrames;

    this.indexPool = new Array(this.numParticles);

    params = {
      color: new THREE.Color(data.color),
      side: THREE.DoubleSide,
      blending: BLENDINGS[data.blending],
      map: data.img ? new THREE.TextureLoader().load(data.img.src) : null,
      depthWrite: false,
      opacity: data.opacity,
      transparent: data.img || data.blending !== 'normal' || data.opacity < 1
    };

    if (SHADERS[data.shader] !== undefined) {
      this.material = new SHADERS[data.shader](params);
    } else {
      this.material = new SHADERS['flat'](params);
    }

    const ratio = data.img ? (data.img.width / data.img.height) : 1;
    this.geometry = new THREE.PlaneBufferGeometry(
      0.1 * ratio * data.particleSystemScale,
      0.1 * data.particleSystemcale
    );

    if (this.sprite_rotation !== false) {
      this.geometry.rotateX(this.sprite_rotation.x);
      this.geometry.rotateY(this.sprite_rotation.y);
      this.geometry.rotateZ(this.sprite_rotation.z);
    } else {
      this.geometry.rotateX((this.data.protation.x * Math.PI) / 180);
      this.geometry.rotateY((this.data.protation.y * Math.PI) / 180);
      this.geometry.rotateZ((this.data.protation.z * Math.PI) / 180);
    }

    this.createParticles(data.cache);

    if (data.on === 'init') {
      this.start();
    }
  },

  loadParticlesJSON: function(json, scale) {
    var data = JSON.parse(json.data);
    var p;  // particle
    var alive;
    var frames = data.frames;
    var F = data.precision;
    this.restPositions = [];
    this.restRotations = [];

    this.useRotation = data.rotation;

    if (data.sprite_rotation !== false) {
      this.sprite_rotation = new THREE.Vector3();
      this.sprite_rotation.x = data.sprite_rotation[0] / F;
      this.sprite_rotation.y = data.sprite_rotation[1] / F;
      this.sprite_rotation.z = data.sprite_rotation[2] / F;
    } else {
      this.sprite_rotation = false;
    }

    this.framedata = new Array(frames.length);
    for (let f = 0; f < frames.length; f++) {
      this.framedata[f] = new Array(frames[f].length);
      for (let i = 0; i < frames[f].length; i++) {
        p = frames[f][i];  // data of particle i in frame f
        alive = p !== 0;

        this.framedata[f][i] = {
          position: alive
            ? new THREE.Vector3(
                (p[0] / F) * scale,
                (p[1] / F) * scale,
                (p[2] / F) * scale
              )
            : null,
          alive: alive
        };

        if (data.rotation) {
          this.framedata[f][i].rotation = alive
            ? new THREE.Euler(p[3] / F, p[4] / F, p[5] / F)
            : null;
        }

        if (alive && this.restPositions[i] === undefined) {
          this.restPositions[i] = this.framedata[f][i].position;
          if (data.rotation) {
            this.restRotations[i] = this.framedata[f][i].rotation;
          }
        }
      }
    }
  },

  createParticles: (function(numParticleSystems) {
    const tempGeometries = [];

    return function () {
      const data = this.data;
      var loop = parseInt(this.data.loop);

      this.cache = [];

      if (isNaN(loop)) {
        loop = this.data.loop === 'true' ? Number.MAX_VALUE : 0;
      }

      for (let i = 0; i < numParticleSystems; i++) {
        let particleSystem = {
          active: false,
          activeParticles: new Array(this.particleCount),
          loopCount: 0,
          loopTotal: loop,
          mesh: null,
          time: 0
        };

        // Fill array of geometries to merge.
        tempGeometries.length = 0;
        for (p = 0; p < this.numParticles; p++) {
          tempGeometries.push(this.geometry);
        }

        // Create merged geometry for whole particle system.
        let mergedBufferGeometry = THREE.BufferGeometries.utils.merge(tempGeometries);

        // Only render up to count with drawRange (vertices).
        mergedBufferGeometry.setDrawRange(0, NUM_VERTICES * this.particleCount);

        particleSystem.mesh = new THREE.Mesh(mergedBufferGeometry, this.material);
        particleSystem.mesh.visible = false;

        this.cache.push(particleSystem);
      }
    };
  })(),

  start: function(evt) {
    if (this.data.delay > 0) {
      setTimeout(() => this.startAfterDelay(evt), this.data.delay);
    } else {
      this.startAfterDelay(evt);
    }
  },

  startAfterDelay: function(evt) {
    // position, rotation
    var found = -1;
    var particleSystem;
    var oldestTime = 0;
    var position = evt ? evt.detail['position'] : null;
    var rotation = evt ? evt.detail['rotation'] : null;

    if (!(position instanceof THREE.Vector3)) {
      position = new THREE.Vector3();
    }
    if (!(rotation instanceof THREE.Euler)) {
      rotation = new THREE.Euler();
    }

    // find available (or oldest) particle system
    for (var i = 0; i < this.cache.length; i++) {
      if (this.cache[i].active === false) {
        found = i;
        break;
      }
      if (this.cache[i].time > oldestTime) {
        found = i;
        oldestTime = this.cache[i].time;
      }
    }

    particleSystem = this.cache[found];

    particleSystem.active = true;
    particleSystem.loopCount = 1;
    particleSystem.object3D.visible = true;
    particleSystem.object3D.position.copy(position);
    particleSystem.object3D.rotation.copy(rotation);
    particleSystem.time = 0;

    this.resetParticles(particleSystem);
  },

  doLoop: function(particleSystem) {
    particleSystem.loopCount++;
    particleSystem.frame = -1;
    particleSystem.time = 0;
    this.resetParticles(particleSystem);
  },

  resetParticle: function(part, i) {
    part.visible = false;
    if (this.restPositions[i]) {
      part.position.copy(this.restPositions[i]);
    }
    if (this.useRotation) {
      if (this.restRotations[i]) {
        part.rotation.copy(this.restRotations[i]);
      }
    } else {
      // lookAt does not support rotated or translated parents! :_(
      // part.lookAt(this.camera.position);
    }
  },

  /**
   * When starting or finishing (looping) animation, this resets particles
   * to their initial position and, if user asked for replaying less than 100%
   * of particles, randomly choose them.
   */
  resetParticles: function(particleSystem) {
    var i;
    var rand;

    // no picking, just hide and reset
    if (this.particleCount === this.numParticles) {
      for (i = 0; i < this.numParticles; i++) {
        this.resetParticle(particleSystem.object3D.children[i], i);
      }
      return;
    }

    // hide particles from last animation and initialize indexPool
    for (i = 0; i < this.numParticles; i++) {
      if (i < this.particleCount) {
        particleSystem.object3D.children[particleSystem.activeParticles[i]].visible = false;
      }
      this.indexPool[i] = i;
    }

    // scramble indexPool
    for (i = 0; i < this.particleCount - 1; i++) {
      rand = i + Math.floor(Math.random() * (this.numParticles - i));
      particleSystem.activeParticles[i] = this.indexPool[rand];
      this.indexPool[rand] = this.indexPool[i];
      this.resetParticle(particleSystem.object3D.children[particleSystem.activeParticles[i]], i);
    }
  },

  tick: function(time, delta) {
    var j, i;  // loop vars
    var particleSystem;  // current particle system
    var frame;  // current particle system frame
    var particle;  // current particle
    var particleIndex;  // index of current particle
    var fdata;  // all particles data in current frame
    var fdataNext;  // next frame (for interpolation)
    var useRotation = this.useRotation;
    var frameTime;  // time in current frame (for interpolation)
    var relTime;  // current particle system relative time (0-1)
    var interpolate;  // whether interpolate between frames or not

    for (i = 0; i < this.cache.length; i++) {
      particleSystem = this.cache[i];
      if (!particleSystem.active) continue;

      // if the duration is so short that there's no need to interpolate, don't do it
      // even if user asked for it.
      interpolate =
        this.data.interpolate && this.data.dur / this.numFrames > delta;

      relTime = particleSystem.time / this.data.dur;
      frame = relTime * this.numFrames;
      fdata = this.framedata[Math.floor(frame)];
      if (interpolate) {
        frameTime = frame - Math.floor(frame);
        fdataNext =
          frame < this.numFrames - 1
            ? this.framedata[Math.floor(frame) + 1]
            : null;
      }
      for (j = 0; j < particleSystem.activeParticles.length; j++) {
        particleIndex = particleSystem.activeParticles[j];
        particle = particleSystem.object3D.children[particleIndex];
        if (!fdata[particleIndex].alive) {
          particle.visible = false;
          continue;
        }

        particle.visible = true;

        if (interpolate && fdataNext && fdataNext[particleIndex].alive) {
          particle.position.lerpVectors(
            fdata[particleIndex].position,
            fdataNext[particleIndex].position,
            frameTime
          );
        } else {
          particle.position.copy(fdata[particleIndex].position);
        }

        if (useRotation) {
          particle.rotation.copy(fdata[particleIndex].rotation);
        }
      }

      particleSystem.time += delta;
      if (particleSystem.time >= this.data.dur) {
        if (particleSystem.loopCount < particleSystem.loopTotal) {
          this.el.emit('loop');
          this.doLoop(particleSystem);
        } else {
          this.el.emit('finished');
          particleSystem.active = false;
          particleSystem.object3D.visible = false;
        }
        continue;
      }
    }
  }
});


/***/ })
/******/ ]);