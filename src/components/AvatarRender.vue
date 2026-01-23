<template>
  <div ref="containerRef" class="avatar-render">
    <!-- SDK 渲染容器 -->
    <div :id="containerId" class="sdk-container" />

    <!-- 字幕显示 -->
    <div v-show="appState.ui.subTitleText" class="subtitle">
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
    <div v-show="appState.ui.routeGuide?.visible" class="route-guide">
      <div class="route-title">{{ appState.ui.routeGuide?.title }}</div>
      <div class="map-3d">
        <div
          class="scene"
          :style="{
            '--routeDur': `${appState.ui.routeGuide?.durationSec || 8}s`,
          }"
        >
          <div class="floor floor1">
            <div class="label">1F</div>
            <div class="path path-1f-a"></div>
            <div class="path path-1f-b"></div>
            <div class="marker start">起点</div>
          </div>
          <div class="floor floor2">
            <div class="label">2F</div>
            <div class="path path-2f-a"></div>
            <div class="path path-2f-b"></div>
            <div class="marker end">终点</div>
          </div>
          <div class="elevator-shaft"></div>
          <div class="elevator-car"></div>
          <div
            v-show="appState.ui.routeGuide?.mode === 'floors'"
            class="guide-arrow"
          ></div>
        </div>
      </div>
      <div class="route-steps">
        <div
          v-for="(s, i) in appState.ui.routeGuide?.steps"
          :key="i"
          class="route-step"
        >
          {{ i + 1 }}. {{ s }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, computed } from "vue";
import { avatarService } from "../services/avatar";
import type { AppState } from "../types";
import siriIcon from "../assets/siri.png";

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
.sdk-container {
  width: 100%;
  height: 100%;
}
.subtitle {
  position: absolute;
  z-index: 100;
  bottom: 220px;
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
.route-guide {
  position: absolute;
  right: 16px;
  top: 16px;
  width: 420px;
  z-index: 120;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(6px);
}
.route-title {
  font-size: 16px;
  font-weight: 600;
  color: #222;
  margin-bottom: 8px;
}
.map-3d {
  perspective: 1000px;
  height: 220px;
  margin-bottom: 10px;
}
.scene {
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transform: rotateX(55deg) rotateZ(-10deg);
  position: relative;
}
.floor {
  position: absolute;
  left: 20px;
  top: 30px;
  width: 360px;
  height: 140px;
  border-radius: 10px;
  background: linear-gradient(
    135deg,
    rgba(232, 241, 255, 0.35) 0%,
    rgba(255, 255, 255, 0.35) 100%
  );
  border: 1px solid #cdd6e6;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
}
.floor1 {
  transform: translateZ(0);
}
.floor2 {
  transform: translateZ(60px);
}
.label {
  position: absolute;
  right: 10px;
  top: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #1f2d3d;
}
.path {
  position: absolute;
  background: linear-gradient(90deg, #0a84ff 0%, #5ac8fa 100%);
  box-shadow: 0 0 12px rgba(10, 132, 255, 0.6);
}
.path-1f-a {
  left: 30px;
  top: 90px;
  width: 220px;
  height: 8px;
}
.path-1f-b {
  left: 250px;
  top: 40px;
  width: 8px;
  height: 60px;
}
.path-2f-a {
  left: 250px;
  top: 30px;
  width: 8px;
  height: 60px;
}
.path-2f-b {
  left: 110px;
  top: 60px;
  width: 160px;
  height: 8px;
}
.marker {
  position: absolute;
  padding: 4px 8px;
  background: rgba(255, 0, 0, 0.85);
  color: #fff;
  font-size: 12px;
  border-radius: 8px;
  border: 1px solid rgba(180, 0, 0, 0.9);
}
.marker.start {
  left: 22px;
  top: 80px;
  transform: translateZ(0);
}
.marker.end {
  left: 265px;
  top: 48px;
  transform: translateZ(60px);
}
.elevator-shaft {
  position: absolute;
  left: 250px;
  top: 30px;
  width: 20px;
  height: 140px;
  transform: translateZ(0);
  background: rgba(100, 120, 140, 0.25);
  border: 1px solid #9fb0c2;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.15);
}
.elevator-car {
  position: absolute;
  left: 251px;
  top: 100px;
  width: 18px;
  height: 20px;
  background: #0a84ff;
  border-radius: 3px;
  transform: translateZ(0);
  animation: lift 2.2s ease-in-out infinite alternate;
}
@keyframes lift {
  0% {
    transform: translateZ(0);
  }
  100% {
    transform: translateZ(60px);
  }
}
.guide-arrow {
  position: absolute;
  left: 30px;
  top: 86px;
  width: 16px;
  height: 16px;
  background: #0a84ff;
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(10, 132, 255, 0.8);
  transform: translateZ(0);
  animation: routeAnim var(--routeDur) linear infinite;
}
@keyframes routeAnim {
  0% {
    left: 30px;
    top: 86px;
    transform: translateZ(0);
  }
  40% {
    left: 250px;
    top: 86px;
    transform: translateZ(0);
  }
  50% {
    left: 250px;
    top: 60px;
    transform: translateZ(60px);
  }
  100% {
    left: 270px;
    top: 56px;
    transform: translateZ(60px);
  }
}
.route-steps {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.route-step {
  font-size: 13px;
  color: #333;
  padding: 8px;
  border: 1px dashed #d0d7e2;
  border-radius: 8px;
  background: #f7fbff;
}
</style>
