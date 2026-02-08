<script setup lang="ts">
import Dialog from "primevue/dialog";
import type { Appointment } from "../types";
import { dialogPt } from "../ui/primevuePt";

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{
  appointment: Appointment | null;
}>();

const emit = defineEmits<{
  (event: "check-in"): void;
  (event: "log"): void;
}>();

const v = (x: any) => (x === null || x === undefined || x === "" ? "-" : String(x));

const statusText = (s: any) => {
  const t = String(s ?? "").trim();
  return t || "-";
};
const statusClass = (s: any) => {
  const t = String(s ?? "").toLowerCase();
  if (t.includes("confirm")) return "cc-badge cc-badge-success";
  if (t.includes("complete")) return "cc-badge cc-badge-success";
  if (t.includes("cancel")) return "cc-badge cc-badge-danger";
  if (t.includes("pend")) return "cc-badge cc-badge-warning";
  return "cc-badge cc-badge-muted";
};

const patientName = () => v(props.appointment?.patient?.name);
const patientPhone = () => v(props.appointment?.patient?.phone);

const locationText = () =>
  v((props.appointment as any)?.location ?? (props.appointment as any)?.address ?? (props.appointment as any)?.city);

const scheduleText = () =>
  `${v(props.appointment?.date)} — ${v(props.appointment?.start_time)} - ${v(props.appointment?.end_time)}`;

type TeamItem = { role: string; name: string; confirmed?: boolean };

const careTeam = (): TeamItem[] => {
  const a: any = props.appointment;

  const list: TeamItem[] = [];

  if (a?.doctor?.name) list.push({ role: "Doctor", name: v(a.doctor.name), confirmed: true });
  if (a?.nurse?.name) list.push({ role: "Nurse", name: v(a.nurse.name), confirmed: true });

  // social worker keys fallback
  const swName =
    a?.social_worker?.name ??
    a?.socialWorker?.name ??
    a?.social_worker_name ??
    a?.social_worker?.full_name;

  if (swName) list.push({ role: "Social Worker", name: v(swName), confirmed: true });

  // لو مفيش حد ظاهر
  if (!list.length) list.push({ role: "Care Team", name: "-", confirmed: false });

  return list;
};
</script>

<template>
  <Dialog v-model:visible="visible" :modal="true" :draggable="false" :closable="false" :pt="dialogPt"
    class="cc-apt-dialog">
    <!-- HEADER -->
    <template #header>
      <div class="cc-head">
        <div class="cc-head-top">
          <router-link class="cc-title cc-link">
            {{ patientName() }}
          </router-link>

          <div class="cc-head-actions">
            <span :class="statusClass(props.appointment?.status)">
              {{ statusText(props.appointment?.status) }}
            </span>

            <button type="button" class="cc-icon-btn cc-dialog-close rounded" aria-label="Close"
              @click="visible = false">
              X
            </button>
          </div>
        </div>

        <div class="cc-sub">
          <div class="cc-sub-item">
            <span class="cc-sub-ic"><i class="fa-solid fa-phone"></i></span>
            <span dir="ltr">{{ patientPhone() }}</span>
          </div>

          <div class="cc-sub-item">
            <span class="cc-sub-ic"><i class="fa-solid fa-location-dot"></i></span>
            <span class="cc-sub-text">{{ locationText() }}</span>
          </div>
        </div>

        <div class="cc-chip-row">
          <div class="cc-chip">
            <span class="cc-chip-ic"><i class="fa-regular fa-calendar"></i></span>
            <span class="cc-chip-lbl">Schedule:</span>
            <span class="cc-chip-val">{{ scheduleText() }}</span>
          </div>

          <div class="cc-chip">
            <span class="cc-chip-ic"><i class="fa-solid fa-tag"></i></span>
            <span class="cc-chip-lbl">Visit Type:</span>
            <span class="cc-chip-val">{{ v(props.appointment?.visit_type) }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- BODY -->
    <div class="cc-body">
      <div class="cc-card">
        <div class="cc-card-title">Care Team</div>

        <div class="cc-team-list">
          <div v-for="(m, idx) in careTeam()" :key="idx" class="cc-team-item">
            <div class="cc-team-left">
              <div class="cc-team-role">{{ m.role }}</div>
              <div class="cc-team-name">{{ m.name }}</div>
              <div class="cc-team-time">
                Time: {{ v(props.appointment?.start_time) }} - {{ v(props.appointment?.end_time) }}
              </div>
            </div>

            <div class="cc-team-right">
              <span class="cc-confirm" v-if="m.confirmed">
                <span class="cc-confirm-dot">✓</span>
                Confirmed
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="cc-actions">
        <button type="button" class="cc-btn cc-btn-primary" @click="emit('check-in')">
          View Visit
        </button>

        <button type="button" class="cc-btn cc-btn-warn" @click="emit('log')">
          Log
        </button>
      </div>
    </div>

    <!-- footer فاضي زي الصورة -->
    <template #footer>
      <div style="height:0" />
    </template>
  </Dialog>
</template>

<style scoped>
/* Prime dialog paddings */
.cc-apt-dialog :deep(.p-dialog-header) {
  padding: 14px 16px 10px;
  border-bottom: 1px solid #eef2f7;
}

.cc-apt-dialog :deep(.p-dialog-content) {
  padding: 14px 16px 16px;
}

.cc-apt-dialog :deep(.p-dialog-footer) {
  padding: 0;
  border-top: 0;
}

/* Header */
.cc-head {
  display: grid;
  gap: 10px;
  width: 100%;
}

.cc-head-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.cc-title {
  font-weight: 700;
  font-size: 18px;
  color: #1f2937;
}

.cc-head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cc-link{
  text-decoration: none;
  color: #0f766e;
  font-weight: 800;
  transition: color .2s ease;
}

.cc-link:hover{
  text-decoration: underline;
  color: #115e59;
}

/* subtitle row */
.cc-sub {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  color: #6b7280;
  font-size: 13px;
}

.cc-sub-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.cc-sub-ic {
  font-size: 14px;
}

.cc-sub-text {
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

/* chips */
.cc-chip-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.cc-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fafafa;
  font-size: 13px;
  color: #111827;
}

.cc-chip-ic {
  font-size: 14px;
}

.cc-chip-lbl {
  color: #374151;
  font-weight: 600;
}

.cc-chip-val {
  color: #111827;
}

/* badges */
.cc-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid transparent;
  white-space: nowrap;
}

.cc-badge-success {
  background: #e8fbf2;
  color: #0f766e;
  border-color: #bff3d8;
}

.cc-badge-warning {
  background: #fff7ed;
  color: #c2410c;
  border-color: #fed7aa;
}

.cc-badge-danger {
  background: #fef2f2;
  color: #b91c1c;
  border-color: #fecaca;
}

.cc-badge-muted {
  background: #f3f4f6;
  color: #374151;
  border-color: #e5e7eb;
}

/* Body */
.cc-body {
  display: grid;
  gap: 12px;
}

/* Card */
.cc-card {
  border: 1px solid #eef2f7;
  border-radius: 12px;
  padding: 12px;
  background: #fff;
}

.cc-card-title {
  font-weight: 700;
  font-size: 13px;
  color: #111827;
  margin-bottom: 10px;
}

/* Team list */
.cc-team-list {
  display: grid;
  gap: 12px;
}

.cc-team-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eef2f7;
}

.cc-team-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.cc-team-left {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.cc-team-role {
  font-size: 12px;
  color: #6b7280;
}

.cc-team-name {
  font-weight: 800;
  color: #111827;
}

.cc-team-time {
  font-size: 12px;
  color: #6b7280;
}

.cc-team-right {
  display: flex;
  align-items: center;
}

.cc-confirm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #0f766e;
  font-weight: 700;
  font-size: 13px;
  white-space: nowrap;
}

.cc-confirm-dot {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #e8fbf2;
  border: 1px solid #bff3d8;
  display: grid;
  place-items: center;
  font-size: 12px;
}

/* Bottom actions */
.cc-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding-top: 6px;
}

.cc-btn {
  border: 0;
  cursor: pointer;
  border-radius: 6px;
  padding: 7px 12px;
  font-weight: 700;
  font-size: 12px;
}

.cc-btn-primary {
  background: #0ea5a4;
  color: #fff;
}

.cc-btn-primary:hover {
  filter: brightness(0.95);
}

.cc-btn-warn {
  background: #f59e0b;
  color: #fff;
}

.cc-btn-warn:hover {
  filter: brightness(0.95);
}
</style>
