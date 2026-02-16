<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { CheckCircle, XCircle, Ban, Loader2, X } from "lucide-vue-next";
import Dialog from "primevue/dialog";
import AppointmentEditReasonDialog from "./AppointmentEditReasonDialog.vue";
import type { Appointment, Confirmation } from "../types";
import {
  fetchAppointmentLog,
  type AppointmentLogEntry,
  cancelAppointment as cancelAppointmentApi,
  confirmAppointmentAll,
  confirmAppointmentEmployee,
  quickNoShowAppointment,
} from "../services/appointments";
import { dialogPt } from "../ui/primevuePt";
import { useReasonRequiredAction } from "../composables/useReasonRequiredAction";
import { isSameCalendarDay, parseLocalDateOnly } from "../lib/dateUtils";
import {
  formatStatusLabel,
  isFinalStatus,
} from "../lib/statusTransitions";

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{
  appointment: Appointment | null;
}>();

const emit = defineEmits<{
  (event: "check-in"): void;
  (event: "edit", payload: Appointment): void;
  (event: "confirm-all", payload: Appointment): void;
  (event: "confirm-employee", payload: Appointment): void;
  (event: "no-show", payload: Appointment): void;
  (event: "cancel", payload: Appointment): void;
}>();

const appointmentData = computed(() => props.appointment);
const appointmentId = computed(() => appointmentData.value?.id ?? null);
const isConfirming = ref(false);
const isNoShowLoading = ref(false);
const isCancelLoading = ref(false);
const statusOverride = ref<string | null>(null);
const activeView = ref<"details" | "log">("details");
const confirmingEmployeeIds = ref<number[]>([]);
const optimisticConfirmedEmployeeIds = ref<number[]>([]);
const logs = ref<AppointmentLogEntry[]>([]);
const isLogLoading = ref(false);
const logErrorMessage = ref<string | null>(null);

type PendingReasonAction = {
  type: "cancel";
  appointment: Appointment;
};

const reasonAction = useReasonRequiredAction<PendingReasonAction>({
  onConfirm: async ({ action, reason }) => {
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
  },
});
const { visible: reasonDialogVisible, reasonText } = reasonAction;

type OptionalAddress = {
  address?: string | null;
  city?: string | null;
  lat?: unknown;
  lng?: unknown;
};
type OptionalEmployeeRef = { id?: unknown; name?: string | null };
type CareTeamLike = {
  role?: string | null;
  name?: string | null;
  employee?: OptionalEmployeeRef | null;
  employee_id?: unknown;
  start_time?: string | null;
  end_time?: string | null;
};
type AppointmentWithExtras = AppointmentWithConfirmations & {
  patient_address?: OptionalAddress | null;
  location?: string | null;
  address?: string | null;
  city?: string | null;
  socialWorker?: OptionalEmployeeRef | null;
  social_worker_name?: string | null;
  care_team?: CareTeamLike[] | null;
  doctor?: OptionalEmployeeRef | null;
  nurse?: OptionalEmployeeRef | null;
  social_worker?: (OptionalEmployeeRef & { full_name?: string | null }) | null;
};

const appointmentRecord = computed<AppointmentWithExtras | null>(
  () => appointmentData.value as AppointmentWithExtras | null,
);

const v = (x: unknown) =>
  x === null || x === undefined || x === "" ? "-" : String(x);

const statusText = (s: unknown) => {
  return formatStatusLabel(s);
};
const statusClass = (s: unknown) => {
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
const canEditAppointment = computed(() => {
  if (!appointmentId.value) {
    return false;
  }
  return !isFinalStatus(displayStatus.value);
});
const normalizedStatus = computed(() =>
  String(displayStatus.value ?? "")
    .trim()
    .toLowerCase(),
);
const isConfirmableStatus = computed(
  () =>
    normalizedStatus.value === "new" || normalizedStatus.value === "waiting",
);
const isCompletedStatus = computed(
  () => normalizedStatus.value === "completed",
);
const isStatusConfirmed = computed(() =>
  normalizedStatus.value.includes("confirm"),
);
const checkInButtonLabel = computed(() =>
  isCompletedStatus.value ? "View Visit" : "Check In",
);
const hasValidDateValue = (value: Date) => !Number.isNaN(value.getTime());
const isAppointmentToday = computed(() => {
  const rawDate = String(appointmentRecord.value?.date ?? "").trim();
  if (!rawDate) {
    return false;
  }
  const parsed = parseLocalDateOnly(rawDate) ?? new Date(rawDate);
  if (!hasValidDateValue(parsed)) {
    return false;
  }
  return isSameCalendarDay(parsed, new Date());
});

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
  reasonAction.reset();
};

const resetLogViewState = () => {
  activeView.value = "details";
  logs.value = [];
  logErrorMessage.value = null;
  isLogLoading.value = false;
};
const resetDialogState = () => {
  resetRowConfirmState();
  resetReasonDialogState();
  resetLogViewState();
};

const loadingRows = computed(() =>
  Array.from({ length: 7 }, (_, index) => ({
    id: `loading-${index + 1}`,
  })),
);

const logRows = computed(() => {
  const duplicateCountByBaseKey = new Map<string, number>();
  return logs.value.map((entry, index) => {
    const base = [
      String(entry.time ?? "").trim(),
      String(entry.employee ?? "").trim(),
      String(entry.patient ?? "").trim(),
      String(entry.action ?? "").trim(),
      String(entry.reason ?? "").trim(),
    ].join("|");
    const count = (duplicateCountByBaseKey.get(base) ?? 0) + 1;
    duplicateCountByBaseKey.set(base, count);
    return {
      index: index + 1,
      key: `${base}|${count}`,
      ...entry,
    };
  });
});

watch(
  () => appointmentData.value?.id ?? null,
  () => {
    resetDialogState();
  },
);

watch(visible, (value) => {
  if (!value) {
    resetDialogState();
  }
});

const patientName = computed(() => v(appointmentRecord.value?.patient?.name));
const patientPhone = computed(() =>
  v(
    appointmentRecord.value?.patient?.mobile ??
      appointmentRecord.value?.patient?.phone,
  ),
);

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
  const patientAddress = appointmentRecord.value?.patient_address;
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

const locationText = computed(() => {
  const address = appointmentRecord.value?.patient_address?.address;
  const city = appointmentRecord.value?.patient_address?.city;
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
      appointmentRecord.value?.location ??
      appointmentRecord.value?.address ??
      appointmentRecord.value?.city,
  );
});

const scheduleText = computed(
  () =>
    `${v(appointmentRecord.value?.date)} - ${v(appointmentRecord.value?.start_time)} - ${v(appointmentRecord.value?.end_time)}`,
);

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
  const appointment =
    appointmentData.value as AppointmentWithConfirmations | null;
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
    const byEmployeeId = normalizeId(item.employee_id);
    if (byEmployeeId !== null) {
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
  const appointment = appointmentRecord.value;
  const list: TeamItem[] = [];

  if (
    Array.isArray(appointment?.care_team) &&
    appointment.care_team.length > 0
  ) {
    for (const member of appointment.care_team) {
      const role = String(member?.role ?? "")
        .replace(/_/g, " ")
        .trim();
      list.push(
        buildTeamItem({
          role: role
            ? role.charAt(0).toUpperCase() + role.slice(1)
            : "Care Team",
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
const hasAnyCareTeamEmployee = computed(() =>
  careTeam.value.some((member) => member.employeeId !== null),
);
const areAllCareTeamEmployeesConfirmed = computed(() => {
  const membersWithIds = careTeam.value.filter(
    (member) => member.employeeId !== null,
  );
  if (!membersWithIds.length) {
    return false;
  }
  return membersWithIds.every((member) => member.confirmed);
});
const canCheckIn = computed(
  () =>
    Boolean(appointmentId.value) &&
    hasAnyCareTeamEmployee.value &&
    areAllCareTeamEmployeesConfirmed.value &&
    isAppointmentToday.value,
);

const openReasonForAction = (action: PendingReasonAction) => {
  reasonAction.open(action);
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
  if (!appointment?.id || isConfirming.value || !isConfirmableStatus.value) {
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

const loadLogs = async (id: number | null) => {
  if (!id) {
    logs.value = [];
    logErrorMessage.value = "Invalid appointment id.";
    return;
  }

  isLogLoading.value = true;
  logErrorMessage.value = null;
  try {
    logs.value = await fetchAppointmentLog(id);
  } catch (error) {
    console.error("Failed to load appointment log.", error);
    logs.value = [];
    logErrorMessage.value = "Failed to load appointment log.";
  } finally {
    isLogLoading.value = false;
  }
};

watch(
  [activeView, appointmentId],
  ([view, id]) => {
    if (!visible.value || view !== "log") {
      return;
    }
    void loadLogs(id);
  },
  { immediate: true },
);

const showLogView = () => {
  if (!appointmentId.value) {
    return;
  }
  activeView.value = "log";
};

const showDetailsView = () => {
  activeView.value = "details";
};

const handleCheckIn = () => {
  if (!canCheckIn.value || !appointmentId.value) return;
  emit("check-in");
};

const handleEditAppointment = () => {
  const appointment = appointmentData.value;
  if (!appointment?.id || !canEditAppointment.value) return;
  emit("edit", appointment);
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
            {{ patientName }}
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
                :disabled="
                  !appointmentId || isConfirming || !isConfirmableStatus
                "
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
            <span dir="ltr">{{ patientPhone }}</span>
          </div>

          <div class="cc-sub-item">
            <span class="cc-sub-ic"
              ><i class="fa-solid fa-location-dot"></i
            ></span>
            <span class="cc-sub-text">{{ locationText }}</span>
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
            <span class="cc-chip-val">{{ scheduleText }}</span>
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
    <div v-if="activeView === 'details'" class="cc-body">
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
                <Loader2
                  v-if="m.isConfirming"
                  class="cc-icon cc-icon-spinner"
                />
                <span v-else>Confirm</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="cc-actions">
        <div class="cc-actions-left">
          <button
            type="button"
            class="cc-btn cc-btn-sm cc-btn-input excel-btn text-light"
            :disabled="!canCheckIn"
            @click="handleCheckIn"
          >
            {{ checkInButtonLabel }}
          </button>
          <button
            type="button"
            class="cc-btn cc-btn-primary"
            :disabled="!appointmentId || isConfirming || !isConfirmableStatus"
            @click="requestConfirmAll"
          >
            <Loader2 v-if="isConfirming" class="cc-icon cc-icon-spinner" />
            <span v-else>Confirm Appointment</span>
          </button>
        </div>

        <div class="cc-actions-right">
          <button
            type="button"
            class="cc-btn save text-light"
            :disabled="!canEditAppointment"
            @click="handleEditAppointment"
          >
            Edit Appointment
          </button>
          <button
            type="button"
            class="cc-btn cc-btn-warn"
            :disabled="!appointmentId"
            @click="showLogView"
          >
            Log
          </button>
        </div>
      </div>
    </div>

    <div v-else class="cc-log-view">
      <div class="cc-log-toolbar">
        <h3 class="cc-log-title">Appointment Log</h3>
        <button
          type="button"
          class="cc-btn cc-btn-outline"
          @click="showDetailsView"
        >
          <i class="fa-solid fa-arrow-left"></i>
          <span>Back to Details</span>
        </button>
      </div>

      <div class="cc-card cc-log-card">
        <div class="cc-log-table-wrap">
          <table class="cc-log-table">
            <thead class="cc-log-head">
              <tr>
                <th scope="col">#</th>
                <th scope="col">Employee</th>
                <th scope="col">Patient</th>
                <th scope="col">Action</th>
                <th scope="col">Reason</th>
                <th scope="col">Timestamp</th>
              </tr>
            </thead>
            <tbody class="cc-log-body">
              <template v-if="isLogLoading">
                <tr v-for="row in loadingRows" :key="row.id">
                  <td><span class="cc-skeleton cc-skeleton-sm"></span></td>
                  <td><span class="cc-skeleton cc-skeleton-md"></span></td>
                  <td><span class="cc-skeleton cc-skeleton-md"></span></td>
                  <td><span class="cc-skeleton cc-skeleton-pill"></span></td>
                  <td><span class="cc-skeleton cc-skeleton-md"></span></td>
                  <td><span class="cc-skeleton cc-skeleton-lg"></span></td>
                </tr>
              </template>
              <tr v-else-if="logErrorMessage">
                <td colspan="6" class="cc-help-text">
                  {{ logErrorMessage }}
                </td>
              </tr>
              <tr v-else-if="logRows.length === 0">
                <td colspan="6" class="cc-help-text">No log entries yet.</td>
              </tr>
              <tr v-for="row in logRows" :key="row.key">
                <td>{{ row.index }}</td>
                <td>{{ row.employee }}</td>
                <td>{{ row.patient }}</td>
                <td>{{ row.action }}</td>
                <td>{{ v(row.reason) }}</td>
                <td>{{ row.time }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Empty footer for layout parity -->
    <template #footer>
      <div style="height: 0" />
    </template>
  </Dialog>
  <AppointmentEditReasonDialog
    v-model:visible="reasonDialogVisible"
    v-model:reasonText="reasonText"
    @confirm="reasonAction.confirm"
    @cancel="reasonAction.cancel"
    @hide="reasonAction.cancel"
  />
</template>
