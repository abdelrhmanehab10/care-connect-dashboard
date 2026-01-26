<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import TabPanel from "primevue/tabpanel";
import TabView from "primevue/tabview";
import type { DataTableCellEditCompleteEvent } from "primevue/datatable";
import AppointmentDialog from "./components/AppointmentDialog.vue";
import AppointmentsCalendar from "./components/AppointmentsCalendar.vue";
import AppointmentsTable from "./components/AppointmentsTable.vue";
import {
  useAppointments,
  type Appointment,
} from "./composables/useAppointments";
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
  event: DataTableCellEditCompleteEvent<Appointment>,
) => {
  updateAppointment(event.newData);
};
</script>

<template>
  <div class="cc-page">
    <div class="cc-container">
      <div class="cc-toolbar">
        <h2 class="cc-title">Appointments</h2>
        <Button
          label="Add appointment"
          class="cc-btn cc-btn-primary cc-toolbar-action"
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
