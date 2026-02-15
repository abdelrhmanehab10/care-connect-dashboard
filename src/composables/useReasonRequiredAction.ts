import { computed, ref } from "vue";

type ConfirmPayload<TAction> = {
  action: TAction;
  reason: string;
};

type UseReasonRequiredActionOptions<TAction> = {
  onConfirm: (payload: ConfirmPayload<TAction>) => void | Promise<void>;
  onCancel?: (action: TAction | null) => void;
};

export const useReasonRequiredAction = <TAction>(
  options: UseReasonRequiredActionOptions<TAction>,
) => {
  const visible = ref(false);
  const reasonText = ref("");
  const pendingAction = ref<TAction | null>(null);

  const isReasonValid = computed(() => reasonText.value.trim().length > 0);

  const reset = () => {
    visible.value = false;
    reasonText.value = "";
    pendingAction.value = null;
  };

  const open = (action: TAction) => {
    if (visible.value) {
      return false;
    }
    pendingAction.value = action;
    reasonText.value = "";
    visible.value = true;
    return true;
  };

  const confirm = async () => {
    const action = pendingAction.value;
    const reason = reasonText.value.trim();
    if (!action || !reason) {
      return false;
    }

    reset();
    await options.onConfirm({ action, reason });
    return true;
  };

  const cancel = () => {
    options.onCancel?.(pendingAction.value);
    reset();
  };

  return {
    visible,
    reasonText,
    pendingAction,
    isReasonValid,
    open,
    confirm,
    cancel,
    reset,
  };
};
