import { onScopeDispose, ref } from "vue";

type AsyncAutocompleteFetcher<T> = (
  query: string,
  signal: AbortSignal,
) => Promise<T[]>;

type UseAsyncAutocompleteOptions<T> = {
  fetcher: AsyncAutocompleteFetcher<T>;
  debounceMs?: number | (() => number | undefined);
  minChars?: number | (() => number | undefined);
  showCachedOnFocus?: boolean | (() => boolean | undefined);
  onError?: (error: unknown) => void;
};

export const useAsyncAutocomplete = <T>(
  options: UseAsyncAutocompleteOptions<T>,
) => {
  const resolveOption = <V>(value: V | (() => V | undefined) | undefined) =>
    typeof value === "function"
      ? (value as () => V | undefined)()
      : value;

  const suggestions = ref<T[]>([]);
  const isLoading = ref(false);
  const error = ref<unknown | null>(null);

  const lastResults = ref<T[]>([]);
  const timer = ref<ReturnType<typeof setTimeout> | null>(null);
  const activeController = ref<AbortController | null>(null);
  const requestId = ref(0);

  const stopTimer = () => {
    if (!timer.value) return;
    clearTimeout(timer.value);
    timer.value = null;
  };

  const abortActiveRequest = () => {
    if (!activeController.value) return;
    activeController.value.abort();
    activeController.value = null;
  };

  const cancel = () => {
    stopTimer();
    abortActiveRequest();
    requestId.value += 1;
    isLoading.value = false;
  };

  const clear = () => {
    cancel();
    suggestions.value = [];
    error.value = null;
  };

  const search = (queryInput: string) => {
    const query = queryInput.trim();
    const debounceMs = resolveOption(options.debounceMs) ?? 300;
    const minChars = resolveOption(options.minChars) ?? 2;
    const showCachedOnFocus = resolveOption(options.showCachedOnFocus) ?? true;

    stopTimer();
    error.value = null;

    if (!query) {
      abortActiveRequest();
      isLoading.value = false;
      suggestions.value =
        showCachedOnFocus && lastResults.value.length
          ? [...lastResults.value]
          : [];
      return;
    }

    if (query.length < minChars) {
      abortActiveRequest();
      isLoading.value = false;
      suggestions.value = [];
      return;
    }

    requestId.value += 1;
    const currentRequestId = requestId.value;
    isLoading.value = true;

    timer.value = window.setTimeout(async () => {
      abortActiveRequest();
      const controller = new AbortController();
      activeController.value = controller;

      try {
        const results = await options.fetcher(query, controller.signal);
        if (currentRequestId !== requestId.value) return;
        lastResults.value = Array.isArray(results) ? results : [];
        suggestions.value = [...lastResults.value];
      } catch (caughtError) {
        if (controller.signal.aborted) return;
        if (currentRequestId !== requestId.value) return;
        suggestions.value = [];
        error.value = caughtError;
        options.onError?.(caughtError);
      } finally {
        if (currentRequestId !== requestId.value) return;
        isLoading.value = false;
        timer.value = null;
        activeController.value = null;
      }
    }, debounceMs);
  };

  onScopeDispose(() => {
    cancel();
  });

  return {
    suggestions,
    isLoading,
    error,
    search,
    clear,
    cancel,
  };
};
