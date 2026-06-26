// glmath.js
// Minimal column-major mat4 / vec3 math for the renderer. No dependencies.
// Column-major to match WebGL's expectation when passed with transpose=false.

export const vec3 = {
  create: (x = 0, y = 0, z = 0) => [x, y, z],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  length: (a) => Math.hypot(a[0], a[1], a[2]),
  normalize: (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
};

export const mat4 = {
  identity: () => [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ],

  multiply: (a, b) => {
    const out = new Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        out[c * 4 + r] =
          a[0 * 4 + r] * b[c * 4 + 0] +
          a[1 * 4 + r] * b[c * 4 + 1] +
          a[2 * 4 + r] * b[c * 4 + 2] +
          a[3 * 4 + r] * b[c * 4 + 3];
      }
    }
    return out;
  },

  translation: (x, y, z) => [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1,
  ],

  scaling: (x, y, z) => [
    x, 0, 0, 0,
    0, y, 0, 0,
    0, 0, z, 0,
    0, 0, 0, 1,
  ],

  rotationX: (a) => {
    const c = Math.cos(a), s = Math.sin(a);
    return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
  },
  rotationY: (a) => {
    const c = Math.cos(a), s = Math.sin(a);
    return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
  },
  rotationZ: (a) => {
    const c = Math.cos(a), s = Math.sin(a);
    return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  },

  perspective: (fovyRad, aspect, near, far) => {
    const f = 1 / Math.tan(fovyRad / 2);
    const nf = 1 / (near - far);
    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0,
    ];
  },

  // Right-handed look-at view matrix.
  lookAt: (eye, target, up) => {
    const z = vec3.normalize(vec3.sub(eye, target));
    const x = vec3.normalize(vec3.cross(up, z));
    const y = vec3.cross(z, x);
    return [
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      -vec3.dot(x, eye), -vec3.dot(y, eye), -vec3.dot(z, eye), 1,
    ];
  },

  // Upper-left 3x3 inverse-transpose for transforming normals. For our
  // rigid + uniform-scale model matrices we can just use the rotation part,
  // but this is the general-correct version restricted to 3x3.
  normalFromMat4: (m) => {
    // Extract 3x3
    const a00 = m[0], a01 = m[1], a02 = m[2];
    const a10 = m[4], a11 = m[5], a12 = m[6];
    const a20 = m[8], a21 = m[9], a22 = m[10];
    const det =
      a00 * (a11 * a22 - a12 * a21) -
      a01 * (a10 * a22 - a12 * a20) +
      a02 * (a10 * a21 - a11 * a20);
    if (!det) return [a00, a01, a02, a10, a11, a12, a20, a21, a22];
    const id = 1 / det;
    // inverse-transpose
    return [
      (a11 * a22 - a12 * a21) * id,
      (a12 * a20 - a10 * a22) * id,
      (a10 * a21 - a11 * a20) * id,
      (a02 * a21 - a01 * a22) * id,
      (a00 * a22 - a02 * a20) * id,
      (a01 * a20 - a00 * a21) * id,
      (a01 * a12 - a02 * a11) * id,
      (a02 * a10 - a00 * a12) * id,
      (a00 * a11 - a01 * a10) * id,
    ];
  },
};
