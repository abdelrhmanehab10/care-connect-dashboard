<script setup lang="ts">
import { computed, ref, toRefs } from "vue";
import AutoComplete from "primevue/autocomplete";
import type { AutoCompleteCompleteEvent } from "primevue/autocomplete";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import { Eye } from "lucide-vue-next";
import type {
  DataTableCellEditCancelEvent,
  DataTableCellEditCompleteEvent,
  DataTableCellEditInitEvent,
} from "primevue/datatable";
import type { Appointment } from "../types";
import {
  doctorOptions,
  nurseOptions,
  socialWorkerOptions,
  type AppointmentStatus,
  type PatientOption,
} from "../data/options";
import type { AppointmentStatusOption } from "../services/appointments";
import { autoCompletePt, dataTablePt } from "../ui/primevuePt";
import { fetchPatientAutocomplete } from "../services/patients";
import {
  fetchEmployeeOptionsByTitle,
  type EmployeeOption,
} from "../services/employees";
import { useDebouncedAsync } from "../composables/useDebouncedAsync";

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

const getFieldValue = (data: Appointment, field: string) => {
  switch (field) {
    case "patient.name":
      return data.patient ?? null;
    case "nurse.name":
      return data.nurse?.name ?? "";
    case "doctor.name":
      return data.doctor?.name ?? "";
    case "social_worker.name":
      return data.social_worker?.name ?? "";
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

const setFieldValue = (data: Appointment, field: string, value: unknown) => {
  editDrafts.set(snapshotKey(data, field), value);
  applyFieldValue(data, field, value);
};

const props = defineProps<{
  appointments: ReadonlyArray<Appointment>;
  isLoading: boolean;
  detailsLoadingId?: number | null;
  statusOptions: ReadonlyArray<AppointmentStatus | AppointmentStatusOption>;
  statusBadgeClass: (status: AppointmentStatus) => string;
  visitTypeOptions: ReadonlyArray<string>;
}>();
const { isLoading, detailsLoadingId } = toRefs(props);

const filteredPatients = ref<PatientOption[]>([]);
const filteredNurses = ref<EmployeeOption[]>([]);
const filteredDoctors = ref<EmployeeOption[]>([]);
const filteredSocialWorkers = ref<EmployeeOption[]>([]);
const { run: runPatientSearch, cancel: cancelPatientSearch } =
  useDebouncedAsync(300);
const { run: runNurseSearch } = useDebouncedAsync(300);
const { run: runDoctorSearch } = useDebouncedAsync(300);
const { run: runSocialWorkerSearch } = useDebouncedAsync(300);
const editSnapshots = new Map<string, unknown>();
const fallbackNurseOptions = nurseOptions.map((name) => ({
  id: 0,
  name,
}));
const fallbackDoctorOptions = doctorOptions.map((name) => ({
  id: 0,
  name,
}));
const fallbackSocialWorkerOptions = socialWorkerOptions.map((name) => ({
  id: 0,
  name,
}));
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
  isLoading.value ? loadingRows.value : props.appointments,
);
const editMode = computed(() => (isLoading.value ? undefined : "cell"));

const searchPatients = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim();
  if (query.length < 2) {
    cancelPatientSearch();
    filteredPatients.value = [];
    return;
  }

  runPatientSearch(
    () => fetchPatientAutocomplete(query),
    (results) => {
      filteredPatients.value = results;
    },
    (error) => {
      filteredPatients.value = [];
      console.error("Failed to load patient suggestions.", error);
    },
  );
};

const searchNurses = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  runNurseSearch(
    () => fetchEmployeeOptionsByTitle("nurse", query),
    (results) => {
      filteredNurses.value =
        results.length > 0 ? results : [...fallbackNurseOptions];
    },
    (error) => {
      console.error("Failed to load nurses.", error);
      filteredNurses.value = [...fallbackNurseOptions];
    },
  );
};

const searchDoctors = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  runDoctorSearch(
    () => fetchEmployeeOptionsByTitle("doctor", query),
    (results) => {
      filteredDoctors.value =
        results.length > 0 ? results : [...fallbackDoctorOptions];
    },
    (error) => {
      console.error("Failed to load doctors.", error);
      filteredDoctors.value = [...fallbackDoctorOptions];
    },
  );
};

const searchSocialWorkers = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  runSocialWorkerSearch(
    () => fetchEmployeeOptionsByTitle("social_worker", query),
    (results) => {
      filteredSocialWorkers.value =
        results.length > 0 ? results : [...fallbackSocialWorkerOptions];
    },
    (error) => {
      console.error("Failed to load social workers.", error);
      filteredSocialWorkers.value = [...fallbackSocialWorkerOptions];
    },
  );
};

const isAutoCompleteEvent = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null;
  return Boolean(target?.closest?.(".p-autocomplete"));
};

const handleEditorKeydown = (
  event: KeyboardEvent,
  save: (event: Event) => void,
  cancel: (event: Event) => void,
) => {
  if (event.key === "Enter") {
    if (isAutoCompleteEvent(event)) {
      return;
    }
    event.preventDefault();
    save(event);
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    cancel(event);
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

const normalizeDateInput = (value: string | null | undefined) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
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
  return "";
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
  const key = snapshotKey(event.data, event.field);
  if (editSnapshots.has(key)) {
    return;
  }

  editSnapshots.set(key, getFieldValue(event.data, event.field));
};

const handleCellEditCancel = (event: DataTableCellEditCancelEvent) => {
  const data = event.data as Appointment;
  const key = snapshotKey(data, event.field);
  if (!editSnapshots.has(key)) {
    return;
  }

  applyFieldValue(data, event.field, editSnapshots.get(key));
  editSnapshots.delete(key);
  editDrafts.delete(key);
};

const handleCellEditComplete = (
  event: DataTableCellEditCompleteEvent<Appointment>,
) => {
  const key = snapshotKey(event.data, event.field);
  const previousValue = editSnapshots.get(key);

  if (event.field === "status" && previousValue !== undefined) {
    if (!isStatusTransitionAllowed(previousValue, event.data.status)) {
      applyFieldValue(event.data, event.field, previousValue);
      editSnapshots.delete(key);
      editDrafts.delete(key);
      return;
    }
  }

  const draftValue = editDrafts.get(key);
  if (draftValue !== undefined) {
    applyFieldValue(event.data, event.field, draftValue);
    if (event.newData) {
      applyFieldValue(event.newData as Appointment, event.field, draftValue);
    }
    event.newValue = draftValue;
    editDrafts.delete(key);
  }

  editSnapshots.delete(key);
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
    <DataTable
      :value="displayAppointments"
      dataKey="id"
      :editMode="editMode"
      @cell-edit-init="handleCellEditInit"
      @cell-edit-cancel="handleCellEditCancel"
      @cell-edit-complete="handleCellEditComplete"
      :pt="dataTablePt"
    >
      <template #empty>
        <div v-if="!isLoading" class="cc-empty">No appointments yet.</div>
      </template>

      <Column field="date" header="Date">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-md"></span>
          <span v-else>{{ data.date ?? "-" }}</span>
        </template>
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields">
                <input
                  :value="normalizeDateInput(data.date)"
                  type="date"
                  class="cc-input cc-input-sm"
                  @input="
                    data.date = ($event.target as HTMLInputElement).value
                  "
                  @keydown="
                    handleEditorKeydown(
                      $event,
                      editorSaveCallback,
                      editorCancelCallback,
                    )
                  "
                />
              </div>
              <div class="cc-cell-edit-actions">
                <button
                  type="button"
                  class="cc-btn cc-btn-outline-success cc-btn-sm"
                  @click.stop="editorSaveCallback($event)"
                >
                  Save
                </button>
                <button
                  type="button"
                  class="cc-btn cc-btn-outline cc-btn-sm"
                  @click.stop="editorCancelCallback($event)"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Transition>
        </template>
      </Column>

      <Column field="patient.name" header="Patient">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-lg"></span>
          <span v-else>{{ data.patient?.name ?? "-" }}</span>
        </template>
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields">
                <AutoComplete
                  :modelValue="data.patient ?? null"
                  :suggestions="filteredPatients"
                  optionLabel="name"
                  :completeOnFocus="true"
                  :autoOptionFocus="true"
                  forceSelection
                  appendTo="self"
                  panelClass="cc-autocomplete-panel"
                  inputClass="cc-input cc-input-sm"
                  :pt="autoCompletePt"
                  placeholder="Search patient"
                  @update:modelValue="
                    setFieldValue(data, 'patient.name', $event)
                  "
                  @option-select="
                    setFieldValue(data, 'patient.name', $event.value)
                  "
                  @complete="searchPatients"
                  @keydown="
                    handleEditorKeydown(
                      $event,
                      editorSaveCallback,
                      editorCancelCallback,
                    )
                  "
                  @keydown.down.stop
                  @keydown.up.stop
                />
              </div>
              <div class="cc-cell-edit-actions">
                <button
                  type="button"
                  class="cc-btn cc-btn-outline-success cc-btn-sm"
                  @click.stop="editorSaveCallback($event)"
                >
                  Save
                </button>
                <button
                  type="button"
                  class="cc-btn cc-btn-outline cc-btn-sm"
                  @click.stop="editorCancelCallback($event)"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Transition>
        </template>
      </Column>

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
                <input
                  v-model="data.start_time"
                  type="time"
                  class="cc-input cc-input-sm"
                  @keydown="
                    handleEditorKeydown(
                      $event,
                      editorSaveCallback,
                      editorCancelCallback,
                    )
                  "
                />
                <input
                  v-model="data.end_time"
                  type="time"
                  class="cc-input cc-input-sm"
                  @keydown="
                    handleEditorKeydown(
                      $event,
                      editorSaveCallback,
                      editorCancelCallback,
                    )
                  "
                />
              </div>
              <div class="cc-cell-edit-actions">
                <button
                  type="button"
                  class="cc-btn cc-btn-outline-success cc-btn-sm"
                  @click.stop="editorSaveCallback($event)"
                >
                  Save
                </button>
                <button
                  type="button"
                  class="cc-btn cc-btn-outline cc-btn-sm"
                  @click.stop="editorCancelCallback($event)"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Transition>
        </template>
      </Column>

      <Column field="status" header="Status">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-pill"></span>
          <span
            v-else
            class="cc-badge"
            :class="statusBadgeClass(data.status as AppointmentStatus)"
          >
            {{ data.status ?? "-" }}
          </span>
        </template>
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields">
                  <select
                    v-model="data.status"
                    class="cc-select cc-select-sm"
                    :disabled="isStatusLocked(data)"
                  @keydown="
                    handleEditorKeydown(
                      $event,
                      editorSaveCallback,
                      editorCancelCallback,
                    )
                  "
                >
                  <option
                    v-for="status in getStatusOptionsForRow(data.status)"
                    :key="status.key"
                    :value="status.key"
                    :disabled="status.disabled"
                  >
                    {{ status.label }}
                  </option>
                </select>
              </div>
              <div class="cc-cell-edit-actions">
                  <button
                    type="button"
                    class="cc-btn cc-btn-outline-success cc-btn-sm"
                    :disabled="isStatusLocked(data)"
                    @click.stop="editorSaveCallback($event)"
                  >
                  Save
                </button>
                <button
                  type="button"
                  class="cc-btn cc-btn-outline cc-btn-sm"
                  @click.stop="editorCancelCallback($event)"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Transition>
        </template>
      </Column>

      <Column field="nurse.name" header="Nurse">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-md"></span>
          <span v-else>{{ data.nurse?.name ?? "-" }}</span>
        </template>
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields">
                <AutoComplete
                  :modelValue="data.nurse ?? null"
                  :suggestions="filteredNurses"
                  optionLabel="name"
                  :completeOnFocus="true"
                  :autoOptionFocus="true"
                  forceSelection
                  :disabled="!hasStaffName(data.nurse)"
                  appendTo="self"
                  panelClass="cc-autocomplete-panel"
                  inputClass="cc-input cc-input-sm"
                  :pt="autoCompletePt"
                  placeholder="Search nurse"
                  @update:modelValue="setFieldValue(data, 'nurse.name', $event)"
                  @option-select="
                    setFieldValue(data, 'nurse.name', $event.value)
                  "
                  @complete="searchNurses"
                  @keydown="
                    handleEditorKeydown(
                      $event,
                      editorSaveCallback,
                      editorCancelCallback,
                    )
                  "
                  @keydown.down.stop
                  @keydown.up.stop
                />
              </div>
              <div class="cc-cell-edit-actions">
                <button
                  type="button"
                  class="cc-btn cc-btn-outline-success cc-btn-sm"
                  :disabled="!hasStaffName(data.nurse)"
                  @click.stop="editorSaveCallback($event)"
                >
                  Save
                </button>
                <button
                  type="button"
                  class="cc-btn cc-btn-outline cc-btn-sm"
                  @click.stop="editorCancelCallback($event)"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Transition>
        </template>
      </Column>

      <Column field="doctor.name" header="Doctor">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-md"></span>
          <span v-else>{{ data.doctor?.name ?? "-" }}</span>
        </template>
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields">
                <AutoComplete
                  :modelValue="data.doctor ?? null"
                  :suggestions="filteredDoctors"
                  optionLabel="name"
                  :completeOnFocus="true"
                  :autoOptionFocus="true"
                  forceSelection
                  :disabled="!hasStaffName(data.doctor)"
                  appendTo="self"
                  panelClass="cc-autocomplete-panel"
                  inputClass="cc-input cc-input-sm"
                  :pt="autoCompletePt"
                  placeholder="Search doctor"
                  @update:modelValue="
                    setFieldValue(data, 'doctor.name', $event)
                  "
                  @option-select="
                    setFieldValue(data, 'doctor.name', $event.value)
                  "
                  @complete="searchDoctors"
                  @keydown="
                    handleEditorKeydown(
                      $event,
                      editorSaveCallback,
                      editorCancelCallback,
                    )
                  "
                  @keydown.down.stop
                  @keydown.up.stop
                />
              </div>
              <div class="cc-cell-edit-actions">
                <button
                  type="button"
                  class="cc-btn cc-btn-outline-success cc-btn-sm"
                  :disabled="!hasStaffName(data.doctor)"
                  @click.stop="editorSaveCallback($event)"
                >
                  Save
                </button>
                <button
                  type="button"
                  class="cc-btn cc-btn-outline cc-btn-sm"
                  @click.stop="editorCancelCallback($event)"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Transition>
        </template>
      </Column>

      <Column field="social_worker.name" header="Social worker">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-md"></span>
          <span v-else>{{ data.social_worker?.name ?? "-" }}</span>
        </template>
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields">
                <AutoComplete
                  :modelValue="data.social_worker ?? null"
                  :suggestions="filteredSocialWorkers"
                  optionLabel="name"
                  :completeOnFocus="true"
                  :autoOptionFocus="true"
                  forceSelection
                  :disabled="!hasStaffName(data.social_worker)"
                  appendTo="self"
                  panelClass="cc-autocomplete-panel"
                  inputClass="cc-input cc-input-sm"
                  :pt="autoCompletePt"
                  placeholder="Search social worker"
                  @update:modelValue="
                    setFieldValue(data, 'social_worker.name', $event)
                  "
                  @option-select="
                    setFieldValue(data, 'social_worker.name', $event.value)
                  "
                  @complete="searchSocialWorkers"
                  @keydown="
                    handleEditorKeydown(
                      $event,
                      editorSaveCallback,
                      editorCancelCallback,
                    )
                  "
                  @keydown.down.stop
                  @keydown.up.stop
                />
              </div>
              <div class="cc-cell-edit-actions">
                <button
                  type="button"
                  class="cc-btn cc-btn-outline-success cc-btn-sm"
                  :disabled="!hasStaffName(data.social_worker)"
                  @click.stop="editorSaveCallback($event)"
                >
                  Save
                </button>
                <button
                  type="button"
                  class="cc-btn cc-btn-outline cc-btn-sm"
                  @click.stop="editorCancelCallback($event)"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Transition>
        </template>
      </Column>

      <Column field="visit_type" header="Visit type">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-sm"></span>
          <span v-else>{{ data.visit_type ?? "-" }}</span>
        </template>
      </Column>

      <Column header="Actions" style="width: 8.5rem">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-sm"></span>
          <button
            v-else
            type="button"
            class="cc-icon-btn cc-icon-btn-outline"
            :disabled="detailsLoadingId === data.id"
            :aria-label="
              detailsLoadingId === data.id ? 'Loading details' : 'View details'
            "
            @click="emit('view-details', data)"
          >
            <i
              v-if="detailsLoadingId === data.id"
              class="fa-solid fa-spinner fa-spin cc-icon"
              aria-hidden="true"
            ></i>
            <Eye v-else class="cc-icon" aria-hidden="true" />
          </button>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
