<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import Button from "primevue/button";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { useToast } from "primevue/usetoast";
import AppointmentsFilters from "../components/AppointmentsFilters.vue";
import AppointmentDialog from "../components/AppointmentDialog.vue";
import AppointmentDetailsDialog from "../components/AppointmentDetailsDialog.vue";
import AppointmentsCalendar from "../components/AppointmentsCalendar.vue";
import AppointmentsTable from "../components/AppointmentsTable.vue";
import {
  createAppointment,
  fetchAppointmentDetails,
  updateAppointment,
  type CreateAppointmentPayload,
  type UpdateAppointmentPayload,
  type AppointmentStatusOption,
} from "../services/appointments";
import type { EmployeeOption } from "../services/employees";
import { fetchVisitTypes, type VisitType } from "../services/visitTypes";
import { useAppointmentsQuery } from "../composables/useAppointmentsQuery";
import { isFinalStatus } from "../lib/statusTransitions";
import type { Appointment } from "../types";
import {
  doctorOptions,
  nurseOptions,
  patientOptions as patientOptionsData,
  socialWorkerOptions,
  weekdayOptions,
  type AppointmentStatus,
  type PatientOption,
} from "../data/options";

const isDialogOpen = ref(false);
const isDetailsOpen = ref(false);
const activeTab = ref("table");
const page = ref(1);
const selectedAppointment = ref<Appointment | null>(null);
const detailsLoadingId = ref<number | null>(null);
const detailsRequestSeq = ref(0);
const editingAppointment = ref<Appointment | null>(null);
const isEditLoading = ref(false);
const isSaving = ref(false);
const saveError = ref<string | null>(null);
const toast = useToast();
const visitTypes = ref<VisitType[]>([]);

const employeeFilter = ref<EmployeeOption | null>(null);

const patientFilter = ref<PatientOption | null>(null);

const statusTagFilter = ref<AppointmentStatus | null>(null);

// Added options list to avoid missing data errors.
const visitTypeOptions = computed(() => {
  const options: string[] = [];
  const seen = new Set<string>();

  for (const type of visitTypes.value) {
    const name = String(type?.name ?? "").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    options.push(name);
  }

  return options;
});

const visitTypeFilter = ref<string | null>(null);
const stateFilter = ref<AppointmentStatusOption | null>(null);

const startDate = ref<Date | null>(null);
const endDate = ref<Date | null>(null);
const dateFilterSource = ref<"calendar" | "filters" | null>(null);

const setStartDateFromFilter = (value: Date | null) => {
  dateFilterSource.value = "filters";
  startDate.value = value;
};

const setEndDateFromFilter = (value: Date | null) => {
  dateFilterSource.value = "filters";
  endDate.value = value;
};

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

const calendarTabLinkPt = {
  root: ({ context }: { context?: { active?: boolean } }) => ({
    class: ["cc-tab-link", "cc-tab-link-gap", context?.active ? "is-active" : ""],
  }),
};

const tabPanelsPt = {
  root: { class: "cc-tab-content" },
};

const isCalendarView = computed(() => activeTab.value === "calendar");

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
const patientIdFilter = computed(() => patientFilter.value?.id ?? "");
const employeeIdsFilter = computed<number[]>(() => {
  const id = employeeFilter.value?.id;
  return typeof id === "number" && Number.isFinite(id) ? [id] : [];
});

const resolveStateFilter = () => {
  return stateFilter.value?.value ?? stateFilter.value?.key ?? "";
};

const visitTypeIdLookup = computed(() => {
  const map = new Map<string, string>();
  for (const type of visitTypes.value) {
    map.set(type.name.toLowerCase(), type.id);
  }
  return map;
});

const visitTypeFilterId = computed(() => {
  const name = String(visitTypeFilter.value ?? "").toLowerCase();
  if (!name) return "";
  return visitTypeIdLookup.value.get(name) ?? "";
});

const {
  appointments,
  isLoading,
  refetch,
} = useAppointmentsQuery({
  page,
  start: apiStart,
  end: apiEnd,
  status: computed(() => statusTagFilter.value ?? ""),
  employee_ids: employeeIdsFilter,
  patient_id: patientIdFilter,
  visit_type: computed(() =>
    visitTypeFilterId.value ? "" : (visitTypeFilter.value ?? ""),
  ),
  visit_type_id: visitTypeFilterId,
  state: computed(() => resolveStateFilter()),
});

const patientOptions = computed<PatientOption[]>(() => {
  const map = new Map<string, PatientOption>();
  for (const appointment of appointments.value) {
    const patient = appointment.patient;
    if (!patient) continue;
    const id = String(patient.id ?? "").trim();
    const name = String(patient.name ?? "").trim();
    if (!id || !name) continue;
    if (!map.has(id)) {
      map.set(id, { id, name });
    }
  }
  return Array.from(map.values());
});

const quickPatientLabel = computed<string>(
  () =>
    patientOptions.value[0]?.name ?? patientOptionsData[0]?.name ?? "Patient",
);
const quickDoctorLabel = computed<string>(() => doctorOptions[0] ?? "Doctor");

const exportExcel = () => {
  const rows = appointments.value;

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

const syncCalendarRange = (payload: { start: string; end: string }) => {
  if (activeTab.value !== "calendar") {
    return;
  }
  const nextStart = parseIsoDate(payload.start);
  const nextEnd = parseIsoDate(payload.end);
  if (!nextStart || !nextEnd) {
    return;
  }
  if (
    dateFilterSource.value === "filters" &&
    startDate.value &&
    endDate.value
  ) {
    return;
  }
  dateFilterSource.value = "calendar";
  startDate.value = nextStart;
  endDate.value = nextEnd;
};

const openDetails = async (appointment: Appointment) => {
  const fallback = appointment;
  const requestSeq = detailsRequestSeq.value + 1;
  detailsRequestSeq.value = requestSeq;
  isDetailsOpen.value = true;
  selectedAppointment.value = fallback;
  detailsLoadingId.value = fallback.id;

  try {
    const details = await fetchAppointmentDetails(fallback.id);
    if (requestSeq !== detailsRequestSeq.value) {
      return;
    }
    selectedAppointment.value = mergeAppointmentDetails(
      details as Partial<Appointment>,
      fallback,
    );
  } catch (error) {
    if (requestSeq !== detailsRequestSeq.value) {
      return;
    }
    console.error("Failed to load appointment details.", error);
    toast.add({
      severity: "warn",
      summary: "Loaded partial details",
      detail: "Showing basic appointment data while full details load failed.",
      life: 3500,
    });
  } finally {
    if (requestSeq === detailsRequestSeq.value) {
      detailsLoadingId.value = null;
    }
  }
};

const openAddDialog = () => {
  saveError.value = null;
  editingAppointment.value = null;
  isDialogOpen.value = true;
};

const canEditAppointment = (appointment: Appointment | null | undefined) =>
  Boolean(appointment?.id) && !isFinalStatus(appointment?.status);

const openEditDialog = (appointment: Appointment) => {
  if (!canEditAppointment(appointment)) {
    toast.add({
      severity: "warn",
      summary: "Editing not allowed",
      detail: "Appointments in final status cannot be edited.",
      life: 4000,
    });
    return;
  }

  const fallback = appointment;
  isDetailsOpen.value = false;
  isDialogOpen.value = true;
  isEditLoading.value = true;
  saveError.value = null;
  editingAppointment.value = null;
  fetchAppointmentDetails(appointment.id)
    .then((details) => {
      const mergedAppointment = mergeAppointmentDetails(
        details as Partial<Appointment>,
        fallback,
      );
      if (!canEditAppointment(mergedAppointment)) {
        toast.add({
          severity: "warn",
          summary: "Editing not allowed",
          detail: "Appointments in final status cannot be edited.",
          life: 4000,
        });
        isDialogOpen.value = false;
        editingAppointment.value = null;
        return;
      }
      editingAppointment.value = mergedAppointment;
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

const getSaveErrorMessage = (error: unknown) => {
  const responseMessage = (
    error as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Failed to save appointment.";
};

const handleSaveAppointment = async (
  payload: CreateAppointmentPayload,
  reason = "",
) => {
  if (isSaving.value) return;
  isSaving.value = true;
  saveError.value = null;
  const appointmentId = editingAppointment.value?.id ?? null;
  try {
    if (appointmentId) {
      const updatePayload: UpdateAppointmentPayload = { ...payload };
      delete (updatePayload as { address_id?: string }).address_id;
      const trimmedReason = reason.trim();
      if (trimmedReason) {
        updatePayload.reason = trimmedReason;
      }
      await updateAppointment(appointmentId, updatePayload);
    } else {
      await createAppointment(payload);
    }
    isDialogOpen.value = false;
    editingAppointment.value = null;
    refreshAppointments();
  } catch (error) {
    saveError.value = getSaveErrorMessage(error);
  } finally {
    isSaving.value = false;
  }
};

watch([apiStart, apiEnd], () => {
  page.value = 1;
});

watch(activeTab, (value) => {
  if (value === "calendar") {
    dateFilterSource.value = null;
  }
});

watch(
  [
    employeeFilter,
    patientFilter,
    visitTypeFilter,
    stateFilter,
    statusTagFilter,
  ],
  () => {
    page.value = 1;
  },
);

watch(isDialogOpen, (value) => {
  if (!value) {
    editingAppointment.value = null;
    isEditLoading.value = false;
    isSaving.value = false;
    saveError.value = null;
  }
});

onMounted(() => {
  fetchVisitTypes()
    .then((items) => {
      visitTypes.value = items;
    })
    .catch((error) => {
      console.error("Failed to load visit types.", error);
      visitTypes.value = [];
    });
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
          :start-date="startDate"
          :end-date="endDate"
          @update:start-date="setStartDateFromFilter"
          @update:end-date="setEndDateFromFilter"
          :patient-options="patientOptions"
          :visit-type-options="visitTypeOptions"
          :quick-patient-label="quickPatientLabel"
          :quick-doctor-label="quickDoctorLabel"
          :is-calendar-view="isCalendarView"
        />

        <Tabs v-model:value="activeTab">
          <div class="cc-tabs-wrap d-flex justify-content-between">
            <TabList class="cc-tabs">
              <Tab value="table" :pt="tabLinkPt">Table View</Tab>
              <Tab value="calendar" :pt="calendarTabLinkPt">Calendar View</Tab>
            </TabList>
            <button
              v-if="activeTab === 'table'"
              type="button"
              class="cc-btn cc-btn-sm cc-btn-input excel-btn text-light"
              @click="exportExcel"
            >
              Export Excel
            </button>
          </div>

          <TabPanels :pt="tabPanelsPt">
            <TabPanel value="table">
              <div class="cc-table-card">
                <AppointmentsTable />
              </div>
            </TabPanel>
            <TabPanel value="calendar">
              <AppointmentsCalendar
                :appointments="appointments"
                :is-loading="isLoading"
                :details-loading-id="detailsLoadingId"
                :range-start="apiStart"
                :range-end="apiEnd"
                @range-change="syncCalendarRange"
                @view-details="openDetails"
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
      :is-saving="isSaving"
      :error-message="saveError"
      :patient-options="patientOptionsData"
      :nurse-options="nurseOptions"
      :doctor-options="doctorOptions"
      :social-worker-options="socialWorkerOptions"
      :visit-type-options="visitTypeOptions"
      :visit-types="visitTypes"
      :weekday-options="weekdayOptions"
      @save="handleSaveAppointment"
    />
    <AppointmentDetailsDialog
      v-model="isDetailsOpen"
      :appointment="selectedAppointment"
      :is-loading="isDetailsOpen && detailsLoadingId !== null"
      @edit="openEditDialog"
      @confirm-all="refreshAppointments"
      @confirm-employee="refreshAppointments"
      @no-show="refreshAppointments"
      @cancel="refreshAppointments"
    />
  </div>
</template>
