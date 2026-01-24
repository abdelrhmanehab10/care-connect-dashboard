<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import AppointmentDialog from "./components/AppointmentDialog.vue";
import AppointmentsTable from "./components/AppointmentsTable.vue";
import { useAppointments } from "./composables/useAppointments";

const isDialogOpen = ref(false);
const { sortedAppointments, statusOptions, statusBadgeClass } = useAppointments();
</script>

<template>
  <div class="min-vh-100 bg-light">
    <div class="container py-4">
      <div class="d-flex align-items-center mb-3 gap-2">
        <h2 class="mb-0">Appointments</h2>
        <Button
          label="Add appointment"
          class="btn btn-warning text-white fw-semibold ms-auto"
          @click="isDialogOpen = true"
        />
      </div>

      <AppointmentsTable
        :appointments="sortedAppointments"
        :status-options="statusOptions"
        :status-badge-class="statusBadgeClass"
      />
    </div>

    <AppointmentDialog v-model="isDialogOpen" />
  </div>
</template>
