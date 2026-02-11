<script setup lang="ts">
import { CheckCircle, XCircle, Ban, Loader2 } from "lucide-vue-next";
import type { AppointmentStatus } from "../data/options";
import type { Appointment } from "../types";

type CalendarAppointmentEvent = {
  color: string;
  appointment: Appointment;
};

const props = defineProps<{
  event: CalendarAppointmentEvent;
  formatTimeRange: (appointment: Appointment) => string;
  statusBadgeClass: (status: AppointmentStatus | string) => string;
  isConfirming: boolean;
  isNoShowLoading: boolean;
  isCancelLoading: boolean;
}>();

const emit = defineEmits<{
  (event: "edit", appointment: Appointment): void;
  (event: "confirm", appointment: Appointment): void;
  (event: "no-show", appointment: Appointment): void;
  (event: "cancel", appointment: Appointment): void;
}>();

const displayValue = (value: string | null | undefined) => value ?? "-";

const onEdit = () => emit("edit", props.event.appointment);
const onConfirm = () => emit("confirm", props.event.appointment);
const onNoShow = () => emit("no-show", props.event.appointment);
const onCancel = () => emit("cancel", props.event.appointment);
</script>

<template>
  <div
    class="cc-calendar-event"
    :style="{ borderLeftColor: event.color }"
    role="button"
    tabindex="0"
    @click="onEdit"
  >
    <div class="cc-calendar-event-title">
      {{ displayValue(event.appointment.patient?.name) }}
    </div>
    <div class="cc-calendar-event-meta">
      <span class="cc-calendar-event-time">
        {{ formatTimeRange(event.appointment) }}
      </span>
      <span class="cc-calendar-event-provider">
        Dr: {{ displayValue(event.appointment.doctor?.name) }}<i class="fa-solid fa-circle-info mx-1"></i>

      </span>
    </div>
    <span
      class="cc-calendar-event-status"
      :class="statusBadgeClass(event.appointment.status as AppointmentStatus)"
    >
      {{ displayValue(event.appointment.status) }}
    </span>
    <div class="cc-calendar-event-actions">
      <button
        type="button"
        class="cc-icon-btn cc-icon-btn-outline cc-icon-btn--confirm"
        aria-label="Confirm appointment"
        title="Confirm"
        :disabled="isConfirming"
        @click.stop="onConfirm"
      >
        <Loader2 v-if="isConfirming" class="cc-icon cc-icon-spinner" />
        <CheckCircle v-else class="cc-icon" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="cc-icon-btn cc-icon-btn-outline cc-icon-btn--no-show"
        aria-label="Mark as no show"
        title="No show"
        :disabled="isNoShowLoading"
        @click.stop="onNoShow"
      >
        <Loader2 v-if="isNoShowLoading" class="cc-icon cc-icon-spinner" />
        <XCircle v-else class="cc-icon" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="cc-icon-btn cc-icon-btn-outline cc-icon-btn--cancel"
        aria-label="Cancel appointment"
        title="Cancel"
        :disabled="isCancelLoading"
        @click.stop="onCancel"
      >
        <Loader2 v-if="isCancelLoading" class="cc-icon cc-icon-spinner" />
        <Ban v-else class="cc-icon" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>