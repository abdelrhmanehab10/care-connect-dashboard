<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Button from "primevue/button";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import type { DataTableCellEditCompleteEvent } from "primevue/datatable";
import AppointmentsFilters from "../components/AppointmentsFilters.vue";
import AppointmentDialog from "../components/AppointmentDialog.vue";
import AppointmentDetailsDialog from "../components/AppointmentDetailsDialog.vue";
import AppointmentsCalendar from "../components/AppointmentsCalendar.vue";
import AppointmentsTable from "../components/AppointmentsTable.vue";
import { fetchAppointmentDetails } from "../services/appointments";
import {
  statusBadgeClass,
  useAppointmentsQuery,
} from "../composables/useAppointmentsQuery";
import type { Appointment } from "../types";
import {
  areaOptions,
  doctorOptions,
  nurseOptions,
  patientOptions as patientOptionsData,
  socialWorkerOptions,
  weekdayOptions,
  type AppointmentStatus,
} from "../data/options";

const isDialogOpen = ref(false);
const isDetailsOpen = ref(false);
const activeTab = ref("table");
const page = ref(1);
const selectedAppointment = ref<Appointment | null>(null);
const editingAppointment = ref<Appointment | null>(null);
const isEditLoading = ref(false);

const employeeFilter = ref<string | null>(null);
const employeeOptions = Array.from(
  new Set([...doctorOptions, ...nurseOptions]),
);

const patientFilter = ref<string | null>(null);

const statusTagFilter = ref<AppointmentStatus | null>(null);

// Added options list to avoid missing data errors.
const visitTypeOptions = ["Routine", "Urgent", "Home Visit", "Clinic Visit"];
const stateOptions = [
  "Scheduled",
  "In-Progress",
  "Completed",
  "Cancelled",
  "No Show",
];

const visitTypeFilter = ref<string | null>(null);
const stateFilter = ref<string | null>(null);

const startDate = ref<Date | null>(null);
const endDate = ref<Date | null>(null);

const formatDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isValidIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const normalizeAppointmentDate = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  const trimmed = value.trim().replace(/\//g, "-");
  const dateOnly = (trimmed.split("T")[0] ?? "").split(" ")[0] ?? "";
  if (isValidIsoDate(dateOnly)) {
    return dateOnly;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDate(parsed);
  }

  return "";
};

const parseIsoDate = (value: string) => {
  const [yearRaw = Number.NaN, monthRaw = Number.NaN, dayRaw = Number.NaN] =
    value.split("-").map(Number);
  if (
    !Number.isFinite(yearRaw) ||
    !Number.isFinite(monthRaw) ||
    !Number.isFinite(dayRaw)
  ) {
    return null;
  }
  return new Date(yearRaw, monthRaw - 1, dayRaw);
};

const tabLinkPt = {
  root: ({ context }: { context?: { active?: boolean } }) => ({
    class: ["cc-tab-link", context?.active ? "is-active" : ""],
  }),
};

const tabPanelsPt = {
  root: { class: "cc-tab-content" },
};

const mergeAppointmentDetails = (
  details: Partial<Appointment>,
  fallback: Appointment,
): Appointment => ({
  ...fallback,
  ...details,
  date: normalizeAppointmentDate(details.date) || details.date || fallback.date,
  start_time: details.start_time ?? fallback.start_time,
  end_time: details.end_time ?? fallback.end_time,
  patient: details.patient ?? fallback.patient,
  doctor: details.doctor ?? fallback.doctor,
  nurse: details.nurse ?? fallback.nurse,
});

const apiStart = computed(() =>
  startDate.value ? formatDate(startDate.value) : "",
);
const apiEnd = computed(() => (endDate.value ? formatDate(endDate.value) : ""));

const {
  appointments,
  data: appointmentsResponse,
  isLoading,
  statusOptions,
  refetch,
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
        .map((appointment) => normalizeString(appointment.patient?.name ?? ""))
        .filter((name) => name.length > 0),
    ),
  ),
);

const quickPatientLabel = computed<string>(
  () => patientNameOptions.value[0] ?? patientOptionsData[0]?.name ?? "Patient",
);
const quickDoctorLabel = computed<string>(() => doctorOptions[0] ?? "Doctor");

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

  const data = rows.map((appointment) => [
    appointment.date ?? "",
    appointment.patient?.name ?? "",
    appointment.doctor?.name ?? "",
    appointment.nurse?.name ?? "",
    appointment.status ?? "",
    appointment.visit_type ?? "",
    appointment.state ?? "",
    appointment.start_time ?? "",
    appointment.end_time ?? "",
  ]);

  const csv = [headers, ...data]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `appointments_${new Date().toISOString().slice(0, 10)}.csv`;
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
    if (start || end) {
      const appointmentDate = normalizeAppointmentDate(appointment.date);
      if (!appointmentDate) return false;
      if (start && appointmentDate < start) return false;
      if (end && appointmentDate > end) return false;
    }
    if (statusQuery && appointment.status !== statusQuery) return false;

    const doctorName = normalizeString(
      appointment.doctor?.name ?? "",
    ).toLowerCase();
    const nurseName = normalizeString(
      appointment.nurse?.name ?? "",
    ).toLowerCase();
    const patientName = normalizeString(
      appointment.patient?.name ?? "",
    ).toLowerCase();

    if (
      employeeQuery &&
      !(doctorName.includes(employeeQuery) || nurseName.includes(employeeQuery))
    )
      return false;
    if (patientQuery && !patientName.includes(patientQuery)) return false;

    const visitType = normalizeString(
      appointment.visit_type ?? "",
    ).toLowerCase();
    const state = normalizeString(appointment.state ?? "").toLowerCase();

    if (visitTypeQuery && !visitType.includes(visitTypeQuery)) return false;
    if (stateQuery && !state.includes(stateQuery)) return false;

    return true;
  });
});

const syncCalendarRange = (payload: { start: string; end: string }) => {
  const nextStart = parseIsoDate(payload.start);
  const nextEnd = parseIsoDate(payload.end);
  if (!nextStart || !nextEnd) {
    return;
  }
  startDate.value = nextStart;
  endDate.value = nextEnd;
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
  const fallback = appointment;
  isDetailsOpen.value = false;
  isDialogOpen.value = true;
  isEditLoading.value = true;
  editingAppointment.value = null;
  fetchAppointmentDetails(appointment.id)
    .then((details) => {
      editingAppointment.value = mergeAppointmentDetails(
        details as Partial<Appointment>,
        fallback,
      );
    })
    .catch((error) => {
      console.error("Failed to load appointment details.", error);
      editingAppointment.value = fallback;
    })
    .finally(() => {
      isEditLoading.value = false;
    });
};

const refreshAppointments = () => {
  void refetch();
};

watch([apiStart, apiEnd], () => {
  page.value = 1;
});

watch(isDialogOpen, (value) => {
  if (!value) {
    editingAppointment.value = null;
    isEditLoading.value = false;
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
        <AppointmentsFilters
          v-model:employee-filter="employeeFilter"
          v-model:patient-filter="patientFilter"
          v-model:visit-type-filter="visitTypeFilter"
          v-model:state-filter="stateFilter"
          v-model:status-tag-filter="statusTagFilter"
          v-model:start-date="startDate"
          v-model:end-date="endDate"
          :employee-options="employeeOptions"
          :patient-options="patientNameOptions"
          :visit-type-options="visitTypeOptions"
          :state-options="stateOptions"
          :quick-patient-label="quickPatientLabel"
          :quick-doctor-label="quickDoctorLabel"
        />

        <Tabs v-model:value="activeTab">
          <div class="cc-tabs-wrap">
            <TabList class="cc-tabs">
              <Tab value="table" :pt="tabLinkPt">Table View</Tab>
              <Tab value="calendar" :pt="tabLinkPt">Calendar View</Tab>
            </TabList>
          </div>
          <TabPanels :pt="tabPanelsPt">
            <TabPanel value="table">
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
            <TabPanel value="calendar">
            <AppointmentsCalendar
              :appointments="filteredAppointments"
              :is-loading="isLoading"
              @range-change="syncCalendarRange"
              @edit="openEditDialog"
              @confirm-all="refreshAppointments"
              @no-show="refreshAppointments"
              @cancel="refreshAppointments"
            />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </section>
    </div>

    <AppointmentDialog
      v-model="isDialogOpen"
      :appointment="editingAppointment"
      :is-loading="isEditLoading"
      :patient-options="patientOptionsData"
      :nurse-options="nurseOptions"
      :doctor-options="doctorOptions"
      :social-worker-options="socialWorkerOptions"
      :area-options="areaOptions"
      :visit-type-options="visitTypeOptions"
      :weekday-options="weekdayOptions"
    />
    <AppointmentDetailsDialog
      v-model="isDetailsOpen"
      :appointment="selectedAppointment"
    />
  </div>
</template>
