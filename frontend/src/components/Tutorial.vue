<template>
  <div class="tutorial-container">
    <nav class="tutorial-nav">
      <button v-for="step in steps" :key="step.id" class="nav-step" :class="{ active: currentStep === step.id, done: step.id < currentStep }" @click="currentStep = step.id">
        <span class="step-num">{{ step.id }}</span>
        <span class="step-label">{{ step.label }}</span>
      </button>
    </nav>

    <div class="tutorial-body">
      <section v-if="currentStep === 1" class="step-content">
        <h2>Step 1：理解四层防重架构</h2>
        <p class="step-intro">在写代码之前，先用一张图看懂这 4 层防线各自负责什么。</p>

        <div class="arch-diagram">
          <div class="arch-layer layer-1">
            <div class="layer-num">Layer 1</div>
            <div class="layer-title">UI 层 · v-preventReClick</div>
            <div class="layer-desc">DOM 事件层面拦截重复点击<br/>拦截位置：浏览器按钮</div>
            <div class="layer-cost">接入成本：1 行指令</div>
          </div>
          <div class="arch-arrow-v">▼ 如果 UI 层被绕过（如脚本触发）</div>
          <div class="arch-layer layer-2">
            <div class="layer-num">Layer 2</div>
            <div class="layer-title">请求层 · Axios 拦截器</div>
            <div class="layer-desc">请求指纹去重，取消重复请求<br/>拦截位置：HTTP 请求发出前</div>
            <div class="layer-cost">接入成本：复制 3 个文件</div>
          </div>
          <div class="arch-arrow-v">▼ 如果前端拦截器被绕过（如多 Tab）</div>
          <div class="arch-layer layer-3">
            <div class="layer-num">Layer 3</div>
            <div class="layer-title">协议层 · 幂等 Key 注入</div>
            <div class="layer-desc">每次请求携带唯一幂等 Key<br/>拦截位置：HTTP Header</div>
            <div class="layer-cost">接入成本：0（拦截器自动注入）</div>
          </div>
          <div class="arch-arrow-v">▼ 如果以上全部失效</div>
          <div class="arch-layer layer-4">
            <div class="layer-num">Layer 4</div>
            <div class="layer-title">服务层 · LRU 幂等缓存</div>
            <div class="layer-desc">后端 LRU 缓存 + in-flight 并发控制<br/>拦截位置：服务端业务处理前</div>
            <div class="layer-cost">接入成本：复制 1 个中间件</div>
          </div>
        </div>

        <div class="principles-box">
          <h4>设计原则</h4>
          <ul>
            <li><strong>纵深防御</strong>：不信任单一防线，每层独立工作</li>
            <li><strong>零侵入</strong>：业务代码无需任何修改</li>
            <li><strong>自动降级</strong>：任何一层失败不影响正常请求</li>
            <li><strong>渐进接入</strong>：可以只接一层，也可以全接</li>
          </ul>
        </div>
      </section>

      <section v-if="currentStep === 2" class="step-content">
        <h2>Step 2：30 秒接入 — v-preventReClick 指令</h2>
        <p class="step-intro">这是最快的一层防护，一行指令搞定按钮重复点击。</p>

        <div class="code-block">
          <div class="code-header">
            <span>main.js — 注册全局指令</span>
            <button class="copy-btn" @click="copyCode">复制</button>
          </div>
          <pre><code>import { vPreventReClick } from './utils/preventReClick.js';

app.directive('preventReClick', vPreventReClick);</code></pre>
        </div>

        <h3>三种使用模式</h3>

        <div class="mode-card">
          <h4>模式 1：纯防抖（默认 300ms）</h4>
          <div class="code-block">
            <div class="code-header"><span>模板中使用</span><button class="copy-btn" @click="copyCode">复制</button></div>
            <pre><code ref="mode1">&lt;!-- 点击后 300ms 内再次点击无效 --&gt;
&lt;button v-preventReClick @click="submit"&gt;提交&lt;/button&gt;

&lt;!-- 自定义 800ms 防抖 --&gt;
&lt;button v-preventReClick="800" @click="submit"&gt;提交&lt;/button&gt;</code></pre>
          </div>
        </div>

        <div class="mode-card">
          <h4>模式 2：异步跟踪（自动等待 handler 完成）</h4>
          <div class="code-block">
            <div class="code-header"><span>模板中使用</span><button class="copy-btn" @click="copyCode">复制</button></div>
            <pre><code ref="mode2">&lt;!-- 自动跟踪 async handler，完成后才恢复按钮 --&gt;
&lt;button v-preventReClick:async @click="submitAsync"&gt;提交&lt;/button&gt;

&lt;script setup&gt;
async function submitAsync() {
  await api.submit(data);  // 请求完成前按钮被锁定
  ElMessage.success('成功');
}
&lt;/script&gt;</code></pre>
          </div>
        </div>

        <div class="mode-card">
          <h4>模式 3：异步 + 自定义防抖</h4>
          <div class="code-block">
            <div class="code-header"><span>模板中使用</span><button class="copy-btn" @click="copyCode">复制</button></div>
            <pre><code ref="mode3">&lt;!-- async 模式 + 500ms 额外防抖 --&gt;
&lt;button v-preventReClick:async="500" @click="submitAsync"&gt;提交&lt;/button&gt;</code></pre>
          </div>
        </div>

        <div class="file-box">
          <h4>需要复制的文件</h4>
          <div class="file-item-download">
            <span class="file-icon">📄</span>
            <code>utils/preventReClick.js</code>
            <a :href="downloadUrl('utils/preventReClick.js')" class="download-btn" download>⬇ 下载</a>
          </div>
        </div>
      </section>

      <section v-if="currentStep === 3" class="step-content">
        <h2>Step 3：3 分钟接入 — Axios 全局拦截器</h2>
        <p class="step-intro">复制 3 个文件，自动获得请求去重 + 幂等 Key 注入能力。</p>

        <h3>文件清单</h3>
        <div class="file-list">
          <div class="file-item">
            <span class="file-icon">📄</span>
            <div>
              <strong>utils/request.js</strong>
              <p>Axios 封装 + 请求/响应拦截器</p>
            </div>
            <a :href="downloadUrl('utils/request.js')" class="download-btn" download>⬇ 下载</a>
          </div>
          <div class="file-item">
            <span class="file-icon">📄</span>
            <div>
              <strong>utils/idempotent.js</strong>
              <p>幂等 Key 生成器 + 请求指纹计算</p>
            </div>
            <a :href="downloadUrl('utils/idempotent.js')" class="download-btn" download>⬇ 下载</a>
          </div>
          <div class="file-item">
            <span class="file-icon">📄</span>
            <div>
              <strong>utils/preventReClick.js</strong>
              <p>v-preventReClick 指令</p>
            </div>
            <a :href="downloadUrl('utils/preventReClick.js')" class="download-btn" download>⬇ 下载</a>
          </div>
        </div>

        <h3>使用方式</h3>
        <div class="code-block">
          <div class="code-header"><span>任意 .vue 文件</span><button class="copy-btn" @click="copyCode">复制</button></div>
          <pre><code ref="use-request">import request from '@/utils/request.js';

// 直接替换 axios — 用法完全一致
const res = await request.post('/api/order/submit', { name: 'U盘' });
const list = await request.get('/api/orders');

// 跳过防重（极少数场景）
import { skipIdempotent } from '@/utils/request.js';
await request({ ...skipIdempotent({ method: 'post', url: '/api/x' }) });</code></pre>
        </div>

        <h3>自动防重机制</h3>
        <div class="auto-guard-flow">
          <div class="flow-step"><span>1</span> 拦截 POST/PUT/PATCH/DELETE</div>
          <span class="flow-arrow">→</span>
          <div class="flow-step"><span>2</span> 计算请求指纹 (method|url)</div>
          <span class="flow-arrow">→</span>
          <div class="flow-step"><span>3</span> 2s 内重复指纹 → 取消请求</div>
          <span class="flow-arrow">→</span>
          <div class="flow-step"><span>4</span> 注入 x-idempotent-key</div>
          <span class="flow-arrow">→</span>
          <div class="flow-step"><span>5</span> 正常发送请求</div>
        </div>

        <div class="tip-box">
          <strong>关键配置</strong>
          <code>DEDUP_WINDOW_MS = 2000</code>（第 19 行）— 去重窗口，超过此时间的请求不会被拦截<br/>
          <code>IDEMPOTENT_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']</code>（第 35 行）— 需要防重的请求方法
        </div>
      </section>

      <section v-if="currentStep === 4" class="step-content">
        <h2>Step 4：5 分钟接入 — 后端幂等中间件</h2>
        <p class="step-intro">安装依赖 + 复制中间件 + 注册路由，最后一道防线。</p>

        <h3>4.1 安装依赖</h3>
        <div class="code-block">
          <div class="code-header"><span>终端</span><button class="copy-btn" @click="copyCode">复制</button></div>
          <pre><code ref="install-dep">npm install express cors uuid</code></pre>
        </div>

        <h3>4.2 复制幂等中间件到你的项目</h3>
        <div class="file-item-download standalone">
          <span class="file-icon">📄</span>
          <a :href="downloadUrl('middleware/idempotent.js')" class="download-btn" download>⬇ 下载 idempotent.js</a>
          <span class="download-hint">（放到项目的 middleware/ 目录即可）</span>
        </div>
        <p style="font-size:13px;color:#888;margin:8px 0;">也可以直接下载文件放入项目：</p>
        <div class="code-block">
          <div class="code-header"><span>middleware/idempotent.js（新建文件，粘贴以下代码）</span><button class="copy-btn" @click="copyCode">复制</button></div>
          <pre><code ref="middleware">// =============================================
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

module.exports = { idempotentMiddleware, idempotentCache };</code></pre>
        </div>

        <h3>4.3 在你的路由中使用</h3>
        <div class="code-block">
          <div class="code-header"><span>app.js / routes/order.js</span><button class="copy-btn" @click="copyCode">复制</button></div>
          <pre><code ref="use-middleware">const { idempotentMiddleware, idempotentCache } = require('./middleware/idempotent');

// 只需要在路由上加一行
app.post('/api/order/submit', idempotentMiddleware, async (req, res) => {
  const order = await createOrder(req.body);
  
  // 存入缓存（关键！）
  const result = { status: 200, body: { code: 0, data: order, message: '成功' } };
  if (req.__idempotentKey) {
    idempotentCache.set(req.__idempotentKey, result);
  }
  
  res.json(result.body);
});</code></pre>
        </div>
      </section>

      <section v-if="currentStep === 5" class="step-content">
        <h2>Step 5：验证防重效果</h2>
        <p class="step-intro">接入完成后，3 种方式验证防重是否生效。</p>

        <div class="verify-card">
          <h4>方式 1：浏览器 Console 日志</h4>
          <p>打开 Chrome DevTools → Console，快速连点提交按钮：</p>
          <div class="verify-log">
            <div class="log-line warn">[防重拦截] 重复请求已取消: POST|/api/order/submit</div>
            <div class="log-line info">[幂等返回] 服务端检测到重复请求，返回缓存结果</div>
          </div>
        </div>

        <div class="verify-card">
          <h4>方式 2：Network 面板</h4>
          <p>打开 Chrome DevTools → Network，快速连点提交按钮：</p>
          <ul>
            <li>只看到 <strong>1 个请求发出</strong>（其余被前端拦截）</li>
            <li>如果看到多个请求，检查是否都有 <code>x-idempotent-key</code> 请求头</li>
          </ul>
        </div>

        <div class="verify-card">
          <h4>方式 3：手动对比测试</h4>
          <p>返回 Demo 页面，使用「有防护」和「无防护」按钮对比：</p>
          <ul>
            <li>无防护 → 产生 N 条重复订单</li>
            <li>有防护 → 只产生 1 条订单，其余显示 🚫 拦截</li>
          </ul>
        </div>
      </section>

      <section v-if="currentStep === 6" class="step-content">
        <h2>Step 6：常见问题排查</h2>

        <div class="faq-item">
          <h4>❓ 为什么我的请求没有被拦截？</h4>
          <div class="faq-answer">
            <p>按以下顺序排查：</p>
            <ol>
              <li>请求方法是否在 <code>IDEMPOTENT_METHODS</code> 列表中？（默认 POST/PUT/PATCH/DELETE）</li>
              <li>是否使用了 <code>skipIdempotent()</code> 跳过了防重？</li>
              <li>两次点击间隔是否超过 <code>DEDUP_WINDOW_MS</code>（2秒）？</li>
              <li>是否直接使用了原生 <code>axios</code> 而不是封装的 <code>request</code>？</li>
            </ol>
          </div>
        </div>

        <div class="faq-item">
          <h4>❓ GET 请求需要防重吗？</h4>
          <p class="faq-answer">不需要。GET 请求是幂等的（多次请求结果相同），框架自动跳过 GET/HEAD/OPTIONS。</p>
        </div>

        <div class="faq-item">
          <h4>❓ 服务端重启后幂等缓存丢失怎么办？</h4>
          <p class="faq-answer">LRU 缓存是内存级的，重启后确实会丢失。生产环境建议替换为 Redis：</p>
          <div class="code-block mini">
            <pre><code>// 将 LRUIdempotentCache 替换为 Redis 实现
class RedisIdempotentCache {
  constructor(redis) { this.redis = redis; }
  get(key) { return this.redis.get(key); }
  set(key, result) { this.redis.setex(key, 60, JSON.stringify(result)); }
}</code></pre>
          </div>
        </div>

        <div class="faq-item">
          <h4>❓ 怎么调整防抖时间？</h4>
          <div class="faq-answer">
            <p><strong>前端请求去重窗口</strong>：修改 <code>request.js</code> 第 19 行的 <code>DEDUP_WINDOW_MS</code></p>
            <p><strong>后端缓存 TTL</strong>：修改中间件 <code>new LRUIdempotentCache(1000, ttlMs)</code></p>
            <p><strong>按钮防抖</strong>：<code>v-preventReClick="500"</code></p>
          </div>
        </div>

        <div class="faq-item">
          <h4>❓ 上传文件的请求怎么防重？</h4>
          <p class="faq-answer">文件上传是 POST 请求，框架会自动处理。但建议额外在前端做文件 MD5 校验（相同文件不重复上传），这需要在业务代码中实现。</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const currentStep = ref(1);

const steps = [
  { id: 1, label: '理解架构' },
  { id: 2, label: '指令接入' },
  { id: 3, label: '拦截器接入' },
  { id: 4, label: '后端接入' },
  { id: 5, label: '验证效果' },
  { id: 6, label: '问题排查' }
];

function copyCode() {
  const btn = event?.target;
  const codeEl = btn?.closest('.code-block')?.querySelector('code');
  if (!codeEl || !btn) return;
  navigator.clipboard.writeText(codeEl.textContent).then(() => {
    btn.textContent = '已复制!';
    setTimeout(() => { btn.textContent = '复制'; }, 1500);
  });
}

function downloadUrl(file) {
  return `/api/download/toolkit/${file}`;
}
</script>

<style scoped>
.tutorial-container {
  display: flex;
  gap: 0;
  min-height: 500px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  overflow: hidden;
}

.tutorial-nav {
  width: 180px;
  background: #f8f9fc;
  padding: 24px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.nav-step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.2s;
  text-align: left;
}

.nav-step:hover {
  background: #eef0f7;
}

.nav-step.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  font-weight: 600;
}

.nav-step.active .step-num {
  background: rgba(255,255,255,0.25);
  color: #fff;
}

.nav-step.done {
  color: #43e97b;
}

.nav-step.done .step-num {
  background: #43e97b;
  color: #fff;
}

.step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e0e4f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #888;
  flex-shrink: 0;
}

.tutorial-body {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
  max-height: 80vh;
}

.step-content h2 {
  font-size: 22px;
  color: #333;
  margin-bottom: 6px;
}

.step-content h3 {
  font-size: 17px;
  color: #444;
  margin: 28px 0 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.step-content h4 {
  font-size: 15px;
  color: #555;
  margin: 18px 0 10px;
}

.step-intro {
  color: #888;
  font-size: 14px;
  margin-bottom: 24px;
  line-height: 1.6;
}

.arch-diagram {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 24px 0;
}

.arch-layer {
  padding: 18px 20px;
  border-radius: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  position: relative;
}

.layer-1 { background: #e3f2fd; border-left: 4px solid #2196f3; }
.layer-2 { background: #e8f5e9; border-left: 4px solid #4caf50; }
.layer-3 { background: #fff3e0; border-left: 4px solid #ff9800; }
.layer-4 { background: #fce4ec; border-left: 4px solid #e91e63; }

.layer-num {
  font-size: 20px;
  font-weight: 800;
  width: 36px;
}

.layer-1 .layer-num { color: #2196f3; }
.layer-2 .layer-num { color: #4caf50; }
.layer-3 .layer-num { color: #ff9800; }
.layer-4 .layer-num { color: #e91e63; }

.layer-title {
  font-weight: 700;
  font-size: 15px;
  color: #333;
  min-width: 200px;
}

.layer-desc {
  font-size: 13px;
  color: #666;
  flex: 1;
}

.layer-cost {
  font-size: 12px;
  color: #fff;
  background: #333;
  padding: 4px 10px;
  border-radius: 12px;
  white-space: nowrap;
}

.arch-arrow-v {
  text-align: center;
  color: #aaa;
  font-size: 12px;
  padding: 4px 0 4px 40px;
}

.principles-box {
  margin-top: 24px;
  padding: 18px 20px;
  background: #f8f9fc;
  border-radius: 8px;
}

.principles-box ul {
  margin-left: 20px;
  margin-top: 8px;
}

.principles-box li {
  margin-bottom: 6px;
  font-size: 14px;
  color: #555;
  line-height: 1.6;
}

.code-block {
  margin: 12px 0 20px;
  background: #1e1e2e;
  border-radius: 8px;
  overflow: hidden;
}

.code-block.mini {
  margin: 8px 0;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #181825;
  color: #aaa;
  font-size: 12px;
}

.copy-btn {
  padding: 4px 12px;
  border: 1px solid #555;
  background: transparent;
  color: #aaa;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.copy-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.code-block pre {
  padding: 16px 20px;
  margin: 0;
  overflow-x: auto;
}

.code-block code {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  color: #cdd6f4;
  line-height: 1.7;
  white-space: pre;
}

.mode-card {
  margin: 14px 0;
  padding: 16px;
  background: #f8f9fc;
  border-radius: 8px;
}

.mode-card h4 {
  margin-top: 0;
}

.file-box {
  margin-top: 20px;
  padding: 12px 16px;
  background: #fff8e1;
  border-radius: 8px;
  border-left: 4px solid #ffc107;
}

.file-box code {
  background: transparent;
  color: #e65100;
  font-size: 14px;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 14px 0;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8f9fc;
  border-radius: 8px;
}

.file-icon {
  font-size: 24px;
}

.file-item strong {
  color: #333;
  font-size: 14px;
}

.file-item p {
  color: #888;
  font-size: 12px;
  margin-top: 2px;
}

.file-item-download {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: #fff;
  border: 1px solid #e0e4f0;
  border-radius: 8px;
}

.file-item-download.standalone {
  margin: 14px 0;
}

.download-btn {
  margin-left: auto;
  padding: 6px 14px;
  background: linear-gradient(135deg, #43e97b, #38f9d7);
  color: #333;
  border-radius: 6px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.download-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(67, 233, 123, 0.3);
}

.download-hint {
  font-size: 12px;
  color: #999;
  margin-left: auto;
}

.auto-guard-flow {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 16px;
  background: linear-gradient(135deg, #667eea11, #764ba211);
  border-radius: 8px;
  margin: 16px 0;
  font-size: 13px;
}

.flow-step {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
}

.flow-step span {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}

.flow-arrow {
  color: #667eea;
  font-weight: 700;
}

.tip-box {
  padding: 14px 18px;
  background: #e3f2fd;
  border-radius: 8px;
  border-left: 4px solid #2196f3;
  font-size: 13px;
  color: #555;
  line-height: 1.8;
  margin-top: 20px;
}

.tip-box code {
  background: #bbdefb;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: #1565c0;
}

.verify-card {
  margin: 16px 0;
  padding: 18px;
  background: #f8f9fc;
  border-radius: 8px;
}

.verify-card h4 {
  margin-top: 0;
}

.verify-card ul {
  margin-left: 20px;
  margin-top: 8px;
}

.verify-card li {
  margin-bottom: 6px;
  font-size: 14px;
  color: #555;
}

.verify-log {
  margin-top: 10px;
  padding: 12px 16px;
  background: #1e1e2e;
  border-radius: 6px;
  font-family: 'Fira Code', monospace;
  font-size: 13px;
}

.log-line {
  margin-bottom: 6px;
}

.log-line.warn {
  color: #fab387;
}

.log-line.info {
  color: #89b4fa;
}

.faq-item {
  margin: 16px 0;
  padding: 18px;
  background: #f8f9fc;
  border-radius: 8px;
}

.faq-item h4 {
  margin-top: 0;
  color: #333;
}

.faq-answer {
  margin-top: 10px;
  font-size: 14px;
  color: #555;
  line-height: 1.7;
}

.faq-answer ol {
  margin-left: 20px;
}

.faq-answer li {
  margin-bottom: 4px;
}

.faq-item > p {
  font-size: 14px;
  color: #555;
  line-height: 1.7;
}
</style>
