<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import { Eye } from "lucide-vue-next";
import { useToast } from "primevue/usetoast";
import type {
  DataTableCellEditCancelEvent,
  DataTableCellEditCompleteEvent,
  DataTableCellEditInitEvent,
} from "primevue/datatable";
import AppointmentEditReasonDialog from "./AppointmentEditReasonDialog.vue";
import AppointmentDetailsDialog from "./AppointmentDetailsDialog.vue";
import AppAsyncAutocomplete from "./shared/AppAsyncAutocomplete.vue";
import type { Appointment } from "../types";
import type { AppointmentStatus } from "../data/options";
import {
  fetchAppointmentDetails,
  updateAppointment,
  type AppointmentStatusOption,
  type UpdateAppointmentPayload,
} from "../services/appointments";
import { fetchVisitTypes, type VisitType } from "../services/visitTypes";
import { autoCompletePt, dataTablePt } from "../ui/primevuePt";
import { fetchPatientAutocomplete } from "../services/patients";
import { fetchEmployeeOptionsByTitle } from "../services/employees";
import { useReasonRequiredAction } from "../composables/useReasonRequiredAction";
import {
  statusBadgeClass,
  useAppointmentsQuery,
} from "../composables/useAppointmentsQuery";
import {
  formatStatusLabel,
  getStatusLevel as getBaseStatusLevel,
  isFinalStatus as isBaseFinalStatus,
  isStatusTransitionAllowed as isBaseStatusTransitionAllowed,
  normalizeStatusKey,
} from "../lib/statusTransitions";
import { normalizeDateString, toIsoDate } from "../lib/dateUtils";

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

type EditTrackingState = {
  drafts: Map<string, unknown>;
  snapshots: Map<string, unknown>;
  explicitSaveKeys: Set<string>;
  reasons: Map<string, string>;
};

const createEditTrackingState = (): EditTrackingState => ({
  drafts: new Map<string, unknown>(),
  snapshots: new Map<string, unknown>(),
  explicitSaveKeys: new Set<string>(),
  reasons: new Map<string, string>(),
});

const editTracking = createEditTrackingState();
const getSnapshot = (key: string) => editTracking.snapshots.get(key);
const setSnapshot = (key: string, value: unknown) =>
  editTracking.snapshots.set(key, value);
const hasSnapshot = (key: string) => editTracking.snapshots.has(key);
const clearSnapshot = (key: string) => editTracking.snapshots.delete(key);
const getDraft = (key: string) => editTracking.drafts.get(key);
const setDraft = (key: string, value: unknown) => editTracking.drafts.set(key, value);
const clearDraft = (key: string) => editTracking.drafts.delete(key);
const markExplicitSave = (key: string) => editTracking.explicitSaveKeys.add(key);
const hasExplicitSave = (key: string) => editTracking.explicitSaveKeys.has(key);
const clearExplicitSave = (key: string) => editTracking.explicitSaveKeys.delete(key);
const setReason = (key: string, reason: string) => editTracking.reasons.set(key, reason);
const consumeReason = (key: string) => {
  const reason = editTracking.reasons.get(key) ?? "";
  editTracking.reasons.delete(key);
  return reason;
};
const clearEditTracking = (key: string) => {
  editTracking.snapshots.delete(key);
  editTracking.drafts.delete(key);
  editTracking.explicitSaveKeys.delete(key);
  editTracking.reasons.delete(key);
};

const reasonAction = useReasonRequiredAction<PendingSave>({
  onConfirm: ({ action: pending, reason }) => {
    const { key, saveCb, originalEvent } = pending;
    setReason(key, reason);
    markExplicitSave(key);

    if (pending.completedEvent) {
      handleCellEditComplete(pending.completedEvent);
      return;
    }

    if (pending.wasCanceled) {
      const previousValue = getSnapshot(key);
      const draftValue = getDraft(key);
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
  },
  onCancel: (pending) => {
    if (!pending) return;
    const previousValue = getSnapshot(pending.key);
    if (previousValue !== undefined) {
      applyFieldValue(pending.data, pending.field, previousValue);
    }
    clearEditTracking(pending.key);
    pending.cancelCb(pending.originalEvent);
  },
});
const { visible: reasonDialogVisible, reasonText } = reasonAction;
const pendingSave = reasonAction.pendingAction;

const openReasonBeforeSave = (
  data: Appointment,
  field: string,
  e: Event,
  saveCb: (e: Event) => void,
  cancelCb: (e: Event) => void,
) => {
  const key = snapshotKey(data, field);
  reasonAction.open({ data, field, key, saveCb, cancelCb, originalEvent: e });
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
const revertFieldAndClear = (
  data: Appointment,
  field: string,
  value: unknown,
  key: string,
) => {
  if (value !== undefined) {
    applyFieldValue(data, field, value);
  }
  clearEditTracking(key);
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
  const draft = getDraft(snapshotKey(data, field));
  return isOptionValue(draft);
};

const setFieldValue = (data: Appointment, field: string, value: unknown) => {
  if (shouldIgnoreStringDraft(field, value, data)) {
    return;
  }
  setDraft(snapshotKey(data, field), value);
  applyFieldValue(data, field, value);
};
const page = ref(1);
const fallbackToast = {
  add: () => { },
};
let toast: ReturnType<typeof useToast> | typeof fallbackToast = fallbackToast;
try {
  toast = useToast();
} catch {
  toast = fallbackToast;
}
const visitTypes = ref<VisitType[]>([]);
const localDetailsLoadingId = ref<number | null>(null);
const detailsRequestSeq = ref(0);
const isDetailsOpen = ref(false);
const selectedAppointment = ref<Appointment | null>(null);
const isInlineSaving = ref(false);

let queryClient: ReturnType<typeof useQueryClient> | null = null;
try {
  queryClient = useQueryClient();
} catch {
  queryClient = null;
}

let queryResult: ReturnType<typeof useAppointmentsQuery> | null = null;
try {
  queryResult = useAppointmentsQuery({
    page,
  });
} catch {
  queryResult = null;
}

const queriedAppointments = queryResult?.appointments ?? ref<Appointment[]>([]);
const appointmentsResponse = queryResult?.data ?? ref<{
  total?: number;
  perPage?: number;
  currentPage?: number;
  hasMorePages?: boolean;
} | null>(null);
const queriedIsLoading = queryResult?.isLoading ?? ref(false);
const queriedStatusOptions = queryResult?.statusOptions ?? [];
const refetch = queryResult?.refetch ?? (() => Promise.resolve());

const sourceAppointments = computed<ReadonlyArray<Appointment>>(
  () => queriedAppointments.value,
);
const isLoading = computed(() => queriedIsLoading.value);
const sourceStatusOptions = computed<ReadonlyArray<StatusOptionInput>>(
  () => queriedStatusOptions,
);
const detailsLoadingId = computed(() => localDetailsLoadingId.value);

onMounted(() => {
  void fetchVisitTypes()
    .then((items) => {
      visitTypes.value = items;
    })
    .catch((error) => {
      console.error("Failed to load visit types.", error);
      visitTypes.value = [];
    });
});

const refreshAppointments = () => {
  void refetch();
};

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

const syncEditableAppointments = (items: ReadonlyArray<Appointment>) => {
  editableAppointments.value = items.map(cloneAppointment);
};

watch(
  sourceAppointments,
  syncEditableAppointments,
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

const currentPage = computed(
  () => appointmentsResponse.value?.currentPage ?? page.value,
);
const totalCount = computed(() => appointmentsResponse.value?.total ?? 0);
const totalPages = computed(() => {
  const total = appointmentsResponse.value?.total ?? 0;
  const perPage = appointmentsResponse.value?.perPage ?? 1;
  return perPage ? Math.max(1, Math.ceil(total / perPage)) : 1;
});
const canGoPrev = computed(() => currentPage.value > 1);
const canGoNext = computed(
  () => appointmentsResponse.value?.hasMorePages ?? false,
);

const goPrev = () => {
  if (!canGoPrev.value) return;
  page.value = Math.max(1, page.value - 1);
};

const goNext = () => {
  if (!canGoNext.value) return;
  page.value += 1;
};
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
  return toIsoDate(new Date());
};

const normalizeDateInput = (value: string | null | undefined) => {
  return normalizeDateString(value) || getTodayIsoDate();
};

const fallbackStatusMeta = (value: unknown) => {
  const level = getBaseStatusLevel(value);
  return { level, isFinal: level >= 3 };
};

const baseStatusOptions = computed<NormalizedStatusOption[]>(() => {
  const options: NormalizedStatusOption[] = [];
  for (const option of sourceStatusOptions.value) {
    if (typeof option === "string") {
      const key = option.trim();
      if (!key) continue;
      const meta = fallbackStatusMeta(key);
      options.push({
        key,
        label: formatStatusLabel(option),
        level: meta.level,
        isFinal: meta.isFinal,
      });
      continue;
    }

    const key = String(option.key ?? option.value ?? "").trim();
    if (!key) continue;
    const label = formatStatusLabel(option.value ?? option.key ?? key);
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

const getStatusDisplayLabel = (value: unknown) => {
  const optionLabel = getStatusOption(value)?.label?.trim();
  if (optionLabel) {
    return optionLabel;
  }
  return formatStatusLabel(value);
};

const buildFallbackStatusOption = (
  value: unknown,
): NormalizedStatusOption | null => {
  const key = String(value ?? "").trim();
  if (!key) return null;
  const meta = fallbackStatusMeta(key);
  return {
    key,
    label: formatStatusLabel(key),
    level: meta.level,
    isFinal: meta.isFinal,
  };
};

const getStatusLevel = (value: unknown) =>
  getStatusOption(value)?.level ?? fallbackStatusMeta(value).level;

const isFinalStatus = (value: unknown) => {
  // Always honor built-in final-like statuses, even if API metadata is wrong.
  if (isBaseFinalStatus(value)) {
    return true;
  }
  const option = getStatusOption(value);
  if (option) {
    return option.isFinal || option.level >= 3;
  }
  return false;
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
  if (!getStatusOption(from) && !getStatusOption(to)) {
    return isBaseStatusTransitionAllowed(from, to);
  }
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

const visitTypeIdLookup = computed(() => {
  const map = new Map<string, string>();
  for (const type of visitTypes.value) {
    const name = String(type?.name ?? "").trim().toLowerCase();
    const id = String(type?.id ?? "").trim();
    if (!name || !id) continue;
    map.set(name, id);
  }
  return map;
});

const normalizeAddressId = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : "";
  }
  return "";
};

const normalizeAddressCoordinate = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
};

const resolveInlineAddress = (appointment: Appointment) => {
  const address = String(appointment.patient_address?.address ?? "").trim();
  if (!address) {
    return null;
  }

  const normalizedAddressId = normalizeAddressId(appointment.patient_address?.id);
  const lat = normalizeAddressCoordinate(appointment.patient_address?.lat);
  const lng = normalizeAddressCoordinate(appointment.patient_address?.lng);
  const hasLat = Number.isFinite(lat);
  const hasLng = Number.isFinite(lng);

  return {
    id: normalizedAddressId || undefined,
    address,
    lat: hasLat ? String(lat) : "",
    lng: hasLng ? String(lng) : "",
  };
};

const normalizeStaffPayloadId = (value: number | null | undefined) =>
  typeof value === "number" && value > 0 ? String(value) : "";

const buildInlineUpdatePayload = (
  appointment: Appointment,
  reason = "",
): UpdateAppointmentPayload => {
  const visitTypeId = appointment.visit_type
    ? visitTypeIdLookup.value.get(appointment.visit_type.toLowerCase())
    : "";
  const payload: UpdateAppointmentPayload = {
    patient_id: String(appointment.patient?.id ?? ""),
    visit_type_id: visitTypeId || "",
    date: normalizeDateString(appointment.date) || appointment.date,
    start_time: appointment.start_time ?? "",
    end_time: appointment.end_time ?? "",
    is_recurring: "0",
    status: appointment.status ?? "",
    doctor_id: normalizeStaffPayloadId(appointment.doctor?.id),
    nurse_id: normalizeStaffPayloadId(appointment.nurse?.id),
    social_worker_id: normalizeStaffPayloadId(appointment.social_worker?.id),
  };

  const normalizedReason = String(reason).trim();
  if (normalizedReason) {
    payload.reason = normalizedReason;
  }

  const address = resolveInlineAddress(appointment);
  if (address) {
    payload.new_address = address;
  }

  return payload;
};

const applyOptimisticUpdate = (updated: Appointment) => {
  if (!queryClient) {
    return;
  }
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
  if (!queryClient) {
    return;
  }
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
  const snapshot = queryClient
    ? queryClient.getQueriesData({ queryKey: ["appointments"] })
    : [];
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

const isValidIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const formatDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const normalizeAppointmentDate = (value: string | null | undefined) => {
  if (!value) return "";
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

const openDetails = async (appointment: Appointment) => {
  const fallback = appointment;
  const requestSeq = detailsRequestSeq.value + 1;
  detailsRequestSeq.value = requestSeq;
  isDetailsOpen.value = true;
  selectedAppointment.value = fallback;
  localDetailsLoadingId.value = fallback.id;

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
      localDetailsLoadingId.value = null;
    }
  }
};

const handleDetailsEdit = () => {
  toast.add({
    severity: "info",
    summary: "Details view only",
    detail: "Editing is handled from the main appointment form.",
    life: 3000,
  });
};

const getSnapshotValue = (data: Appointment, field: string) =>
  getSnapshot(snapshotKey(data, field));
const isRowEditLocked = (data: Appointment) => {
  const snapshot = getSnapshotValue(data, "status");
  return isFinalStatus(snapshot ?? data.status);
};
const blockRowEditIfLocked = (event: Event, data: Appointment) => {
  if (!isRowEditLocked(data)) {
    return false;
  }
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  return true;
};
const handleStaffCellPointer = (
  event: Event,
  data: Appointment,
  staff: StaffMember | null | undefined,
) => {
  if (blockRowEditIfLocked(event, data)) {
    return;
  }
  blockEditIfMissing(event, staff);
};
const blockCellEditInit = (event: DataTableCellEditInitEvent<Appointment>) => {
  const originalEvent = event.originalEvent as Event | undefined;
  originalEvent?.preventDefault?.();
  originalEvent?.stopPropagation?.();
  originalEvent?.stopImmediatePropagation?.();
};

const handleCellEditInit = (event: DataTableCellEditInitEvent<Appointment>) => {
  if (isRowEditLocked(event.data)) {
    blockCellEditInit(event);
    return;
  }

  if (isStaffEditBlocked(event.data, event.field)) {
    blockCellEditInit(event);
    return;
  }

  const key = snapshotKey(event.data, event.field);
  clearExplicitSave(key);
  if (hasSnapshot(key)) {
    return;
  }

  setSnapshot(key, cloneSnapshotValue(getFieldValue(event.data, event.field)));
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
  if (!hasSnapshot(key)) {
    return;
  }

  applyFieldValue(data, event.field, getSnapshot(key));
  clearEditTracking(key);
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
  const previousValue = getSnapshot(key);
  if (isStaffEditBlocked(event.data, event.field)) {
    revertFieldAndClear(event.data, event.field, previousValue, key);
    return;
  }

  const isExplicitSave = hasExplicitSave(key);
  if (!isExplicitSave) {
    revertFieldAndClear(event.data, event.field, previousValue, key);
    return;
  }

  if (event.field === "status" && previousValue !== undefined) {
    if (!isStatusTransitionAllowed(previousValue, event.data.status)) {
      revertFieldAndClear(event.data, event.field, previousValue, key);
      return;
    }
  }

  const draftValue = getDraft(key);
  if (draftValue !== undefined) {
    applyFieldValue(event.data, event.field, draftValue);
    event.newValue = draftValue;
    clearDraft(key);
  }

  // Ensure consumers see the same mutated row for nested edits.
  (event as DataTableCellEditCompleteEvent<Appointment>).newData = event.data;

  clearSnapshot(key);
  clearExplicitSave(key);
  const reasonKey = snapshotKey(event.data, event.field);
  const reason = consumeReason(reasonKey);
  void handleInlineUpdate(event.data, reason);
};
</script>
<template>
  <div class="cc-card">
    <div class="cc-row cc-row-between cc-row-wrap cc-stack-sm" style="margin-bottom: 0.875rem;">
      <div class="cc-help-text">
        Total: {{ totalCount }}
      </div>
      <div class="cc-row cc-stack-sm">
        <div class="cc-help-text">
          Page {{ currentPage }} of {{ totalPages }}
        </div>
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
    <DataTable :value="displayAppointments" dataKey="id" :editMode="editMode" @cell-edit-init="handleCellEditInit"
      @cell-edit-cancel="handleCellEditCancel" @cell-edit-complete="handleCellEditComplete" :pt="dataTablePt">
      <template #empty>
        <div v-if="!isLoading" class="cc-empty">No appointments yet.</div>
      </template>

      <!-- Date -->
      <Column field="date" header="Date">
        <template #body="{ data }">
          <div
            class="cc-cell-block"
            @mousedown="blockRowEditIfLocked($event, data)"
            @click="blockRowEditIfLocked($event, data)"
          >
            <span v-if="isLoading" class="cc-skeleton cc-skeleton-md"></span>
            <span v-else>{{ data.date ?? "-" }}</span>
          </div>
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
          <div
            class="cc-cell-block"
            @mousedown="blockRowEditIfLocked($event, data)"
            @click="blockRowEditIfLocked($event, data)"
          >
            <span v-if="isLoading" class="cc-skeleton cc-skeleton-lg"></span>
            <span v-else>{{ data.patient?.name ?? "-" }}</span>
          </div>
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
      <Column field="time" header="Time">
        <template #body="{ data }">
          <div
            class="cc-cell-block"
            @mousedown="blockRowEditIfLocked($event, data)"
            @click="blockRowEditIfLocked($event, data)"
          >
            <span v-if="isLoading" class="cc-skeleton cc-skeleton-sm"></span>
            <span v-else class="cc-text-nowrap">
              {{ formatTime(data.start_time) }} - {{ formatTime(data.end_time) }}
            </span>
          </div>
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
          <div
            class="cc-cell-block"
            @mousedown="blockRowEditIfLocked($event, data)"
            @click="blockRowEditIfLocked($event, data)"
          >
            <span v-if="isLoading" class="cc-skeleton cc-skeleton-pill"></span>
            <span v-else class="cc-badge" :class="statusBadgeClass(data.status as AppointmentStatus)">
              {{ getStatusDisplayLabel(data.status) }}
            </span>
          </div>
        </template>

        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields">
                <select v-model="data.status" class="cc-select cc-select-sm" :disabled="isRowEditLocked(data)" @keydown="
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
                <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm" :disabled="isRowEditLocked(data)"
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
          <div class="cc-cell-block" @mousedown="handleStaffCellPointer($event, data, data.nurse)"
            @click="handleStaffCellPointer($event, data, data.nurse)">
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
          <div class="cc-cell-block" @mousedown="handleStaffCellPointer($event, data, data.doctor)"
            @click="handleStaffCellPointer($event, data, data.doctor)">
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
          <div class="cc-cell-block" @mousedown="handleStaffCellPointer($event, data, data.social_worker)"
            @click="handleStaffCellPointer($event, data, data.social_worker)">
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
            @click="openDetails(data)">
            <i v-if="detailsLoadingId === data.id" class="fa-solid fa-spinner fa-spin cc-icon" aria-hidden="true"></i>
            <Eye v-else class="cc-icon" aria-hidden="true" />
          </button>
        </template>
      </Column>
    </DataTable>

    <AppointmentEditReasonDialog
      v-model:visible="reasonDialogVisible"
      v-model:reasonText="reasonText"
      @confirm="reasonAction.confirm"
      @cancel="reasonAction.cancel"
      @hide="reasonAction.cancel"
    />
    <AppointmentDetailsDialog
      v-model="isDetailsOpen"
      :appointment="selectedAppointment"
      :is-loading="isDetailsOpen && detailsLoadingId !== null"
      @edit="handleDetailsEdit"
      @confirm-all="refreshAppointments"
      @confirm-employee="refreshAppointments"
      @no-show="refreshAppointments"
      @cancel="refreshAppointments"
    />
  </div>
</template>
