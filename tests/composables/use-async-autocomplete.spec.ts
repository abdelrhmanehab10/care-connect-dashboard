import { effectScope } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useAsyncAutocomplete } from "../../src/composables/useAsyncAutocomplete";

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const createDeferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe("useAsyncAutocomplete", () => {
  it("debounces requests and keeps only the latest response", async () => {
    vi.useFakeTimers();

    const first = createDeferred<string[]>();
    const second = createDeferred<string[]>();
    const seenSignals: AbortSignal[] = [];
    const fetcher = vi.fn((query: string, signal: AbortSignal) => {
      seenSignals.push(signal);
      if (query === "al") return first.promise;
      return second.promise;
    });

    const scope = effectScope();
    const api = scope.run(() =>
      useAsyncAutocomplete<string>({
        fetcher,
        debounceMs: 100,
        minChars: 2,
      }),
    );
    if (!api) throw new Error("Failed to create composable scope.");

    api.search("al");
    vi.advanceTimersByTime(100);
    await flushMicrotasks();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(api.isLoading.value).toBe(true);

    api.search("alex");
    vi.advanceTimersByTime(100);
    await flushMicrotasks();
    expect(seenSignals[0]?.aborted).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);

    second.resolve(["Alex Morgan"]);
    await flushMicrotasks();
    expect(api.suggestions.value).toEqual(["Alex Morgan"]);
    expect(api.isLoading.value).toBe(false);

    first.resolve(["Old Result"]);
    await flushMicrotasks();
    expect(api.suggestions.value).toEqual(["Alex Morgan"]);

    scope.stop();
    vi.useRealTimers();
  });

  it("reuses cached suggestions on empty focus query", async () => {
    vi.useFakeTimers();

    const fetcher = vi.fn(async (query: string) => [query.toUpperCase()]);

    const scope = effectScope();
    const api = scope.run(() =>
      useAsyncAutocomplete<string>({
        fetcher,
        debounceMs: 50,
        minChars: 2,
        showCachedOnFocus: true,
      }),
    );
    if (!api) throw new Error("Failed to create composable scope.");

    api.search("ma");
    vi.advanceTimersByTime(50);
    await flushMicrotasks();
    expect(api.suggestions.value).toEqual(["MA"]);
    expect(fetcher).toHaveBeenCalledTimes(1);

    api.search("");
    await flushMicrotasks();
    expect(api.suggestions.value).toEqual(["MA"]);
    expect(fetcher).toHaveBeenCalledTimes(1);

    scope.stop();
    vi.useRealTimers();
  });
});
