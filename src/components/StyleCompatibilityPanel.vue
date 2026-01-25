<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import Dropdown from "primevue/dropdown";
import InputText from "primevue/inputtext";
import Tag from "primevue/tag";

const statusOptions = ["Review", "Finalize", "Audit"];
const selectedStatus = ref<string>(statusOptions[0] ?? "Review");
const note = ref("PrimeVue + Tailwind sample");
</script>

<template>
  <section class="cc-tailwind">
    <div
      class="tw-mt-4 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-4 tw-shadow-sm"
    >
      <div class="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-3">
        <div>
          <p class="tw-mb-1 tw-text-sm tw-uppercase tw-tracking-wide tw-text-slate-500">
            Style Compatibility
          </p>
          <h3 class="tw-mb-0 tw-text-lg tw-font-semibold tw-text-slate-900">
            PrimeVue + Tailwind sample
          </h3>
        </div>
        <Tag
          value="Scoped"
          class="tw-rounded-full tw-bg-emerald-100 tw-px-3 tw-py-1 tw-text-xs tw-font-semibold tw-text-emerald-700"
        />
      </div>

      <div class="tw-mt-3 tw-grid tw-gap-3 md:tw-grid-cols-[1fr_220px]">
        <InputText
          v-model="note"
          class="tw-w-full tw-rounded-lg tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-3 tw-py-2 tw-text-sm tw-text-slate-700"
          placeholder="Add a note"
        />
        <Dropdown
          v-model="selectedStatus"
          :options="statusOptions"
          class="tw-w-full tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-text-sm tw-text-slate-700"
        />
      </div>

      <div class="tw-mt-3 tw-flex tw-flex-wrap tw-gap-2">
        <Button
          label="Run audit"
          class="tw-rounded-full tw-bg-amber-400 tw-px-4 tw-py-2 tw-text-sm tw-font-semibold tw-text-slate-900"
        />
        <Button
          label="Reset"
          class="tw-rounded-full tw-border tw-border-slate-200 tw-bg-white tw-px-4 tw-py-2 tw-text-sm tw-font-semibold tw-text-slate-700"
        />
      </div>
    </div>
  </section>
</template>
