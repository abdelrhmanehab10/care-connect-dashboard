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
import {
  isStatusTransitionAllowed,
  normalizeStatusKey,
} from "../lib/statusTransitions";
import {
  endOfMonth,
  endOfWeekMonday,
  normalizeDateString,
  parseLocalDateOnly,
  startOfMonth,
  startOfWeekMonday,
  toIsoDate,
} from "../lib/dateUtils";
import { useReasonRequiredAction } from "../composables/useReasonRequiredAction";
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

const sourceAppointments = computed(() => props.appointments);

const normalizeTime = (value: string | null | undefined): string => {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}:\d{2})(?::\d{2})?$/);
  return match?.[1] ?? "";
};

const getEarliestAppointmentFocus = (
  appointments: ReadonlyArray<Appointment>,
): string => {
  const dates = appointments
    .map((appointment) => normalizeDateString(appointment.date))
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
  normalizeStatusKey(status);

const statusToColor = (status: string | null | undefined) => {
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

const statusBadgeClass = (status: string | null | undefined) => {
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
    const normalizedStart = normalizeDateString(rangeStart);
    const normalizedEnd = normalizeDateString(rangeEnd);
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
const createLoadingIdsState = () => {
  const ids = ref<number[]>([]);
  const isLoading = (appointmentId: number) => ids.value.includes(appointmentId);
  const setLoading = (appointmentId: number, value: boolean) => {
    if (value) {
      if (!ids.value.includes(appointmentId)) {
        ids.value = [...ids.value, appointmentId];
      }
      return;
    }
    ids.value = ids.value.filter((id) => id !== appointmentId);
  };
  return { ids, isLoading, setLoading };
};
const confirmState = createLoadingIdsState();
const noShowState = createLoadingIdsState();
const cancelState = createLoadingIdsState();

type PendingCalendarAction = {
  type: "cancel";
  appointment: Appointment;
};

const reasonAction = useReasonRequiredAction<PendingCalendarAction>({
  onConfirm: async ({ action, reason }) => {
    switch (action.type) {
      case "cancel": {
        const { appointment } = action;
        if (!appointment?.id || isCancelLoading(appointment.id)) {
          return;
        }

        cancelState.setLoading(appointment.id, true);
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
          cancelState.setLoading(appointment.id, false);
        }
        return;
      }
    }
  },
});
const { visible: reasonDialogVisible, reasonText } = reasonAction;
const neutralEventColor = () => "";
const asAppointmentEvent = (event: unknown) =>
  event as AppointmentCalendarEvent;

const isConfirming = (appointmentId: number) =>
  confirmState.isLoading(appointmentId);

const isNoShowLoading = (appointmentId: number) =>
  noShowState.isLoading(appointmentId);

const isCancelLoading = (appointmentId: number) =>
  cancelState.isLoading(appointmentId);

const openReasonForAction = (action: PendingCalendarAction) => {
  reasonAction.open(action);
};

const requestConfirmAll = (appointment: Appointment) => {
  if (
    !appointment?.id ||
    isConfirming(appointment.id) ||
    !isStatusTransitionAllowed(appointment.status, "patient_confirmed")
  ) {
    return;
  }

  confirmState.setLoading(appointment.id, true);
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
      confirmState.setLoading(appointment.id, false);
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

  noShowState.setLoading(appointment.id, true);
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
      noShowState.setLoading(appointment.id, false);
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

const syncRange = () => {
  const focusedDate = parseFocusDate(focus.value);
  let rangeStart = focusedDate;
  let rangeEnd = focusedDate;
  if (viewType.value === "week") {
    rangeStart = startOfWeekMonday(focusedDate);
    rangeEnd = endOfWeekMonday(focusedDate);
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
    const normalizedDate = normalizeDateString(appointment.date);
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
        color: statusToColor(appointment.status),
        timed: hasTimes,
        appointment,
      },
    ];
  });
});

const setToday = () => {
  focus.value = toIsoDate(new Date());
  viewType.value = "day";
};

type CalendarTimestamp = { date: string };

const focusDay = (timestamp: CalendarTimestamp) => {
  focus.value = timestamp.date;
  viewType.value = "day";
};

const viewDay = (_event: Event, timestamp: CalendarTimestamp) =>
  focusDay(timestamp);

const viewMore = (_event: Event, timestamp: CalendarTimestamp) =>
  focusDay(timestamp);

const viewWeek = () => {
  viewType.value = "week";
};

const viewMonth = () => {
  viewType.value = "month";
};

const parseFocusDate = (value: string) => {
  const normalized = normalizeDateString(value);
  const parsed = parseLocalDateOnly(normalized);
  return parsed ?? new Date();
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

watch([focus, viewType], syncRange, { immediate: true });
</script>

<template>
  <div class="cc-card">
    <div class="cc-card-body">
      <div class="cc-row cc-row-between cc-row-wrap cc-section-header">
        <div>
          <div class="cc-section-title">
             <div class="cc-month-title" v-if="viewType === 'month'">
            {{ monthTitle }}
          </div>
          </div>
          <div class="cc-help-text">Click a date to focus on that day.</div>
         
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
      @confirm="reasonAction.confirm"
      @cancel="reasonAction.cancel"
      @hide="reasonAction.cancel"
    />
  </div>
</template>
