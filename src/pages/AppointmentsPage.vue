<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
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
import {
  createAppointment,
  fetchAppointmentDetails,
  updateAppointment,
  type CreateAppointmentPayload,
  type UpdateAppointmentPayload,
  type AppointmentStatusOption,
} from "../services/appointments";
import { fetchVisitTypes, type VisitType } from "../services/visitTypes";
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
  type PatientOption,
} from "../data/options";

const isDialogOpen = ref(false);
const isDetailsOpen = ref(false);
const activeTab = ref("table");
const page = ref(1);
const selectedAppointment = ref<Appointment | null>(null);
const editingAppointment = ref<Appointment | null>(null);
const isEditLoading = ref(false);
const isSaving = ref(false);
const saveError = ref<string | null>(null);
const isInlineSaving = ref(false);
const visitTypes = ref<VisitType[]>([]);

const employeeFilter = ref<string | null>(null);
const employeeOptions = Array.from(
  new Set([...doctorOptions, ...nurseOptions]),
);

const patientFilter = ref<PatientOption | null>(null);

const statusTagFilter = ref<AppointmentStatus | null>(null);

// Added options list to avoid missing data errors.
const visitTypeOptions = ["Routine", "Urgent", "Home Visit", "Clinic Visit"];

const visitTypeFilter = ref<string | null>(null);
const stateFilter = ref<AppointmentStatusOption | null>(null);

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
const patientIdFilter = computed(() => patientFilter.value?.id ?? "");

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
  data: appointmentsResponse,
  isLoading,
  statusOptions,
  refetch,
} = useAppointmentsQuery({
  page,
  start: apiStart,
  end: apiEnd,
  status: computed(() => statusTagFilter.value ?? ""),
  employee: computed(() => employeeFilter.value ?? ""),
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
  () => patientOptions.value[0]?.name ?? patientOptionsData[0]?.name ?? "Patient",
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
  const nextStart = parseIsoDate(payload.start);
  const nextEnd = parseIsoDate(payload.end);
  if (!nextStart || !nextEnd) {
    return;
  }
  startDate.value = nextStart;
  endDate.value = nextEnd;
};

const resolveInlineAddress = (appointment: Appointment) => {
  const source = appointment as Appointment & {
    area_id?: string | number | null;
    city?: string | null;
    address?: string | null;
    patient?: {
      area_id?: string | number | null;
      city?: string | null;
      address?: string | null;
      street?: string | null;
    };
  };

  const areaId = source.area_id ?? source.patient?.area_id ?? "";
  const city = source.city ?? source.patient?.city ?? "";
  const address =
    source.address ?? source.patient?.address ?? source.patient?.street ?? "";

  if (!areaId && !city && !address) {
    return null;
  }

  return {
    area_id: String(areaId ?? "").trim(),
    city: String(city ?? "").trim(),
    address: String(address ?? "").trim(),
  };
};

const buildInlineUpdatePayload = (
  appointment: Appointment,
): UpdateAppointmentPayload => {
  const visitTypeId = appointment.visit_type
    ? visitTypeIdLookup.value.get(appointment.visit_type.toLowerCase())
    : undefined;
  const payload: UpdateAppointmentPayload = {
    patient_id: String(appointment.patient?.id ?? ""),
    visit_type_id: visitTypeId,
    date: normalizeAppointmentDate(appointment.date) || appointment.date,
    start_time: appointment.start_time ?? "",
    end_time: appointment.end_time ?? "",
    is_recurring: "0",
  };

  const doctorId = appointment.doctor?.id;
  const nurseId = appointment.nurse?.id;
  const socialWorkerId = appointment.social_worker?.id ?? null;

  if (doctorId) {
    payload.doctor_id = String(doctorId);
  }
  if (nurseId) {
    payload.nurse_id = String(nurseId);
  }
  if (socialWorkerId) {
    payload.social_worker_id = String(socialWorkerId);
  }

  const address = resolveInlineAddress(appointment);
  if (address) {
    payload.new_address = address;
  }

  return payload;
};

const handleInlineUpdate = async (appointment: Appointment): Promise<void> => {
  if (!appointment?.id || isInlineSaving.value) return;
  isInlineSaving.value = true;
  try {
    const payload = buildInlineUpdatePayload(appointment);
    await updateAppointment(appointment.id, payload);
    refreshAppointments();
  } catch (error) {
    console.error("Failed to update appointment.", error);
    refreshAppointments();
  } finally {
    isInlineSaving.value = false;
  }
};

const handleCellEditComplete = (
  event: DataTableCellEditCompleteEvent<Appointment>,
) => {
  void handleInlineUpdate(event.data);
};

const openDetails = (appointment: Appointment) => {
  selectedAppointment.value = appointment;
  isDetailsOpen.value = true;
};

const openLogPage = () => {
  isDetailsOpen.value = false;
  emit("open-log");
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
  saveError.value = null;
  editingAppointment.value = null;
  isDialogOpen.value = true;
};

const openEditDialog = (appointment: Appointment) => {
  const fallback = appointment;
  isDetailsOpen.value = false;
  isDialogOpen.value = true;
  isEditLoading.value = true;
  saveError.value = null;
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

const getSaveErrorMessage = (error: unknown) => {
  const responseMessage =
    (error as { response?: { data?: { message?: unknown } } })?.response?.data
      ?.message;
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Failed to save appointment.";
};

const handleSaveAppointment = async (payload: CreateAppointmentPayload) => {
  if (isSaving.value) return;
  isSaving.value = true;
  saveError.value = null;
  const appointmentId = editingAppointment.value?.id ?? null;
  try {
    if (appointmentId) {
      await updateAppointment(appointmentId, payload);
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
const emit = defineEmits<{
  (
    event: "cell-edit-complete",
    payload: DataTableCellEditCompleteEvent<Appointment>,
  ): void;
  (event: "view-details", payload: Appointment): void;
  (event: "export-excel"): void;
  (event: "open-log"): void;
}>();
</script>

<template>
  <div class="cc-page">
    <div class="cc-container cc-layout">
      <section class="cc-main">
        <div class="cc-toolbar">
          <h2 class="cc-title">Appointments</h2>
          <Button label="Add Appointment" class="cc-btn cc-btn-primary cc-toolbar-action text-light"
            @click="openAddDialog" />
        </div>
        <AppointmentsFilters v-model:employee-filter="employeeFilter" v-model:patient-filter="patientFilter"
          v-model:visit-type-filter="visitTypeFilter" v-model:state-filter="stateFilter"
          v-model:status-tag-filter="statusTagFilter" v-model:start-date="startDate" v-model:end-date="endDate"
          :employee-options="employeeOptions" :patient-options="patientOptions"
          :visit-type-options="visitTypeOptions" :quick-patient-label="quickPatientLabel"
          :quick-doctor-label="quickDoctorLabel" />

        <Tabs v-model:value="activeTab">
          <div class="cc-tabs-wrap d-flex justify-content-between">
            <TabList class="cc-tabs">
              <Tab value="table" :pt="tabLinkPt">Table View</Tab>
              <Tab value="calendar" :pt="tabLinkPt">Calendar View</Tab>
            </TabList>
            <button type="button" class="cc-btn cc-btn-sm cc-btn-input excel-btn text-light"
              @click="emit('export-excel')">
              Export Excel
            </button>
         
          </div>
         
          <TabPanels :pt="tabPanelsPt">
            <TabPanel value="table">
              <div class="cc-table-card">
                <AppointmentsTable :appointments="appointments" :is-loading="isLoading"
                  :status-options="statusOptions" :status-badge-class="statusBadgeClass"
                  @cell-edit-complete="handleCellEditComplete" @view-details="openDetails"
                  @export-excel="exportExcel" />
                <div class="cc-table-footer">
                  <div class="cc-help-text">
                    Page {{ appointmentsResponse?.currentPage ?? 1 }} of
                    {{ totalPages }}
                  </div>
                  <div class="cc-row cc-stack-sm">
                    <button type="button" class="cc-btn cc-btn-outline cc-btn-sm" :disabled="!canGoPrev"
                      @click="goPrev">
                      Prev
                    </button>
                    <button type="button" class="cc-btn cc-btn-outline cc-btn-sm" :disabled="!canGoNext"
                      @click="goNext">
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </TabPanel>
            <TabPanel value="calendar">
              <AppointmentsCalendar :appointments="appointments" :is-loading="isLoading"
                @range-change="syncCalendarRange" @edit="openEditDialog" @confirm-all="refreshAppointments"
                @no-show="refreshAppointments" @cancel="refreshAppointments" />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </section>
    </div>

    <AppointmentDialog v-model="isDialogOpen" :appointment="editingAppointment" :is-loading="isEditLoading"
      :is-saving="isSaving" :error-message="saveError" :patient-options="patientOptionsData"
      :nurse-options="nurseOptions" :doctor-options="doctorOptions" :social-worker-options="socialWorkerOptions"
      :area-options="areaOptions" :visit-type-options="visitTypeOptions" :weekday-options="weekdayOptions"
      @save="handleSaveAppointment" />
    <AppointmentDetailsDialog
      v-model="isDetailsOpen"
      :appointment="selectedAppointment"
      @log="openLogPage"
    />
  </div>
</template>
