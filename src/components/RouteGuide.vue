<template>
  <div class="route-guide">
    <div class="route-title">{{ guide.title }}</div>
    <div class="route-steps">
      <div v-for="(s, i) in guide.steps" :key="i" class="route-step">
        {{ i + 1 }}. {{ s }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  guide: {
    title: string;
    steps: string[];
    durationSec?: number;
  };
}>();
</script>

<style scoped>
.route-guide {
  position: absolute;
  right: 16px;
  top: 16px;
  width: 560px;
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
