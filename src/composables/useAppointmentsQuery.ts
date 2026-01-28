import { computed, unref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import type { Ref } from "vue";
import { fetchAppointments } from "../services/appointments";
import { statusOptions, type AppointmentStatus } from "../data/options";

type UseAppointmentsQueryParams = {
  page: Ref<number> | number;
  start?: Ref<string> | string;
  end?: Ref<string> | string;
};

const normalizeStatus = (status: string | null | undefined) =>
  status?.trim().toLowerCase() ?? "";

export const statusBadgeClass = (status: AppointmentStatus | string) => {
  switch (normalizeStatus(status)) {
    case "confirmed":
      return "cc-badge--success";
    case "completed":
      return "cc-badge--neutral";
    case "new":
      return "cc-badge--warning";
    default:
      return "cc-badge--neutral";
  }
};

export const useAppointmentsQuery = (params: UseAppointmentsQueryParams) => {
  const query = useQuery({
    queryKey: [
      "appointments",
      computed(() => unref(params.page)),
      computed(() => unref(params.start ?? "")),
      computed(() => unref(params.end ?? "")),
    ],
    queryFn: () =>
      fetchAppointments({
        page: unref(params.page),
        start: params.start ? unref(params.start) : undefined,
        end: params.end ? unref(params.end) : undefined,
      }),
    staleTime: 30_000,
  });

  const appointments = computed(() =>
    query.data.value?.data ?? [],
  );

  return {
    ...query,
    appointments,
    statusOptions,
  };
};
