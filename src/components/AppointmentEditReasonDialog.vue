<script setup lang="ts">
import { computed } from "vue";
import Dialog from "primevue/dialog";
import Textarea from "primevue/textarea";
import { dialogPt } from "../ui/primevuePt";

const props = defineProps<{
  visible: boolean;
  reasonText: string;
}>();

const emit = defineEmits<{
  (event: "update:visible", value: boolean): void;
  (event: "update:reasonText", value: string): void;
  (event: "confirm"): void;
  (event: "cancel"): void;
  (event: "hide"): void;
}>();

const visibleModel = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const reasonTextModel = computed({
  get: () => props.reasonText,
  set: (value: string) => emit("update:reasonText", value),
});
</script>

<template>
  <Dialog
    v-model:visible="visibleModel"
    modal
    header="Reason required"
    :draggable="false"
    :closable="false"
    :closeOnEscape="false"
    :dismissableMask="false"
    :style="{ width: '32rem' }"
    :pt="dialogPt"
    @hide="$emit('hide')"
  >
    <div class="cc-reason-content">
      <label for="appointments-edit-reason" class="cc-label">
        Please enter the reason for this change
      </label>
      <Textarea
        id="appointments-edit-reason"
        v-model="reasonTextModel"
        rows="4"
        autoResize
        class="cc-textarea"
        placeholder="e.g. Patient requested reschedule..."
      />
      <small v-if="!reasonTextModel.trim()" class="cc-help-text cc-help-text--error">
        Reason is required.
      </small>
    </div>

    <template #footer>
      <button type="button" class="cc-btn cc-btn-outline" @click="$emit('cancel')">
        Cancel
      </button>
      <button
        type="button"
        class="cc-btn cc-btn-outline-success"
        :disabled="!reasonTextModel.trim()"
        @click="$emit('confirm')"
      >
        Confirm & Save
      </button>
    </template>
  </Dialog>
</template>

<style scoped>
.cc-reason-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
