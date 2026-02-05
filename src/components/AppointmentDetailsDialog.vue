<script setup lang="ts">
import Dialog from "primevue/dialog";
import type { Appointment } from "../types";
import { dialogPt } from "../ui/primevuePt";

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{
  appointment: Appointment | null;
}>();

const displayValue = (value: string | null | undefined) => value ?? "-";
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :modal="true"
    :draggable="false"
    :closable="false"
    :pt="dialogPt"
  >
    <template #header>
      <div class="cc-row cc-row-between">
        <span class="cc-dialog-title">Appointment details</span>
        <button
          type="button"
          class="cc-icon-btn cc-dialog-close"
          aria-label="Close"
          @click="visible = false"
        ></button>
      </div>
    </template>

    <div class="cc-stack">
      <div class="cc-grid cc-grid-2">
        <div>
          <div class="cc-label">Patient</div>
          <div>{{ displayValue(props.appointment?.patient?.name) }}</div>
        </div>
        <div>
          <div class="cc-label">Status</div>
          <div>{{ displayValue(props.appointment?.status) }}</div>
        </div>
        <div>
          <div class="cc-label">Date</div>
          <div>{{ displayValue(props.appointment?.date) }}</div>
        </div>
       
        <div>
          <div class="cc-label">Time</div>
          <div>
            {{ displayValue(props.appointment?.start_time) }} -
            {{ displayValue(props.appointment?.end_time) }}
          </div>
        </div>
        <div>
          <div class="cc-label">Doctor</div>
          <div>{{ displayValue(props.appointment?.doctor?.name) }}</div>
        </div>
        <div>
          <div class="cc-label">Nurse</div>
          <div>{{ displayValue(props.appointment?.nurse?.name) }}</div>
        </div>
        <div>
          <div class="cc-label">Visit type</div>
          <div>{{ displayValue(props.appointment?.visit_type) }}</div>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="cc-btn bg-danger"
        @click="visible = false"
      >
        Close
      </button>
    </template>
  </Dialog>
</template>
