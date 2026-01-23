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
        <div class="map-surface">
          <div class="route-arrow route-a"></div>
          <div class="route-arrow route-b"></div>
          <div class="route-arrow route-c"></div>
          <div class="poi start">入口</div>
          <div class="poi mid">大厅</div>
          <div class="poi end">目的地</div>
        </div>
      </div>
      <div class="route-steps">
        <div v-for="(s, i) in appState.ui.routeGuide?.steps" :key="i" class="route-step">
          {{ i + 1 }}. {{ s }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'
import { avatarService } from '../services/avatar'
import type { AppState } from '../types'
import siriIcon from '../assets/siri.png'

// 注入全局状态
const appState = inject<AppState>('appState')!

// 获取容器ID
const containerId = computed(() => avatarService.getContainerId())
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
  background: rgba(255,255,255,0.9);
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.15);
  backdrop-filter: blur(6px);
}

.route-title {
  font-size: 16px;
  font-weight: 600;
  color: #222;
  margin-bottom: 8px;
}

.map-3d {
  perspective: 800px;
  height: 200px;
  margin-bottom: 10px;
}

.map-surface {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #e8f1ff 0%, #ffffff 100%);
  border: 1px solid #cdd6e6;
  border-radius: 10px;
  transform: rotateX(25deg);
  transform-origin: bottom;
  position: relative;
  overflow: hidden;
}

.route-arrow {
  position: absolute;
  height: 10px;
  background: linear-gradient(90deg, #0a84ff 0%, #5ac8fa 100%);
  box-shadow: 0 0 12px rgba(10,132,255,0.6);
}

.route-a { left: 30px; top: 130px; width: 280px; }
.route-b { left: 300px; top: 60px; width: 10px; height: 80px; }
.route-c { left: 120px; top: 60px; width: 180px; height: 10px; }

.poi {
  position: absolute;
  padding: 4px 8px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 12px;
  border-radius: 6px;
}
.poi.start { left: 20px; top: 140px; }
.poi.mid { left: 290px; top: 40px; }
.poi.end { left: 270px; top: 45px; }

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
