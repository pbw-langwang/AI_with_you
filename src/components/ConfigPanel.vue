<template>
  <div class="config-panel">
    <!-- 消息交互 - 固定在右下角 -->
    <div class="message-input-fixed">
      <p>TODO：做成语音交互更nice！</p>
      <textarea
        v-model="appState.ui.text"
        rows="3"
        placeholder="请输入您的消息，eg：你好、我的症状是发热、去XX科室、这里有什么好玩的？、有什么好吃的？、去XX店家"
      />
      <div class="button-container">
        <button
          @click="handleSendMessage"
          :disabled="
            !appState.avatar.connected || !appState.ui.text.trim() || isSending
          "
          class="btn btn-primary"
        >
          {{ isSending ? "发送中..." : "发送" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref } from "vue";
import type { AppState, AppStore } from "../types";

// 注入全局状态和方法
const appState = inject<AppState>("appState")!;
const appStore = inject<AppStore>("appStore")!;

// 组件状态
const isSending = ref(false);

async function handleSendMessage() {
  if (isSending.value || !appState.ui.text.trim()) return;

  isSending.value = true;
  try {
    await appStore.sendMessage();
  } catch (error) {
    console.error("发送消息失败:", error);
    alert("发送消息失败");
  } finally {
    isSending.value = false;
  }
}
</script>

<style scoped>
.config-panel {
  position: relative;
  width: 420px;
  height: 100vh;
  background: #ffffff;
  border-left: 1px solid #e0e0e0;
  overflow: hidden;
}

.message-input-fixed {
  position: absolute;
  bottom: 20px;
  right: 20px;
  left: 20px;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
  resize: vertical;
  min-height: 80px;
  margin-bottom: 12px;
}

textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
}

.button-container {
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 80px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}
</style>
