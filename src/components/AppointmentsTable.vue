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
  patientOptions,
  type AppointmentStatus,
} from "../data/options";
import { autoCompletePt, dataTablePt } from "../ui/primevuePt";

const props = defineProps<{
  appointments: ReadonlyArray<Appointment>;
  isLoading: boolean;
  statusOptions: ReadonlyArray<AppointmentStatus>;
  statusBadgeClass: (status: AppointmentStatus) => string;
}>();
const { isLoading } = toRefs(props);

const emit = defineEmits<{
  (event: "cell-edit-complete", payload: DataTableCellEditCompleteEvent<Appointment>): void;
  (event: "view-details", payload: Appointment): void;
}>();

const filteredPatients = ref<string[]>([]);
const filteredNurses = ref<string[]>([]);
const filteredDoctors = ref<string[]>([]);
const editSnapshots = new Map<string, Appointment[keyof Appointment]>();
const loadingRows = computed(() =>
  Array.from({ length: 6 }, (_, index) => ({
    id: `loading-${index}`,
  })) as Appointment[]
);
const displayAppointments = computed(() =>
  isLoading.value ? loadingRows.value : props.appointments
);
const editMode = computed(() => (isLoading.value ? undefined : "cell"));

const searchPatients = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  if (!query) {
    filteredPatients.value = patientOptions.map((patient) => patient.name);
    return;
  }

  filteredPatients.value = patientOptions
    .map((patient) => patient.name)
    .filter((name) => name.toLowerCase().includes(query));
};

const searchNurses = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  if (!query) {
    filteredNurses.value = [...nurseOptions];
    return;
  }

  filteredNurses.value = nurseOptions.filter((name) =>
    name.toLowerCase().includes(query)
  );
};

const searchDoctors = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  if (!query) {
    filteredDoctors.value = [...doctorOptions];
    return;
  }

  filteredDoctors.value = doctorOptions.filter((name) =>
    name.toLowerCase().includes(query)
  );
};

const handleEditorKeydown = (
  event: KeyboardEvent,
  save: (event: Event) => void,
  cancel: (event: Event) => void
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

const snapshotKey = (data: Appointment, field: string) => `${data.id}:${field}`;

const handleCellEditInit = (
  event: DataTableCellEditInitEvent<Appointment>,
) => {
  const key = snapshotKey(event.data, event.field);
  if (editSnapshots.has(key)) {
    return;
  }

  const field = event.field as keyof Appointment;
  if (field in event.data) {
    editSnapshots.set(key, event.data[field]);
  }
};

const handleCellEditCancel = (event: DataTableCellEditCancelEvent) => {
  const data = event.data as Appointment;
  const key = snapshotKey(data, event.field);
  if (!editSnapshots.has(key)) {
    return;
  }

  const field = event.field as keyof Appointment;
  if (field in data) {
    data[field] = editSnapshots.get(key) as never;
  }

  editSnapshots.delete(key);
};

const handleCellEditComplete = (
  event: DataTableCellEditCompleteEvent<Appointment>,
) => {
  editSnapshots.delete(snapshotKey(event.data, event.field));
  emit("cell-edit-complete", event);
};
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
                  v-model="data.date"
                  type="date"
                  class="cc-input cc-input-sm"
                  @keydown="handleEditorKeydown($event, editorSaveCallback, editorCancelCallback)"
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

      <Column field="patient_name" header="Patient">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-lg"></span>
          <span v-else>{{ data.patient_name ?? "-" }}</span>
        </template>
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields">
                <AutoComplete
                  v-model="data.patient_name"
                  :suggestions="filteredPatients"
                  :completeOnFocus="true"
                  :autoOptionFocus="true"
                  appendTo="self"
                  panelClass="cc-autocomplete-panel"
                  inputClass="cc-input cc-input-sm"
                  :pt="autoCompletePt"
                  placeholder="Search patient"
                  @complete="searchPatients"
                  @keydown="handleEditorKeydown($event, editorSaveCallback, editorCancelCallback)"
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
            {{ data.start_time ?? "-" }} - {{ data.end_time ?? "-" }}
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
                  @keydown="handleEditorKeydown($event, editorSaveCallback, editorCancelCallback)"
                />
                <input
                  v-model="data.end_time"
                  type="time"
                  class="cc-input cc-input-sm"
                  @keydown="handleEditorKeydown($event, editorSaveCallback, editorCancelCallback)"
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
                  @keydown="handleEditorKeydown($event, editorSaveCallback, editorCancelCallback)"
                >
                  <option v-for="status in statusOptions" :key="status" :value="status">
                    {{ status }}
                  </option>
                </select>
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

      <Column field="nurse_name" header="Nurse">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-md"></span>
          <span v-else>{{ data.nurse_name ?? "-" }}</span>
        </template>
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields">
                <AutoComplete
                  v-model="data.nurse_name"
                  :suggestions="filteredNurses"
                  :completeOnFocus="true"
                  :autoOptionFocus="true"
                  appendTo="self"
                  panelClass="cc-autocomplete-panel"
                  inputClass="cc-input cc-input-sm"
                  :pt="autoCompletePt"
                  placeholder="Search nurse"
                  @complete="searchNurses"
                  @keydown="handleEditorKeydown($event, editorSaveCallback, editorCancelCallback)"
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

      <Column field="doctor_name" header="Doctor">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-md"></span>
          <span v-else>{{ data.doctor_name ?? "-" }}</span>
        </template>
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <Transition name="cc-cell-edit" appear>
            <div class="cc-cell-edit">
              <div class="cc-cell-edit-fields">
                <AutoComplete
                  v-model="data.doctor_name"
                  :suggestions="filteredDoctors"
                  :completeOnFocus="true"
                  :autoOptionFocus="true"
                  appendTo="self"
                  panelClass="cc-autocomplete-panel"
                  inputClass="cc-input cc-input-sm"
                  :pt="autoCompletePt"
                  placeholder="Search doctor"
                  @complete="searchDoctors"
                  @keydown="handleEditorKeydown($event, editorSaveCallback, editorCancelCallback)"
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

      <Column header="Actions" style="width: 8.5rem">
        <template #body="{ data }">
          <span v-if="isLoading" class="cc-skeleton cc-skeleton-sm"></span>
          <button
            v-else
            type="button"
            class="cc-icon-btn cc-icon-btn-outline"
            aria-label="View details"
            @click="emit('view-details', data)"
          >
            <Eye class="cc-icon" aria-hidden="true" />
          </button>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
