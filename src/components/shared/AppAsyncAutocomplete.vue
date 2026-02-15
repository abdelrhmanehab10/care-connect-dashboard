<script setup lang="ts" generic="TOption, TValue = TOption | null">
import AutoComplete from "primevue/autocomplete";
import type {
  AutoCompleteCompleteEvent,
  AutoCompleteProps,
  AutoCompleteOptionSelectEvent,
} from "primevue/autocomplete";
import { computed, onBeforeUnmount } from "vue";
import { useAsyncAutocomplete } from "../../composables/useAsyncAutocomplete";
import { autoCompletePt as defaultAutoCompletePt } from "../../ui/primevuePt";

type AsyncAutocompleteFetcher<TOption> = (
  query: string,
  signal: AbortSignal,
) => Promise<TOption[]>;

type TypedOptionSelectEvent<TOption> = Omit<AutoCompleteOptionSelectEvent, "value"> & {
  value: TOption;
};

const props = withDefaults(
  defineProps<{
    modelValue: TValue;
    fetcher: AsyncAutocompleteFetcher<TOption>;
    optionLabel?: string | ((data: TOption) => string);
    inputId?: string;
    placeholder?: string;
    minChars?: number;
    debounceMs?: number;
    showCachedOnFocus?: boolean;
    appendTo?: "body" | "self";
    panelClass?: string;
    inputClass?: string;
    pt?: AutoCompleteProps["pt"];
    forceSelection?: boolean;
    completeOnFocus?: boolean;
    autoOptionFocus?: boolean;
    showEmptyMessage?: boolean;
  }>(),
  {
    placeholder: "",
    minChars: 2,
    debounceMs: 300,
    showCachedOnFocus: true,
    appendTo: "body",
    panelClass: "cc-autocomplete-panel",
    forceSelection: true,
    completeOnFocus: true,
    autoOptionFocus: true,
    showEmptyMessage: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: TValue];
  "option-select": [event: TypedOptionSelectEvent<TOption>];
  error: [error: unknown];
}>();

defineSlots<{
  option: (props: { option: TOption; index: number }) => unknown;
}>();

const { suggestions, isLoading, search } = useAsyncAutocomplete<TOption>({
  fetcher: props.fetcher,
  debounceMs: () => props.debounceMs,
  minChars: () => props.minChars,
  showCachedOnFocus: () => props.showCachedOnFocus,
  onError: (error) => {
    emit("error", error);
  },
});

const resolvedPt = computed(() => props.pt ?? defaultAutoCompletePt);

const getOptionLabel = (option: unknown) => {
  if (option === null || option === undefined) {
    return "";
  }
  if (typeof props.optionLabel === "function") {
    return String(props.optionLabel(option as TOption) ?? "").trim();
  }
  if (typeof props.optionLabel === "string" && typeof option === "object") {
    const value = (option as Record<string, unknown>)[props.optionLabel];
    return String(value ?? "").trim();
  }
  return String(option).trim();
};

const handleComplete = (event: AutoCompleteCompleteEvent) => {
  search(event.query ?? "");
};

let suppressTypedModelAfterSelect = false;
let suppressResetTimer: ReturnType<typeof setTimeout> | null = null;
let lastSelectedOption: TOption | null = null;
const armTypedModelSuppression = () => {
  suppressTypedModelAfterSelect = true;
  if (suppressResetTimer) {
    clearTimeout(suppressResetTimer);
  }
  suppressResetTimer = setTimeout(() => {
    suppressTypedModelAfterSelect = false;
    suppressResetTimer = null;
  }, 0);
};

onBeforeUnmount(() => {
  if (suppressResetTimer) {
    clearTimeout(suppressResetTimer);
    suppressResetTimer = null;
  }
});

const handleModelUpdate = (value: TValue) => {
  if (props.forceSelection && typeof value === "string") {
    const next = value.trim();
    if (next) {
      const selectedLabel = getOptionLabel(lastSelectedOption);
      const currentLabel = getOptionLabel(props.modelValue);
      if (next === selectedLabel || next === currentLabel) {
        return;
      }
    }
  }
  if (
    suppressTypedModelAfterSelect &&
    props.forceSelection &&
    typeof value === "string"
  ) {
    return;
  }
  emit("update:modelValue", value);
};

let optionSelectEmitLocked = false;
const handleOptionSelect = (event: AutoCompleteOptionSelectEvent) => {
  if (optionSelectEmitLocked) return;
  optionSelectEmitLocked = true;
  queueMicrotask(() => {
    optionSelectEmitLocked = false;
  });
  lastSelectedOption = event.value as TOption;
  armTypedModelSuppression();
  emit("update:modelValue", event.value as TValue);
  emit("option-select", event as TypedOptionSelectEvent<TOption>);
};
</script>

<template>
  <AutoComplete
    v-bind="$attrs"
    class="cc-async-autocomplete"
    :class="{ 'cc-async-autocomplete--loading': isLoading }"
    :modelValue="modelValue"
    :suggestions="suggestions"
    :optionLabel="optionLabel"
    :inputId="inputId"
    :placeholder="placeholder"
    :appendTo="appendTo"
    :panelClass="panelClass"
    :inputClass="inputClass"
    :pt="resolvedPt"
    :forceSelection="forceSelection"
    :completeOnFocus="completeOnFocus"
    :autoOptionFocus="autoOptionFocus"
    :showEmptyMessage="showEmptyMessage"
    :loading="isLoading"
    @update:modelValue="handleModelUpdate"
    @option-select="handleOptionSelect"
    @item-select="handleOptionSelect"
    @complete="handleComplete"
  >
    <template v-if="$slots.option" #option="slotProps">
      <slot name="option" v-bind="slotProps" />
    </template>
  </AutoComplete>
</template>
