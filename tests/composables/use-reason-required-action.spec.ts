import { describe, expect, it, vi } from "vitest";
import { useReasonRequiredAction } from "../../src/composables/useReasonRequiredAction";

describe("useReasonRequiredAction", () => {
  it("opens with a pending action and resets reason input", () => {
    const action = { type: "cancel", id: 101 };
    const composable = useReasonRequiredAction({
      onConfirm: vi.fn(),
    });

    composable.reasonText.value = "old reason";
    const opened = composable.open(action);

    expect(opened).toBe(true);
    expect(composable.visible.value).toBe(true);
    expect(composable.pendingAction.value).toEqual(action);
    expect(composable.reasonText.value).toBe("");
  });

  it("blocks opening while dialog is already visible", () => {
    const composable = useReasonRequiredAction({
      onConfirm: vi.fn(),
    });

    const first = composable.open({ type: "cancel", id: 1 });
    const second = composable.open({ type: "cancel", id: 2 });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(composable.pendingAction.value).toEqual({ type: "cancel", id: 1 });
  });

  it("requires a non-empty reason before confirming", async () => {
    const onConfirm = vi.fn();
    const composable = useReasonRequiredAction({
      onConfirm,
    });

    composable.open({ type: "cancel", id: 1 });
    composable.reasonText.value = "   ";

    const confirmed = await composable.confirm();

    expect(confirmed).toBe(false);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(composable.visible.value).toBe(true);
  });

  it("confirms with trimmed reason and resets state", async () => {
    const onConfirm = vi.fn();
    const composable = useReasonRequiredAction({
      onConfirm,
    });
    const action = { type: "cancel", id: 77 };

    composable.open(action);
    composable.reasonText.value = "  duplicate booking  ";

    const confirmed = await composable.confirm();

    expect(confirmed).toBe(true);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({
      action,
      reason: "duplicate booking",
    });
    expect(composable.visible.value).toBe(false);
    expect(composable.pendingAction.value).toBe(null);
    expect(composable.reasonText.value).toBe("");
  });

  it("calls onCancel with pending action and resets state", () => {
    const onCancel = vi.fn();
    const composable = useReasonRequiredAction({
      onConfirm: vi.fn(),
      onCancel,
    });
    const action = { type: "cancel", id: 55 };

    composable.open(action);
    composable.reasonText.value = "any text";
    composable.cancel();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledWith(action);
    expect(composable.visible.value).toBe(false);
    expect(composable.pendingAction.value).toBe(null);
    expect(composable.reasonText.value).toBe("");
  });
});
