<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import * as THREE from "three";
import NET from "vanta/dist/vanta.net.min";

const container = ref<HTMLElement | null>(null);
let effect: { destroy: () => void } | null = null;

onMounted(() => {
  if (!container.value) {
    return;
  }

  effect = NET({
    el: container.value,
    THREE,
    color: 0xf59e0b,
    backgroundColor: 0x09090b,
    points: 10,
    maxDistance: 24,
    spacing: 20,
    showDots: true,
  });
});

onBeforeUnmount(() => {
  effect?.destroy();
  effect = null;
});
</script>

<template>
  <section class="relative overflow-hidden rounded-2xl border border-zinc-700/70">
    <div ref="container" class="absolute inset-0" />
    <div class="relative z-10 px-8 py-16 backdrop-blur-[1px]">
      <slot />
    </div>
  </section>
</template>
