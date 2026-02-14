<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { VCalendar } from "vuetify/components";
import { useToast } from "primevue/usetoast";
import AppointmentEditReasonDialog from "./AppointmentEditReasonDialog.vue";
import CalendarAppointmentCard from "./CalendarAppointmentCard.vue";
import {
  confirmAppointmentPatient,
  quickNoShowAppointment,
  cancelAppointment as cancelAppointmentApi,
} from "../services/appointments";
import type { AppointmentStatus } from "../data/options";
import type { Appointment } from "../types";

type AppointmentCalendarEvent = {
  name: string;
  start: string;
  end: string;
  color: string;
  timed: boolean;
  appointment: Appointment;
};

const props = defineProps<{
  appointments: ReadonlyArray<Appointment>;
  isLoading: boolean;
  rangeStart?: string;
  rangeEnd?: string;
}>();
const toast = useToast();
const emit = defineEmits<{
  (event: "edit", appointment: Appointment): void;
  (event: "confirm-all", appointment: Appointment): void;
  (event: "no-show", appointment: Appointment): void;
  (event: "cancel", appointment: Appointment): void;
  (
    event: "range-change",
    payload: {
      start: string;
      end: string;
      viewType: "week" | "day" | "month";
      focus: string;
    },
  ): void;
}>();

const toIsoDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfWeek = (value: Date) => {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date;
};

const endOfWeek = (value: Date) => {
  const date = startOfWeek(value);
  date.setDate(date.getDate() + 6);
  return date;
};

const startOfMonth = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), 1);

const endOfMonth = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth() + 1, 0);

const sourceAppointments = computed(() => props.appointments);

const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const normalizeTime = (value: string | null | undefined): string => {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}:\d{2})(?::\d{2})?$/);
  return match?.[1] ?? "";
};


const normalizeDate = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  const normalizedSeparators = trimmed.replace(/\//g, "-");
  if (isValidDate(normalizedSeparators)) {
    return normalizedSeparators;
  }

  const splitByT = normalizedSeparators.split("T")[0] ?? "";
  if (isValidDate(splitByT)) {
    return splitByT;
  }

  const splitBySpace = normalizedSeparators.split(" ")[0] ?? "";
  if (isValidDate(splitBySpace)) {
    return splitBySpace;
  }

  const parsed = new Date(normalizedSeparators);
  if (!Number.isNaN(parsed.getTime())) {
    return toIsoDate(parsed);
  }

  return "";
};

const getEarliestAppointmentFocus = (
  appointments: ReadonlyArray<Appointment>,
): string => {
  const dates = appointments
    .map((appointment) => normalizeDate(appointment.date))
    .filter((date) => date.length > 0);

  const [first, ...rest] = dates;
  if (!first) {
    return "";
  }

  let earliest = first;
  for (const date of rest) {
    if (date < earliest) {
      earliest = date;
    }
  }
  return earliest;
};

const normalizeStatus = (status: string | null | undefined) =>
  status?.trim().toLowerCase().replace(/[\s-]+/g, "_") ?? "";

const normalizeStatusKey = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const statusLevelLookup: Record<string, number> = {
  new: 1,
  waiting: 1,
  confirmed: 2,
  patient_confirmed: 2,
  rescheduled: 2,
  canceled: 3,
  cancelled: 3,
  completed: 3,
  no_show: 3,
};

const getStatusLevel = (value: unknown) =>
  statusLevelLookup[normalizeStatusKey(value)] ?? 1;

const isFinalStatus = (value: unknown) => getStatusLevel(value) >= 3;

const isStatusTransitionAllowed = (from: unknown, to: unknown) => {
  const fromKey = normalizeStatusKey(from);
  const toKey = normalizeStatusKey(to);
  if (!fromKey || fromKey === toKey) return true;
  if (isFinalStatus(from)) return false;
  if (getStatusLevel(from) >= 2) {
    return isFinalStatus(to);
  }
  return true;
};

const statusToColor = (status: AppointmentStatus | string) => {
  switch (normalizeStatus(status)) {
    case "confirmed":
    case "patient_confirmed":
      return "green";
    case "canceled":
    case "cancelled":
    case "no_show":
      return "red";
    case "waiting":
    case "rescheduled":
    case "completed":
      return "blue";
    case "new":
      return "orange";
    default:
      return "blue";
  }
};

const statusBadgeClass = (status: AppointmentStatus | string) => {
  switch (normalizeStatus(status)) {
    case "confirmed":
    case "patient_confirmed":
      return "cc-badge--success";
    case "canceled":
    case "cancelled":
    case "no_show":
      return "cc-badge--danger";
    case "waiting":
    case "rescheduled":
    case "new":
      return "cc-badge--warning";
    case "completed":
      return "cc-badge--neutral";
    default:
      return "cc-badge--neutral";
  }
};

const displayValue = (value: string | null | undefined) => value ?? "-";

const formatTimeRange = (appointment: Appointment) => {
  const start = normalizeTime(appointment.start_time);
  const end = normalizeTime(appointment.end_time);
  if (start && end) {
    return `${start} - ${end}`;
  }
  return "All day";
};

const focus = ref<string>(
  getEarliestAppointmentFocus(sourceAppointments.value) || toIsoDate(new Date()),
);
const viewType = ref<"week" | "day" | "month">("week");
const monthTitle = computed(() => {
  const d = parseFocusDate(focus.value);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
});

const resolveRangeFocus = (rangeStart: string, rangeEnd: string) => {
  const today = toIsoDate(new Date());
  if (today >= rangeStart && today <= rangeEnd) {
    return today;
  }
  return rangeStart;
};

watch(
  [() => props.rangeStart, () => props.rangeEnd, sourceAppointments],
  ([rangeStart, rangeEnd, appointments]) => {
    const normalizedStart = normalizeDate(rangeStart);
    const normalizedEnd = normalizeDate(rangeEnd);
    if (!normalizedStart || !normalizedEnd) {
      return;
    }
    const appointmentFocus = getEarliestAppointmentFocus(appointments);
    focus.value =
      appointmentFocus || resolveRangeFocus(normalizedStart, normalizedEnd);
  },
  { immediate: true },
);
const calendarHeight = computed(() =>
  viewType.value === "month" ? undefined : 640,
);
const eventHeight = computed(() => (viewType.value === "month" ? 96 : 52));
const showEventMore = computed(() => viewType.value !== "month");
const confirmingIds = ref<number[]>([]);
const noShowIds = ref<number[]>([]);
const cancelIds = ref<number[]>([]);
const reasonDialogVisible = ref(false);
const reasonText = ref("");

type PendingCalendarAction = {
  type: "cancel";
  appointment: Appointment;
};

const pendingReasonAction = ref<PendingCalendarAction | null>(null);
const neutralEventColor = () => "";
const asAppointmentEvent = (event: unknown) =>
  event as AppointmentCalendarEvent;

const isConfirming = (appointmentId: number) =>
  confirmingIds.value.includes(appointmentId);

const setConfirming = (appointmentId: number, value: boolean) => {
  if (value) {
    if (!confirmingIds.value.includes(appointmentId)) {
      confirmingIds.value = [...confirmingIds.value, appointmentId];
    }
    return;
  }
  confirmingIds.value = confirmingIds.value.filter((id) => id !== appointmentId);
};

const isNoShowLoading = (appointmentId: number) =>
  noShowIds.value.includes(appointmentId);

const setNoShowLoading = (appointmentId: number, value: boolean) => {
  if (value) {
    if (!noShowIds.value.includes(appointmentId)) {
      noShowIds.value = [...noShowIds.value, appointmentId];
    }
    return;
  }
  noShowIds.value = noShowIds.value.filter((id) => id !== appointmentId);
};

const isCancelLoading = (appointmentId: number) =>
  cancelIds.value.includes(appointmentId);

const setCancelLoading = (appointmentId: number, value: boolean) => {
  if (value) {
    if (!cancelIds.value.includes(appointmentId)) {
      cancelIds.value = [...cancelIds.value, appointmentId];
    }
    return;
  }
  cancelIds.value = cancelIds.value.filter((id) => id !== appointmentId);
};

const openReasonForAction = (action: PendingCalendarAction) => {
  if (reasonDialogVisible.value) {
    return;
  }

  pendingReasonAction.value = action;
  reasonText.value = "";
  reasonDialogVisible.value = true;
};

const resetReasonDialogState = () => {
  reasonDialogVisible.value = false;
  reasonText.value = "";
  pendingReasonAction.value = null;
};

const requestConfirmAll = (appointment: Appointment) => {
  if (
    !appointment?.id ||
    isConfirming(appointment.id) ||
    !isStatusTransitionAllowed(appointment.status, "patient_confirmed")
  ) {
    return;
  }

  setConfirming(appointment.id, true);
  void confirmAppointmentPatient(appointment.id)
    .then(() => {
      toast.add({
        severity: "success",
        summary: "Patient confirmed",
        detail: "Appointment marked as patient confirmed.",
        life: 3000,
      });
      emit("confirm-all", appointment);
    })
    .catch((error) => {
      console.error("Failed to confirm appointment.", error);
    })
    .finally(() => {
      setConfirming(appointment.id, false);
    });
};

const requestNoShow = (appointment: Appointment) => {
  if (
    !appointment?.id ||
    isNoShowLoading(appointment.id) ||
    !isStatusTransitionAllowed(appointment.status, "no_show")
  ) {
    return;
  }

  setNoShowLoading(appointment.id, true);
  void quickNoShowAppointment(appointment.id)
    .then(() => {
      toast.add({
        severity: "success",
        summary: "No show updated",
        detail: "Appointment marked as no show.",
        life: 3000,
      });
      emit("no-show", appointment);
    })
    .catch((error) => {
      console.error("Failed to mark appointment as no show.", error);
    })
    .finally(() => {
      setNoShowLoading(appointment.id, false);
    });
};

const requestCancelAppointment = (appointment: Appointment) => {
  if (
    !appointment?.id ||
    isCancelLoading(appointment.id) ||
    !isStatusTransitionAllowed(appointment.status, "canceled")
  ) {
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
      if (!appointment?.id || isCancelLoading(appointment.id)) {
        return;
      }

      setCancelLoading(appointment.id, true);
      try {
        await cancelAppointmentApi(appointment.id, { reason });
        toast.add({
          severity: "success",
          summary: "Appointment canceled",
          detail: "Appointment canceled successfully.",
          life: 3000,
        });
        emit("cancel", appointment);
      } catch (error) {
        console.error("Failed to cancel appointment.", error);
      } finally {
        setCancelLoading(appointment.id, false);
      }
      return;
    }
  }
};

const cancelReasonModal = () => {
  resetReasonDialogState();
};

const syncRange = () => {
  const focusedDate = parseFocusDate(focus.value);
  let rangeStart = focusedDate;
  let rangeEnd = focusedDate;
  if (viewType.value === "week") {
    rangeStart = startOfWeek(focusedDate);
    rangeEnd = endOfWeek(focusedDate);
  } else if (viewType.value === "month") {
    rangeStart = startOfMonth(focusedDate);
    rangeEnd = endOfMonth(focusedDate);
  }
  emit("range-change", {
    start: toIsoDate(rangeStart),
    end: toIsoDate(rangeEnd),
    viewType: viewType.value,
    focus: focus.value,
  });
};

const events = computed<AppointmentCalendarEvent[]>(() => {
  if (props.isLoading) {
    return [];
  }
  return sourceAppointments.value.flatMap((appointment) => {
    const normalizedDate = normalizeDate(appointment.date);
    if (!normalizedDate) {
      return [];
    }

    const startTime = normalizeTime(appointment.start_time);
    const endTime = normalizeTime(appointment.end_time);
    const hasTimes = startTime.length > 0 && endTime.length > 0;
    const start = hasTimes
      ? `${normalizedDate} ${startTime}`
      : normalizedDate;
    const end = hasTimes ? `${normalizedDate} ${endTime}` : normalizedDate;

    return [
      {
        name: `${displayValue(appointment.patient?.name)} (${appointment.doctor?.name || "TBD"
          })`,
        start,
        end,
        color: statusToColor(appointment.status as AppointmentStatus),
        timed: hasTimes,
        appointment,
      },
    ];
  });
});

const setToday = () => {
  focus.value = toIsoDate(new Date());
};

const viewDay = (_event: Event, timestamp: { date: string }) => {
  focus.value = timestamp.date;
  viewType.value = "day";
};

const viewMore = (_event: Event, timestamp: { date: string }) => {
  focus.value = timestamp.date;
  viewType.value = "day";
};

const viewWeek = () => {
  viewType.value = "week";
};

const viewMonth = () => {
  viewType.value = "month";
};

const parseFocusDate = (value: string) => {
  const [yearRaw = Number.NaN, monthRaw = Number.NaN, dayRaw = Number.NaN] =
    value.split("-").map(Number);
  const fallback = new Date();
  const year = Number.isFinite(yearRaw) ? yearRaw : fallback.getFullYear();
  const month = Number.isFinite(monthRaw) ? monthRaw : fallback.getMonth() + 1;
  const day = Number.isFinite(dayRaw) ? dayRaw : fallback.getDate();
  return new Date(year, month - 1, day);
};

const shiftFocus = (days: number) => {
  const date = parseFocusDate(focus.value);
  if (Number.isNaN(date.getTime())) {
    focus.value = toIsoDate(new Date());
    return;
  }

  date.setDate(date.getDate() + days);
  focus.value = toIsoDate(date);
};

const shiftFocusByMonth = (months: number) => {
  const date = parseFocusDate(focus.value);
  if (Number.isNaN(date.getTime())) {
    focus.value = toIsoDate(new Date());
    return;
  }

  const dayOfMonth = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  target.setDate(Math.min(dayOfMonth, lastDay));
  focus.value = toIsoDate(target);
};

const goPrev = () => {
  if (viewType.value === "month") {
    shiftFocusByMonth(-1);
    return;
  }
  shiftFocus(viewType.value === "week" ? -7 : -1);
};

const goNext = () => {
  if (viewType.value === "month") {
    shiftFocusByMonth(1);
    return;
  }
  shiftFocus(viewType.value === "week" ? 7 : 1);
};

watch(
  [focus, viewType],
  () => {
    syncRange();
  },
  { immediate: true },
);
</script>

<template>
  <div class="cc-card">
    <div class="cc-card-body">
      <div class="cc-row cc-row-between cc-row-wrap cc-section-header">
        <div>
          <div class="cc-section-title">Calendar View</div>
          <div class="cc-help-text">Click a date to focus on that day.</div>
          <div class="cc-month-title" v-if="viewType === 'month'">
            {{ monthTitle }}
          </div>
        </div>
        <div class="cc-btn-group" role="group" aria-label="Calendar navigation">
          <button type="button" class="cc-btn cc-btn-outline cc-btn-sm scheduler" @click="goPrev">
            &lt;
          </button>
          <button type="button" class="cc-btn cc-btn-outline cc-btn-sm scheduler" @click="goNext">
            &gt;
          </button>
        </div>
        <div class="cc-btn-group" role="group">
          <button type="button" class="cc-btn cc-btn-outline cc-btn-sm scheduler" @click="setToday">
            Today
          </button>
          <button type="button" class="cc-btn cc-btn-outline cc-btn-sm scheduler"
            :class="{ 'is-active': viewType === 'week' }" @click="viewWeek">
            Week
          </button>
          <button type="button" class="cc-btn cc-btn-outline cc-btn-sm scheduler"
            :class="{ 'is-active': viewType === 'month' }" @click="viewMonth">
            Month
          </button>
          <button type="button" class="cc-btn cc-btn-outline cc-btn-sm scheduler"
            :class="{ 'is-active': viewType === 'day' }" @click="viewType = 'day'">
            Day
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="cc-empty">Loading appointments...</div>
      <div v-else-if="!sourceAppointments.length" class="cc-empty">
        No appointments for this range.
      </div>

      <VCalendar v-model="focus" :type="viewType" :events="events" :height="calendarHeight" :showWeek="false"
        :eventHeight="eventHeight" :eventMore="showEventMore" :event-color="neutralEventColor"
        :event-overlap-threshold="0"
        :class="['cc-calendar', `cc-calendar--${viewType}`]" @click:date="viewDay" @click:more="viewMore">
        <template #event="{ event }">
          <CalendarAppointmentCard :event="asAppointmentEvent(event)" :format-time-range="formatTimeRange"
            :status-badge-class="statusBadgeClass" :is-confirming="isConfirming(event.appointment.id)"
            :is-no-show-loading="isNoShowLoading(event.appointment.id)"
            :is-cancel-loading="isCancelLoading(event.appointment.id)"
            :can-confirm-action="isStatusTransitionAllowed(event.appointment.status, 'patient_confirmed')"
            :can-no-show-action="isStatusTransitionAllowed(event.appointment.status, 'no_show')"
            :can-cancel-action="isStatusTransitionAllowed(event.appointment.status, 'canceled')" @edit="emit('edit', $event)"
            @confirm="requestConfirmAll" @no-show="requestNoShow" @cancel="requestCancelAppointment" />
        </template>
      </VCalendar>
    </div>
    <AppointmentEditReasonDialog
      v-model:visible="reasonDialogVisible"
      v-model:reasonText="reasonText"
      @confirm="confirmReasonAndRun"
      @cancel="cancelReasonModal"
      @hide="cancelReasonModal"
    />
  </div>
</template>
