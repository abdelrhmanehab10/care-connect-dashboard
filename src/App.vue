<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import TabPanel from "primevue/tabpanel";
import TabView from "primevue/tabview";
import type { DataTableCellEditCompleteEvent } from "primevue/datatable";
import AppointmentDialog from "./components/AppointmentDialog.vue";
import AppointmentsCalendar from "./components/AppointmentsCalendar.vue";
import AppointmentsTable from "./components/AppointmentsTable.vue";
import { useAppointments, type Appointment } from "./composables/useAppointments";
import { tabViewPt } from "./ui/primevuePt";

const isDialogOpen = ref(false);
const activeViewIndex = ref(0);
const {
  sortedAppointments,
  statusOptions,
  statusBadgeClass,
  addAppointment,
  updateAppointment,
} = useAppointments();

const handleCellEditComplete = (
  event: DataTableCellEditCompleteEvent<Appointment>
) => {
  updateAppointment(event.newData);
};
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

      <TabView v-model:activeIndex="activeViewIndex" :pt="tabViewPt">
        <TabPanel header="Table View" value="table">
          <AppointmentsTable
            :appointments="sortedAppointments"
            :status-options="statusOptions"
            :status-badge-class="statusBadgeClass"
            @cell-edit-complete="handleCellEditComplete"
          />
        </TabPanel>
        <TabPanel header="Calendar View" value="calendar">
          <AppointmentsCalendar :appointments="sortedAppointments" />
        </TabPanel>
      </TabView>
    </div>

    <AppointmentDialog v-model="isDialogOpen" @save="addAppointment" />
  </div>
</template>
