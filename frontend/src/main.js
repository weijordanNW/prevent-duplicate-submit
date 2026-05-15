import { createApp } from 'vue';
import App from './App.vue';
import { vPreventReClick } from './utils/preventReClick.js';

const app = createApp(App);

// 注册 v-preventReClick 全局指令
app.directive('preventReClick', vPreventReClick);

app.mount('#app');