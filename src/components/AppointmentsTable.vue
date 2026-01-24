<script setup lang="ts">
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import type { DataTableCellEditCompleteEvent } from "primevue/datatable";
import type { Appointment } from "../composables/useAppointments";
import type { AppointmentStatus } from "../data/options";
import { dataTablePt } from "../ui/primevuePt";

defineProps<{
  appointments: ReadonlyArray<Appointment>;
  statusOptions: ReadonlyArray<AppointmentStatus>;
  statusBadgeClass: (status: AppointmentStatus) => string;
}>();

const emit = defineEmits<{
  (event: "cell-edit-complete", payload: DataTableCellEditCompleteEvent<Appointment>): void;
}>();
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
        <template #editor="{ data }">
          <input v-model="data.patient" class="form-control form-control-sm" />
        </template>
      </Column>

      <Column header="Time">
        <template #body="{ data }">
          <span class="text-nowrap">{{ data.startTime }} - {{ data.endTime }}</span>
        </template>
        <template #editor="{ data }">
          <div class="d-flex gap-2">
            <input
              v-model="data.startTime"
              type="time"
              class="form-control form-control-sm"
            />
            <input
              v-model="data.endTime"
              type="time"
              class="form-control form-control-sm"
            />
          </div>
        </template>
      </Column>

      <Column field="status" header="Status">
        <template #body="{ data }">
          <span class="badge" :class="statusBadgeClass(data.status)">
            {{ data.status }}
          </span>
        </template>
        <template #editor="{ data }">
          <select v-model="data.status" class="form-select form-select-sm">
            <option v-for="status in statusOptions" :key="status" :value="status">
              {{ status }}
            </option>
          </select>
        </template>
      </Column>

      <Column field="nurse" header="Nurse">
        <template #editor="{ data }">
          <input v-model="data.nurse" class="form-control form-control-sm" />
        </template>
      </Column>

      <Column field="doctor" header="Doctor">
        <template #editor="{ data }">
          <input v-model="data.doctor" class="form-control form-control-sm" />
        </template>
      </Column>

      <Column header="Actions" style="width: 8.5rem" />
    </DataTable>
  </div>
</template>
