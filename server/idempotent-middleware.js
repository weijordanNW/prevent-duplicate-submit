// =============================================
// LRU 幂等缓存
// =============================================
class LRUIdempotentCache {
  constructor(maxSize = 1000, ttlMs = 60000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.result;
  }

  set(key, result) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { result, timestamp: Date.now() });
  }
}

const idempotentCache = new LRUIdempotentCache(1000, 60000);

// =============================================
// in-flight 并发保护
// =============================================
const inFlight = new Map();

function idempotentMiddleware(req, res, next) {
  const idempotentKey = req.headers['x-idempotent-key'];
  if (!idempotentKey) return next();

  const cachedResult = idempotentCache.get(idempotentKey);
  if (cachedResult) {
    return res.status(cachedResult.status).json({
      ...cachedResult.body,
      idempotent: true,
      message: '(幂等返回) ' + cachedResult.body.message
    });
  }

  if (inFlight.has(idempotentKey)) {
    inFlight.get(idempotentKey).push(res);
    return;
  }

  inFlight.set(idempotentKey, []);

  const originalJson = res.json.bind(res);
  res.json = function (body) {
    const queue = inFlight.get(idempotentKey) || [];
    inFlight.delete(idempotentKey);
    for (const queuedRes of queue) {
      queuedRes.json({ ...body, idempotent: true, message: '(幂等返回) ' + (body.message || '') });
    }
    return originalJson(body);
  };

  req.__idempotentKey = idempotentKey;
  next();
}

module.exports = { idempotentMiddleware, idempotentCache };
