<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { fetchAppointmentLog, type AppointmentLogEntry } from "../services/appointments";

const emit = defineEmits<{
  (event: "back"): void;
}>();

const props = defineProps<{
  appointmentId: number | null;
}>();

const logs = ref<AppointmentLogEntry[]>([]);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);

const loadLogs = async (appointmentId: number | null) => {
  if (!appointmentId) {
    logs.value = [];
    errorMessage.value = "Select an appointment to view its log.";
    return;
  }
  isLoading.value = true;
  errorMessage.value = null;
  try {
    logs.value = await fetchAppointmentLog(appointmentId);
  } catch (error) {
    console.error("Failed to load appointment log.", error);
    logs.value = [];
    errorMessage.value = "Failed to load appointment log.";
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.appointmentId,
  (value) => {
    void loadLogs(value);
  },
  { immediate: true },
);

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
          <button type="button" class="cc-tab-link is-active btn-sm" @click="emit('back')">
            <i class="fa-solid fa-arrow-left me-2"></i>
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
                <tr v-if="isLoading">
                  <td colspan="5" class="cc-help-text">
                    Loading log entries...
                  </td>
                </tr>
                <tr v-else-if="errorMessage">
                  <td colspan="5" class="cc-help-text">
                    {{ errorMessage }}
                  </td>
                </tr>
                <tr v-else-if="logRows.length === 0">
                  <td colspan="5" class="cc-help-text">
                    No log entries yet.
                  </td>
                </tr>
                <tr v-for="row in logRows" :key="row.index">
                  <td>{{ row.index }}</td>
                  <td>{{ row.employee }}</td>
                  <td>{{ row.patient }}</td>
                  <td>{{ row.action }}</td>
                  <td>{{ row.time }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
<style scoped>
/* ===== page layout ===== */
.cc-page{
  background: #ffffff;
}

.cc-container{
  max-width: 1100px;
  margin: 0 auto;
  padding: 22px 18px 30px;
}

.cc-layout{
  display: grid;
}

.cc-main{
  min-width: 0;
}

/* ===== toolbar ===== */
.cc-toolbar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.cc-title{
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color:#111827;
}

/* button (fallback if you already have global cc-btn styles) */
.cc-btn{
  border: 0;
  cursor: pointer;
  border-radius: 10px;
  padding: 9px 12px;
  font-weight: 700;
  font-size: 13px;
  display:inline-flex;
  align-items:center;
  gap: 8px;
  transition: transform .05s ease, box-shadow .15s ease, background .15s ease, border-color .15s ease;
}

.cc-btn:active{ transform: translateY(1px); }

.cc-btn-outline{
  background:#fff;
  border: 1px solid #e5e7eb;
  color:#111827;
  box-shadow: 0 1px 0 rgba(17,24,39,0.03);
}

.cc-btn-outline:hover{
  background:#f9fafb;
  border-color:#d1d5db;
}

/* ===== card ===== */
.cc-table-card{
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background:#fff;
  box-shadow: 0 10px 30px rgba(17, 24, 39, 0.06);
  overflow: hidden;
}

.cc-table-wrap{
  overflow:auto;
}

/* ===== table ===== */
.cc-table{
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 760px; /* عشان الـ responsive scroll */
}

.cc-table-head th{
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f8fafc;
  color:#111827;
  font-weight: 800;
  font-size: 13px;
  text-align: left;
  padding: 12px 14px;
  border-bottom: 1px solid #e5e7eb;
}

.cc-table-body td{
  padding: 12px 14px;
  border-bottom: 1px solid #eef2f7;
  font-size: 13px;
  color:#111827;
  vertical-align: middle;
}

.cc-table-body tr:nth-child(even){
  background: #fafafa;
}

.cc-table-body tr:hover{
  background: #f3f4f6;
}

.cc-table-body td:first-child,
.cc-table-head th:first-child{
  width: 56px;
  color:#374151;
}

.cc-help-text{
  text-align:center;
  color:#6b7280;
  padding: 22px 14px !important;
}

/* ===== action pill ===== */
.cc-pill{
  display:inline-flex;
  align-items:center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  border: 1px solid transparent;
  white-space: nowrap;
}

/* variants by keyword (simple + robust) */
.cc-pill[data-variant*="check"]{
  background:#e8fbf2;
  color:#0f766e;
  border-color:#bff3d8;
}
.cc-pill[data-variant*="update"]{
  background:#eef2ff;
  color:#3730a3;
  border-color:#c7d2fe;
}
.cc-pill[data-variant*="resched"],
.cc-pill[data-variant*="schedule"]{
  background:#fff7ed;
  color:#c2410c;
  border-color:#fed7aa;
}
.cc-pill:not([data-variant]){
  background:#f3f4f6;
  color:#374151;
  border-color:#e5e7eb;
}

/* ===== responsive ===== */
@media (max-width: 720px){
  .cc-toolbar{
    flex-direction: column;
    align-items: flex-start;
  }
  .cc-title{ font-size: 22px; }
  .cc-btn{ width: 100%; justify-content: center; }
  .cc-table{ min-width: 680px; }
}
</style>
