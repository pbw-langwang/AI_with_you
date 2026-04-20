<template>
  <div ref="containerRef" class="avatar-render">
    <!-- 全屏路线覆盖层 -->
    <RouteFloor3DMerchant
      v-if="
        appState.ui.routeGuide?.visible &&
        appState.ui.routeGuide?.mode === 'merchant'
      "
      :durationSec="appState.ui.routeGuide?.durationSec"
      :key="`merchant-${appState.ui.routeResetToken}`"
      class="route-floor-overlay"
    />
    <RouteFloor3D
      v-else-if="appState.ui.routeGuide?.visible"
      :durationSec="appState.ui.routeGuide?.durationSec"
      :key="`dept-${appState.ui.routeResetToken}`"
      class="route-floor-overlay"
    />

    <!-- SDK 渲染容器 -->
    <div
      :id="containerId"
      class="sdk-container"
      :class="
        appState.ui.diagnosis?.active && !appState.ui.routeGuide?.visible
          ? 'sdk-container--center-large'
          : ''
      "
    />

    <!-- 字幕显示 -->
    <div v-show="appState.ui.subTitleText" class="subtitle subtitle--bottom">
      {{ appState.ui.subTitleText }}
    </div>

    <!-- 语音输入动画 -->
    <div v-show="appState.asr.isListening" class="voice-animation">
      <img :src="siriIcon" alt="语音输入" />
    </div>

    <!-- AI思考加载状态 -->
    <div v-if="appState.ui.isLoading" class="ai-loading">
      <div class="ai-loading-spinner"></div>
      <div class="ai-loading-text">AI正在思考...</div>
    </div>

    <!-- 加载状态 -->
    <div v-if="!appState.avatar.connected" class="loading-placeholder">
      <div class="loading-text">请先点击右侧的「配置」按钮设置API Key</div>
      <div class="loading-subtext">配置完成后会自动连接</div>
    </div>

    <!-- 路线引导 -->
    <RouteGuide
      v-if="appState.ui.routeGuide?.visible"
      :guide="{
        title: appState.ui.routeGuide!.title,
        steps: appState.ui.routeGuide!.steps,
        durationSec: appState.ui.routeGuide!.durationSec,
      }"
    />
    <div v-if="appState.ui.diagnosis?.active" class="diagnosis-panel">
      <div
        v-for="(line, index) in appState.ui.diagnosis!.lines"
        :key="index"
        class="diag-line"
        :class="{ strong: index === appState.ui.diagnosis!.lines.length - 1 }"
      >
        {{ line }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, computed } from "vue";
import { avatarService } from "../services/avatar";
import type { AppState } from "../types";
import siriIcon from "../assets/siri.png";
import RouteGuide from "./RouteGuide.vue";
import RouteFloor3D from "./RouteFloor3D.vue";
import RouteFloor3DMerchant from "./RouteFloor3DMerchant.vue";

// 注入全局状态
const appState = inject<AppState>("appState")!;

// 获取容器ID
const containerId = computed(() => avatarService.getContainerId());
</script>

<style scoped>
.avatar-render {
  flex: 1;
  position: relative;
  border-right: 1px solid #e0e0e0;
  background: #f5f5f5;
}
.route-floor-overlay {
  z-index: 1;
}
.sdk-container {
  position: absolute;
  z-index: 1000;
  width: 320px;
  height: 500px;
  border-radius: 12px;
  overflow: hidden;
}
.sdk-container :deep(canvas) {
  left: 0 !important;
}
.sdk-container--center-large {
  left: 40%;
  bottom: auto;
  top: 60%;
  transform: translate(-50%, -50%);
  width: 520px;
  height: 960px;
}
.subtitle {
  position: absolute;
  z-index: 1001;
  left: 50%;
  width: 375px;
  max-width: 90%;
  word-break: break-word;
  text-align: center;
  transform: translateX(-50%);
  font-size: 20px;
  color: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.2);
  padding: 8px 16px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
}
.subtitle--top {
  top: 24px;
}
.subtitle--bottom {
  bottom: 24px;
}
.diagnosis-panel {
  position: absolute;
  left: 50%;
  top: 24px;
  transform: translateX(-50%);
  width: 720px;
  max-width: 92%;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #d0d7e2;
  border-radius: 16px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15);
  padding: 16px;
  z-index: 1001;
}
.diag-line {
  font-size: 16px;
  color: #333;
  padding: 8px 10px;
}
.diag-line.strong {
  font-weight: 600;
  color: #0a84ff;
}
.voice-animation {
  position: absolute;
  left: 50%;
  top: 75%;
  transform: translateX(-50%);
  width: 360px;
  max-width: 90%;
  z-index: 101;
}
.voice-animation > img {
  width: 100%;
  height: auto;
}
.loading-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
}
.loading-text {
  font-size: 18px;
  color: #333;
  font-weight: 600;
  margin-bottom: 8px;
}

.loading-subtext {
  font-size: 14px;
  color: #666;
  font-weight: 400;
}

/* AI思考加载状态 */
.ai-loading {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1002;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.ai-loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.ai-loading-text {
  font-size: 16px;
  color: #333;
  font-weight: 500;
}
</style>
