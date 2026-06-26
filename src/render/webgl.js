// webgl.js
// Thin WebGL helpers: context creation, shader/program compilation, buffers.
// No dependencies. Throws readable errors on failure.

export function createContext(canvas) {
  const gl =
    canvas.getContext('webgl2', { antialias: true, alpha: true }) ||
    canvas.getContext('webgl', { antialias: true, alpha: true });
  if (!gl) throw new Error('WebGL is not supported in this browser.');
  return gl;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error:\n${log}\n--- source ---\n${source}`);
  }
  return shader;
}

export function createProgram(gl, vertexSrc, fragmentSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    throw new Error(`Program link error:\n${log}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  // Cache attribute & uniform locations lazily.
  const attribs = {};
  const uniforms = {};
  return {
    program,
    attrib(name) {
      if (!(name in attribs)) attribs[name] = gl.getAttribLocation(program, name);
      return attribs[name];
    },
    uniform(name) {
      if (!(name in uniforms)) uniforms[name] = gl.getUniformLocation(program, name);
      return uniforms[name];
    },
    use() { gl.useProgram(program); },
  };
}

export function createBuffer(gl, data, target = gl.ARRAY_BUFFER, usage = gl.STATIC_DRAW) {
  const buf = gl.createBuffer();
  gl.bindBuffer(target, buf);
  gl.bufferData(target, data, usage);
  return buf;
}

// Resize the drawing buffer to match CSS size * devicePixelRatio. Returns true
// if the size changed (so the caller can update the projection / viewport).
export function resizeToDisplay(gl, canvas, maxDpr = 2) {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    return true;
  }
  return false;
}
