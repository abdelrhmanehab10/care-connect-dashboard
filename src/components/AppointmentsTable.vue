<script setup lang="ts">
import { ref } from "vue";
import AutoComplete from "primevue/autocomplete";
import type { AutoCompleteCompleteEvent } from "primevue/autocomplete";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import type { DataTableCellEditCompleteEvent } from "primevue/datatable";
import type { Appointment } from "../composables/useAppointments";
import {
  doctorOptions,
  nurseOptions,
  patientOptions,
  type AppointmentStatus,
} from "../data/options";
import { autoCompletePt, dataTablePt } from "../ui/primevuePt";

defineProps<{
  appointments: ReadonlyArray<Appointment>;
  statusOptions: ReadonlyArray<AppointmentStatus>;
  statusBadgeClass: (status: AppointmentStatus) => string;
}>();

const emit = defineEmits<{
  (event: "cell-edit-complete", payload: DataTableCellEditCompleteEvent<Appointment>): void;
}>();

const filteredPatients = ref<string[]>([]);
const filteredNurses = ref<string[]>([]);
const filteredDoctors = ref<string[]>([]);

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
</script>

<template>
  <div class="bg-white border rounded-2">
    <DataTable
      :value="appointments"
      dataKey="id"
      rowGroupMode="rowspan"
      groupRowsBy="date"
      editMode="cell"
      @cell-edit-complete="emit('cell-edit-complete', $event)"
      :pt="dataTablePt"
    >
      <template #empty>
        <div class="text-center text-muted py-4">No appointments yet.</div>
      </template>

      <Column field="date" header="Date" />

      <Column field="patient" header="Patient">
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <div class="d-flex align-items-center gap-2">
            <AutoComplete
              v-model="data.patient"
              :suggestions="filteredPatients"
              :completeOnFocus="true"
              appendTo="self"
              panelClass="cc-autocomplete-panel"
              inputClass="form-control form-control-sm"
              :pt="autoCompletePt"
              placeholder="Search patient"
              @complete="searchPatients"
              @keydown="handleEditorKeydown($event, editorSaveCallback, editorCancelCallback)"
            />
            <div class="btn-group btn-group-sm">
              <button
                type="button"
                class="btn btn-outline-success"
                @click.stop="editorSaveCallback($event)"
              >
                Save
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click.stop="editorCancelCallback($event)"
              >
                Cancel
              </button>
            </div>
          </div>
        </template>
      </Column>

      <Column header="Time">
        <template #body="{ data }">
          <span class="text-nowrap">{{ data.startTime }} - {{ data.endTime }}</span>
        </template>
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <div class="d-flex flex-wrap align-items-center gap-2">
            <div class="d-flex gap-2">
              <input
                v-model="data.startTime"
                type="time"
                class="form-control form-control-sm"
                @keydown="handleEditorKeydown($event, editorSaveCallback, editorCancelCallback)"
              />
              <input
                v-model="data.endTime"
                type="time"
                class="form-control form-control-sm"
                @keydown="handleEditorKeydown($event, editorSaveCallback, editorCancelCallback)"
              />
            </div>
            <div class="btn-group btn-group-sm">
              <button
                type="button"
                class="btn btn-outline-success"
                @click.stop="editorSaveCallback($event)"
              >
                Save
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click.stop="editorCancelCallback($event)"
              >
                Cancel
              </button>
            </div>
          </div>
        </template>
      </Column>

      <Column field="status" header="Status">
        <template #body="{ data }">
          <span class="badge" :class="statusBadgeClass(data.status)">
            {{ data.status }}
          </span>
        </template>
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <div class="d-flex align-items-center gap-2">
            <select
              v-model="data.status"
              class="form-select form-select-sm"
              @keydown="handleEditorKeydown($event, editorSaveCallback, editorCancelCallback)"
            >
              <option v-for="status in statusOptions" :key="status" :value="status">
                {{ status }}
              </option>
            </select>
            <div class="btn-group btn-group-sm">
              <button
                type="button"
                class="btn btn-outline-success"
                @click.stop="editorSaveCallback($event)"
              >
                Save
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click.stop="editorCancelCallback($event)"
              >
                Cancel
              </button>
            </div>
          </div>
        </template>
      </Column>

      <Column field="nurse" header="Nurse">
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <div class="d-flex align-items-center gap-2">
            <AutoComplete
              v-model="data.nurse"
              :suggestions="filteredNurses"
              :completeOnFocus="true"
              appendTo="self"
              panelClass="cc-autocomplete-panel"
              inputClass="form-control form-control-sm"
              :pt="autoCompletePt"
              placeholder="Search nurse"
              @complete="searchNurses"
              @keydown="handleEditorKeydown($event, editorSaveCallback, editorCancelCallback)"
            />
            <div class="btn-group btn-group-sm">
              <button
                type="button"
                class="btn btn-outline-success"
                @click.stop="editorSaveCallback($event)"
              >
                Save
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click.stop="editorCancelCallback($event)"
              >
                Cancel
              </button>
            </div>
          </div>
        </template>
      </Column>

      <Column field="doctor" header="Doctor">
        <template #editor="{ data, editorSaveCallback, editorCancelCallback }">
          <div class="d-flex align-items-center gap-2">
            <AutoComplete
              v-model="data.doctor"
              :suggestions="filteredDoctors"
              :completeOnFocus="true"
              appendTo="self"
              panelClass="cc-autocomplete-panel"
              inputClass="form-control form-control-sm"
              :pt="autoCompletePt"
              placeholder="Search doctor"
              @complete="searchDoctors"
              @keydown="handleEditorKeydown($event, editorSaveCallback, editorCancelCallback)"
            />
            <div class="btn-group btn-group-sm">
              <button
                type="button"
                class="btn btn-outline-success"
                @click.stop="editorSaveCallback($event)"
              >
                Save
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click.stop="editorCancelCallback($event)"
              >
                Cancel
              </button>
            </div>
          </div>
        </template>
      </Column>

      <Column header="Actions" style="width: 8.5rem" />
    </DataTable>
  </div>
</template>
