// storage.js
// Safe key/value persistence. Yandex flags direct window.localStorage use inside
// their sandboxed iframe ("Service storage URL detected") and recommends the
// SDK's safe drop-in storage (ysdk.getStorage()). All game persistence (progress,
// onboarding, support flag) goes through here so we never touch window.localStorage
// directly on Yandex/Playhoop.
//
// The platform adapter installs the backend at boot:
//   - Playhoop/Yandex  -> ysdk.getStorage()  (safe storage, no service-URL warning)
//   - other platforms  -> window.localStorage
//   - none available   -> in-memory map (last resort, lost on refresh)

const _mem = Object.create(null);
let _backend = null;

// Install the active storage backend (a localStorage-like object) or null.
export function setBackend(backend) { _backend = backend || null; }

export function getItem(key) {
  try {
    if (_backend) {
      const v = _backend.getItem(key);
      if (v != null) return v;
    }
  } catch (_) {}
  return key in _mem ? _mem[key] : null;
}

export function setItem(key, val) {
  const v = String(val);
  _mem[key] = v;
  try { if (_backend) _backend.setItem(key, v); } catch (_) {}
}
