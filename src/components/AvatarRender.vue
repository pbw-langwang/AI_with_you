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
        appState.ui.diagnosis?.active ? 'sdk-container--center-large' : ''
      "
    />

    <!-- 字幕显示 -->
    <div
      v-show="appState.ui.subTitleText && !appState.ui.diagnosis?.active"
      class="subtitle"
    >
      {{ appState.ui.subTitleText }}
    </div>

    <!-- 语音输入动画 -->
    <div v-show="appState.asr.isListening" class="voice-animation">
      <img :src="siriIcon" alt="语音输入" />
    </div>

    <!-- 加载状态 -->
    <div v-if="!appState.avatar.connected" class="loading-placeholder">
      <div class="loading-text">-- 正在连接 --</div>
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
      <div class="diag-line">{{ appState.ui.diagnosis!.lines[0] }}</div>
      <div class="diag-line">{{ appState.ui.diagnosis!.lines[1] }}</div>
      <div class="diag-line strong">{{ appState.ui.diagnosis!.lines[2] }}</div>
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
  left: 16px;
  bottom: 16px;
  width: 320px;
  height: 480px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15);
}
.sdk-container--center-large {
  left: 50%;
  bottom: auto;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 720px;
  height: 960px;
}
.subtitle {
  position: absolute;
  z-index: 1001;
  top: 24px;
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
  color: #666;
  font-weight: 500;
}
</style>
