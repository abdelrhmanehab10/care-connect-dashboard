<script setup lang="ts">
import { computed, ref, watch } from "vue";
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
  statusBadgeClass,
  type AppointmentUi,
  useAppointmentsQuery,
} from "./composables/useAppointmentsQuery";
import {
  doctorOptions,
  nurseOptions,
  patientOptions as patientOptionsData,
  type AppointmentStatus,
} from "./data/options";
import { autoCompletePt, datePickerPt, tabViewPt } from "./ui/primevuePt";

const isDialogOpen = ref(false);
const activeViewIndex = ref(0);
const page = ref(1);

const employeeFilter = ref<string | null>(null);
const filteredEmployees = ref<string[]>([]);
const employeeOptions = Array.from(
  new Set([...doctorOptions, ...nurseOptions]),
);
const patientFilter = ref<string | null>(null);
const filteredPatients = ref<string[]>([]);
const statusTagFilter = ref<AppointmentStatus | null>(null);
const startDate = ref<Date | null>(null);
const endDate = ref<Date | null>(null);
const apiStart = computed(() =>
  startDate.value ? formatDate(startDate.value) : "",
);
const apiEnd = computed(() => (endDate.value ? formatDate(endDate.value) : ""));
const {
  appointments,
  data: appointmentsResponse,
  isLoading,
  statusOptions,
} = useAppointmentsQuery({
  page,
  start: apiStart,
  end: apiEnd,
});
const patientNameOptions = computed(() =>
  Array.from(
    new Set(appointments.value.map((appointment) => appointment.patient)),
  ),
);
const quickPatientLabel = computed<string>(
  () => patientNameOptions.value[0] ?? patientOptionsData[0]?.name ?? "Patient",
);
const quickDoctorLabel = computed<string>(
  () => doctorOptions[0] ?? "Doctor",
);

const searchEmployees = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  if (!query) {
    filteredEmployees.value = [...employeeOptions];
    return;
  }

  filteredEmployees.value = employeeOptions.filter((name) =>
    name.toLowerCase().includes(query),
  );
};

const searchPatients = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  if (!query) {
    filteredPatients.value = [...patientNameOptions.value];
    return;
  }

  filteredPatients.value = patientNameOptions.value.filter((name) =>
    name.toLowerCase().includes(query),
  );
};

const startOfWeek = (value: Date) => {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date;
};

const endOfWeek = (value: Date) => {
  const date = startOfWeek(value);
  date.setDate(date.getDate() + 6);
  return date;
};

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const isThisWeekActive = computed(() => {
  if (!startDate.value || !endDate.value) {
    return false;
  }
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  return (
    isSameDay(startDate.value, weekStart) && isSameDay(endDate.value, weekEnd)
  );
});

const formatDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const filteredAppointments = computed(() => {
  const employeeQuery = employeeFilter.value?.trim().toLowerCase() ?? "";
  const patientQuery = patientFilter.value?.trim().toLowerCase() ?? "";
  const statusQuery = statusTagFilter.value;
  const start = apiStart.value;
  const end = apiEnd.value;
  return appointments.value.filter((appointment) => {
    if (start && appointment.date < start) {
      return false;
    }
    if (end && appointment.date > end) {
      return false;
    }
    if (statusQuery && appointment.status !== statusQuery) {
      return false;
    }
    if (
      employeeQuery &&
      !(
        appointment.doctor.toLowerCase().includes(employeeQuery) ||
        appointment.nurse.toLowerCase().includes(employeeQuery)
      )
    ) {
      return false;
    }
    if (
      patientQuery &&
      !appointment.patient.toLowerCase().includes(patientQuery)
    ) {
      return false;
    }
    return true;
  });
});

const clearEmployeeFilter = () => {
  employeeFilter.value = null;
  filteredEmployees.value = [];
};

const clearPatientFilter = () => {
  patientFilter.value = null;
  filteredPatients.value = [];
};

const clearFilters = () => {
  clearEmployeeFilter();
  clearPatientFilter();
  statusTagFilter.value = null;
  startDate.value = null;
  endDate.value = null;
};

const toggleStatusTag = (status: AppointmentStatus) => {
  statusTagFilter.value = statusTagFilter.value === status ? null : status;
};

const toggleThisWeek = () => {
  if (isThisWeekActive.value) {
    startDate.value = null;
    endDate.value = null;
    return;
  }
  const now = new Date();
  startDate.value = startOfWeek(now);
  endDate.value = endOfWeek(now);
};

const toggleQuickPatient = () => {
  const patientName = quickPatientLabel.value;
  if (!patientName || patientName === "Patient") {
    return;
  }
  patientFilter.value =
    patientFilter.value === patientName ? null : patientName;
};

const toggleQuickDoctor = () => {
  const doctorName = quickDoctorLabel.value;
  if (!doctorName || doctorName === "Doctor") {
    return;
  }
  employeeFilter.value =
    employeeFilter.value === doctorName ? null : doctorName;
};

const handleCellEditComplete = (
  _event: DataTableCellEditCompleteEvent<AppointmentUi>,
) => {
  return;
};

const canGoPrev = computed(
  () => (appointmentsResponse.value?.currentPage ?? 1) > 1,
);
const canGoNext = computed(
  () => appointmentsResponse.value?.hasMorePages ?? false,
);
const totalPages = computed(() => {
  const total = appointmentsResponse.value?.total ?? 0;
  const perPage = appointmentsResponse.value?.perPage ?? 1;
  return perPage ? Math.max(1, Math.ceil(total / perPage)) : 1;
});

const goPrev = () => {
  if (page.value > 1) {
    page.value -= 1;
  }
};

const goNext = () => {
  if (canGoNext.value) {
    page.value += 1;
  }
};

watch([apiStart, apiEnd], () => {
  page.value = 1;
});
</script>

<template>
  <div class="cc-page">
    <div class="cc-container cc-layout">
      <section class="cc-main">
        <div class="cc-toolbar">
          <h2 class="cc-title">Appointments</h2>
          <Button
            label="Add appointment"
            class="cc-btn cc-btn-primary cc-toolbar-action"
            @click="isDialogOpen = true"
          />
        </div>
        <div class="cc-sidebar-header">
          <div class="cc-section-title">Filters</div>
          <div class="cc-help-text">Refine by staff member.</div>
        </div>
        <div class="cc-quick-filters">
          <span class="cc-label cc-label-inline">Quick filters</span>
          <div class="cc-quick-filter-row">
            <button
              type="button"
              class="cc-quick-filter"
              :class="{ 'is-active': isThisWeekActive }"
              @click="toggleThisWeek"
            >
              This week
            </button>
            <button
              type="button"
              class="cc-quick-filter"
              :class="{ 'is-active': statusTagFilter === 'Pending' }"
              @click="toggleStatusTag('Pending')"
            >
              Pending
            </button>
            <button
              type="button"
              class="cc-quick-filter"
              :class="{ 'is-active': patientFilter === quickPatientLabel }"
              @click="toggleQuickPatient"
            >
              {{ quickPatientLabel }}
            </button>
            <button
              type="button"
              class="cc-quick-filter"
              :class="{ 'is-active': employeeFilter === quickDoctorLabel }"
              @click="toggleQuickDoctor"
            >
              {{ quickDoctorLabel }}
            </button>
          </div>
        </div>
        <div class="cc-filters-grid">
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
            <label for="patientFilter" class="cc-label">Patient</label>
            <AutoComplete
              v-model="patientFilter"
              inputId="patientFilter"
              :suggestions="filteredPatients"
              :completeOnFocus="true"
              :autoOptionFocus="true"
              appendTo="body"
              panelClass="cc-autocomplete-panel"
              inputClass="cc-input"
              :pt="autoCompletePt"
              placeholder="Search patient"
              @complete="searchPatients"
            />
          </div>
          <div>
            <label for="filterStartDate" class="cc-label">Start date</label>
            <DatePicker
              v-model="startDate"
              inputId="filterStartDate"
              dateFormat="yy-mm-dd"
              appendTo="body"
              panelClass="cc-datepicker-panel"
              :pt="datePickerPt"
              placeholder="Start date"
            />
          </div>
          <div>
            <label for="filterEndDate" class="cc-label">End date</label>
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
          <div class="cc-filters-actions">
            <button
              type="button"
              class="cc-btn cc-btn-outline cc-btn-sm cc-btn-input"
              @click="clearFilters"
            >
              Clear
            </button>
          </div>
        </div>

        <TabView v-model:activeIndex="activeViewIndex" :pt="tabViewPt">
          <TabPanel header="Table View" value="table">
            <div class="cc-table-card">
              <AppointmentsTable
                :appointments="filteredAppointments"
                :is-loading="isLoading"
                :status-options="statusOptions"
                :status-badge-class="statusBadgeClass"
                @cell-edit-complete="handleCellEditComplete"
              />
              <div class="cc-table-footer">
                <div class="cc-help-text">
                  Page {{ appointmentsResponse?.currentPage ?? 1 }} of
                  {{ totalPages }}
                </div>
                <div class="cc-row cc-stack-sm">
                  <button
                    type="button"
                    class="cc-btn cc-btn-outline cc-btn-sm"
                    :disabled="!canGoPrev"
                    @click="goPrev"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    class="cc-btn cc-btn-outline cc-btn-sm"
                    :disabled="!canGoNext"
                    @click="goNext"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </TabPanel>
          <TabPanel header="Calendar View" value="calendar">
            <AppointmentsCalendar :appointments="filteredAppointments" />
          </TabPanel>
        </TabView>
      </section>
    </div>

    <AppointmentDialog v-model="isDialogOpen" />
  </div>
</template>
