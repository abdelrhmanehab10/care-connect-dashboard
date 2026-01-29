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
import AppointmentDetailsDialog from "./components/AppointmentDetailsDialog.vue";
import AppointmentsCalendar from "./components/AppointmentsCalendar.vue";
import AppointmentsTable from "./components/AppointmentsTable.vue";
import AppointmentCards from "./components/AppointmentCards.vue";
import {
  statusBadgeClass,
  useAppointmentsQuery,
} from "./composables/useAppointmentsQuery";
import type { Appointment } from "./types";
import {
  doctorOptions,
  nurseOptions,
  patientOptions as patientOptionsData,
  type AppointmentStatus,
} from "./data/options";
import { autoCompletePt, datePickerPt, tabViewPt } from "./ui/primevuePt";

const isDialogOpen = ref(false);
const isDetailsOpen = ref(false);
const activeViewIndex = ref(0);
const page = ref(1);
const selectedAppointment = ref<Appointment | null>(null);
const editingAppointment = ref<Appointment | null>(null);

const employeeFilter = ref<string | null>(null);
const filteredEmployees = ref<string[]>([]);
const employeeOptions = Array.from(
  new Set([...doctorOptions, ...nurseOptions]),
);

const patientFilter = ref<string | null>(null);
const filteredPatients = ref<string[]>([]);

const statusTagFilter = ref<AppointmentStatus | null>(null);

// ✅ ADD: options lists (كانت ناقصة وبتعمل error)
const visitTypeOptions = ["Routine", "Urgent", "Home Visit", "Clinic Visit"];
const stateOptions = [
  "Scheduled",
  "In-Progress",
  "Completed",
  "Cancelled",
  "No Show",
];

const visitTypeFilter = ref<string | null>(null);
const filteredVisitTypes = ref<string[]>([]);

const stateFilter = ref<string | null>(null);
const filteredStates = ref<string[]>([]);

const startDate = ref<Date | null>(null);
const endDate = ref<Date | null>(null);

const formatDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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

const normalizeString = (value: string | null | undefined) =>
  value?.toString().trim() ?? "";

const patientNameOptions = computed(() =>
  Array.from(
    new Set(
      appointments.value
        .map((appointment) => normalizeString(appointment.patient_name))
        .filter((name) => name.length > 0),
    ),
  ),
);

const quickPatientLabel = computed<string>(
  () => patientNameOptions.value[0] ?? patientOptionsData[0]?.name ?? "Patient",
);
const quickDoctorLabel = computed<string>(() => doctorOptions[0] ?? "Doctor");

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

const searchVisitTypes = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  if (!query) {
    filteredVisitTypes.value = [...visitTypeOptions];
    return;
  }
  filteredVisitTypes.value = visitTypeOptions.filter((name) =>
    name.toLowerCase().includes(query),
  );
};

const searchStates = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  if (!query) {
    filteredStates.value = [...stateOptions];
    return;
  }
  filteredStates.value = stateOptions.filter((name) =>
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
  if (!startDate.value || !endDate.value) return false;
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  return (
    isSameDay(startDate.value, weekStart) && isSameDay(endDate.value, weekEnd)
  );
});
const exportExcel = () => {
  const rows = filteredAppointments.value;

  const headers = [
    "Date",
    "Patient",
    "Doctor",
    "Nurse",
    "Status",
    "Visit Type",
    "State",
    "Start Time",
    "End Time",
  ];

  const data = rows.map((a: any) => [
    a.date ?? "",
    a.patient_name ?? "",
    a.doctor_name ?? "",
    a.nurse_name ?? "",
    a.status ?? "",
    a.visit_type ?? "",
    a.state ?? "",
    a.start_time ?? "",
    a.end_time ?? "",
  ]);

  const csv = [headers, ...data]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `appointments_${new Date().toISOString().slice(0, 10)}.csv`; // Excel يفتحه عادي
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

const filteredAppointments = computed(() => {
  const employeeQuery = employeeFilter.value?.trim().toLowerCase() ?? "";
  const patientQuery = patientFilter.value?.trim().toLowerCase() ?? "";
  const statusQuery = statusTagFilter.value;

  const visitTypeQuery = visitTypeFilter.value?.trim().toLowerCase() ?? "";
  const stateQuery = stateFilter.value?.trim().toLowerCase() ?? "";

  const start = apiStart.value;
  const end = apiEnd.value;

  return appointments.value.filter((appointment) => {
    if (start && appointment.date < start) return false;
    if (end && appointment.date > end) return false;
    if (statusQuery && appointment.status !== statusQuery) return false;

    const doctorName = normalizeString(appointment.doctor_name).toLowerCase();
    const nurseName = normalizeString(appointment.nurse_name).toLowerCase();
    const patientName = normalizeString(appointment.patient_name).toLowerCase();

    if (
      employeeQuery &&
      !(doctorName.includes(employeeQuery) || nurseName.includes(employeeQuery))
    )
      return false;
    if (patientQuery && !patientName.includes(patientQuery)) return false;

    const visitType = normalizeString(
      (appointment as any).visit_type,
    ).toLowerCase();
    const state = normalizeString((appointment as any).state).toLowerCase();

    if (visitTypeQuery && !visitType.includes(visitTypeQuery)) return false;
    if (stateQuery && !state.includes(stateQuery)) return false;

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

// ✅ عدلت التنسيق بس
const clearFilters = () => {
  clearEmployeeFilter();
  clearPatientFilter();

  statusTagFilter.value = null;
  startDate.value = null;
  endDate.value = null;

  visitTypeFilter.value = null;
  filteredVisitTypes.value = [];

  stateFilter.value = null;
  filteredStates.value = [];
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
  if (!patientName || patientName === "Patient") return;
  patientFilter.value =
    patientFilter.value === patientName ? null : patientName;
};

const toggleQuickDoctor = () => {
  const doctorName = quickDoctorLabel.value;
  if (!doctorName || doctorName === "Doctor") return;
  employeeFilter.value =
    employeeFilter.value === doctorName ? null : doctorName;
};

const handleCellEditComplete = (
  _event: DataTableCellEditCompleteEvent<Appointment>,
) => {
  return;
};

const openDetails = (appointment: Appointment) => {
  selectedAppointment.value = appointment;
  isDetailsOpen.value = true;
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
  if (page.value > 1) page.value -= 1;
};

const goNext = () => {
  if (canGoNext.value) page.value += 1;
};

const openAddDialog = () => {
  editingAppointment.value = null;
  isDialogOpen.value = true;
};

const openEditDialog = (appointment: Appointment) => {
  editingAppointment.value = appointment;
  isDetailsOpen.value = false;
  isDialogOpen.value = true;
};

watch([apiStart, apiEnd], () => {
  page.value = 1;
});

watch(isDialogOpen, (value) => {
  if (!value) {
    editingAppointment.value = null;
  }
});
</script>

<template>
  <div class="cc-page">
    <div class="cc-container cc-layout">
      <section class="cc-main">
        <div class="cc-toolbar">
          <h2 class="cc-title">Appointments</h2>
          <Button
            label="Add Appointment"
            class="cc-btn cc-btn-primary cc-toolbar-action text-light"
            @click="openAddDialog"
          />
        </div>
        <div class="border p-3 rounded mb-2">
          <div class="cc-sidebar-header">
            <div class="cc-section-title">Filters</div>
            <div class="cc-help-text">Refine by staff member.</div>
          </div>
          <AppointmentCards
            :is-this-week-active="isThisWeekActive"
            :status-tag-filter="statusTagFilter"
            :quick-patient-label="quickPatientLabel"
            :quick-doctor-label="quickDoctorLabel"
            :patient-filter="patientFilter"
            :employee-filter="employeeFilter"
            @toggle-week="toggleThisWeek"
            @toggle-status="toggleStatusTag"
            @toggle-patient="toggleQuickPatient"
            @toggle-doctor="toggleQuickDoctor"
          />
          <div class="row">
            <div class="col-md-2">
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
            <div class="col-md-2">
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
            <div class="col-md-2">
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
            <div class="col-md-2">
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
            <div class="col-md-2">
              <label for="visitTypeFilter" class="cc-label">Visit Type</label>
              <AutoComplete
                v-model="visitTypeFilter"
                inputId="visitTypeFilter"
                :suggestions="filteredVisitTypes"
                :completeOnFocus="true"
                :autoOptionFocus="true"
                appendTo="body"
                panelClass="cc-autocomplete-panel"
                inputClass="cc-input"
                :pt="autoCompletePt"
                placeholder="Select visit type"
                @complete="searchVisitTypes"
              />
            </div>

            <div class="col-md-2">
              <label for="stateFilter" class="cc-label">States</label>
              <AutoComplete
                v-model="stateFilter"
                inputId="stateFilter"
                :suggestions="filteredStates"
                :completeOnFocus="true"
                :autoOptionFocus="true"
                appendTo="body"
                panelClass="cc-autocomplete-panel"
                inputClass="cc-input"
                :pt="autoCompletePt"
                placeholder="Select state"
                @complete="searchStates"
              />
            </div>
            <div class="cc-filters-actions">
              <button
                type="button"
                class="cc-btn cc-btn-sm cc-btn-input bg-danger text-light mt-3 mb-2 cc-btn-full"
                @click="clearFilters"
              >
                Clear Filters
              </button>
            </div>
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
                @view-details="openDetails"
                @export-excel="exportExcel"
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
            <AppointmentsCalendar
              :appointments="filteredAppointments"
              @edit="openEditDialog"
            />
          </TabPanel>
        </TabView>
      </section>
    </div>

    <AppointmentDialog
      v-model="isDialogOpen"
      :appointment="editingAppointment"
    />
    <AppointmentDetailsDialog
      v-model="isDetailsOpen"
      :appointment="selectedAppointment"
    />
  </div>
</template>
