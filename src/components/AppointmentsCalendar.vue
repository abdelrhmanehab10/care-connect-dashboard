<script setup lang="ts">
import { computed, ref } from "vue";
import { VCalendar } from "vuetify/components";
import type { AppointmentStatus } from "../data/options";
import type { Appointment } from "../composables/useAppointments";

type AppointmentCalendarEvent = {
  name: string;
  start: string;
  end: string;
  color: string;
  timed: boolean;
};

const props = defineProps<{
  appointments: ReadonlyArray<Appointment>;
}>();

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);

const getInitialFocus = (appointments: ReadonlyArray<Appointment>) => {
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

const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const isValidTime = (value: string) => /^\d{1,2}:\d{2}$/.test(value);

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
      },
    ];
  })
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
</script>

<template>
  <div class="card border-0 shadow-sm">
    <div class="card-body">
      <div
        class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3"
      >
        <div>
          <div class="fw-semibold">Calendar View</div>
          <div class="text-muted small">
            Click a date to focus on that day.
          </div>
        </div>
        <div class="btn-group btn-group-sm" role="group">
          <button type="button" class="btn btn-outline-secondary" @click="setToday">
            Today
          </button>
          <button
            type="button"
            class="btn btn-outline-secondary"
            :class="{ active: viewType === 'week' }"
            @click="viewWeek"
          >
            Week
          </button>
          <button
            type="button"
            class="btn btn-outline-secondary"
            :class="{ active: viewType === 'day' }"
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
        @click:date="viewDay"
        @click:more="viewMore"
      />
    </div>
  </div>
</template>
