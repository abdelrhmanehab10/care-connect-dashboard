<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { VCalendar } from "vuetify/components";
import { CheckCircle, XCircle, Ban } from "lucide-vue-next";
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
}>();
const emit = defineEmits<{
  (event: "edit", appointment: Appointment): void;
  (
    event: "range-change",
    payload: {
      start: string;
      end: string;
      viewType: "week" | "day";
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

const getInitialFocus = (appointments: ReadonlyArray<Appointment>): string => {
  const dates = appointments
    .map((appointment) => normalizeDate(appointment.date))
    .filter((date) => date.length > 0);

  const [first, ...rest] = dates;
  if (!first) {
    return toIsoDate(new Date());
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
  status?.trim().toLowerCase() ?? "";

const statusToColor = (status: AppointmentStatus | string) => {
  switch (normalizeStatus(status)) {
    case "confirmed":
      return "green";
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
      return "cc-badge--success";
    case "completed":
      return "cc-badge--neutral";
    case "new":
      return "cc-badge--warning";
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

const focus = ref<string>(getInitialFocus(sourceAppointments.value));
const viewType = ref<"week" | "day">("week");

const syncRange = () => {
  const focusedDate = parseFocusDate(focus.value);
  const rangeStart =
    viewType.value === "week" ? startOfWeek(focusedDate) : focusedDate;
  const rangeEnd =
    viewType.value === "week" ? endOfWeek(focusedDate) : focusedDate;
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
        name: `${displayValue(appointment.patient?.name)} (${
          appointment.doctor?.name || "TBD"
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

watch([focus, viewType], () => {
  syncRange();
});
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
            class="cc-btn cc-btn-outline cc-btn-sm scheduler"
            @click="goPrev"
          >
            &lt;
          </button>
          <button
            type="button"
            class="cc-btn cc-btn-outline cc-btn-sm scheduler"
            @click="goNext"
          >
            &gt;
          </button>
        </div>
        <div class="cc-btn-group" role="group">
          <button
            type="button"
            class="cc-btn cc-btn-outline cc-btn-sm scheduler"
            @click="setToday"
          >
            Today
          </button>
          <button
            type="button"
            class="cc-btn cc-btn-outline cc-btn-sm scheduler"
            :class="{ 'is-active': viewType === 'week' }"
            @click="viewWeek"
          >
            Week
          </button>
          <button
            type="button"
            class="cc-btn cc-btn-outline cc-btn-sm scheduler"
            :class="{ 'is-active': viewType === 'day' }"
            @click="viewType = 'day'"
          >
            Day
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="cc-empty">Loading appointments...</div>
      <div v-else-if="!sourceAppointments.length" class="cc-empty">
        No appointments for this range.
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
          <div
            class="cc-calendar-event"
            :style="{ borderLeftColor: event.color }"
            role="button"
            tabindex="0"
            @click="emit('edit', event.appointment)"
          >
            <div class="cc-calendar-event-title">
              {{ displayValue(event.appointment.patient?.name) }}
            </div>
            <div class="cc-calendar-event-meta">
              <span class="cc-calendar-event-time">
                {{ formatTimeRange(event.appointment) }}
              </span>
              <span class="cc-calendar-event-provider">
                Dr: {{ displayValue(event.appointment.doctor?.name) }}
              </span>
              <span class="cc-calendar-event-provider">
                Nurse: {{ displayValue(event.appointment.nurse?.name) }}
              </span>
            </div>
            <span
              class="cc-calendar-event-status"
              :class="
                statusBadgeClass(event.appointment.status as AppointmentStatus)
              "
            >
              {{ displayValue(event.appointment.status) }}
            </span>
            <div class="cc-calendar-event-actions">
              <button
                type="button"
                class="cc-icon-btn cc-icon-btn-outline cc-icon-btn--confirm"
                aria-label="Confirm appointment"
                title="Confirm"
                @click.stop
              >
                <CheckCircle class="cc-icon" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="cc-icon-btn cc-icon-btn-outline cc-icon-btn--no-show"
                aria-label="Mark as no show"
                title="No show"
                @click.stop
              >
                <XCircle class="cc-icon" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="cc-icon-btn cc-icon-btn-outline cc-icon-btn--cancel"
                aria-label="Cancel appointment"
                title="Cancel"
                @click.stop
              >
                <Ban class="cc-icon" aria-hidden="true" />
              </button>
            </div>
          </div>
        </template>
      </VCalendar>
    </div>
  </div>
</template>
