<script setup lang="ts">
import { computed, ref } from "vue";
import Button from "primevue/button";
import AutoComplete from "primevue/autocomplete";
import type { AutoCompleteCompleteEvent } from "primevue/autocomplete";
import DatePicker from "primevue/datepicker";
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
import {
  doctorOptions,
  nurseOptions,
  type AppointmentStatus,
} from "./data/options";
import { autoCompletePt, datePickerPt, tabViewPt } from "./ui/primevuePt";

const isDialogOpen = ref(false);
const activeViewIndex = ref(0);
const {
  sortedAppointments,
  statusOptions,
  statusBadgeClass,
  addAppointment,
  updateAppointment,
} = useAppointments();

const employeeFilter = ref<string | null>(null);
const filteredEmployees = ref<string[]>([]);
const employeeOptions = Array.from(
  new Set([...doctorOptions, ...nurseOptions])
);
const statusFilter = ref<AppointmentStatus | "">("");
const startDate = ref<Date | null>(null);
const endDate = ref<Date | null>(null);

const searchEmployees = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  if (!query) {
    filteredEmployees.value = [...employeeOptions];
    return;
  }

  filteredEmployees.value = employeeOptions.filter((name) =>
    name.toLowerCase().includes(query)
  );
};

const formatDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const filteredAppointments = computed(() => {
  const query = employeeFilter.value?.trim().toLowerCase() ?? "";
  const hasStatus = Boolean(statusFilter.value);
  const start = startDate.value ? formatDate(startDate.value) : "";
  const end = endDate.value ? formatDate(endDate.value) : "";
  if (!query) {
    return sortedAppointments.value.filter((appointment) => {
      if (hasStatus && appointment.status !== statusFilter.value) {
        return false;
      }
      if (start && appointment.date < start) {
        return false;
      }
      if (end && appointment.date > end) {
        return false;
      }
      return true;
    });
  }

  return sortedAppointments.value.filter((appointment) => {
    if (hasStatus && appointment.status !== statusFilter.value) {
      return false;
    }
    if (start && appointment.date < start) {
      return false;
    }
    if (end && appointment.date > end) {
      return false;
    }
    return (
      appointment.doctor.toLowerCase().includes(query) ||
      appointment.nurse.toLowerCase().includes(query)
    );
  });
});

const clearEmployeeFilter = () => {
  employeeFilter.value = null;
  filteredEmployees.value = [];
};

const clearFilters = () => {
  clearEmployeeFilter();
  statusFilter.value = "";
  startDate.value = null;
  endDate.value = null;
};

const handleCellEditComplete = (
  event: DataTableCellEditCompleteEvent<Appointment>,
) => {
  updateAppointment(event.newData);
};
</script>

<template>
  <div class="cc-page">
    <div class="cc-container cc-layout">
      <aside class="cc-sidebar">
        <div class="cc-sidebar-header">
          <div class="cc-section-title">Filters</div>
          <div class="cc-help-text">Refine by staff member.</div>
        </div>
          <div class="cc-stack">
            <div>
              <label for="employeeFilter" class="cc-label">Employee</label>
            <AutoComplete
              v-model="employeeFilter"
              inputId="employeeFilter"
              :suggestions="filteredEmployees"
              :completeOnFocus="true"
              :autoOptionFocus="true"
              appendTo="body"
              panelClass="cc-autocomplete-panel"
              inputClass="cc-input"
              :pt="autoCompletePt"
                placeholder="Search nurse or doctor"
                @complete="searchEmployees"
              />
            </div>
            <div>
              <label for="statusFilter" class="cc-label">Status</label>
              <select id="statusFilter" v-model="statusFilter" class="cc-select">
                <option value="">All statuses</option>
                <option v-for="status in statusOptions" :key="status" :value="status">
                  {{ status }}
                </option>
              </select>
            </div>
            <div class="cc-stack cc-stack-sm">
              <span class="cc-label">Date range</span>
              <DatePicker
                v-model="startDate"
                inputId="filterStartDate"
                dateFormat="yy-mm-dd"
                appendTo="body"
                panelClass="cc-datepicker-panel"
                :pt="datePickerPt"
                placeholder="Start date"
              />
              <DatePicker
                v-model="endDate"
                inputId="filterEndDate"
                dateFormat="yy-mm-dd"
                appendTo="body"
                panelClass="cc-datepicker-panel"
                :pt="datePickerPt"
                placeholder="End date"
              />
            </div>
            <button
              type="button"
              class="cc-btn cc-btn-outline cc-btn-sm"
              @click="clearFilters"
            >
              Clear filters
            </button>
          </div>
      </aside>

      <section class="cc-main">
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
              :appointments="filteredAppointments"
              :status-options="statusOptions"
              :status-badge-class="statusBadgeClass"
              @cell-edit-complete="handleCellEditComplete"
            />
          </TabPanel>
          <TabPanel header="Calendar View" value="calendar">
            <AppointmentsCalendar :appointments="filteredAppointments" />
          </TabPanel>
        </TabView>
      </section>
    </div>

    <AppointmentDialog v-model="isDialogOpen" @save="addAppointment" />
  </div>
</template>
