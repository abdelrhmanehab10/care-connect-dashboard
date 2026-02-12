<script setup lang="ts">
import { computed, getCurrentInstance, ref, watch } from "vue";
import { CheckCircle, XCircle, Ban, Loader2, X } from "lucide-vue-next";
import Dialog from "primevue/dialog";
import AppointmentEditReasonDialog from "./AppointmentEditReasonDialog.vue";
import type { Appointment, Confirmation } from "../types";
import {
  cancelAppointment as cancelAppointmentApi,
  confirmAppointmentAll,
  confirmAppointmentEmployee,
  quickNoShowAppointment,
} from "../services/appointments";
import { dialogPt } from "../ui/primevuePt";

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{
  appointment: Appointment | null;
}>();

const emit = defineEmits<{
  (event: "check-in"): void;
  (event: "log", payload: number): void;
  (event: "confirm-all", payload: Appointment): void;
  (event: "confirm-employee", payload: Appointment): void;
  (event: "no-show", payload: Appointment): void;
  (event: "cancel", payload: Appointment): void;
}>();

type RouterLike = {
  push?: (to: string) => unknown;
};

const instance = getCurrentInstance();
const appRouter = (instance?.proxy as { $router?: RouterLike } | null)?.$router;

const appointmentData = computed(() => props.appointment);
const appointmentId = computed(() => appointmentData.value?.id ?? null);
const isConfirming = ref(false);
const isNoShowLoading = ref(false);
const isCancelLoading = ref(false);
const statusOverride = ref<string | null>(null);
const confirmingEmployeeIds = ref<number[]>([]);
const optimisticConfirmedEmployeeIds = ref<number[]>([]);
const reasonDialogVisible = ref(false);
const reasonText = ref("");

type PendingReasonAction =
  {
      type: "cancel";
      appointment: Appointment;
    };

const pendingReasonAction = ref<PendingReasonAction | null>(null);

const v = (x: any) =>
  x === null || x === undefined || x === "" ? "-" : String(x);

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

const displayStatus = computed(
  () => statusOverride.value ?? appointmentData.value?.status ?? null,
);
const normalizedStatus = computed(() =>
  String(displayStatus.value ?? "")
    .trim()
    .toLowerCase(),
);
const isConfirmableStatus = computed(
  () => normalizedStatus.value === "new" || normalizedStatus.value === "waiting",
);
const isStatusConfirmed = computed(() =>
  normalizedStatus.value.includes("confirm"),
);

watch(
  () => appointmentData.value?.status ?? null,
  (value) => {
    statusOverride.value = value;
  },
  { immediate: true },
);

const resetRowConfirmState = () => {
  confirmingEmployeeIds.value = [];
  optimisticConfirmedEmployeeIds.value = [];
};

const resetReasonDialogState = () => {
  reasonDialogVisible.value = false;
  reasonText.value = "";
  pendingReasonAction.value = null;
};

watch(
  () => appointmentData.value?.id ?? null,
  () => {
    resetRowConfirmState();
    resetReasonDialogState();
  },
);

watch(visible, (value) => {
  if (!value) {
    resetRowConfirmState();
    resetReasonDialogState();
  }
});

const patientName = () => v(appointmentData.value?.patient?.name);
const patientPhone = () => v(appointmentData.value?.patient?.phone);

const normalizeCoordinate = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const locationMapUrl = computed(() => {
  const patientAddress = (appointmentData.value as any)?.patient_address;
  if (!patientAddress || typeof patientAddress !== "object") {
    return null;
  }

  const lat = normalizeCoordinate(patientAddress.lat);
  const lng = normalizeCoordinate(patientAddress.lng);
  if (lat !== null && lng !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  }

  const address = String(patientAddress.address ?? "").trim();
  const city = String(patientAddress.city ?? "").trim();
  const query = [address, city].filter(Boolean).join(", ");
  if (!query) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
});

const locationText = () => {
  const address = (appointmentData.value as any)?.patient_address?.address;
  const city = (appointmentData.value as any)?.patient_address?.city;
  if (address && city) {
    const normalized = String(address);
    if (normalized.toLowerCase().includes(String(city).toLowerCase())) {
      return v(address);
    }
    return v(`${address}, ${city}`);
  }
  return v(
    address ??
      city ??
      (appointmentData.value as any)?.location ??
      (appointmentData.value as any)?.address ??
      (appointmentData.value as any)?.city,
  );
};

const scheduleText = () =>
  `${v(appointmentData.value?.date)} - ${v(appointmentData.value?.start_time)} - ${v(appointmentData.value?.end_time)}`;

type TeamItem = {
  role: string;
  name: string;
  employeeId: number | null;
  confirmed: boolean;
  isConfirming: boolean;
  canConfirm: boolean;
  start_time?: string;
  end_time?: string;
};

type AppointmentWithConfirmations = Appointment & {
  confirmations?: Confirmation[] | null;
  confirmation?: Confirmation[] | null;
};

const normalizeId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
};

const confirmationList = computed<Confirmation[]>(() => {
  const appointment = appointmentData.value as AppointmentWithConfirmations | null;
  if (!appointment) {
    return [];
  }
  if (Array.isArray(appointment.confirmations)) {
    return appointment.confirmations;
  }
  if (Array.isArray(appointment.confirmation)) {
    return appointment.confirmation;
  }
  return [];
});

const confirmedEmployeeIds = computed(() => {
  const ids = new Set<number>();
  for (const item of confirmationList.value) {
    const byConfirmedBy = normalizeId(item.confirmed_by);
    const byEmployeeId = normalizeId(item.employee_id);
    if (byConfirmedBy !== null) {
      ids.add(byConfirmedBy);
    } else if (byEmployeeId !== null) {
      ids.add(byEmployeeId);
    }
  }
  return ids;
});

const isEmployeeConfirming = (employeeId: number | null) =>
  employeeId !== null && confirmingEmployeeIds.value.includes(employeeId);

const isEmployeeConfirmed = (employeeId: number | null) => {
  if (isStatusConfirmed.value) {
    return true;
  }
  if (employeeId === null) {
    return false;
  }
  return (
    confirmedEmployeeIds.value.has(employeeId) ||
    optimisticConfirmedEmployeeIds.value.includes(employeeId)
  );
};

const canConfirmEmployee = (employeeId: number | null, confirmed: boolean) =>
  Boolean(
    appointmentId.value &&
      employeeId !== null &&
      isConfirmableStatus.value &&
      !confirmed,
  );

const buildTeamItem = (base: {
  role: string;
  name: string;
  employeeId: number | null;
  start_time?: string;
  end_time?: string;
}): TeamItem => {
  const confirmed = isEmployeeConfirmed(base.employeeId);
  return {
    ...base,
    confirmed,
    isConfirming: isEmployeeConfirming(base.employeeId),
    canConfirm: canConfirmEmployee(base.employeeId, confirmed),
  };
};

const careTeam = computed<TeamItem[]>(() => {
  const appointment: any = appointmentData.value;
  const list: TeamItem[] = [];

  if (Array.isArray(appointment?.care_team) && appointment.care_team.length > 0) {
    for (const member of appointment.care_team) {
      const role = String(member?.role ?? "")
        .replace(/_/g, " ")
        .trim();
      list.push(
        buildTeamItem({
          role: role ? role.charAt(0).toUpperCase() + role.slice(1) : "Care Team",
          name: v(member?.employee?.name ?? member?.name ?? ""),
          employeeId: normalizeId(member?.employee?.id ?? member?.employee_id),
          start_time: member?.start_time,
          end_time: member?.end_time,
        }),
      );
    }
  }

  if (!list.length) {
    if (appointment?.doctor?.name) {
      list.push(
        buildTeamItem({
          role: "Doctor",
          name: v(appointment.doctor.name),
          employeeId: normalizeId(appointment?.doctor?.id),
        }),
      );
    }
    if (appointment?.nurse?.name) {
      list.push(
        buildTeamItem({
          role: "Nurse",
          name: v(appointment.nurse.name),
          employeeId: normalizeId(appointment?.nurse?.id),
        }),
      );
    }

    const swName =
      appointment?.social_worker?.name ??
      appointment?.socialWorker?.name ??
      appointment?.social_worker_name ??
      appointment?.social_worker?.full_name;
    if (swName) {
      list.push(
        buildTeamItem({
          role: "Social Worker",
          name: v(swName),
          employeeId: normalizeId(
            appointment?.social_worker?.id ?? appointment?.socialWorker?.id,
          ),
        }),
      );
    }
  }

  if (!list.length) {
    list.push(
      buildTeamItem({
        role: "Care Team",
        name: "-",
        employeeId: null,
      }),
    );
  }

  return list;
});

const openReasonForAction = (action: PendingReasonAction) => {
  if (reasonDialogVisible.value) {
    return;
  }

  pendingReasonAction.value = action;
  reasonText.value = "";
  reasonDialogVisible.value = true;
};

const requestConfirmEmployee = (employeeId: number | null) => {
  const appointment = appointmentData.value;
  if (
    !appointment?.id ||
    employeeId === null ||
    !isConfirmableStatus.value ||
    isEmployeeConfirming(employeeId) ||
    isEmployeeConfirmed(employeeId)
  ) {
    return;
  }

  confirmingEmployeeIds.value = [...confirmingEmployeeIds.value, employeeId];
  if (!optimisticConfirmedEmployeeIds.value.includes(employeeId)) {
    optimisticConfirmedEmployeeIds.value = [
      ...optimisticConfirmedEmployeeIds.value,
      employeeId,
    ];
  }

  void confirmAppointmentEmployee(appointment.id, employeeId)
    .then(() => {
      emit("confirm-employee", appointment);
    })
    .catch((error) => {
      console.error("Failed to confirm appointment employee.", error);
      optimisticConfirmedEmployeeIds.value =
        optimisticConfirmedEmployeeIds.value.filter((id) => id !== employeeId);
    })
    .finally(() => {
      confirmingEmployeeIds.value = confirmingEmployeeIds.value.filter(
        (id) => id !== employeeId,
      );
    });
};

const requestConfirmAll = () => {
  const appointment = appointmentData.value;
  if (!appointment?.id || isConfirming.value) {
    return;
  }

  isConfirming.value = true;
  void confirmAppointmentAll(appointment.id)
    .then(() => {
      statusOverride.value = "confirmed";
      emit("confirm-all", appointment);
    })
    .catch((error) => {
      console.error("Failed to confirm appointment.", error);
    })
    .finally(() => {
      isConfirming.value = false;
    });
};

const requestNoShow = () => {
  const appointment = appointmentData.value;
  if (!appointment?.id || isNoShowLoading.value) {
    return;
  }

  isNoShowLoading.value = true;
  void quickNoShowAppointment(appointment.id)
    .then(() => {
      statusOverride.value = "no_show";
      emit("no-show", appointment);
    })
    .catch((error) => {
      console.error("Failed to mark appointment as no show.", error);
    })
    .finally(() => {
      isNoShowLoading.value = false;
    });
};

const requestCancel = () => {
  const appointment = appointmentData.value;
  if (!appointment?.id || isCancelLoading.value) {
    return;
  }

  openReasonForAction({
    type: "cancel",
    appointment,
  });
};

const confirmReasonAndRun = async () => {
  const action = pendingReasonAction.value;
  const reason = reasonText.value.trim();
  if (!action || !reason) {
    return;
  }

  resetReasonDialogState();

  switch (action.type) {
    case "cancel": {
      const { appointment } = action;
      if (!appointment?.id || isCancelLoading.value) {
        return;
      }

      isCancelLoading.value = true;
      try {
        await cancelAppointmentApi(appointment.id, { reason });
        statusOverride.value = "canceled";
        emit("cancel", appointment);
      } catch (error) {
        console.error("Failed to cancel appointment.", error);
      } finally {
        isCancelLoading.value = false;
      }
      return;
    }
  }
};

const cancelReasonModal = () => {
  resetReasonDialogState();
};

const handleCheckIn = () => {
  if (!appointmentId.value) return;
  const destination = `/visits/start/${appointmentId.value}`;
  emit("check-in");
  if (appRouter?.push) {
    void appRouter.push(destination);
    return;
  }
  window.location.assign(destination);
};
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :modal="true"
    :draggable="false"
    :closable="false"
    :pt="dialogPt"
    class="cc-apt-dialog"
  >
    <!-- HEADER -->
    <template #header>
      <div class="cc-head">
        <div class="cc-head-top">
          <span class="cc-title cc-link">
            {{ patientName() }}
          </span>

          <div class="cc-head-actions">
            <span :class="statusClass(displayStatus)">
              {{ statusText(displayStatus) }}
            </span>

            <div class="cc-status-actions">
              <button
                type="button"
                class="cc-icon-btn cc-icon-btn-outline cc-icon-btn--confirm"
                aria-label="Confirm appointment"
                title="Confirm"
                :disabled="!appointmentId || isConfirming"
                @click="requestConfirmAll"
              >
                <Loader2 v-if="isConfirming" class="cc-icon cc-icon-spinner" />
                <CheckCircle v-else class="cc-icon" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="cc-icon-btn cc-icon-btn-outline cc-icon-btn--no-show"
                aria-label="Mark as no show"
                title="No show"
                :disabled="!appointmentId || isNoShowLoading"
                @click="requestNoShow"
              >
                <Loader2
                  v-if="isNoShowLoading"
                  class="cc-icon cc-icon-spinner"
                />
                <XCircle v-else class="cc-icon" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="cc-icon-btn cc-icon-btn-outline cc-icon-btn--cancel"
                aria-label="Cancel appointment"
                title="Cancel"
                :disabled="!appointmentId || isCancelLoading"
                @click="requestCancel"
              >
                <Loader2
                  v-if="isCancelLoading"
                  class="cc-icon cc-icon-spinner"
                />
                <Ban v-else class="cc-icon" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="cc-icon-btn cc-dialog-close"
                aria-label="Close"
                @click="visible = false"
              >
                <X class="cc-icon" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div class="cc-sub">
          <div class="cc-sub-item">
            <span class="cc-sub-ic"><i class="fa-solid fa-phone"></i></span>
            <span dir="ltr">{{ patientPhone() }}</span>
          </div>

          <div class="cc-sub-item">
            <span class="cc-sub-ic"
              ><i class="fa-solid fa-location-dot"></i
            ></span>
            <span class="cc-sub-text">{{ locationText() }}</span>
          </div>
          <a
            v-if="locationMapUrl"
            :href="locationMapUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="cc-map-link"
            aria-label="Open location in Google Maps"
            title="Open in Google Maps"
          >
            <i class="fa-solid fa-diamond-turn-right"></i>
          </a>
        </div>

        <div class="cc-chip-row">
          <div class="cc-chip">
            <span class="cc-chip-ic"
              ><i class="fa-regular fa-calendar"></i
            ></span>
            <span class="cc-chip-lbl">Schedule:</span>
            <span class="cc-chip-val">{{ scheduleText() }}</span>
          </div>

          <div class="cc-chip">
            <span class="cc-chip-ic"><i class="fa-solid fa-tag"></i></span>
            <span class="cc-chip-lbl">Visit Type:</span>
            <span class="cc-chip-val">{{
              v(appointmentData?.visit_type)
            }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- BODY -->
    <div class="cc-body">
      <div class="cc-card">
        <div class="cc-card-title">Care Team</div>

        <div class="cc-team-list">
          <div v-for="(m, idx) in careTeam" :key="idx" class="cc-team-item">
            <div class="cc-team-left">
              <div class="cc-team-role">{{ m.role }}</div>
              <div class="cc-team-name">{{ m.name }}</div>
              <div class="cc-team-time">
                Time: {{ v(m.start_time ?? appointmentData?.start_time) }} -
                {{ v(m.end_time ?? appointmentData?.end_time) }}
              </div>
            </div>

            <div class="cc-team-right">
              <span class="cc-confirm" v-if="m.confirmed"> Confirmed </span>
              <button
                v-else-if="m.canConfirm"
                type="button"
                class="cc-btn cc-team-confirm-btn"
                :disabled="m.isConfirming"
                @click="requestConfirmEmployee(m.employeeId)"
              >
                <Loader2 v-if="m.isConfirming" class="cc-icon cc-icon-spinner" />
                <span v-else>Confirm</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="cc-actions">
        <button
          type="button"
          class="cc-btn cc-btn-primary"
          @click="handleCheckIn"
        >
          Check In
        </button>

        <button
          type="button"
          class="cc-btn cc-btn-warn"
          :disabled="!appointmentId"
          @click="appointmentId && emit('log', appointmentId)"
        >
          Log
        </button>
      </div>
    </div>

    <!-- footer ÙØ§Ø¶ÙŠ Ø²ÙŠ Ø§Ù„ØµÙˆØ±Ø© -->
    <template #footer>
      <div style="height: 0" />
    </template>
  </Dialog>
  <AppointmentEditReasonDialog
    v-model:visible="reasonDialogVisible"
    v-model:reasonText="reasonText"
    @confirm="confirmReasonAndRun"
    @cancel="cancelReasonModal"
    @hide="cancelReasonModal"
  />
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

.cc-status-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cc-status-actions .cc-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
}

.cc-status-actions .cc-icon {
  width: 16px;
  height: 16px;
}

.cc-status-actions .cc-icon-btn--confirm:hover,
.cc-status-actions .cc-icon-btn--confirm:focus-visible {
  border-color: var(--cc-success);
  color: var(--cc-success);
  background: rgba(26, 127, 90, 0.12);
}

.cc-status-actions .cc-icon-btn--no-show:hover,
.cc-status-actions .cc-icon-btn--no-show:focus-visible {
  border-color: var(--cc-warning);
  color: var(--cc-warning);
  background: rgba(217, 138, 16, 0.12);
}

.cc-status-actions .cc-icon-btn--cancel:hover,
.cc-status-actions .cc-icon-btn--cancel:focus-visible {
  border-color: var(--cc-danger);
  color: var(--cc-danger);
  background: rgba(204, 63, 63, 0.12);
}
.cc-link {
  text-decoration: none;
  color: #0f766e;
  font-weight: 800;
  transition: color 0.2s ease;
}

.cc-link:hover {
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
  align-items: center;
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

.cc-map-link {
  color: inherit;
  text-decoration: none;
}

.cc-map-link:hover {
  color: #0f766e;
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

.cc-team-confirm-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid #bff3d8;
  border-radius: 999px;
  background: #e8fbf2;
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
}

.cc-team-confirm-btn:hover {
  filter: none;
  background: #d8f5e8;
}

.cc-team-confirm-btn:disabled {
  opacity: 0.7;
  cursor: default;
}

.cc-team-confirm-btn .cc-icon {
  width: 14px;
  height: 14px;
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
