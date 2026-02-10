<script setup lang="ts">
import { ref } from "vue";
import AppointmentsPage from "./pages/AppointmentsPage.vue";
import LogPage from "./pages/LogPage.vue";
import { toastPt } from "./ui/primevuePt";

const activePage = ref<"appointments" | "logs">("appointments");
const logAppointmentId = ref<number | null>(null);

const openLogPage = (appointmentId: number) => {
  logAppointmentId.value = appointmentId;
  activePage.value = "logs";
};

const openAppointmentsPage = () => {
  activePage.value = "appointments";
};
</script>

<template>
  <Toast position="top-right" :pt="toastPt" />
  <AppointmentsPage
    v-if="activePage === 'appointments'"
    @open-log="openLogPage"
  />
  <LogPage
    v-else
    :appointment-id="logAppointmentId"
    @back="openAppointmentsPage"
  />
</template>
