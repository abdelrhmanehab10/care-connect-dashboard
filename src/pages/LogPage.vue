<script setup lang="ts">
import { computed, ref } from "vue";

const emit = defineEmits<{
  (event: "back"): void;
}>();

type LogEntry = {
  employee: string;
  patient: string;
  action: string;
  timestamp: string;
};

const logs = ref<LogEntry[]>([
  {
    employee: "Nadia Shah",
    patient: "Isabel Ortiz",
    action: "Checked in",
    timestamp: "2026-02-05 09:12",
  },
  {
    employee: "Aaron Miles",
    patient: "Daniel Park",
    action: "Updated visit notes",
    timestamp: "2026-02-05 09:34",
  },
  {
    employee: "Priya Desai",
    patient: "Maria Gomez",
    action: "Rescheduled appointment",
    timestamp: "2026-02-05 10:02",
  },
]);

const logRows = computed(() =>
  logs.value.map((entry, index) => ({
    index: index + 1,
    ...entry,
  })),
);
</script>

<template>
  <div class="cc-page">
    <div class="cc-container cc-layout">
      <section class="cc-main">
        <div class="cc-toolbar">
          <h2 class="cc-title">Appointment Log</h2>
          <button type="button" class="cc-btn cc-btn-outline" @click="emit('back')">
            Back to Appointments
          </button>
        </div>

        <div class="cc-table-card">
          <div class="cc-table-wrap">
            <table class="cc-table">
              <thead class="cc-table-head">
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Employee</th>
                  <th scope="col">Patient</th>
                  <th scope="col">Action</th>
                  <th scope="col">Timestamp</th>
                </tr>
              </thead>
              <tbody class="cc-table-body">
                <tr v-if="logRows.length === 0">
                  <td colspan="5" class="cc-help-text">
                    No log entries yet.
                  </td>
                </tr>
                <tr v-for="row in logRows" :key="row.index">
                  <td>{{ row.index }}</td>
                  <td>{{ row.employee }}</td>
                  <td>{{ row.patient }}</td>
                  <td>{{ row.action }}</td>
                  <td>{{ row.timestamp }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
