<script setup lang="ts">
import { computed, ref, toRefs, watch } from "vue";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import { Eye } from "lucide-vue-next";
import type {
  DataTableCellEditCancelEvent,
  DataTableCellEditCompleteEvent,
  DataTableCellEditInitEvent,
} from "primevue/datatable";
import AppointmentEditReasonDialog from "./AppointmentEditReasonDialog.vue";
import AppAsyncAutocomplete from "./shared/AppAsyncAutocomplete.vue";
import type { Appointment } from "../types";
import type { AppointmentStatus } from "../data/options";
import type { AppointmentStatusOption } from "../services/appointments";
import { autoCompletePt, dataTablePt } from "../ui/primevuePt";
import { fetchPatientAutocomplete } from "../services/patients";
import { fetchEmployeeOptionsByTitle } from "../services/employees";

const reasonDialogVisible = ref(false);
const reasonText = ref("");

type PendingSave = {
  data: Appointment;
  field: string;
  key: string;
  saveCb: (e: Event) => void;
  cancelCb: (e: Event) => void;
  originalEvent: Event;
  completedEvent?: DataTableCellEditCompleteEvent<Appointment>;
  wasCanceled?: boolean;
};

const pendingSave = ref<PendingSave | null>(null);
const editReasons = new Map<string, string>();

const openReasonBeforeSave = (
  data: Appointment,
  field: string,
  e: Event,
  saveCb: (e: Event) => void,
  cancelCb: (e: Event) => void,
) => {
  const key = snapshotKey(data, field);
  pendingSave.value = { data, field, key, saveCb, cancelCb, originalEvent: e };
  reasonText.value = "";
  reasonDialogVisible.value = true;
};

const confirmReasonAndSave = () => {
  if (!pendingSave.value) return;

  const reason = reasonText.value.trim();
  if (!reason) return;

  const pending = pendingSave.value;
  const { key, saveCb, originalEvent } = pending;
  editReasons.set(key, reason);
  explicitSaveKeys.add(key);

  reasonDialogVisible.value = false;
  reasonText.value = "";
  pendingSave.value = null;

  if (pending.completedEvent) {
    handleCellEditComplete(pending.completedEvent);
    return;
  }

  if (pending.wasCanceled) {
    const previousValue = editSnapshots.get(key);
    const draftValue = editDrafts.get(key);
    const currentValue =
      draftValue !== undefined
        ? draftValue
        : getFieldValue(pending.data, pending.field);
    const syntheticEvent = {
      originalEvent,
      data: pending.data,
      newData: pending.data,
      value: previousValue,
      newValue: currentValue,
      field: pending.field,
      index: -1,
    } as DataTableCellEditCompleteEvent<Appointment>;
    handleCellEditComplete(syntheticEvent);
    return;
  }

  saveCb(originalEvent);
};

const cancelReasonModal = () => {
  const pending = pendingSave.value;
  if (pending) {
    const previousValue = editSnapshots.get(pending.key);
    if (previousValue !== undefined) {
      applyFieldValue(pending.data, pending.field, previousValue);
    }
    editSnapshots.delete(pending.key);
    editDrafts.delete(pending.key);
    explicitSaveKeys.delete(pending.key);
    editReasons.delete(pending.key);
    pending.cancelCb(pending.originalEvent);
  }
  reasonDialogVisible.value = false;
  pendingSave.value = null;
  reasonText.value = "";
};

type StaffMember = Appointment["doctor"];
type Patient = Appointment["patient"];
type StatusOptionInput = AppointmentStatus | AppointmentStatusOption;
type NormalizedStatusOption = {
  key: string;
  label: string;
  level: number;
  isFinal: boolean;
};
type StatusOptionForRow = NormalizedStatusOption & { disabled?: boolean };

const ensurePatient = (value: Patient | null | undefined): Patient =>
  value ?? { id: "", name: "", date_of_birth: "", phone: "" };

const ensureStaffMember = (
  value: StaffMember | null | undefined,
): StaffMember => value ?? { id: 0, name: "" };

const isPatientLike = (
  value: unknown,
): value is {
  id?: unknown;
  name?: unknown;
  date_of_birth?: unknown;
} => typeof value === "object" && value !== null && "name" in value;

const isStaffLike = (
  value: unknown,
): value is {
  id?: unknown;
  name?: unknown;
} => typeof value === "object" && value !== null && "name" in value;

const hasStaffName = (value: StaffMember | null | undefined) =>
  Boolean(
    value &&
    typeof value.name === "string" &&
    value.name.trim(),
  );
const displayStaffName = (value: StaffMember | null | undefined) =>
  value?.name?.trim() || "-";

const getStaffForField = (data: Appointment, field: string) => {
  switch (field) {
    case "nurse.name":
      return data.nurse ?? null;
    case "doctor.name":
      return data.doctor ?? null;
    case "social_worker.name":
      return data.social_worker ?? null;
    default:
      return null;
  }
};

const isStaffEditBlocked = (data: Appointment, field: string) =>
  ["nurse.name", "doctor.name", "social_worker.name"].includes(field) &&
  !hasStaffName(getStaffForField(data, field));

const blockEditIfMissing = (
  event: Event,
  value: StaffMember | null | undefined,
) => {
  if (!hasStaffName(value)) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
};
const blockEditIfFinalStatus = (event: Event, status: unknown) => {
  if (isFinalStatus(status)) {
    event.preventDefault();
    event.stopPropagation();
  }
};

const normalizePatientId = (value: unknown): string | number => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
};

const normalizeStaffId = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const snapshotKey = (data: Appointment, field: string) => `${data.id}:${field}`;
const editDrafts = new Map<string, unknown>();
const editSnapshots = new Map<string, unknown>();
const explicitSaveKeys = new Set<string>();

const closeCellEditor = () => {
  if (typeof document === "undefined") return;
  document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
};

const cloneSnapshotValue = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "object") {
    return { ...(value as Record<string, unknown>) };
  }
  return value;
};

const getFieldValue = (data: Appointment, field: string) => {
  switch (field) {
    case "patient.name":
      return data.patient ?? null;
    case "nurse.name":
      return data.nurse ?? null;
    case "doctor.name":
      return data.doctor ?? null;
    case "social_worker.name":
      return data.social_worker ?? null;
    default:
      return (data as Record<string, unknown>)[field];
  }
};

const applyFieldValue = (
  data: Appointment,
  field: string,
  value: unknown,
) => {
  switch (field) {
    case "patient.name":
      if (isPatientLike(value)) {
        const name = typeof value.name === "string" ? value.name : "";
        const dateOfBirth =
          typeof value.date_of_birth === "string"
            ? value.date_of_birth
            : (data.patient?.date_of_birth ?? "");
        const phone =
          typeof (value as { phone?: unknown }).phone === "string"
            ? ((value as { phone?: string }).phone ?? "")
            : (data.patient?.phone ?? "");
        data.patient = {
          id: normalizePatientId(value.id),
          name,
          date_of_birth: dateOfBirth,
          phone,
        };
        return;
      }
      data.patient = ensurePatient(data.patient);
      data.patient.name =
        typeof value === "string" ? value : String(value ?? "");
      data.patient.id = "";
      data.patient.date_of_birth = "";
      data.patient.phone = "";
      return;
    case "nurse.name":
      data.nurse = ensureStaffMember(data.nurse);
      if (isStaffLike(value)) {
        data.nurse.name =
          typeof value.name === "string" ? value.name : data.nurse.name;
        data.nurse.id = normalizeStaffId(value.id);
        return;
      }
      data.nurse.name = typeof value === "string" ? value : String(value ?? "");
      data.nurse.id = 0;
      return;
    case "doctor.name":
      data.doctor = ensureStaffMember(data.doctor);
      if (isStaffLike(value)) {
        data.doctor.name =
          typeof value.name === "string" ? value.name : data.doctor.name;
        data.doctor.id = normalizeStaffId(value.id);
        return;
      }
      data.doctor.name =
        typeof value === "string" ? value : String(value ?? "");
      data.doctor.id = 0;
      return;
    case "social_worker.name":
      data.social_worker = ensureStaffMember(data.social_worker ?? null);
      if (isStaffLike(value)) {
        data.social_worker.name =
          typeof value.name === "string"
            ? value.name
            : data.social_worker.name;
        data.social_worker.id = normalizeStaffId(value.id);
        return;
      }
      data.social_worker.name =
        typeof value === "string" ? value : String(value ?? "");
      data.social_worker.id = 0;
      return;
    default:
      (data as Record<string, unknown>)[field] = value;
  }
};

const isOptionValue = (value: unknown) =>
  typeof value === "object" && value !== null && "name" in value;

const shouldIgnoreStringDraft = (
  field: string,
  value: unknown,
  data: Appointment,
) => {
  if (typeof value !== "string") return false;
  if (!value.trim()) return false;
  if (
    !["patient.name", "nurse.name", "doctor.name", "social_worker.name"].includes(
      field,
    )
  ) {
    return false;
  }
  const draft = editDrafts.get(snapshotKey(data, field));
  return isOptionValue(draft);
};

const setFieldValue = (data: Appointment, field: string, value: unknown) => {
  if (shouldIgnoreStringDraft(field, value, data)) {
    return;
  }
  editDrafts.set(snapshotKey(data, field), value);
  applyFieldValue(data, field, value);
};

const props = withDefaults(
  defineProps<{
    appointments: ReadonlyArray<Appointment>;
    isLoading: boolean;
    detailsLoadingId?: number | null;
    statusOptions: ReadonlyArray<AppointmentStatus | AppointmentStatusOption>;
    statusBadgeClass: (status: AppointmentStatus) => string;
    visitTypeOptions?: ReadonlyArray<string>;
  }>(),
  {
    visitTypeOptions: () => [],
  },
);
const { isLoading, detailsLoadingId } = toRefs(props);

const cloneAppointment = (appointment: Appointment): Appointment => ({
  ...appointment,
  patient: { ...ensurePatient(appointment.patient) },
  nurse: { ...ensureStaffMember(appointment.nurse) },
  doctor: { ...ensureStaffMember(appointment.doctor) },
  social_worker: appointment.social_worker
    ? { ...appointment.social_worker }
    : appointment.social_worker ?? null,
  patient_address: appointment.patient_address
    ? { ...appointment.patient_address }
    : appointment.patient_address,
});

const editableAppointments = ref<Appointment[]>([]);

watch(
  () => props.appointments,
  (items) => {
    editableAppointments.value = items.map(cloneAppointment);
  },
  { immediate: true, deep: true },
);

const loadingRows = computed(() =>
  Array.from({ length: 7 }, (_, index) => ({
    id: -(index + 1),
    patient: {
      id: 0,
      name: "",
      date_of_birth: "",
    },
    start_time: "",
    end_time: "",
    status: "",
    date: "",
    nurse: {
      id: 0,
      name: "",
    },
    doctor: {
      id: 0,
      name: "",
    },
    visit_type: "",
    social_worker: {
      id: 0,
      name: "",
    },
  })),
);
const displayAppointments = computed(() =>
  isLoading.value ? loadingRows.value : editableAppointments.value,
);
const staffCellBodyStyle = { padding: "0" } as const;
const editMode = computed(() => (isLoading.value ? undefined : "cell"));

const fetchPatientSuggestions = (query: string, signal: AbortSignal) =>
  fetchPatientAutocomplete(query, signal);

const fetchNurseSuggestions = (query: string, signal: AbortSignal) =>
  fetchEmployeeOptionsByTitle("nurse", query.trim().toLowerCase(), signal);

const fetchDoctorSuggestions = (query: string, signal: AbortSignal) =>
  fetchEmployeeOptionsByTitle("doctor", query.trim().toLowerCase(), signal);

const fetchSocialWorkerSuggestions = (query: string, signal: AbortSignal) =>
  fetchEmployeeOptionsByTitle(
    "social_worker",
    query.trim().toLowerCase(),
    signal,
  );

const isAutoCompleteEvent = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null;
  return Boolean(target?.closest?.(".p-autocomplete"));
};

const handleEditorKeydown = (
  event: KeyboardEvent,
  _requestSave: (event: Event) => void,
  _cancel: (event: Event) => void,
) => {
  if (event.key === "Enter") {
    if (isAutoCompleteEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
  }
};


const formatTime = (value: string | null | undefined) => {
  if (!value) return "-";
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return trimmed;
  const hours = (match[1] ?? "").padStart(2, "0");
  const minutes = match[2] ?? "";
  if (!hours || !minutes) return trimmed;
  return `${hours}:${minutes}`;
};

const getTodayIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeDateInput = (value: string | null | undefined) => {
  if (!value) return getTodayIsoDate();
  const trimmed = value.trim();
  if (!trimmed) return getTodayIsoDate();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (match) {
    const month = match[1]?.padStart(2, "0") ?? "";
    const day = match[2]?.padStart(2, "0") ?? "";
    const year = match[3] ?? "";
    return year && month && day ? `${year}-${month}-${day}` : "";
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return getTodayIsoDate();
};

const normalizeStatusKey = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const statusLevelLookup: Record<string, number> = {
  new: 1,
  waiting: 1,
  confirmed: 2,
  patient_confirmed: 2,
  rescheduled: 2,
  canceled: 3,
  cancelled: 3,
  completed: 3,
  no_show: 3,
};

const fallbackStatusMeta = (value: unknown) => {
  const normalized = normalizeStatusKey(value);
  const level = statusLevelLookup[normalized] ?? 1;
  return { level, isFinal: level >= 3 };
};

const baseStatusOptions = computed<NormalizedStatusOption[]>(() => {
  const options: NormalizedStatusOption[] = [];
  for (const option of props.statusOptions as ReadonlyArray<StatusOptionInput>) {
    if (typeof option === "string") {
      const key = option.trim();
      if (!key) continue;
      const meta = fallbackStatusMeta(key);
      options.push({
        key,
        label: option,
        level: meta.level,
        isFinal: meta.isFinal,
      });
      continue;
    }

    const key = String(option.key ?? option.value ?? "").trim();
    if (!key) continue;
    const label = String(option.value ?? option.key ?? key);
    const meta = fallbackStatusMeta(key);
    const level =
      typeof option.level === "number" && Number.isFinite(option.level)
        ? option.level
        : meta.level;
    const isFinal =
      typeof option.is_final === "boolean" ? option.is_final : meta.isFinal;
    options.push({
      key,
      label,
      level,
      isFinal,
    });
  }

  return options;
});

const statusOptionsMap = computed(() => {
  const map = new Map<string, NormalizedStatusOption>();
  for (const option of baseStatusOptions.value) {
    map.set(normalizeStatusKey(option.key), option);
  }
  return map;
});

const getStatusOption = (value: unknown) =>
  statusOptionsMap.value.get(normalizeStatusKey(value)) ?? null;

const buildFallbackStatusOption = (
  value: unknown,
): NormalizedStatusOption | null => {
  const key = String(value ?? "").trim();
  if (!key) return null;
  const meta = fallbackStatusMeta(key);
  return {
    key,
    label: key,
    level: meta.level,
    isFinal: meta.isFinal,
  };
};

const getStatusLevel = (value: unknown) =>
  getStatusOption(value)?.level ?? fallbackStatusMeta(value).level;

const isFinalStatus = (value: unknown) => {
  const option = getStatusOption(value);
  if (option) {
    return option.isFinal || option.level >= 3;
  }
  return fallbackStatusMeta(value).isFinal;
};

const getStatusOptionsForRow = (
  currentValue: unknown,
): StatusOptionForRow[] => {
  const currentOption =
    getStatusOption(currentValue) ?? buildFallbackStatusOption(currentValue);

  if (isFinalStatus(currentValue)) {
    return currentOption ? [{ ...currentOption, disabled: true }] : [];
  }

  const currentLevel = getStatusLevel(currentValue);
  const candidates =
    currentLevel >= 2
      ? baseStatusOptions.value.filter(
        (option) => option.isFinal || option.level >= 3,
      )
      : baseStatusOptions.value;

  if (!currentOption) {
    return candidates;
  }

  const hasCurrent = candidates.some(
    (option) =>
      normalizeStatusKey(option.key) === normalizeStatusKey(currentOption.key),
  );

  if (hasCurrent) {
    return candidates;
  }

  return [{ ...currentOption, disabled: true }, ...candidates];
};

const isStatusTransitionAllowed = (from: unknown, to: unknown) => {
  const fromKey = normalizeStatusKey(from);
  const toKey = normalizeStatusKey(to);
  if (!fromKey || fromKey === toKey) return true;
  if (isFinalStatus(from)) return false;
  const fromLevel = getStatusLevel(from);
  if (fromLevel >= 2) {
    return isFinalStatus(to);
  }
  return true;
};

const getSnapshotValue = (data: Appointment, field: string) =>
  editSnapshots.get(snapshotKey(data, field));
const isStatusLocked = (data: Appointment) => {
  const snapshot = getSnapshotValue(data, "status");
  return isFinalStatus(snapshot ?? data.status);
};

const handleCellEditInit = (event: DataTableCellEditInitEvent<Appointment>) => {
  if (event.field === "status" && isStatusLocked(event.data)) {
    const originalEvent = event.originalEvent as Event | undefined;
    originalEvent?.preventDefault?.();
    originalEvent?.stopPropagation?.();
    setTimeout(closeCellEditor, 0);
    return;
  }

  if (isStaffEditBlocked(event.data, event.field)) {
    const originalEvent = event.originalEvent as Event | undefined;
    originalEvent?.preventDefault?.();
    originalEvent?.stopPropagation?.();
    setTimeout(closeCellEditor, 0);
    return;
  }

  const key = snapshotKey(event.data, event.field);
  explicitSaveKeys.delete(key);
  if (editSnapshots.has(key)) {
    return;
  }

  editSnapshots.set(key, cloneSnapshotValue(getFieldValue(event.data, event.field)));
};

const handleCellEditCancel = (event: DataTableCellEditCancelEvent) => {
  const data = event.data as Appointment;
  const key = snapshotKey(data, event.field);
  if (
    pendingSave.value &&
    reasonDialogVisible.value &&
    pendingSave.value.key === key
  ) {
    pendingSave.value.wasCanceled = true;
    return;
  }
  if (!editSnapshots.has(key)) {
    return;
  }

  applyFieldValue(data, event.field, editSnapshots.get(key));
  editSnapshots.delete(key);
  editDrafts.delete(key);
  explicitSaveKeys.delete(key);
  editReasons.delete(key);
};

const handleCellEditComplete = (
  event: DataTableCellEditCompleteEvent<Appointment>,
) => {
  const key = snapshotKey(event.data, event.field);
  if (
    pendingSave.value &&
    reasonDialogVisible.value &&
    pendingSave.value.key === key
  ) {
    pendingSave.value.completedEvent = event;
    return;
  }
  const previousValue = editSnapshots.get(key);
  if (isStaffEditBlocked(event.data, event.field)) {
    if (previousValue !== undefined) {
      applyFieldValue(event.data, event.field, previousValue);
    }
    editSnapshots.delete(key);
    editDrafts.delete(key);
    explicitSaveKeys.delete(key);
    editReasons.delete(key);
    return;
  }

  const isExplicitSave = explicitSaveKeys.has(key);
  if (!isExplicitSave) {
    if (previousValue !== undefined) {
      applyFieldValue(event.data, event.field, previousValue);
    }
    editSnapshots.delete(key);
    editDrafts.delete(key);
    explicitSaveKeys.delete(key);
    editReasons.delete(key);
    return;
  }

  if (event.field === "status" && previousValue !== undefined) {
    if (!isStatusTransitionAllowed(previousValue, event.data.status)) {
      applyFieldValue(event.data, event.field, previousValue);
      editSnapshots.delete(key);
      editDrafts.delete(key);
      explicitSaveKeys.delete(key);
      editReasons.delete(key);
      return;
    }
  }

  const draftValue = editDrafts.get(key);
  if (draftValue !== undefined) {
    applyFieldValue(event.data, event.field, draftValue);
    event.newValue = draftValue;
    editDrafts.delete(key);
  }

  // Ensure consumers see the same mutated row for nested edits.
  (event as DataTableCellEditCompleteEvent<Appointment>).newData = event.data;

  editSnapshots.delete(key);
  explicitSaveKeys.delete(key);
  const reasonKey = snapshotKey(event.data, event.field);
  const reason = editReasons.get(reasonKey) ?? "";
  editReasons.delete(reasonKey);
  // Pass reason to parent alongside the cell edit payload.
  (event as any).reason = reason;

  emit("cell-edit-complete", event);
};
const emit = defineEmits<{
  (
    event: "cell-edit-complete",
    payload: DataTableCellEditCompleteEvent<Appointment>,
  ): void;
  (event: "view-details", payload: Appointment): void;
}>();
</script>
<template>
  <div class="cc-card">
    <DataTable :value="displayAppointments" dataKey="id" :editMode="editMode" @cell-edit-init="handleCellEditInit"
      @cell-edit-cancel="handleCellEditCancel" @cell-edit-complete="handleCellEditComplete" :pt="dataTablePt">
      <template #empty>
        <div v-if="!isLoading" class="cc-empty">No appointments yet.</div>
      </template>

      <!-- Date -->
      <Column field="date" header="Date">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-md"></span>
          <span v-else>{{ data.date ?? "-" }}</span>
        </template>

        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields">
                <input :value="normalizeDateInput(data.date)" type="date" class="cc-input cc-input-sm"
                  @input="data.date = ($event.target as HTMLInputElement).value" @keydown="
                    handleEditorKeydown(
                      $event,
                      (e) =>
                        openReasonBeforeSave(
                          data,
                          'date',
                          e,
                          editorSaveCallback,
                          editorCancelCallback
                        ),
                      editorCancelCallback
                    )
                    " />
              </div>

              <div class="cc-cell-edit-actions">
                <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm" @click.stop="
                  openReasonBeforeSave(
                    data,
                    'date',
                    $event,
                    editorSaveCallback,
                    editorCancelCallback
                  )
                  ">
                  Save
                </button>
                <button type="button" class="cc-btn cc-btn-outline cc-btn-sm"
                  @click.stop="editorCancelCallback($event)">
                  Cancel
                </button>
              </div>
            </div>
          </Transition>
        </template>
      </Column>

      <!-- Patient -->
      <Column field="patient.name" header="Patient">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-lg"></span>
          <span v-else>{{ data.patient?.name ?? "-" }}</span>
        </template>

        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields">
                <AppAsyncAutocomplete :modelValue="data.patient ?? null" optionLabel="name" appendTo="self"
                  panelClass="cc-autocomplete-panel" inputClass="cc-input cc-input-sm" :pt="autoCompletePt"
                  placeholder="Search patient" :fetcher="fetchPatientSuggestions"
                  @update:modelValue="setFieldValue(data, 'patient.name', $event)"
                  @option-select="setFieldValue(data, 'patient.name', $event.value)"
                  @error="(error) => console.error('Failed to load patient suggestions.', error)"
                  @keydown="
                    handleEditorKeydown(
                      $event,
                      (e) =>
                        openReasonBeforeSave(
                          data,
                          'patient.name',
                          e,
                          editorSaveCallback,
                          editorCancelCallback
                        ),
                      editorCancelCallback
                    )
                    " @keydown.down.stop @keydown.up.stop />
              </div>

              <div class="cc-cell-edit-actions">
                <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm" @click.stop="
                  openReasonBeforeSave(
                    data,
                    'patient.name',
                    $event,
                    editorSaveCallback,
                    editorCancelCallback
                  )
                  ">
                  Save
                </button>
                <button type="button" class="cc-btn cc-btn-outline cc-btn-sm"
                  @click.stop="editorCancelCallback($event)">
                  Cancel
                </button>
              </div>
            </div>
          </Transition>
        </template>
      </Column>

      <!-- Time -->
      <Column header="Time">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-sm"></span>
          <span v-else class="cc-text-nowrap">
            {{ formatTime(data.start_time) }} - {{ formatTime(data.end_time) }}
          </span>
        </template>

        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields cc-cell-edit-fields-row">
                <input v-model="data.start_time" type="time" class="cc-input cc-input-sm" @keydown="
                  handleEditorKeydown(
                    $event,
                    (e) =>
                      openReasonBeforeSave(
                        data,
                        'start_time',
                        e,
                        editorSaveCallback,
                        editorCancelCallback
                      ),
                    editorCancelCallback
                  )
                  " />
                <input v-model="data.end_time" type="time" class="cc-input cc-input-sm" @keydown="
                  handleEditorKeydown(
                    $event,
                    (e) =>
                      openReasonBeforeSave(
                        data,
                        'end_time',
                        e,
                        editorSaveCallback,
                        editorCancelCallback
                      ),
                    editorCancelCallback
                  )
                  " />
              </div>

              <div class="cc-cell-edit-actions">
                <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm" @click.stop="
                  openReasonBeforeSave(
                    data,
                    'time',
                    $event,
                    editorSaveCallback,
                    editorCancelCallback
                  )
                  ">
                  Save
                </button>
                <button type="button" class="cc-btn cc-btn-outline cc-btn-sm"
                  @click.stop="editorCancelCallback($event)">
                  Cancel
                </button>
              </div>
            </div>
          </Transition>
        </template>
      </Column>

      <!-- Status -->
      <Column field="status" header="Status">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-pill"></span>
          <span v-else class="cc-badge" :class="statusBadgeClass(data.status as AppointmentStatus)"
            @click="blockEditIfFinalStatus($event, data.status)">
            {{ data.status ?? "-" }}
          </span>
        </template>

        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields">
                <select v-model="data.status" class="cc-select cc-select-sm" :disabled="isStatusLocked(data)" @keydown="
                  handleEditorKeydown(
                    $event,
                    (e) =>
                      openReasonBeforeSave(
                        data,
                        'status',
                        e,
                        editorSaveCallback,
                        editorCancelCallback
                      ),
                    editorCancelCallback
                  )
                  ">
                  <option v-for="status in getStatusOptionsForRow(data.status)" :key="status.key" :value="status.key"
                    :disabled="status.disabled">
                    {{ status.label }}
                  </option>
                </select>
              </div>

              <div class="cc-cell-edit-actions">
                <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm" :disabled="isStatusLocked(data)"
                  @click.stop="
                    openReasonBeforeSave(
                      data,
                      'status',
                      $event,
                      editorSaveCallback,
                      editorCancelCallback
                    )
                    ">
                  Save
                </button>
                <button type="button" class="cc-btn cc-btn-outline cc-btn-sm"
                  @click.stop="editorCancelCallback($event)">
                  Cancel
                </button>
              </div>
            </div>
          </Transition>
        </template>
      </Column>

      <!-- Nurse -->
      <Column field="nurse.name" header="Nurse" :bodyStyle="staffCellBodyStyle">
        <template #body="{ data }">
          <div class="cc-cell-block" @mousedown="blockEditIfMissing($event, data.nurse)"
            @click="blockEditIfMissing($event, data.nurse)">
            <span v-if="isLoading" class="cc-skeleton cc-skeleton-md"></span>
            <span v-else>{{ displayStaffName(data.nurse) }}</span>
          </div>
        </template>

        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit cc-staff-edit">
              <div class="cc-cell-edit-fields">
                <AppAsyncAutocomplete :modelValue="data.nurse ?? null" optionLabel="name" appendTo="self"
                  panelClass="cc-autocomplete-panel" inputClass="cc-input cc-input-sm" :pt="autoCompletePt"
                  placeholder="Search nurse" :fetcher="fetchNurseSuggestions"
                  @update:modelValue="setFieldValue(data, 'nurse.name', $event)"
                  @option-select="setFieldValue(data, 'nurse.name', $event.value)"
                  @error="(error) => console.error('Failed to load nurses.', error)" @keydown="
                    handleEditorKeydown(
                      $event,
                      (e) =>
                        openReasonBeforeSave(
                          data,
                          'nurse.name',
                          e,
                          editorSaveCallback,
                          editorCancelCallback
                        ),
                      editorCancelCallback
                    )
                    " @keydown.down.stop @keydown.up.stop />
              </div>

              <div class="cc-cell-edit-actions">
                <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm" @click.stop="
                  openReasonBeforeSave(
                    data,
                    'nurse.name',
                    $event,
                    editorSaveCallback,
                    editorCancelCallback
                  )
                  ">
                  Save
                </button>
                <button type="button" class="cc-btn cc-btn-outline cc-btn-sm"
                  @click.stop="editorCancelCallback($event)">
                  Cancel
                </button>
              </div>
            </div>
          </Transition>
        </template>
      </Column>

      <!-- Doctor -->
      <Column field="doctor.name" header="Doctor" :bodyStyle="staffCellBodyStyle">
        <template #body="{ data }">
          <div class="cc-cell-block" @mousedown="blockEditIfMissing($event, data.doctor)"
            @click="blockEditIfMissing($event, data.doctor)">
            <span v-if="isLoading" class="cc-skeleton cc-skeleton-md"></span>
            <span v-else>{{ displayStaffName(data.doctor) }}</span>
          </div>
        </template>

        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit cc-staff-edit">
              <div class="cc-cell-edit-fields">
                <AppAsyncAutocomplete :modelValue="data.doctor ?? null" optionLabel="name" appendTo="self"
                  panelClass="cc-autocomplete-panel" inputClass="cc-input cc-input-sm" :pt="autoCompletePt"
                  placeholder="Search doctor" :fetcher="fetchDoctorSuggestions"
                  @update:modelValue="setFieldValue(data, 'doctor.name', $event)"
                  @option-select="setFieldValue(data, 'doctor.name', $event.value)"
                  @error="(error) => console.error('Failed to load doctors.', error)" @keydown="
                    handleEditorKeydown(
                      $event,
                      (e) =>
                        openReasonBeforeSave(
                          data,
                          'doctor.name',
                          e,
                          editorSaveCallback,
                          editorCancelCallback
                        ),
                      editorCancelCallback
                    )
                    " @keydown.down.stop @keydown.up.stop />
              </div>

              <div class="cc-cell-edit-actions">
                <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm" @click.stop="
                  openReasonBeforeSave(
                    data,
                    'doctor.name',
                    $event,
                    editorSaveCallback,
                    editorCancelCallback
                  )
                  ">
                  Save
                </button>
                <button type="button" class="cc-btn cc-btn-outline cc-btn-sm"
                  @click.stop="editorCancelCallback($event)">
                  Cancel
                </button>
              </div>
            </div>
          </Transition>
        </template>
      </Column>

      <!-- Social worker -->
      <Column field="social_worker.name" header="Social worker" :bodyStyle="staffCellBodyStyle">
        <template #body="{ data }">
          <div class="cc-cell-block" @mousedown="blockEditIfMissing($event, data.social_worker)"
            @click="blockEditIfMissing($event, data.social_worker)">
            <span v-if="isLoading" class="cc-skeleton cc-skeleton-md"></span>
            <span v-else>{{ displayStaffName(data.social_worker) }}</span>
          </div>
        </template>

        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit cc-staff-edit">
              <div class="cc-cell-edit-fields">
                <AppAsyncAutocomplete :modelValue="data.social_worker ?? null" optionLabel="name" appendTo="self"
                  panelClass="cc-autocomplete-panel" inputClass="cc-input cc-input-sm" :pt="autoCompletePt"
                  placeholder="Search social worker" :fetcher="fetchSocialWorkerSuggestions"
                  @update:modelValue="setFieldValue(data, 'social_worker.name', $event)"
                  @option-select="setFieldValue(data, 'social_worker.name', $event.value)"
                  @error="(error) => console.error('Failed to load social workers.', error)" @keydown="
                    handleEditorKeydown(
                      $event,
                      (e) =>
                        openReasonBeforeSave(
                          data,
                          'social_worker.name',
                          e,
                          editorSaveCallback,
                          editorCancelCallback
                        ),
                      editorCancelCallback
                    )
                    " @keydown.down.stop @keydown.up.stop />
              </div>

              <div class="cc-cell-edit-actions">
                <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm" @click.stop="
                  openReasonBeforeSave(
                    data,
                    'social_worker.name',
                    $event,
                    editorSaveCallback,
                    editorCancelCallback
                  )
                  ">
                  Save
                </button>
                <button type="button" class="cc-btn cc-btn-outline cc-btn-sm"
                  @click.stop="editorCancelCallback($event)">
                  Cancel
                </button>
              </div>
            </div>
          </Transition>
        </template>
      </Column>

      <!-- Visit type -->
      <Column field="visit_type" header="Visit type">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-sm"></span>
          <span v-else>{{ data.visit_type ?? "-" }}</span>
        </template>
      </Column>

      <!-- Actions -->
      <Column header="Actions" style="width: 8.5rem">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-sm"></span>
          <button v-else type="button" class="cc-icon-btn cc-icon-btn-outline" :disabled="detailsLoadingId === data.id"
            :aria-label="detailsLoadingId === data.id ? 'Loading details' : 'View details'"
            @click="emit('view-details', data)">
            <i v-if="detailsLoadingId === data.id" class="fa-solid fa-spinner fa-spin cc-icon" aria-hidden="true"></i>
            <Eye v-else class="cc-icon" aria-hidden="true" />
          </button>
        </template>
      </Column>
    </DataTable>

    <AppointmentEditReasonDialog
      v-model:visible="reasonDialogVisible"
      v-model:reasonText="reasonText"
      @confirm="confirmReasonAndSave"
      @cancel="cancelReasonModal"
      @hide="cancelReasonModal"
    />
  </div>
</template>