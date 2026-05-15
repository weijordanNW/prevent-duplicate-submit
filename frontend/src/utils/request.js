// =============================================
// Axios 全局请求拦截器 - 自动防重
// =============================================

import axios from 'axios';
import { getIdempotentKey, requestFingerprint, refreshIdempotentKey } from './idempotent.js';

const instance = axios.create({
  baseURL: '/',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// =============================================
// 请求去重 Map
// key: 请求指纹, value: { controller, timestamp }
// =============================================
const pendingRequests = new Map();
const DEDUP_WINDOW_MS = 2000;

function cleanupPendingRequests() {
  const now = Date.now();
  for (const [key, entry] of pendingRequests.entries()) {
    if (now - entry.timestamp > DEDUP_WINDOW_MS) {
      pendingRequests.delete(key);
    }
  }
}

// =============================================
// 请求拦截器
// =============================================

// 需要防重的写操作方法
const IDEMPOTENT_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

instance.interceptors.request.use(async (config) => {
  const method = (config.method || 'GET').toUpperCase();

  // 跳过不需要防重的请求
  if (config.__skipIdempotent || !IDEMPOTENT_METHODS.includes(method)) {
    return config;
  }

  cleanupPendingRequests();

  const dedupKey = `${method}|${config.url}`;
  const existing = pendingRequests.get(dedupKey);

  if (existing && Date.now() - existing.timestamp < DEDUP_WINDOW_MS) {
    console.warn(`[防重拦截] 重复请求已取消: ${dedupKey}`);
    const controller = new AbortController();
    config.signal = controller.signal;
    controller.abort('DUPLICATE_REQUEST');
    return config;
  }

  pendingRequests.set(dedupKey, { timestamp: Date.now() });

  // 幂等Key注入
  try {
    const idempotentKey = __idempotentKeyOverride
      || await getIdempotentKey(config);
    if (idempotentKey) {
      config.headers['x-idempotent-key'] = idempotentKey;
    }
  } catch {
    // 获取Key失败不阻塞请求，降级运行
  }

  // 标记幂等返回
  config.__idempotentKeyUsed = true;

  return config;
}, (error) => Promise.reject(error));

// =============================================
// 响应拦截器
// =============================================

instance.interceptors.response.use(
  (response) => {
    const method = (response.config.method || 'GET').toUpperCase();
    const dedupKey = `${method}|${response.config.url}`;
    pendingRequests.delete(dedupKey);

    if (response.data?.idempotent) {
      console.log('[幂等返回] 服务端检测到重复请求，返回缓存结果');
    }

    // 写请求成功后刷新幂等Key，下次请求用新Key
    if (!response.config.__skipIdempotent && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      refreshIdempotentKey();
    }

    return response;
  },
  (error) => {
    if (axios.isCancel(error) && error.message === 'DUPLICATE_REQUEST') {
      return Promise.resolve({ data: { code: -1, message: '重复请求已拦截', duplicate: true } });
    }

    if (error.config) {
      const method = (error.config.method || 'GET').toUpperCase();
      const dedupKey = `${method}|${error.config.url}`;
      pendingRequests.delete(dedupKey);
    }

    return Promise.reject(error);
  }
);

// =============================================
// 对外暴露的工具方法
// =============================================

let __idempotentKeyOverride = null;

export function setIdempotentKeyOverride(key) {
  __idempotentKeyOverride = key;
}

export function clearIdempotentKeyOverride() {
  __idempotentKeyOverride = null;
}

export function skipIdempotent(config) {
  return { ...config, __skipIdempotent: true };
}

export function getPendingCount() {
  return pendingRequests.size;
}

export default instance;