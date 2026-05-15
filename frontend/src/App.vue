<template>
  <div class="app-container">
    <header class="app-header">
      <h1>大厂级防重复提交方案</h1>
      <p class="subtitle">前端+后端双保险，全局拦截器 + 幂等设计 + 自定义指令</p>
    </header>
    <DemoForm />
  </div>
</template>

<script setup>
import DemoForm from './components/DemoForm.vue';
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f0f2f5;
  color: #333;
  min-height: 100vh;
}

.app-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px;
}

.app-header {
  text-align: center;
  margin-bottom: 40px;
}

.app-header h1 {
  font-size: 32px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.app-header .subtitle {
  color: #666;
  margin-top: 8px;
  font-size: 14px;
}
</style>