<script setup lang="ts">
import { computed } from "vue";
import Dialog from "primevue/dialog";
import Textarea from "primevue/textarea";
import { dialogPt } from "../ui/primevuePt";
import type Color from "vuetify/directives/color";

const props = defineProps<{
  visible: boolean;
  reasonText: string;
  isSubmitting?: boolean;
  headerText?: string;
  labelText?: string;
  placeholderText?: string;
  cancelText?: string;
  confirmText?: string;
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

const isReasonValid = computed(() => reasonTextModel.value.trim().length > 0);
const isSubmitting = computed(() => Boolean(props.isSubmitting));
const isConfirmDisabled = computed(
  () => isSubmitting.value || !isReasonValid.value,
);

const headerText = computed(() => props.headerText ?? "Reason required");
const labelText = computed(
  () => props.labelText ?? "Please enter the reason for this change",
);
const placeholderText = computed(
  () => props.placeholderText ?? "e.g. Patient requested reschedule...",
);
const cancelText = computed(() => props.cancelText ?? "Cancel");
const confirmText = computed(() => props.confirmText ?? "Confirm & Save");

const handleHide = () => {
  emit("hide");
};

const handleCancel = () => {
  if (isSubmitting.value) return;
  emit("cancel");
};

const handleConfirm = () => {
  if (isConfirmDisabled.value) return;
  emit("confirm");
};
</script>

<template>
  <Dialog
    v-model:visible="visibleModel"
    modal
<<<<<<< HEAD
    header="Reason Required"
=======
    :header="headerText"
>>>>>>> f4a01f110436a1e74eb966d8ea55f44c764e1760
    :draggable="false"
    :closable="false"
    :closeOnEscape="false"
    :dismissableMask="false"
    :style="{ width: '32rem' }"
    :pt="dialogPt"
<<<<<<< HEAD
    @hide="$emit('hide')"
    class="reason-title"
  >
    <div class="cc-reason-content">
      <label for="appointments-edit-reason" class="cc-label">
        Please Enter The Reason 
=======
    @hide="handleHide"
  >
    <div class="cc-reason-content">
      <label for="appointments-edit-reason" class="cc-label">
        {{ labelText }}
>>>>>>> f4a01f110436a1e74eb966d8ea55f44c764e1760
      </label>
      <Textarea
        id="appointments-edit-reason"
        v-model="reasonTextModel"
        rows="2"
        autoResize
        class="cc-textarea"
<<<<<<< HEAD
      />
    </div>

    <template #footer>
      <button type="button" class="cc-btn cc-btn-outline bg-danger text-light" @click="$emit('cancel')">
        Cancel
=======
        :placeholder="placeholderText"
        :disabled="isSubmitting"
      />
      <small v-if="!isReasonValid" class="cc-help-text cc-help-text--error">
        Reason is required.
      </small>
    </div>

    <template #footer>
      <button
        type="button"
        class="cc-btn cc-btn-outline"
        :disabled="isSubmitting"
        @click="handleCancel"
      >
        {{ cancelText }}
>>>>>>> f4a01f110436a1e74eb966d8ea55f44c764e1760
      </button>
      <button
        type="button"
        class="cc-btn cc-btn-outline-success"
        :disabled="isConfirmDisabled"
        @click="handleConfirm"
      >
        {{ confirmText }}
      </button>
    </template>
  </Dialog>
</template>