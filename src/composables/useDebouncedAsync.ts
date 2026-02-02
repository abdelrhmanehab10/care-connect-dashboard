import { onBeforeUnmount, ref } from "vue";

type DebouncedAsyncHandler<T> = () => Promise<T>;
type DebouncedAsyncSuccess<T> = (result: T) => void;
type DebouncedAsyncError = (error: unknown) => void;

export const useDebouncedAsync = (delay = 300) => {
  const timer = ref<ReturnType<typeof setTimeout> | null>(null);
  const token = ref(0);

  const cancel = () => {
    if (timer.value) {
      clearTimeout(timer.value);
      timer.value = null;
    }
    token.value += 1;
  };

  const run = <T>(
    handler: DebouncedAsyncHandler<T>,
    onSuccess: DebouncedAsyncSuccess<T>,
    onError?: DebouncedAsyncError,
  ) => {
    cancel();
    const currentToken = token.value;
    timer.value = window.setTimeout(async () => {
      try {
        const result = await handler();
        if (currentToken !== token.value) {
          return;
        }
        onSuccess(result);
      } catch (error) {
        if (currentToken !== token.value) {
          return;
        }
        onError?.(error);
      }
    }, delay);
  };

  onBeforeUnmount(() => {
    cancel();
  });

  return {
    run,
    cancel,
  };
};
