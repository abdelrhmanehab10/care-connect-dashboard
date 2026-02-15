<script setup lang="ts">
import { computed } from "vue";
import { CheckCircle, XCircle, Ban, Loader2 } from "lucide-vue-next";
import type { Appointment } from "../types";
import { formatStatusLabel } from "../lib/statusTransitions";

type CalendarAppointmentEvent = {
  color: string;
  appointment: Appointment;
};

const props = defineProps<{
  event: CalendarAppointmentEvent;
  formatTimeRange: (appointment: Appointment) => string;
  statusBadgeClass: (status: string | null | undefined) => string;
  isConfirming: boolean;
  isNoShowLoading: boolean;
  isCancelLoading: boolean;
  canConfirmAction: boolean;
  canNoShowAction: boolean;
  canCancelAction: boolean;
}>();

const emit = defineEmits<{
  (event: "edit", appointment: Appointment): void;
  (event: "confirm", appointment: Appointment): void;
  (event: "no-show", appointment: Appointment): void;
  (event: "cancel", appointment: Appointment): void;
}>();

const displayValue = (value: string | null | undefined) => value ?? "-";
const displayStatus = (value: string | null | undefined) =>
  formatStatusLabel(value);
const formatRoleLabel = (role: string | null | undefined) => {
  const normalized = String(role ?? "").trim().toLowerCase();
  if (!normalized) return "Team";
  return normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

type TeamMemberDisplay = {
  role: string;
  name: string;
};

const appointment = computed(() => props.event.appointment);

const buildTeamMembers = (appointment: Appointment) => {
  const members: TeamMemberDisplay[] = [];
  const seen = new Set<string>();
  const addMember = (role: string | null | undefined, name: string | null | undefined) => {
    const normalizedName = String(name ?? "").trim();
    if (!normalizedName) return;
    const roleLabel = formatRoleLabel(role);
    const key = `${roleLabel.toLowerCase()}::${normalizedName.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    members.push({ role: roleLabel, name: normalizedName });
  };

  for (const member of appointment.care_team ?? []) {
    addMember(member.role, member.employee?.name);
  }
  addMember("doctor", appointment.doctor?.name);
  addMember("nurse", appointment.nurse?.name);
  addMember("social_worker", appointment.social_worker?.name);

  return members;
};

const teamMembers = computed<TeamMemberDisplay[]>(() =>
  buildTeamMembers(appointment.value),
);

const primaryTeamMemberLabel = computed(() => {
  const primary = teamMembers.value[0];
  if (!primary) return "Team: -";
  return `${primary.role}: ${primary.name}`;
});

const teamInfoTitle = computed(() => {
  if (!teamMembers.value.length) return "No team assigned";
  return teamMembers.value
    .map((member) => `${member.role}: ${member.name}`)
    .join(", ");
});

const onEdit = () => emit("edit", appointment.value);
const onConfirm = () => emit("confirm", appointment.value);
const onNoShow = () => emit("no-show", appointment.value);
const isCanceledStatus = computed(() => {
  const status = String(appointment.value.status ?? "").trim().toLowerCase();
  return status === "canceled" || status === "cancelled";
});
const isCancelDisabled = computed(
  () => props.isCancelLoading || !props.canCancelAction || isCanceledStatus.value,
);
const onCancel = () => {
  if (isCancelDisabled.value) return;
  emit("cancel", appointment.value);
};
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
      {{ displayValue(appointment.patient?.name) }}
    </div>
    <div class="cc-calendar-event-meta">
      <span class="cc-calendar-event-time">
        {{ formatTimeRange(appointment) }}
      </span>
      <span class="cc-calendar-event-provider">
        {{ primaryTeamMemberLabel }}
        <i
          class="fa-solid fa-circle-info mx-1"
          :title="teamInfoTitle"
          aria-label="Assigned team details"
        ></i>
      </span>
    </div>
    <span
      class="cc-calendar-event-status"
      :class="statusBadgeClass(appointment.status)"
    >
      {{ displayStatus(appointment.status) }}
    </span>
    <div class="cc-calendar-event-actions">
      <button
        type="button"
        class="cc-icon-btn cc-icon-btn-outline cc-icon-btn--confirm"
        aria-label="Confirm appointment"
        title="Confirm"
        :disabled="isConfirming || !canConfirmAction"
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
        :disabled="isNoShowLoading || !canNoShowAction"
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
        :disabled="isCancelDisabled"
        @click.stop="onCancel"
      >
        <Loader2 v-if="isCancelLoading" class="cc-icon cc-icon-spinner" />
        <Ban v-else class="cc-icon" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
