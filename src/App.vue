<script setup lang="ts">
import { toastPt } from "./ui/primevuePt";
</script>

<template>
  <Toast position="top-right" :pt="toastPt" />
  <RouterView />
</template>
