const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// =============================================
// LRU 幂等缓存
// =============================================
class LRUIdempotentCache {
  constructor(maxSize = 1000, ttlMs = 60000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
    // key -> { result, timestamp }
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    // LRU: 移到末尾
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.result;
  }

  set(key, result) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 淘汰最久未使用的
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { result, timestamp: Date.now() });
  }
}

const idempotentCache = new LRUIdempotentCache(1000, 60000);

// =============================================
// 幂等中间件
// =============================================
function idempotentMiddleware(req, res, next) {
  const idempotentKey = req.headers['x-idempotent-key'];

  if (!idempotentKey) {
    return next();
  }

  const cachedResult = idempotentCache.get(idempotentKey);
  if (cachedResult) {
    console.log(`[幂等命中] key=${idempotentKey.slice(0, 8)}... → 直接返回缓存`);
    return res.status(cachedResult.status).json({
      ...cachedResult.body,
      idempotent: true,
      message: '(幂等返回) ' + cachedResult.body.message
    });
  }

  // 标记处理中，防止并发重复
  req.__idempotentKey = idempotentKey;
  next();
}

// =============================================
// 模拟业务数据存储
// =============================================
const orders = [];

// =============================================
// 业务接口
// =============================================

// 获取幂等Key (前端首次调用获取)
app.get('/api/idempotent-key', (req, res) => {
  const key = uuidv4();
  res.json({ code: 0, data: { key } });
});

// 提交订单 - 核心幂等接口
app.post('/api/order/submit', idempotentMiddleware, (req, res) => {
  // 模拟业务处理延迟 (放大重复提交窗口)
  const delay = parseInt(req.query.delay) || 500;
  const { productName, amount } = req.body;

  setTimeout(() => {
    const order = {
      id: `ORD${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      productName,
      amount,
      createdAt: new Date().toISOString()
    };
    orders.push(order);

    const result = {
      status: 200,
      body: {
        code: 0,
        data: order,
        message: '订单提交成功'
      }
    };

    // 存入幂等缓存
    if (req.__idempotentKey) {
      idempotentCache.set(req.__idempotentKey, result);
      console.log(`[幂等存储] key=${req.__idempotentKey.slice(0, 8)}... → 已缓存`);
    }

    res.json(result.body);
  }, delay);
});

// 查询订单列表
app.get('/api/orders', (req, res) => {
  res.json({ code: 0, data: orders, total: orders.length });
});

// 通用幂等接口 - POST/PUT/DELETE 写操作
app.post('/api/resource/create', idempotentMiddleware, (req, res) => {
  const delay = parseInt(req.query.delay) || 300;
  const { name, value } = req.body;

  setTimeout(() => {
    const resource = {
      id: uuidv4(),
      name,
      value,
      createdAt: new Date().toISOString()
    };

    const result = {
      status: 200,
      body: { code: 0, data: resource, message: '资源创建成功' }
    };

    if (req.__idempotentKey) {
      idempotentCache.set(req.__idempotentKey, result);
    }

    res.json(result.body);
  }, delay);
});

// =============================================
// 启动服务
// =============================================
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ 幂等服务已启动: http://localhost:${PORT}`);
  console.log(`   - 幂等中间件已启用 (TTL=60s, MaxSize=1000)`);
  console.log(`   - GET  /api/idempotent-key  → 获取幂等Key`);
  console.log(`   - POST /api/order/submit    → 提交订单(幂等)`);
  console.log(`   - POST /api/resource/create → 创建资源(幂等)`);
  console.log(`   - GET  /api/orders          → 查询订单`);
});