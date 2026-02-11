<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import type {
  AutoCompleteCompleteEvent,
  AutoCompleteOptionSelectEvent,
} from "primevue/autocomplete";
import { computed } from "vue";
import { useAsyncAutocomplete } from "../../composables/useAsyncAutocomplete";
import { autoCompletePt as defaultAutoCompletePt } from "../../ui/primevuePt";

type AsyncAutocompleteFetcher = (
  query: string,
  signal: AbortSignal,
) => Promise<unknown[]>;

const props = withDefaults(
  defineProps<{
    modelValue: unknown;
    fetcher: AsyncAutocompleteFetcher;
    optionLabel?: string;
    inputId?: string;
    placeholder?: string;
    minChars?: number;
    debounceMs?: number;
    showCachedOnFocus?: boolean;
    appendTo?: "body" | "self";
    panelClass?: string;
    inputClass?: string;
    pt?: unknown;
    forceSelection?: boolean;
    completeOnFocus?: boolean;
    autoOptionFocus?: boolean;
    showEmptyMessage?: boolean;
  }>(),
  {
    optionLabel: undefined,
    inputId: undefined,
    placeholder: "",
    minChars: 2,
    debounceMs: 300,
    showCachedOnFocus: true,
    appendTo: "body",
    panelClass: "cc-autocomplete-panel",
    inputClass: undefined,
    pt: undefined,
    forceSelection: true,
    completeOnFocus: true,
    autoOptionFocus: true,
    showEmptyMessage: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: unknown];
  "option-select": [event: AutoCompleteOptionSelectEvent];
  error: [error: unknown];
}>();

const { suggestions, isLoading, search } = useAsyncAutocomplete<unknown>({
  fetcher: props.fetcher,
  debounceMs: props.debounceMs,
  minChars: props.minChars,
  showCachedOnFocus: props.showCachedOnFocus,
  onError: (error) => {
    emit("error", error);
  },
});

const resolvedPt = computed(() => props.pt ?? defaultAutoCompletePt);

const handleComplete = (event: AutoCompleteCompleteEvent) => {
  search(event.query ?? "");
};

const handleModelUpdate = (value: unknown) => {
  emit("update:modelValue", value);
};

const handleOptionSelect = (event: AutoCompleteOptionSelectEvent) => {
  emit("option-select", event);
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
