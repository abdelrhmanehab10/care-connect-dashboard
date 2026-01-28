<script setup lang="ts">
import { computed, ref } from "vue";
import { VCalendar } from "vuetify/components";
import type { AppointmentStatus } from "../data/options";
import type { AppointmentUi } from "../composables/useAppointmentsQuery";

type AppointmentCalendarEvent = {
  name: string;
  start: string;
  end: string;
  color: string;
  timed: boolean;
  appointment: AppointmentUi;
};

const props = defineProps<{
  appointments: ReadonlyArray<AppointmentUi>;
}>();

const toIsoDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getInitialFocus = (appointments: ReadonlyArray<AppointmentUi>) => {
  if (!appointments.length) {
    return toIsoDate(new Date());
  }

  const [first] = appointments;
  if (!first) {
    return toIsoDate(new Date());
  }

  return appointments.reduce((earliest, appointment) => {
    return appointment.date < earliest ? appointment.date : earliest;
  }, first.date);
};

const statusToColor = (status: AppointmentStatus) => {
  switch (status) {
    case "Confirmed":
      return "green";
    case "Pending":
      return "orange";
    case "Cancelled":
      return "red";
    default:
      return "blue";
  }
};

const statusBadgeClass = (status: AppointmentStatus) => {
  switch (status) {
    case "Confirmed":
      return "cc-badge--success";
    case "Pending":
      return "cc-badge--warning";
    case "Cancelled":
      return "cc-badge--danger";
    default:
      return "cc-badge--neutral";
  }
};

const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const isValidTime = (value: string) => /^\d{1,2}:\d{2}$/.test(value);

const formatTimeRange = (appointment: AppointmentUi) => {
  if (isValidTime(appointment.startTime) && isValidTime(appointment.endTime)) {
    return `${appointment.startTime} - ${appointment.endTime}`;
  }
  return "All day";
};

const focus = ref<string>(getInitialFocus(props.appointments));
const viewType = ref<"week" | "day">("week");

const events = computed<AppointmentCalendarEvent[]>(() =>
  props.appointments.flatMap((appointment) => {
    if (!isValidDate(appointment.date)) {
      return [];
    }

    const hasTimes =
      isValidTime(appointment.startTime) && isValidTime(appointment.endTime);
    const start = hasTimes
      ? `${appointment.date} ${appointment.startTime}`
      : appointment.date;
    const end = hasTimes
      ? `${appointment.date} ${appointment.endTime}`
      : appointment.date;

    return [
      {
        name: `${appointment.patient} (${appointment.doctor || "TBD"})`,
        start,
        end,
        color: statusToColor(appointment.status),
        timed: hasTimes,
        appointment,
      },
    ];
  }),
);

const setToday = () => {
  focus.value = toIsoDate(new Date());
  viewType.value = "week";
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

const goPrev = () => {
  shiftFocus(viewType.value === "week" ? -7 : -1);
};

const goNext = () => {
  shiftFocus(viewType.value === "week" ? 7 : 1);
};
</script>

<template>
  <div class="cc-card">
    <div class="cc-card-body">
      <div class="cc-row cc-row-between cc-row-wrap cc-section-header">
        <div>
          <div class="cc-section-title">Calendar View</div>
          <div class="cc-help-text">Click a date to focus on that day.</div>
        </div>
        <div class="cc-btn-group" role="group" aria-label="Calendar navigation">
          <button
            type="button"
            class="cc-btn cc-btn-outline cc-btn-sm"
            @click="goPrev"
          >
            &lt;
          </button>
          <button
            type="button"
            class="cc-btn cc-btn-outline cc-btn-sm"
            @click="goNext"
          >
            &gt;
          </button>
        </div>
        <div class="cc-btn-group" role="group">
          <button
            type="button"
            class="cc-btn cc-btn-outline cc-btn-sm"
            @click="setToday"
          >
            Today
          </button>
          <button
            type="button"
            class="cc-btn cc-btn-outline cc-btn-sm"
            :class="{ 'is-active': viewType === 'week' }"
            @click="viewWeek"
          >
            Week
          </button>
          <button
            type="button"
            class="cc-btn cc-btn-outline cc-btn-sm"
            :class="{ 'is-active': viewType === 'day' }"
            @click="viewType = 'day'"
          >
            Day
          </button>
        </div>
      </div>

      <VCalendar
        v-model="focus"
        :type="viewType"
        :events="events"
        :height="640"
        :showWeek="false"
        :eventHeight="52"
        class="cc-calendar"
        @click:date="viewDay"
        @click:more="viewMore"
      >
        <template #event="{ event }">
          <div class="cc-calendar-event" :style="{ borderLeftColor: event.color }">
            <div class="cc-calendar-event-title">
              {{ event.appointment.patient }}
            </div>
            <div class="cc-calendar-event-meta">
              <span class="cc-calendar-event-time">
                {{ formatTimeRange(event.appointment) }}
              </span>
              <span class="cc-calendar-event-provider">
                Dr: {{ event.appointment.doctor || "TBD" }}
              </span>
              <span class="cc-calendar-event-provider">
                Nurse: {{ event.appointment.nurse || "TBD" }}
              </span>
            </div>
            <span
              class="cc-calendar-event-status"
              :class="statusBadgeClass(event.appointment.status)"
            >
              {{ event.appointment.status }}
            </span>
          </div>
        </template>
      </VCalendar>
    </div>
  </div>
</template>
