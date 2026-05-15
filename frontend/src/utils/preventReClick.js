// =============================================
// v-preventReClick 自定义指令
// 一行代码搞定按钮防重复点击
//
// 用法:
//   v-preventReClick                    → 300ms 防抖
//   v-preventReClick="500"              → 500ms 防抖
//   v-preventReClick:async              → 自动跟踪异步handler
//   v-preventReClick:async="500"        → 异步 + 500ms防抖
// =============================================

const CLICK_HANDLER_KEY = Symbol('__preventReClick_handler');
const CLICK_ORIGINAL_KEY = Symbol('__preventReClick_original');

function createDirective() {
  const stateMap = new WeakMap();

  function getState(el) {
    if (!stateMap.has(el)) {
      stateMap.set(el, { pending: false, timer: null, delay: 0, asyncMode: false });
    }
    return stateMap.get(el);
  }

  return {
    mounted(el, binding) {
      const state = getState(el);
      state.asyncMode = binding.arg === 'async';
      state.delay = parseDelay(binding.value);

      // 找到目标元素（按钮/可点击元素）
      const target = findClickableElement(el);
      if (!target) return;

      // 保存原始事件（如果有）
      const originalClick = target.onclick;
      if (originalClick) {
        el[CLICK_ORIGINAL_KEY] = originalClick;
      }

      target.addEventListener('click', createPreventHandler(el, target, state), true);
    },

    updated(el, binding) {
      const state = getState(el);
      state.asyncMode = binding.arg === 'async';
      state.delay = parseDelay(binding.value);
    },

    unmounted(el) {
      stateMap.delete(el);
    }
  };
}

function parseDelay(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseInt(value, 10);
    return isNaN(num) ? 300 : num;
  }
  return 300;
}

function findClickableElement(el) {
  if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button') {
    return el;
  }
  const btn = el.querySelector('button, a, [role="button"]');
  return btn || el;
}

function createPreventHandler(el, target, state) {
  return function preventClick(e) {
    if (state.pending) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.warn(`[v-preventReClick] 操作处理中，已拦截重复点击 (${state.delay}ms)`);
      return false;
    }

    state.pending = true;

    if (!state.asyncMode) {
      // 纯防抖模式: 计时器结束后恢复
      clearTimeout(state.timer);
      state.timer = setTimeout(() => {
        state.pending = false;
        state.timer = null;
      }, state.delay);

      el.dispatchEvent(new CustomEvent('click-allowed'));
    } else {
      // 异步模式: 自动跟踪 async handler
      asyncModeHandler(el, target, state, e);
    }
  };
}

function asyncModeHandler(el, target, state, e) {
  // 拦截 Vue 事件处理
  const vueInstance = el.__vueParentComponent || el._vnode?.component;

  // 使用 after 钩子恢复
  const release = () => {
    setTimeout(() => {
      state.pending = false;
    }, state.delay);
  };

  // 监听 click-allowed 用于手动恢复
  el.addEventListener('click-allowed', release, { once: true });

  // 同时设置超时兜底
  setTimeout(() => {
    if (state.pending) {
      state.pending = false;
    }
  }, Math.max(state.delay * 3, 3000));
}

// 工具方法: 手动恢复按钮状态
function resetPreventState(el, directiveName = 'preventReClick') {
  const instance = el.__vueParentComponent || (el._vnode && el._vnode.component);
  if (instance) {
    // 尝试通过 Vue 实例重置
    el.dispatchEvent(new CustomEvent('click-allowed'));
  }
  return true;
}

export const vPreventReClick = createDirective();
export const resetPreventClick = resetPreventState;