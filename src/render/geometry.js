// geometry.js
// Procedurally builds the two meshes we need: a unit cube and a 3D arrow.
// Each mesh = { positions:Float32Array, normals:Float32Array, indices:Uint16Array }.
// No external assets — everything is generated, keeping the build tiny & offline.

function buildMesh(faces) {
  const positions = [];
  const normals = [];
  const indices = [];
  let vbase = 0;
  for (const f of faces) {
    for (const v of f.verts) {
      positions.push(v[0], v[1], v[2]);
      normals.push(f.normal[0], f.normal[1], f.normal[2]);
    }
    // Two triangles per quad face (assumes 4 verts CCW).
    indices.push(vbase, vbase + 1, vbase + 2, vbase, vbase + 2, vbase + 3);
    vbase += 4;
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

// Unit cube centered at origin, edge length 1 (-0.5..0.5).
export function makeCube() {
  const h = 0.5;
  const faces = [
    { normal: [0, 0, 1], verts: [[-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]] },     // +Z
    { normal: [0, 0, -1], verts: [[h, -h, -h], [-h, -h, -h], [-h, h, -h], [h, h, -h]] }, // -Z
    { normal: [1, 0, 0], verts: [[h, -h, h], [h, -h, -h], [h, h, -h], [h, h, h]] },      // +X
    { normal: [-1, 0, 0], verts: [[-h, -h, -h], [-h, -h, h], [-h, h, h], [-h, h, -h]] }, // -X
    { normal: [0, 1, 0], verts: [[-h, h, h], [h, h, h], [h, h, -h], [-h, h, -h]] },      // +Y
    { normal: [0, -1, 0], verts: [[-h, -h, -h], [h, -h, -h], [h, -h, h], [-h, -h, h]] }, // -Y
  ];
  return buildMesh(faces);
}

// A 3D arrow pointing +Y by default (shaft + pyramid head), sized to sit nicely
// on a unit cube face. Centered around origin-ish, tip at +Y.
export function makeArrow() {
  const positions = [];
  const normals = [];
  const indices = [];

  function quad(a, b, c, d, n) {
    const base = positions.length / 3;
    for (const v of [a, b, c, d]) positions.push(v[0], v[1], v[2]);
    for (let i = 0; i < 4; i++) normals.push(n[0], n[1], n[2]);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  function tri(a, b, c, n) {
    const base = positions.length / 3;
    for (const v of [a, b, c]) positions.push(v[0], v[1], v[2]);
    for (let i = 0; i < 3; i++) normals.push(n[0], n[1], n[2]);
    indices.push(base, base + 1, base + 2);
  }

  // Shaft: a thin square prism from y=-0.32 to y=0.05
  const sw = 0.11;       // half-width of shaft
  const sy0 = -0.34, sy1 = 0.04;
  const s = [
    [-sw, sy0, -sw], [sw, sy0, -sw], [sw, sy1, -sw], [-sw, sy1, -sw], // back face verts
    [-sw, sy0, sw], [sw, sy0, sw], [sw, sy1, sw], [-sw, sy1, sw],     // front face verts
  ];
  quad(s[4], s[5], s[6], s[7], [0, 0, 1]);   // +Z
  quad(s[1], s[0], s[3], s[2], [0, 0, -1]);  // -Z
  quad(s[5], s[1], s[2], s[6], [1, 0, 0]);   // +X
  quad(s[0], s[4], s[7], s[3], [-1, 0, 0]);  // -X
  quad(s[3], s[7], s[6], s[2], [0, 1, 0]);   // top (under head)
  quad(s[0], s[1], s[5], s[4], [0, -1, 0]);  // bottom

  // Head: pyramid from a square base at y=0.04 to a tip at y=0.38
  const hw = 0.22; // half-width of head base
  const by = 0.02, ty = 0.4;
  const tip = [0, ty, 0];
  const b0 = [-hw, by, -hw], b1 = [hw, by, -hw], b2 = [hw, by, hw], b3 = [-hw, by, hw];
  // 4 slanted faces (normals approximate, normalized).
  const nUp = 0.5;
  tri(b1, b0, tip, normVec([0, nUp, -1]));
  tri(b2, b1, tip, normVec([1, nUp, 0]));
  tri(b3, b2, tip, normVec([0, nUp, 1]));
  tri(b0, b3, tip, normVec([-1, nUp, 0]));
  // base
  quad(b0, b1, b2, b3, [0, -1, 0]);

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

function normVec(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
