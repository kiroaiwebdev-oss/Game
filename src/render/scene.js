// scene.js
// Owns the WebGL program, cube + arrow meshes, lighting, and draws a frame.
// Converts grid coordinates to centered world coordinates so the puzzle floats
// nicely in front of the orbit camera.

import { createProgram, createBuffer, resizeToDisplay } from './webgl.js';
import { makeCube, makeArrow } from './geometry.js';
import { mat4 } from './glmath.js';
import { DIRECTIONS } from '../core/direction.js';

const VERT_SRC = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
uniform mat3 uNormalMat;
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldPos = world.xyz;
  vNormal = normalize(uNormalMat * aNormal);
  gl_Position = uProjection * uView * world;
}
`;

const FRAG_SRC = `
precision highp float;
varying vec3 vNormal;
varying vec3 vWorldPos;
uniform vec3 uColor;
uniform float uEmissive;
uniform float uAlpha;
uniform vec3 uCameraPos;
void main() {
  vec3 N = normalize(vNormal);
  // Key + fill directional lights for a soft, calming look.
  vec3 keyDir = normalize(vec3(0.5, 0.9, 0.6));
  vec3 fillDir = normalize(vec3(-0.6, 0.3, -0.4));
  float key = max(dot(N, keyDir), 0.0);
  float fill = max(dot(N, fillDir), 0.0) * 0.35;
  float ambient = 0.42;
  // Subtle rim light toward camera for definition.
  vec3 V = normalize(uCameraPos - vWorldPos);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.25;
  float light = ambient + key * 0.75 + fill;
  vec3 col = uColor * light + vec3(rim);
  col = mix(col, vec3(1.0), uEmissive); // highlight blend toward white
  gl_FragColor = vec4(col, uAlpha);
}
`;

// Pleasant pastel palette keyed by travel axis (relaxing vibe).
export const AXIS_COLORS = {
  X: [0.93, 0.45, 0.45], // warm coral
  Y: [0.45, 0.78, 0.55], // soft green
  Z: [0.40, 0.62, 0.92], // calm blue
};
const ARROW_COLOR = [0.98, 0.98, 1.0];

// Rotation that maps the arrow's default +Y to each travel direction.
function dirRotation(dir) {
  switch (dir) {
    case DIRECTIONS.PY: return mat4.identity();
    case DIRECTIONS.NY: return mat4.rotationX(Math.PI);
    case DIRECTIONS.PX: return mat4.rotationZ(-Math.PI / 2);
    case DIRECTIONS.NX: return mat4.rotationZ(Math.PI / 2);
    case DIRECTIONS.PZ: return mat4.rotationX(Math.PI / 2);
    case DIRECTIONS.NZ: return mat4.rotationX(-Math.PI / 2);
    default: return mat4.identity();
  }
}

const DIR_OFFSET = {
  PX: [1, 0, 0], NX: [-1, 0, 0],
  PY: [0, 1, 0], NY: [0, -1, 0],
  PZ: [0, 0, 1], NZ: [0, 0, -1],
};

function mat3FromMat4(m) {
  return [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];
}

export const SPACING = 1.06;   // distance between cell centers
export const CUBE_SCALE = 0.92; // cube edge relative to spacing
export const PICK_HALF = (CUBE_SCALE * 0.5); // half-size for ray-AABB picking

export class Scene {
  constructor(gl, canvas) {
    this.gl = gl;
    this.canvas = canvas;
    this.prog = createProgram(gl, VERT_SRC, FRAG_SRC);

    this.cube = this._upload(makeCube());
    this.arrow = this._upload(makeArrow());

    this.offset = [0, 0, 0]; // grid-centering offset

    gl.enable(gl.DEPTH_TEST);
    // Backface culling is intentionally left OFF: the procedural arrow mesh mixes
    // winding orders, and without it some faces could vanish. Overdraw is trivial
    // for this small scene, and it guarantees every face renders.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  _upload(mesh) {
    const gl = this.gl;
    return {
      position: createBuffer(gl, mesh.positions),
      normal: createBuffer(gl, mesh.normals),
      index: createBuffer(gl, mesh.indices, gl.ELEMENT_ARRAY_BUFFER),
      count: mesh.indices.length,
    };
  }

  // Set grid size to compute the centering offset so the puzzle is centered.
  setGridSize(sx, sy, sz) {
    this.offset = [
      -((sx - 1) / 2) * SPACING,
      -((sy - 1) / 2) * SPACING,
      -((sz - 1) / 2) * SPACING,
    ];
  }

  // World center of a grid cell (plus optional animation offset vector).
  worldCenter(x, y, z, extra = [0, 0, 0]) {
    return [
      this.offset[0] + x * SPACING + extra[0],
      this.offset[1] + y * SPACING + extra[1],
      this.offset[2] + z * SPACING + extra[2],
    ];
  }

  _bindMesh(mesh) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.position);
    const aPos = this.prog.attrib('aPosition');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normal);
    const aNrm = this.prog.attrib('aNormal');
    gl.enableVertexAttribArray(aNrm);
    gl.vertexAttribPointer(aNrm, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.index);
  }

  _drawMesh(mesh, model, color, emissive, alpha) {
    const gl = this.gl;
    gl.uniformMatrix4fv(this.prog.uniform('uModel'), false, new Float32Array(model));
    gl.uniformMatrix3fv(this.prog.uniform('uNormalMat'), false, new Float32Array(mat3FromMat4(model)));
    gl.uniform3fv(this.prog.uniform('uColor'), color);
    gl.uniform1f(this.prog.uniform('uEmissive'), emissive);
    gl.uniform1f(this.prog.uniform('uAlpha'), alpha);
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
  }

  // drawList: [{ x,y,z,dir, color, extra:[dx,dy,dz], scale, alpha, emissive,
  //              arrowExtra:[..], arrowAlpha }]
  render(camera, drawList, bgColor = [0.07, 0.09, 0.13, 1]) {
    const gl = this.gl;
    resizeToDisplay(gl, this.canvas);
    const aspect = this.canvas.width / this.canvas.height;

    gl.clearColor(bgColor[0], bgColor[1], bgColor[2], bgColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.prog.use();
    const view = camera.viewMatrix();
    const proj = camera.projectionMatrix(aspect);
    const eye = camera.eye();
    gl.uniformMatrix4fv(this.prog.uniform('uProjection'), false, new Float32Array(proj));
    gl.uniformMatrix4fv(this.prog.uniform('uView'), false, new Float32Array(view));
    gl.uniform3fv(this.prog.uniform('uCameraPos'), new Float32Array(eye));

    // Cubes first.
    this._bindMesh(this.cube);
    for (const d of drawList) {
      const c = this.worldCenter(d.x, d.y, d.z, d.extra || [0, 0, 0]);
      const scale = (d.scale ?? 1) * CUBE_SCALE;
      const model = mat4.multiply(
        mat4.translation(c[0], c[1], c[2]),
        mat4.scaling(scale, scale, scale)
      );
      this._drawMesh(this.cube, model, d.color, d.emissive ?? 0, d.alpha ?? 1);
    }

    // Arrows on top, oriented & protruding from the cube face.
    this._bindMesh(this.arrow);
    for (const d of drawList) {
      const off = DIR_OFFSET[d.dir];
      const arrowExtra = d.arrowExtra || [0, 0, 0];
      const baseExtra = d.extra || [0, 0, 0];
      const protr = 0.34 * CUBE_SCALE;
      const c = this.worldCenter(
        d.x, d.y, d.z,
        [
          baseExtra[0] + off[0] * protr + arrowExtra[0],
          baseExtra[1] + off[1] * protr + arrowExtra[1],
          baseExtra[2] + off[2] * protr + arrowExtra[2],
        ]
      );
      const aScale = (d.scale ?? 1) * 0.85;
      const model = mat4.multiply(
        mat4.multiply(
          mat4.translation(c[0], c[1], c[2]),
          mat4.scaling(aScale, aScale, aScale)
        ),
        dirRotation(d.dir)
      );
      const arrowAlpha = (d.arrowAlpha ?? d.alpha ?? 1);
      this._drawMesh(this.arrow, model, ARROW_COLOR, d.emissive ?? 0, arrowAlpha);
    }
  }
}
