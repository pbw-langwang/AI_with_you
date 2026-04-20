<template>
  <div class="config-panel">
    <!-- 配置按钮 -->
    <button
      @click="appState.ui.configPanel!.visible = true"
      class="config-button"
    >
      ⚙️ 配置
    </button>

    <!-- 消息交互 - 固定在右下角 -->
    <div class="message-input-fixed">
      <!-- <p>TODO：做成语音交互更nice！</p> -->
      <!-- <p>TODO：做成AI交互更nice！</p> -->
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

    <!-- 配置面板模态框 -->
    <div v-if="appState.ui.configPanel!.visible" class="config-modal">
      <div class="config-modal-content">
        <div class="config-modal-header">
          <h3>配置设置</h3>
          <button
            @click="appState.ui.configPanel!.visible = false"
            class="close-button"
          >
            ×
          </button>
        </div>

        <div class="config-modal-body">
          <!-- 魔珐星云配置 -->
          <div class="config-section">
            <h4>🔮 魔珐星云</h4>
            <div class="config-form">
              <div class="form-row">
                <div class="form-group">
                  <label>App ID</label>
                  <input
                    v-model="appState.avatar.appId"
                    type="text"
                    placeholder="请输入魔珐星云 App ID"
                  />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>App Secret</label>
                  <input
                    v-model="appState.avatar.appSecret"
                    type="text"
                    placeholder="请输入魔珐星云 App Secret"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 豆包大模型配置 -->
          <div class="config-section">
            <h4>🤖 豆包大模型</h4>
            <div class="config-form">
              <div class="form-row">
                <div class="form-group">
                  <label>API Key</label>
                  <input
                    v-model="appState.llm.apiKey"
                    type="text"
                    placeholder="请输入豆包 API Key"
                  />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>模型 ID</label>
                  <input
                    v-model="appState.llm.model"
                    type="text"
                    placeholder="请输入模型 ID，例如：doubao-seed-2-0-pro-260215"
                  />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>API 地址 (可选)</label>
                  <input
                    v-model="apiBaseUrl"
                    type="text"
                    placeholder="请输入 API 地址"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 邀请码提示 -->
          <div class="invite-code">
            🎁
            魔珐星云新用户注册填写邀请码：J39AD7UJHB，可免费获取1000积分（价值100元，还能找我进群领红包）！
          </div>
        </div>

        <div class="config-modal-footer">
          <button @click="clearConfig" class="btn btn-secondary">
            清除配置
          </button>
          <div class="footer-buttons">
            <button
              @click="appState.ui.configPanel!.visible = false"
              class="btn btn-secondary"
            >
              取消
            </button>
            <button @click="saveConfig" class="btn btn-primary">
              保存配置
            </button>
          </div>
        </div>
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
const apiBaseUrl = ref("https://ark.cn-beijing.volces.com/api/v3");

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

function saveConfig() {
  // 保存配置到本地存储
  localStorage.setItem(
    "avatarConfig",
    JSON.stringify({
      appId: appState.avatar.appId,
      appSecret: appState.avatar.appSecret,
    }),
  );
  localStorage.setItem(
    "llmConfig",
    JSON.stringify({
      apiKey: appState.llm.apiKey,
      model: appState.llm.model,
      apiBaseUrl: apiBaseUrl.value,
    }),
  );

  // 关闭配置面板
  appState.ui.configPanel!.visible = false;

  // 重新连接虚拟人
  if (appState.avatar.appId && appState.avatar.appSecret) {
    appStore.connectAvatar().catch((error) => {
      console.error("重新连接虚拟人失败:", error);
      alert("重新连接虚拟人失败，请检查配置");
    });
  }
}

function clearConfig() {
  // 清除配置
  appState.avatar.appId = "";
  appState.avatar.appSecret = "";
  appState.llm.apiKey = "";
  appState.llm.model = "doubao-seed-2-0-pro-260215";
  apiBaseUrl.value = "https://ark.cn-beijing.volces.com/api/v3";

  // 清除本地存储
  localStorage.removeItem("avatarConfig");
  localStorage.removeItem("llmConfig");

  // 断开虚拟人连接
  appStore.disconnectAvatar();
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

.config-button {
  position: absolute;
  top: 20px;
  right: 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
  transition: all 0.2s;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 6px;
}

.config-button:hover {
  background: #0056b3;
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.4);
  transform: translateY(-1px);
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
  margin-left: 8px;
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

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

/* 配置模态框 */
.config-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.config-modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.config-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.config-modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-button:hover {
  background: #f0f0f0;
  color: #333;
}

.config-modal-body {
  padding: 24px;
}

.config-section {
  margin-bottom: 24px;
}

.config-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.config-form {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
}

.form-row {
  margin-bottom: 16px;
}

.form-group {
  width: 100%;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #555;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
}

.invite-code {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 12px;
  font-size: 14px;
  color: #856404;
  margin-top: 16px;
  text-align: center;
}

.config-modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-top: 1px solid #e0e0e0;
  background: #f9f9f9;
  border-radius: 0 0 12px 12px;
}

.footer-buttons {
  display: flex;
}
</style>
