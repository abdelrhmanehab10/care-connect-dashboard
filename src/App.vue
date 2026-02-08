<script setup lang="ts">
import { ref } from "vue";
import AppointmentsPage from "./pages/AppointmentsPage.vue";
import LogPage from "./pages/LogPage.vue";

const activePage = ref<"appointments" | "logs">("appointments");

const openLogPage = () => {
  activePage.value = "logs";
};

const openAppointmentsPage = () => {
  activePage.value = "appointments";
};
</script>

<template>
  <AppointmentsPage v-if="activePage === 'appointments'" @open-log="openLogPage" />
  <LogPage v-else @back="openAppointmentsPage" />
</template>
