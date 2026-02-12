<script setup lang="ts">
import { toastPt } from "./ui/primevuePt";
import AppointmentsPage from "./pages/AppointmentsPage.vue";
</script>

<template>
  <Toast position="top-right" :pt="toastPt" />
  <AppointmentsPage />
</template>
