<template>
  <div class="app-container">
    <header class="app-header">
      <div class="version-badge">v{{ version }}</div>
      <h1>大厂级防重复提交方案</h1>
      <p class="subtitle">前端+后端双保险，全局拦截器 + 幂等设计 + 自定义指令</p>
      <nav class="view-nav">
        <button class="nav-tab" :class="{ active: currentView === 'demo' }" @click="currentView = 'demo'">🧪 Demo 演示</button>
        <button class="nav-tab" :class="{ active: currentView === 'tutorial' }" @click="currentView = 'tutorial'">📖 新人教程</button>
      </nav>
    </header>
    <DemoForm v-if="currentView === 'demo'" />
    <Tutorial v-if="currentView === 'tutorial'" />
    
    <footer class="app-footer">
      <div class="changelog-section" v-if="showChangelog">
        <h3>📝 版本变更日志</h3>
        <div class="changelog-content" v-html="changelogHtml"></div>
      </div>
      <button class="changelog-toggle" @click="showChangelog = !showChangelog">
        {{ showChangelog ? '收起变更日志' : '查看变更日志' }}
      </button>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import DemoForm from './components/DemoForm.vue';
import Tutorial from './components/Tutorial.vue';

const version = '1.5.0';
const currentView = ref('demo');
const showChangelog = ref(false);
const changelogHtml = ref('');

onMounted(async () => {
  try {
    const response = await fetch('/CHANGELOG.md');
    const md = await response.text();
    changelogHtml.value = mdToHtml(md);
  } catch (e) {
    changelogHtml.value = '<p>无法加载变更日志</p>';
  }
});

function mdToHtml(md) {
  return md
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## \[(.+)\] - (.+)$/gm, '<h3><span class="version-tag">v$1</span> <span class="date-tag">$2</span></h3>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/<li>/g, '<ul><li>')
    .replace(/(<\/li>)(?!<li>)/g, '</li></ul>')
    .replace(/---/g, '<hr>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}
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

.view-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 18px;
}

.nav-tab {
  padding: 8px 24px;
  border: 2px solid #e0e4f0;
  background: #fff;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  color: #666;
}

.nav-tab:hover {
  border-color: #667eea;
  color: #667eea;
}

.nav-tab.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  border-color: transparent;
}

.version-badge {
  display: inline-block;
  background: linear-gradient(135deg, #4facfe, #00f2fe);
  color: #fff;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 10px;
}

.app-footer {
  margin-top: 40px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.changelog-toggle {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.changelog-toggle:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.changelog-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.changelog-section h3 {
  color: #333;
  margin-bottom: 15px;
  font-size: 16px;
}

.changelog-content {
  font-size: 14px;
  line-height: 1.8;
  color: #555;
}

.changelog-content h3 {
  margin: 20px 0 12px;
  font-size: 15px;
  color: #333;
}

.changelog-content h4 {
  margin: 16px 0 8px;
  font-size: 14px;
  color: #667eea;
  font-weight: 600;
}

.changelog-content ul {
  margin-left: 20px;
  margin-bottom: 12px;
}

.changelog-content li {
  margin-bottom: 6px;
  list-style: disc;
}

.changelog-content code {
  background: #f4f4f4;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  color: #667eea;
}

.changelog-content hr {
  border: none;
  border-top: 1px dashed #ddd;
  margin: 20px 0;
}

.version-tag {
  background: linear-gradient(135deg, #43e97b, #38f9d7);
  color: #333;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  margin-right: 10px;
}

.date-tag {
  color: #999;
  font-size: 13px;
}
</style>