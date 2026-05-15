<template>
  <div class="demo-wrapper">
    <!-- ======== 卡片1: v-preventReClick 指令演示 ======== -->
    <section class="card">
      <div class="card-header">
        <span class="badge badge-purple">自定义指令</span>
        <h2>v-preventReClick 一行搞定</h2>
      </div>
      <p class="card-desc">只需在按钮上加一个指令，自动防止重复点击，不用每个方法写 loading 判断</p>

      <div class="demo-row">
        <button v-preventReClick class="btn btn-primary" @click="fastClickDemo">
          纯防抖 (300ms) - 疯狂点我
        </button>
        <span class="tip">v-preventReClick 默认300ms防抖</span>
      </div>

      <div class="demo-row">
        <button v-preventReClick="800" class="btn btn-warning" @click="fastClickDemo">
          纯防抖 (800ms) - 疯狂点我
        </button>
        <span class="tip">v-preventReClick="800" 自定义防抖时长</span>
      </div>

      <div class="log-box">
        <div class="log-header">
          <span class="log-title">点击日志</span>
          <button class="log-clear-btn" @click="clearClickLogs">清空日志</button>
        </div>
        <div v-for="(log, i) in clickLogs" :key="i" class="log-item">
          {{ log }}
        </div>
        <div v-if="clickLogs.length === 0" class="log-empty">等待点击...</div>
      </div>
    </section>

    <!-- ======== 卡片2: 全局拦截器 + 幂等设计 ======== -->
    <section class="card">
      <div class="card-header">
        <span class="badge badge-blue">全局拦截器</span>
        <h2>Axios 拦截器自动防重 + 幂等Key</h2>
      </div>
      <p class="card-desc">所有写请求自动携带幂等Key，拦截器自动拦截短时间内重复请求，无需任何额外代码</p>

      <div class="demo-row">
        <button class="btn btn-danger" @click="submitWithoutGuard">
          无防护提交 (可重复)
        </button>
        <button class="btn btn-success" @click="submitOrder">
          有防护提交 (幂等)
        </button>
        <button class="btn btn-outline" @click="rapidFireSubmit">
          连发5次 (测试防重)
        </button>
      </div>

      <div class="config-row">
        <label>模拟延迟: </label>
        <select v-model.number="delay">
          <option :value="500">500ms</option>
          <option :value="1000">1000ms</option>
          <option :value="2000">2000ms</option>
          <option :value="3000">3000ms</option>
        </select>
        <span class="tip ms">延迟越大越容易触发重复提交</span>
      </div>

      <div class="log-box">
        <div class="log-header">
          <span class="log-title">请求日志 (打开控制台查看更多)</span>
          <button class="log-clear-btn" @click="clearRequestLogs">清空日志</button>
        </div>
        <div v-for="(log, i) in requestLogs" :key="i" class="log-item" :class="{ 'log-dup': log.duplicate, 'log-idempotent': log.idempotent }">
          <span class="log-badge">{{ log.type }}</span>
          {{ log.message }}
        </div>
        <div v-if="requestLogs.length === 0" class="log-empty">等待请求...</div>
      </div>
    </section>

    <!-- ======== 卡片3: 架构说明 ======== -->
    <section class="card">
      <div class="card-header">
        <span class="badge badge-green">架构总览</span>
        <h2>防重复提交完整链路</h2>
      </div>
      <div class="arch-diagram">
        <div class="arch-flow">
          <div class="arch-node">用户点击</div>
          <div class="arch-arrow">→</div>
          <div class="arch-node highlight">v-preventReClick<br/><small>UI层防抖</small></div>
          <div class="arch-arrow">→</div>
          <div class="arch-node highlight">Axios拦截器<br/><small>指纹去重</small></div>
          <div class="arch-arrow">→</div>
          <div class="arch-node highlight">幂等Key注入<br/><small>x-idempotent-key</small></div>
          <div class="arch-arrow">→</div>
          <div class="arch-node highlight">后端中间件<br/><small>LRU缓存校验</small></div>
          <div class="arch-arrow">→</div>
          <div class="arch-node">业务处理</div>
        </div>
      </div>
      <ul class="feature-list">
        <li><strong>Layer 1 - UI层:</strong> <code>v-preventReClick</code> 指令阻止DOM层面的重复点击</li>
        <li><strong>Layer 2 - 请求层:</strong> Axios拦截器基于请求指纹去重，自动取消重复请求</li>
        <li><strong>Layer 3 - 协议层:</strong> 每个写请求自动携带幂等Key (<code>x-idempotent-key</code>)</li>
        <li><strong>Layer 4 - 服务层:</strong> 后端LRU缓存幂等校验，TTL内相同Key直接返回缓存结果</li>
      </ul>
    </section>

    <!-- ======== 卡片4: 已提交订单 ======== -->
    <section class="card">
      <div class="card-header">
        <span class="badge badge-orange">数据验证</span>
        <h2>已提交订单</h2>
        <span v-if="hasDuplicates" class="dup-alert-badge">
          ⚠️ 检测到 {{ duplicateCount }} 条疑似重复
        </span>
        <span v-else-if="orders.length > 0" class="dup-ok-badge">
          ✅ 无重复
        </span>
      </div>
      <p class="card-desc">验证：疯狂点击"无防护提交"会出现多条重复，点击"有防护提交"始终只有一条</p>
      <div class="order-actions">
        <button class="btn btn-outline btn-sm" @click="fetchOrders">刷新列表</button>
        <button class="btn btn-danger btn-sm" @click="clearOrders">清空列表</button>
      </div>
      <div v-if="orders.length === 0" class="log-empty">暂无订单，去上面提交一个试试</div>
      <div v-for="order in orders" :key="order.id"
           class="order-item"
           :class="{ 'order-dup': duplicateOrderIds.has(order.id) }">
        <span v-if="duplicateOrderIds.has(order.id)" class="dup-icon" title="疑似重复订单">🔁</span>
        <span class="order-id">{{ order.id }}</span>
        <span class="order-name">{{ order.productName }}</span>
        <span class="order-amount">¥{{ order.amount }}</span>
        <span class="order-time">{{ order.createdAt }}</span>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import request from '../utils/request.js';

const delay = ref(500);
const clickLogs = ref([]);
const requestLogs = ref([]);
const orders = ref([]);

// 检测重复订单：相同商品名 + 相同金额 + 时间间隔 < 3秒 = 真正重复提交
const DUPLICATE_WINDOW_MS = 3000;

const duplicateOrderIds = computed(() => {
  const ids = new Set();
  const list = orders.value;
  if (list.length < 2) return ids;

  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (list[i].productName === list[j].productName && list[i].amount === list[j].amount) {
        const ti = new Date(list[i].createdAt).getTime();
        const tj = new Date(list[j].createdAt).getTime();
        if (Math.abs(tj - ti) < DUPLICATE_WINDOW_MS) {
          ids.add(list[i].id);
          ids.add(list[j].id);
        }
      }
    }
  }
  return ids;
});

const duplicateCount = computed(() => duplicateOrderIds.value.size);

const hasDuplicates = computed(() => duplicateCount.value > 0);

// =============================================
// 纯防抖演示
// =============================================
let clickCount = 0;
function fastClickDemo() {
  clickCount++;
  clickLogs.value.unshift(`[${new Date().toLocaleTimeString()}] 实际执行 #${clickCount}`);
  if (clickLogs.value.length > 8) clickLogs.value.pop();
}

function clearClickLogs() {
  clickLogs.value = [];
  clickCount = 0;
}

// =============================================
// 公共模拟数据
// =============================================
const productPool = [
  { name: '蓝牙耳机', amount: 199 },
  { name: '机械键盘', amount: 299 },
  { name: '充电宝', amount: 399 },
  { name: '无线鼠标', amount: 149 },
  { name: '手机支架', amount: 49 },
  { name: '数据线', amount: 29 },
  { name: '笔记本', amount: 12 },
  { name: 'U盘 64G', amount: 89 },
  { name: '显示器', amount: 1299 },
  { name: '插座', amount: 39 }
];

function randomProduct() {
  return productPool[Math.floor(Math.random() * productPool.length)];
}

// =============================================
// 无防护提交 (可以看到重复提交)
// =============================================
async function submitWithoutGuard() {
  const { name: productName, amount } = randomProduct();
  const msg = `[${new Date().toLocaleTimeString()}] 无防护提交: ${productName} ¥${amount}`;
  requestLogs.value.unshift({ type: '⚠️', message: msg, duplicate: false });

  try {
    const res = await request({
      method: 'post',
      url: '/api/order/submit?delay=2000',
      data: { productName, amount },
      __skipIdempotent: true
    });
    requestLogs.value.unshift({
      type: '✅',
      message: `无防护: ${res.data?.message} (${res.data?.data?.id})`,
      idempotent: false
    });
  } catch (e) {
    requestLogs.value.unshift({ type: '❌', message: '请求失败', duplicate: false });
  }
  if (requestLogs.value.length > 15) requestLogs.value.length = 15;
  fetchOrders();
}

// =============================================
// 有防护提交 (全局拦截器自动防重 + 幂等)
// =============================================
async function submitOrder() {
  const { name: productName, amount } = randomProduct();

  const msg = `[${new Date().toLocaleTimeString()}] 提交订单: ${productName} ¥${amount}`;
  requestLogs.value.unshift({ type: '📤', message: msg, duplicate: false });

  try {
    const res = await request.post(`/api/order/submit?delay=${delay.value}`, {
      productName,
      amount
    });

    if (res.data?.duplicate) {
      requestLogs.value.unshift({
        type: '🚫',
        message: '前端拦截: 重复请求已取消',
        duplicate: true
      });
    } else if (res.data?.idempotent) {
      requestLogs.value.unshift({
        type: '🔁',
        message: `幂等返回: ${res.data?.message}`,
        idempotent: true
      });
    } else {
      requestLogs.value.unshift({
        type: '✅',
        message: `成功: ${res.data?.message} (${res.data?.data?.id})`,
        idempotent: false
      });
    }
  } catch (e) {
    requestLogs.value.unshift({ type: '❌', message: `错误: ${e.message}`, duplicate: false });
  }

  if (requestLogs.value.length > 15) requestLogs.value.length = 15;
  fetchOrders();
}

// =============================================
// 连发5次 - 测试防重能力
// =============================================
function rapidFireSubmit() {
  requestLogs.value.unshift({ type: '🔥', message: '连发5次请求...', duplicate: false });
  for (let i = 0; i < 5; i++) {
    submitOrder();
  }
}

function clearRequestLogs() {
  requestLogs.value = [];
}

// =============================================
// 查询订单
// =============================================
async function fetchOrders() {
  try {
    const res = await request.get('/api/orders');
    orders.value = res.data?.data || [];
  } catch {
    orders.value = [];
  }
}

// =============================================
// 清空订单列表
// =============================================
async function clearOrders() {
  try {
    await request.delete('/api/orders');
    orders.value = [];
  } catch {
    // 降级: 仅清前端
    orders.value = [];
  }
}
</script>

<style scoped>
.demo-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 28px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.card-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.card-desc {
  color: #888;
  font-size: 13px;
  margin-bottom: 20px;
  line-height: 1.6;
}

.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}

.badge-purple { background: linear-gradient(135deg, #667eea, #764ba2); }
.badge-blue   { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.badge-green  { background: linear-gradient(135deg, #43e97b, #38f9d7); }
.badge-orange { background: linear-gradient(135deg, #fa709a, #fee140); }

.demo-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  font-size: 14px;
  color: #666;
}

.config-row select {
  padding: 6px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
}

.tip {
  font-size: 12px;
  color: #aaa;
}

.tip.ms {
  color: #999;
}

/* 按钮样式 */
.btn {
  padding: 10px 22px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  color: #fff;
}

.btn:active { transform: scale(0.97); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary  { background: linear-gradient(135deg, #667eea, #764ba2); }
.btn-warning  { background: linear-gradient(135deg, #f093fb, #f5576c); }
.btn-danger   { background: linear-gradient(135deg, #fa709a, #fee140); color: #333; }
.btn-success  { background: linear-gradient(135deg, #43e97b, #38f9d7); color: #333; }
.btn-outline  { background: transparent; border: 2px solid #d9d9d9; color: #666; }
.btn-sm       { padding: 6px 14px; font-size: 12px; margin-bottom: 12px; }

.order-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

/* 日志 */
.log-box {
  background: #1e1e2e;
  border-radius: 8px;
  padding: 14px 16px;
  max-height: 260px;
  overflow-y: auto;
  margin-top: 6px;
}

.log-title {
  color: #a6adc8;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.log-clear-btn {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  color: #9399b2;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}

.log-clear-btn:hover {
  background: rgba(243,139,168,0.15);
  border-color: rgba(243,139,168,0.3);
  color: #f38ba8;
}

.log-item {
  color: #cdd6f4;
  font-size: 13px;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  font-family: 'SF Mono', Monaco, Consolas, monospace;
}

.log-item.log-dup { color: #f38ba8; }
.log-item.log-idempotent { color: #f9e2af; }

.log-badge {
  display: inline-block;
  width: 28px;
  text-align: center;
}

.log-empty {
  color: #585b70;
  font-size: 13px;
  font-style: italic;
}

/* 架构图 */
.arch-diagram {
  background: #f8f9fc;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
}

.arch-flow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.arch-node {
  background: #e8ecf1;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  min-width: 80px;
}

.arch-node.highlight {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}

.arch-node small {
  display: block;
  font-size: 10px;
  opacity: 0.75;
  margin-top: 2px;
}

.arch-arrow {
  color: #667eea;
  font-weight: bold;
  font-size: 18px;
}

/* 特性列表 */
.feature-list {
  list-style: none;
  padding: 0;
}

.feature-list li {
  padding: 10px 14px;
  margin-bottom: 6px;
  background: #f8f9fc;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
}

.feature-list code {
  background: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: #667eea;
  border: 1px solid #e8ecf1;
}

/* 订单列表 */
.order-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: #f8f9fc;
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  flex-wrap: wrap;
}

.order-id {
  font-family: monospace;
  font-weight: 600;
  color: #667eea;
  min-width: 140px;
}

.order-name { flex: 1; }
.order-amount { font-weight: 600; min-width: 80px; }
.order-time { color: #999; font-size: 12px; }

/* 重复订单高亮 */
.order-dup {
  background: #fff5f5 !important;
  border-left: 3px solid #e53e3e;
  animation: dupPulse 0.6s ease-in-out;
}

@keyframes dupPulse {
  0% { background: #fed7d7; }
  100% { background: #fff5f5; }
}

.dup-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.dup-alert-badge {
  background: #fff5f5;
  color: #c53030;
  border: 1px solid #feb2b2;
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  animation: badgeShake 0.4s ease-in-out;
}

@keyframes badgeShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}

.dup-ok-badge {
  background: #f0fff4;
  color: #276749;
  border: 1px solid #9ae6b4;
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
</style>