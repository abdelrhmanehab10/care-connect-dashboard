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
  visitTypeOptions,
  type AppointmentStatus,
  type PatientOption,
} from "../data/options";
import { autoCompletePt, dataTablePt } from "../ui/primevuePt";
import { fetchPatientAutocomplete } from "../services/patients";
import { fetchEmployeesByTitle } from "../services/employees";
import { useDebouncedAsync } from "../composables/useDebouncedAsync";

type StaffMember = Appointment["doctor"];
type Patient = Appointment["patient"];

const ensurePatient = (value: Patient | null | undefined): Patient =>
  value ?? { id: 0, name: "", date_of_birth: "" };

const ensureStaffMember = (
  value: StaffMember | null | undefined,
): StaffMember => value ?? { id: 0, name: "" };

const isPatientLike = (value: unknown): value is {
  id?: unknown;
  name?: unknown;
  date_of_birth?: unknown;
} =>
  typeof value === "object" && value !== null && "name" in value;

const normalizePatientId = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

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

const setFieldValue = (data: Appointment, field: string, value: unknown) => {
  switch (field) {
    case "patient.name":
      if (isPatientLike(value)) {
        const name = typeof value.name === "string" ? value.name : "";
        const dateOfBirth =
          typeof value.date_of_birth === "string"
            ? value.date_of_birth
            : data.patient?.date_of_birth ?? "";
        data.patient = {
          id: normalizePatientId(value.id ?? data.patient?.id ?? 0),
          name,
          date_of_birth: dateOfBirth,
        };
        return;
      }
      data.patient = ensurePatient(data.patient);
      data.patient.name =
        typeof value === "string" ? value : String(value ?? "");
      return;
    case "nurse.name":
      data.nurse = ensureStaffMember(data.nurse);
      data.nurse.name =
        typeof value === "string" ? value : String(value ?? "");
      return;
    case "doctor.name":
      data.doctor = ensureStaffMember(data.doctor);
      data.doctor.name =
        typeof value === "string" ? value : String(value ?? "");
      return;
    case "social_worker.name":
      data.social_worker = ensureStaffMember(data.social_worker ?? null);
      data.social_worker.name =
        typeof value === "string" ? value : String(value ?? "");
      return;
    default:
      (data as Record<string, unknown>)[field] = value;
  }
};

const props = defineProps<{
  appointments: ReadonlyArray<Appointment>;
  isLoading: boolean;
  statusOptions: ReadonlyArray<AppointmentStatus>;
  statusBadgeClass: (status: AppointmentStatus) => string;
}>();
const { isLoading } = toRefs(props);



const filteredPatients = ref<PatientOption[]>([]);
const filteredNurses = ref<string[]>([]);
const filteredDoctors = ref<string[]>([]);
const filteredSocialWorkers = ref<string[]>([]);
const { run: runPatientSearch, cancel: cancelPatientSearch } =
  useDebouncedAsync(300);
const { run: runNurseSearch } = useDebouncedAsync(300);
const { run: runDoctorSearch } = useDebouncedAsync(300);
const { run: runSocialWorkerSearch } = useDebouncedAsync(300);
const editSnapshots = new Map<string, unknown>();
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
  if (!query) {
    filteredNurses.value = [...nurseOptions];
    return;
  }

  runNurseSearch(
    () => fetchEmployeesByTitle("nurse", query),
    (results) => {
      filteredNurses.value = results.length > 0 ? results : [...nurseOptions];
    },
    (error) => {
      console.error("Failed to load nurses.", error);
      filteredNurses.value = [...nurseOptions];
    },
  );
};

const searchDoctors = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  if (!query) {
    filteredDoctors.value = [...doctorOptions];
    return;
  }

  runDoctorSearch(
    () => fetchEmployeesByTitle("doctor", query),
    (results) => {
      filteredDoctors.value = results.length > 0 ? results : [...doctorOptions];
    },
    (error) => {
      console.error("Failed to load doctors.", error);
      filteredDoctors.value = [...doctorOptions];
    },
  );
};

const searchSocialWorkers = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  if (!query) {
    filteredSocialWorkers.value = [...socialWorkerOptions];
    return;
  }

  runSocialWorkerSearch(
    () => fetchEmployeesByTitle("social_worker", query),
    (results) => {
      filteredSocialWorkers.value =
        results.length > 0 ? results : [...socialWorkerOptions];
    },
    (error) => {
      console.error("Failed to load social workers.", error);
      filteredSocialWorkers.value = [...socialWorkerOptions];
    },
  );
};

const handleEditorKeydown = (
  event: KeyboardEvent,
  save: (event: Event) => void,
  cancel: (event: Event) => void,
) => {
  if (event.key === "Enter") {
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


const snapshotKey = (data: Appointment, field: string) => `${data.id}:${field}`;

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

  setFieldValue(data, event.field, editSnapshots.get(key));
  editSnapshots.delete(key);
};

const handleCellEditComplete = (
  event: DataTableCellEditCompleteEvent<Appointment>,
) => {
  editSnapshots.delete(snapshotKey(event.data, event.field));
  emit("cell-edit-complete", event);
};
const emit = defineEmits<{
  (
    event: "cell-edit-complete",
    payload: DataTableCellEditCompleteEvent<Appointment>
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

      <Column field="date" header="Date">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-md"></span>
          <span v-else>{{ data.date ?? "-" }}</span>
        </template>
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields">
                <input v-model="data.date" type="date" class="cc-input cc-input-sm" @keydown="
                  handleEditorKeydown(
                    $event,
                    editorSaveCallback,
                    editorCancelCallback,
                  )
                  " />
              </div>
              <div class="cc-cell-edit-actions">
                <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm"
                  @click.stop="editorSaveCallback($event)">
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

      <Column field="patient.name" header="Patient">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-lg"></span>
          <span v-else>{{ data.patient?.name ?? "-" }}</span>
        </template>
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields">
                <AutoComplete :modelValue="data.patient ?? null" :suggestions="filteredPatients" optionLabel="name"
                  :completeOnFocus="true" :autoOptionFocus="true" appendTo="self" panelClass="cc-autocomplete-panel"
                  inputClass="cc-input cc-input-sm" :pt="autoCompletePt" placeholder="Search patient"
                  @update:modelValue="
                    setFieldValue(data, 'patient.name', $event)
                    " @complete="searchPatients" @keydown="
                    handleEditorKeydown(
                      $event,
                      editorSaveCallback,
                      editorCancelCallback,
                    )
                    " @keydown.down.stop @keydown.up.stop />
              </div>
              <div class="cc-cell-edit-actions">
                <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm"
                  @click.stop="editorSaveCallback($event)">
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
                    editorSaveCallback,
                    editorCancelCallback,
                  )
                  " />
                <input v-model="data.end_time" type="time" class="cc-input cc-input-sm" @keydown="
                  handleEditorKeydown(
                    $event,
                    editorSaveCallback,
                    editorCancelCallback,
                  )
                  " />
              </div>
              <div class="cc-cell-edit-actions">
                <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm"
                  @click.stop="editorSaveCallback($event)">
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

      <Column field="status" header="Status">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-pill"></span>
          <span v-else class="cc-badge" :class="statusBadgeClass(data.status as AppointmentStatus)">
            {{ data.status ?? "-" }}
          </span>
        </template>
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields">
                <select v-model="data.status" class="cc-select cc-select-sm" @keydown="
                  handleEditorKeydown(
                    $event,
                    editorSaveCallback,
                    editorCancelCallback,
                  )
                  ">
                  <option v-for="status in statusOptions" :key="status" :value="status">
                    {{ status }}
                  </option>
                </select>
              </div>
              <div class="cc-cell-edit-actions">
                <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm"
                  @click.stop="editorSaveCallback($event)">
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

      <Column field="nurse.name" header="Nurse">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-md"></span>
          <span v-else>{{ data.nurse?.name ?? "-" }}</span>
        </template>
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields">
                <AutoComplete :modelValue="data.nurse?.name ?? ''" :suggestions="filteredNurses" :completeOnFocus="true"
                  :autoOptionFocus="true" appendTo="self" panelClass="cc-autocomplete-panel"
                  inputClass="cc-input cc-input-sm" :pt="autoCompletePt" placeholder="Search nurse"
                  @update:modelValue="setFieldValue(data, 'nurse.name', $event)" @complete="searchNurses" @keydown="
                    handleEditorKeydown(
                      $event,
                      editorSaveCallback,
                      editorCancelCallback,
                    )
                    " @keydown.down.stop @keydown.up.stop />
              </div>
              <div class="cc-cell-edit-actions">
                <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm"
                  @click.stop="editorSaveCallback($event)">
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

      <Column field="doctor.name" header="Doctor">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-md"></span>
          <span v-else>{{ data.doctor?.name ?? "-" }}</span>
        </template>
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields">
                <AutoComplete :modelValue="data.doctor?.name ?? ''" :suggestions="filteredDoctors"
                  :completeOnFocus="true" :autoOptionFocus="true" appendTo="self" panelClass="cc-autocomplete-panel"
                  inputClass="cc-input cc-input-sm" :pt="autoCompletePt" placeholder="Search doctor"
                  @update:modelValue="setFieldValue(data, 'doctor.name', $event)" @complete="searchDoctors" @keydown="
                    handleEditorKeydown(
                      $event,
                      editorSaveCallback,
                      editorCancelCallback,
                    )
                    " @keydown.down.stop @keydown.up.stop />
              </div>
              <div class="cc-cell-edit-actions">
                <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm"
                  @click.stop="editorSaveCallback($event)">
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

      <Column field="social_worker.name" header="Social worker">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-md"></span>
          <span v-else>{{ data.social_worker?.name ?? "-" }}</span>
        </template>
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields">
                <AutoComplete :modelValue="data.social_worker?.name ?? ''" :suggestions="filteredSocialWorkers"
                  :completeOnFocus="true" :autoOptionFocus="true" appendTo="self" panelClass="cc-autocomplete-panel"
                  inputClass="cc-input cc-input-sm" :pt="autoCompletePt" placeholder="Search social worker"
                  @update:modelValue="
                    setFieldValue(data, 'social_worker.name', $event)
                    " @complete="searchSocialWorkers" @keydown="
                    handleEditorKeydown(
                      $event,
                      editorSaveCallback,
                      editorCancelCallback,
                    )
                    " @keydown.down.stop @keydown.up.stop />
              </div>
              <div class="cc-cell-edit-actions">
                <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm"
                  @click.stop="editorSaveCallback($event)">
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

      <Column field="visit_type" header="Visit type">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-sm"></span>
          <span v-else>{{ data.visit_type ?? "-" }}</span>
        </template>
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields">
                <select v-model="data.visit_type" class="cc-select cc-select-sm" @keydown="
                  handleEditorKeydown(
                    $event,
                    editorSaveCallback,
                    editorCancelCallback,
                  )
                  ">
                  <option v-for="type in visitTypeOptions" :key="type" :value="type">
                    {{ type }}
                  </option>
                </select>
              </div>
              <div class="cc-cell-edit-actions">
                <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm"
                  @click.stop="editorSaveCallback($event)">
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

      <Column header="Actions" style="width: 8.5rem">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-sm"></span>
          <button v-else type="button" class="cc-icon-btn cc-icon-btn-outline" aria-label="View details"
            @click="emit('view-details', data)">
            <Eye class="cc-icon" aria-hidden="true" />
          </button>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
