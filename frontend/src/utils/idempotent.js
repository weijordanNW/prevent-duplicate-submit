// =============================================
// 幂等Key生成器
// =============================================

let keyCache = null;
let keyPromise = null;

function generateLocalKey() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getIdempotentKey(request, forceRefresh = false) {
  if (!request) {
    return null;
  }

  const { method, url } = request;
  const upperMethod = (method || 'GET').toUpperCase();

  // 读请求不需要幂等Key
  if (upperMethod === 'GET' || upperMethod === 'HEAD' || upperMethod === 'OPTIONS') {
    return null;
  }

  // 请求级别的唯一Key
  const localKey = generateLocalKey();

  try {
    if (forceRefresh || !keyCache) {
      keyPromise = null;
    }

    if (!keyPromise) {
      keyPromise = fetch('/api/idempotent-key')
        .then(res => res.json())
        .then(data => {
          keyCache = data.data.key;
          return keyCache;
        })
        .catch(() => {
          return localKey;
        });
    }

    const serverKey = await keyPromise;
    return serverKey || localKey;
  } catch {
    return localKey;
  }
}

export function requestFingerprint(config) {
  const { method, url, data, params } = config;
  const parts = [
    (method || 'GET').toUpperCase(),
    url || ''
  ];

  try {
    if (data) {
      parts.push(typeof data === 'string' ? data : JSON.stringify(data));
    }
    if (params) {
      parts.push(typeof params === 'string' ? params : JSON.stringify(params));
    }
  } catch {
    parts.push(String(Date.now()));
  }

  return parts.join('|');
}