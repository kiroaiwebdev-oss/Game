// picker.js
// Ray vs axis-aligned-bounding-box intersection, used to figure out which
// block the player tapped. Returns the nearest hit.

import { vec3 } from './glmath.js';

// Slab method. center = [x,y,z], halfSize scalar (cubes are uniform).
// Returns t (distance along ray) or null if no hit / behind origin.
export function rayAABB(origin, dir, center, half) {
  const min = [center[0] - half, center[1] - half, center[2] - half];
  const max = [center[0] + half, center[1] + half, center[2] + half];
  let tmin = -Infinity;
  let tmax = Infinity;
  for (let i = 0; i < 3; i++) {
    const o = origin[i];
    const d = dir[i];
    if (Math.abs(d) < 1e-8) {
      if (o < min[i] || o > max[i]) return null; // parallel & outside slab
    } else {
      const inv = 1 / d;
      let t1 = (min[i] - o) * inv;
      let t2 = (max[i] - o) * inv;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
  }
  const t = tmin >= 0 ? tmin : tmax;
  return t >= 0 ? t : null;
}

// Given a list of pickable items [{ block, worldCenter }] and a ray,
// return the nearest block hit, or null.
export function pickBlock(items, origin, dir, half) {
  let best = null;
  let bestT = Infinity;
  for (const it of items) {
    const t = rayAABB(origin, dir, it.worldCenter, half);
    if (t !== null && t < bestT) {
      bestT = t;
      best = it.block;
    }
  }
  return best;
}

export { vec3 };
