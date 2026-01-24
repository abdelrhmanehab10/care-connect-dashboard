<script setup lang="ts">
import { ref } from "vue";
import type { AutoCompleteCompleteEvent } from "primevue/autocomplete";
import AutoComplete from "primevue/autocomplete";
import Button from "primevue/button";
import Dialog from "primevue/dialog";

const isDialogOpen = ref(false);

type PatientOption = {
  id: string;
  name: string;
};

const patientOptions: PatientOption[] = [
  { id: "PT-1001", name: "Amelia Rivera" },
  { id: "PT-1002", name: "Noah Patel" },
  { id: "PT-1003", name: "Sophia Nguyen" },
  { id: "PT-1004", name: "Liam Johnson" },
  { id: "PT-1005", name: "Isabella Chen" },
];

const selectedPatient = ref<PatientOption | null>(null);
const filteredPatients = ref<PatientOption[]>([]);

const dialogPt = {
  mask: { class: "cc-dialog-mask" },
  root: { class: "cc-dialog" },
  header: { class: "cc-dialog-header" },
  content: { class: "cc-dialog-content" },
  footer: { class: "cc-dialog-footer" },
} as const;

const autoCompletePt = {
  root: { class: "w-100 position-relative" },
  pcInputText: { class: "form-control" },
  listContainer: { class: "cc-autocomplete-list" },
  list: { class: "list-group list-group-flush" },
  option: { class: "list-group-item list-group-item-action" },
  emptyMessage: { class: "list-group-item text-muted small" },
} as const;

const searchPatients = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  if (!query) {
    filteredPatients.value = [...patientOptions];
    return;
  }

  filteredPatients.value = patientOptions.filter((patient) => {
    return (
      patient.name.toLowerCase().includes(query) ||
      patient.id.toLowerCase().includes(query)
    );
  });
};
</script>

<template>
  <div class="min-vh-100 bg-light">
    <header
      class="d-flex justify-content-end align-items-center p-3 border-bottom bg-white"
    >
      <Button
        label="Add appointment"
        class="btn btn-warning text-white fw-semibold"
        @click="isDialogOpen = true"
      />
    </header>

    <Dialog
      v-model:visible="isDialogOpen"
      :modal="true"
      :draggable="false"
      :closable="false"
      :pt="dialogPt"
    >
      <template #header>
        <div class="d-flex align-items-center w-100">
          <span class="fw-semibold">Add appointment</span>
          <button
            type="button"
            class="btn-close ms-auto"
            aria-label="Close"
            @click="isDialogOpen = false"
          ></button>
        </div>
      </template>

      <form class="d-flex flex-column gap-3">
        <div>
          <label for="patient" class="form-label fw-semibold">Patient</label>
          <AutoComplete
            v-model="selectedPatient"
            inputId="patient"
            optionLabel="name"
            :suggestions="filteredPatients"
            :completeOnFocus="true"
            :forceSelection="true"
            appendTo="self"
            panelClass="cc-autocomplete-panel"
            :pt="autoCompletePt"
            placeholder="Search by name or ID"
            @complete="searchPatients"
          >
            <template #option="slotProps">
              <div class="d-flex justify-content-between">
                <span>{{ slotProps.option.name }}</span>
              </div>
            </template>
          </AutoComplete>
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          class="btn btn-outline-secondary"
          @click="isDialogOpen = false"
        >
          Cancel
        </button>
        <button type="button" class="btn btn-warning text-white">Save</button>
      </template>
    </Dialog>
  </div>
</template>
