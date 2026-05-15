# 大厂级防重复提交方案

前端 + 后端双保险，全局拦截器 + 幂等设计 + 自定义指令，彻底杜绝重复提交。

## 项目结构

```
prevent-duplicate-submit/
├── server/                      # 后端 - Express 幂等服务
│   ├── package.json
│   └── index.js                 # LRU缓存 + 幂等中间件 + in-flight 并发保护
├── frontend/                    # 前端 - Vue3 + Vite
│   ├── package.json
│   ├── vite.config.js           # Vite 配置 (含 /api 代理)
│   ├── index.html
│   ├── CHANGELOG.md             # 变更日志 (自动同步)
│   └── src/
│       ├── main.js              # 入口 (注册 v-preventReClick 全局指令)
│       ├── App.vue              # 根组件 (含版本号 + 变更日志展示)
│       ├── components/
│       │   └── DemoForm.vue     # 完整演示组件 (含重复检测 + 自定义连发)
│       └── utils/
│           ├── request.js       # Axios 封装 + 全局拦截器防重
│           ├── idempotent.js    # 幂等Key生成 + 请求指纹 + Key刷新
│           └── preventReClick.js # v-preventReClick 指令
├── scripts/
│   └── update-changelog.js     # CHANGELOG 自动更新脚本
├── CHANGELOG.md                 # 项目变更日志
└── README.md
```

## 快速启动

### 1. 启动后端

```bash
cd server
npm install
npm start
```

后端运行在 `http://localhost:3001`

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 `http://localhost:5173`，代理 `/api` 到后端 3001 端口。

## 四层防护链路

```
用户点击 → v-preventReClick(U层) → Axios拦截器(指纹去重) → 幂等Key注入 → 后端中间件(LRU+in-flight) → 业务处理
```

| 层级 | 技术 | 文件 | 作用 |
|------|------|------|------|
| **Layer 1** | `v-preventReClick` | `preventReClick.js` | DOM 层面防抖，默认 300ms，可自定义 |
| **Layer 2** | Axios 拦截器 | `request.js` | 请求指纹去重，2 秒窗口内相同请求自动取消 |
| **Layer 3** | 幂等 Key | `idempotent.js` | 每个写请求自动携带 `x-idempotent-key` |
| **Layer 4** | 后端中间件 | `server/index.js` | LRU 缓存 + in-flight 队列，60 秒 TTL |

## 各模块说明

### v-preventReClick 指令

一行代码搞定按钮防重复点击：

```vue
<button v-preventReClick @click="handleClick">提交</button>
<button v-preventReClick="800" @click="handleClick">自定义800ms</button>
```

- 默认 300ms 防抖
- 可选参数自定义防抖时长（ms）
- 基于 `WeakMap` 存储状态，不污染 DOM
- 捕获阶段拦截（`addEventListener(..., true)`），优先级最高

### Axios 拦截器

所有写请求自动防重，无需在每个按钮写 loading 判断：

- **请求拦截**：`POST/PUT/PATCH/DELETE` 自动携带幂等 Key
- **指纹去重**：`METHOD + URL + 请求体 JSON` 生成指纹，2 秒窗口内相同请求 `Abort`
- **响应拦截**：成功后自动刷新 Key，确保下次请求用新 Key
- **降级处理**：获取 Key 失败不阻塞请求

```javascript
import request from '@/utils/request';

// 自动防重，无需额外配置
await request.post('/api/order/submit', { productName, amount });

// 如需跳过防重
await request({ ...config, __skipIdempotent: true });
```

### 幂等 Key 生成器

- 从服务端 `GET /api/idempotent-key` 获取 UUID
- 缓存到内存，写请求结束后自动刷新
- 降级策略：请求失败时使用本地 Key

### 后端幂等中间件

- **LRU 缓存**：最大 1000 条，TTL 60 秒
- **in-flight 保护**：相同 Key 的并发请求排队等待，首个完成后广播结果
- **三级判断**：缓存命中 → 直接返回 | 处理中 → 排队等待 | 新请求 → 标记并放行

## 后端接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/idempotent-key` | 获取幂等 Key（UUID） |
| `POST` | `/api/order/submit?delay=ms` | 提交订单（幂等保护） |
| `POST` | `/api/resource/create?delay=ms` | 创建资源（幂等保护） |
| `GET` | `/api/orders` | 查询订单列表 |
| `DELETE` | `/api/orders` | 清空订单列表 |

## 演示说明

页面提供完整的对照实验：

- **自定义指令演示区**：两个带 `v-preventReClick` 的按钮（300ms / 800ms），对比点击次数与实际执行次数
- **完整防护演示区**：
  - `无防护提交`：跳过所有防护，固定延迟 2000ms，可连续点击产生重复
  - `有防护提交`：全链路防护，每次自动刷新 Key
  - `连发5次`：同时触发 5 次提交，验证只有 1 次生效
  - `连发次数`：自定义连发次数（1-20），可分别测试无防护和有防护场景
  - `模拟延迟`：可调 500ms ~ 3000ms，延迟越大越容易触发重复
- **数据验证区**：自动检测重复订单（相同商品名 + 相同金额 + 3 秒内），红色高亮 + 警告标签
- **版本变更日志**：页面底部可展开查看项目版本变更历史

## 版本管理

项目使用语义化版本控制，每次 Git Push 到 main 分支时自动更新 CHANGELOG：

- **自动升级规则**：`feat:` 提交 → minor 版本升级 | `fix:` 提交 → patch 版本升级
- **自动更新**：`scripts/update-changelog.js` 通过 Git pre-push 钩子触发
- **页面展示**：`App.vue` 页面顶部显示当前版本号，底部可展开变更日志

```bash
# 手动触发 CHANGELOG 更新
node scripts/update-changelog.js
```

## 技术栈

- **前端**：Vue 3 + Vite + Axios
- **后端**：Express + uuid + cors
- **防重核心**：幂等 Key + LRU 缓存 + in-flight 队列 + 请求指纹去重 + DOM 事件拦截