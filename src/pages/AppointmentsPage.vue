<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import Button from "primevue/button";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import type { DataTableCellEditCompleteEvent } from "primevue/datatable";
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
import {
  statusBadgeClass,
  useAppointmentsQuery,
} from "../composables/useAppointmentsQuery";
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
const editingAppointment = ref<Appointment | null>(null);
const isEditLoading = ref(false);
const isSaving = ref(false);
const saveError = ref<string | null>(null);
const isInlineSaving = ref(false);
const queryClient = useQueryClient();
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
  data: appointmentsResponse,
  isLoading,
  statusOptions,
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

const resolveInlineAddress = (appointment: Appointment) => {
  const address = String(appointment.patient_address?.address ?? "").trim();
  if (!address) {
    return null;
  }
  const latRaw = appointment.patient_address?.lat;
  const lngRaw = appointment.patient_address?.lng;
  const lat =
    typeof latRaw === "number" ? latRaw : Number(String(latRaw ?? "").trim());
  const lng =
    typeof lngRaw === "number" ? lngRaw : Number(String(lngRaw ?? "").trim());
  const hasLat = Number.isFinite(lat);
  const hasLng = Number.isFinite(lng);

  return {
    address,
    lat: hasLat ? String(lat) : "",
    lng: hasLng ? String(lng) : "",
  };
};

const normalizeStaffPayloadId = (value: number | null | undefined) =>
  typeof value === "number" && value > 0 ? String(value) : "";

const normalizeInlineStaffId = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const resolveInlineStaff = (value: unknown) => {
  if (value && typeof value === "object") {
    const typed = value as {
      id?: number | string | null;
      employee_id?: number | string | null;
      name?: string | null;
      full_name?: string | null;
      text?: string | null;
    };
    const id = normalizeInlineStaffId(typed.id ?? typed.employee_id);
    const name = String(
      typed.name ?? typed.full_name ?? typed.text ?? "",
    ).trim();
    if (id || name) {
      return { id, name };
    }
    return null;
  }
  if (typeof value === "string") {
    return { id: 0, name: value.trim() };
  }
  return null;
};

const buildInlineUpdatePayload = (
  appointment: Appointment,
  reason?: string,
): UpdateAppointmentPayload => {
  const visitTypeId = appointment.visit_type
    ? visitTypeIdLookup.value.get(appointment.visit_type.toLowerCase())
    : "";
  const payload: UpdateAppointmentPayload = {
    patient_id: String(appointment.patient?.id ?? ""),
    visit_type_id: visitTypeId || "",
    date: normalizeAppointmentDate(appointment.date) || appointment.date,
    start_time: appointment.start_time ?? "",
    end_time: appointment.end_time ?? "",
    is_recurring: "0",
    status: appointment.status ?? "",
    doctor_id: normalizeStaffPayloadId(appointment.doctor?.id),
    nurse_id: normalizeStaffPayloadId(appointment.nurse?.id),
    social_worker_id: normalizeStaffPayloadId(appointment.social_worker?.id),
  };

  const normalizedReason = String(reason ?? "").trim();
  if (normalizedReason) {
    payload.reason = normalizedReason;
  }

  const address = resolveInlineAddress(appointment);
  if (address) {
    payload.new_address = address;
  }

  return payload;
};

const applyInlineEditChange = (
  appointment: Appointment,
  field: string,
  value: unknown,
): Appointment => {
  const updated: Appointment = { ...appointment };

  switch (field) {
    case "patient.name": {
      if (value && typeof value === "object") {
        const typed = value as {
          id?: string | number | null;
          name?: string | null;
          date_of_birth?: string | null;
          phone?: string | null;
        };
        const id = String(typed.id ?? "").trim();
        const name = String(typed.name ?? "").trim();
        updated.patient = {
          ...updated.patient,
          id,
          name: name || updated.patient?.name || "",
          date_of_birth:
            String(typed.date_of_birth ?? "").trim() ||
            updated.patient?.date_of_birth ||
            "",
          phone:
            String(typed.phone ?? "").trim() || updated.patient?.phone || "",
        };
        return updated;
      }
      updated.patient = {
        ...updated.patient,
        id: "",
        name: String(value ?? "").trim(),
        date_of_birth: updated.patient?.date_of_birth ?? "",
        phone: updated.patient?.phone ?? "",
      };
      return updated;
    }
    case "nurse.name": {
      const staff = resolveInlineStaff(value);
      if (!staff) return updated;
      updated.nurse = {
        ...updated.nurse,
        id: staff.id,
        name: staff.name || updated.nurse?.name || "",
      };
      return updated;
    }
    case "doctor.name": {
      const staff = resolveInlineStaff(value);
      if (!staff) return updated;
      updated.doctor = {
        ...updated.doctor,
        id: staff.id,
        name: staff.name || updated.doctor?.name || "",
      };
      return updated;
    }
    case "social_worker.name": {
      const staff = resolveInlineStaff(value);
      if (!staff) return updated;
      const existing = updated.social_worker ?? { id: 0, name: "" };
      updated.social_worker = {
        ...existing,
        id: staff.id,
        name: staff.name || existing.name,
      };
      return updated;
    }
    case "status":
      updated.status = String(value ?? "");
      return updated;
    case "date":
      updated.date = String(value ?? "");
      return updated;
    case "start_time":
      updated.start_time = String(value ?? "");
      return updated;
    case "end_time":
      updated.end_time = String(value ?? "");
      return updated;
    case "visit_type":
      updated.visit_type = String(value ?? "");
      return updated;
    default:
      return updated;
  }
};

const applyOptimisticUpdate = (updated: Appointment) => {
  queryClient.setQueriesData({ queryKey: ["appointments"] }, (oldData) => {
    if (!oldData || typeof oldData !== "object") return oldData;
    const typed = oldData as { data?: Appointment[] };
    if (!Array.isArray(typed.data)) return oldData;
    const next = typed.data.map((item) =>
      item.id === updated.id
        ? {
            ...item,
            ...updated,
            patient: updated.patient ?? item.patient,
            doctor: updated.doctor ?? item.doctor,
            nurse: updated.nurse ?? item.nurse,
            social_worker: updated.social_worker ?? item.social_worker,
          }
        : item,
    );
    return { ...typed, data: next };
  });
};

const restoreOptimisticSnapshot = (snapshot: Array<[unknown, unknown]>) => {
  snapshot.forEach(([key, data]) => {
    queryClient.setQueryData(key as any, data);
  });
};

const handleInlineUpdate = async (
  appointment: Appointment,
  reason = "",
): Promise<void> => {
  if (!appointment?.id || isInlineSaving.value) return;
  isInlineSaving.value = true;
  const snapshot = queryClient.getQueriesData({ queryKey: ["appointments"] });
  applyOptimisticUpdate(appointment);
  try {
    const payload = buildInlineUpdatePayload(appointment, reason);
    await updateAppointment(appointment.id, payload);
    toast.add({
      severity: "success",
      summary: "Appointment updated",
      detail: "Changes saved successfully.",
      life: 3000,
    });
    refreshAppointments();
  } catch (error) {
    console.error("Failed to update appointment.", error);
    restoreOptimisticSnapshot(snapshot);
    toast.add({
      severity: "error",
      summary: "Update failed",
      detail: "Could not save changes. Please try again.",
      life: 4000,
    });
    refreshAppointments();
  } finally {
    isInlineSaving.value = false;
  }
};

const handleCellEditComplete = (
  event: DataTableCellEditCompleteEvent<Appointment>,
) => {
  const eventReason = String(
    (
      event as DataTableCellEditCompleteEvent<Appointment> & {
        reason?: string;
      }
    ).reason ?? "",
  ).trim();
  const base = event.newData ?? event.data;
  const updated = applyInlineEditChange(base, event.field, event.newValue);
  void handleInlineUpdate(updated, eventReason);
};

const openDetails = async (appointment: Appointment) => {
  const fallback = appointment;
  isDetailsOpen.value = false;
  selectedAppointment.value = null;
  detailsLoadingId.value = fallback.id;

  try {
    const details = await fetchAppointmentDetails(fallback.id);
    selectedAppointment.value = mergeAppointmentDetails(
      details as Partial<Appointment>,
      fallback,
    );
    isDetailsOpen.value = true;
  } catch (error) {
    console.error("Failed to load appointment details.", error);
  } finally {
    detailsLoadingId.value = null;
  }
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
                <AppointmentsTable
                  :appointments="appointments"
                  :is-loading="isLoading"
                  :details-loading-id="detailsLoadingId"
                  :status-options="statusOptions"
                  :status-badge-class="statusBadgeClass"
                  :visit-type-options="visitTypeOptions"
                  @cell-edit-complete="handleCellEditComplete"
                  @view-details="openDetails"
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
                :appointments="appointments"
                :is-loading="isLoading"
                :range-start="apiStart"
                :range-end="apiEnd"
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
      :is-saving="isSaving"
      :error-message="saveError"
      :patient-options="patientOptionsData"
      :nurse-options="nurseOptions"
      :doctor-options="doctorOptions"
      :social-worker-options="socialWorkerOptions"
      :visit-type-options="visitTypeOptions"
      :weekday-options="weekdayOptions"
      @save="handleSaveAppointment"
    />
    <AppointmentDetailsDialog
      v-model="isDetailsOpen"
      :appointment="selectedAppointment"
      @edit="openEditDialog"
      @confirm-all="refreshAppointments"
      @confirm-employee="refreshAppointments"
      @no-show="refreshAppointments"
      @cancel="refreshAppointments"
    />
  </div>
</template>
