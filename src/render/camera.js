// camera.js
// Orbit camera: rotates around a target point. Produces view/projection
// matrices and can build a world-space pick ray from screen coordinates.

import { mat4, vec3 } from './glmath.js';

export class OrbitCamera {
  constructor(target = [0, 0, 0]) {
    this.target = target;
    this.azimuth = Math.PI * 0.25;   // horizontal angle
    this.elevation = Math.PI * 0.22; // vertical angle
    this.radius = 9;
    this.fov = (50 * Math.PI) / 180;
    this.near = 0.1;
    this.far = 100;
    this.minElevation = -Math.PI / 2 + 0.15;
    this.maxElevation = Math.PI / 2 - 0.15;
    this.minRadius = 3;
    this.maxRadius = 30;
  }

  eye() {
    const ce = Math.cos(this.elevation);
    return vec3.add(this.target, [
      this.radius * ce * Math.sin(this.azimuth),
      this.radius * Math.sin(this.elevation),
      this.radius * ce * Math.cos(this.azimuth),
    ]);
  }

  viewMatrix() {
    return mat4.lookAt(this.eye(), this.target, [0, 1, 0]);
  }

  projectionMatrix(aspect) {
    return mat4.perspective(this.fov, aspect, this.near, this.far);
  }

  orbit(dAzimuth, dElevation) {
    this.azimuth += dAzimuth;
    this.elevation = Math.min(
      this.maxElevation,
      Math.max(this.minElevation, this.elevation + dElevation)
    );
  }

  zoom(factor) {
    this.radius = Math.min(this.maxRadius, Math.max(this.minRadius, this.radius * factor));
  }

  // Build a normalized world-space ray from a screen pixel.
  // ndcX/ndcY in [-1,1]; returns { origin, dir }.
  screenRay(ndcX, ndcY, aspect) {
    const eye = this.eye();
    const forward = vec3.normalize(vec3.sub(this.target, eye));
    const right = vec3.normalize(vec3.cross(forward, [0, 1, 0]));
    const up = vec3.cross(right, forward);
    const tanFov = Math.tan(this.fov / 2);
    const px = ndcX * tanFov * aspect;
    const py = ndcY * tanFov;
    const dir = vec3.normalize(
      vec3.add(forward, vec3.add(vec3.scale(right, px), vec3.scale(up, py)))
    );
    return { origin: eye, dir };
  }
}
