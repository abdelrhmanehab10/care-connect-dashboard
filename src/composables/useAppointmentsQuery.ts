import { computed, unref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import type { Ref } from "vue";
import { fetchAppointments } from "../services/appointments";
import { statusOptions, type AppointmentStatus } from "../data/options";

type UseAppointmentsQueryParams = {
  page: Ref<number> | number;
  start?: Ref<string> | string;
  end?: Ref<string> | string;
  status?: Ref<string> | string;
  employee?: Ref<string> | string;
  patient?: Ref<string> | string;
  patient_id?: Ref<string> | string;
  visit_type?: Ref<string> | string;
  visit_type_id?: Ref<string> | string;
  state?: Ref<string> | string;
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
      computed(() => unref(params.status ?? "")),
      computed(() => unref(params.employee ?? "")),
      computed(() => unref(params.patient ?? "")),
      computed(() => unref(params.patient_id ?? "")),
      computed(() => unref(params.visit_type ?? "")),
      computed(() => unref(params.visit_type_id ?? "")),
      computed(() => unref(params.state ?? "")),
    ],
    queryFn: () =>
      fetchAppointments({
        page: unref(params.page),
        start: params.start ? unref(params.start) : undefined,
        end: params.end ? unref(params.end) : undefined,
        status: params.status ? unref(params.status) : undefined,
        employee: params.employee ? unref(params.employee) : undefined,
        patient: params.patient ? unref(params.patient) : undefined,
        patient_id: params.patient_id ? unref(params.patient_id) : undefined,
        visit_type: params.visit_type ? unref(params.visit_type) : undefined,
        visit_type_id: params.visit_type_id
          ? unref(params.visit_type_id)
          : undefined,
        state: params.state ? unref(params.state) : undefined,
      }),
    staleTime: 30_000,
  });

  const appointments = computed(() => query.data.value?.data ?? []);

  return {
    ...query,
    appointments,
    statusOptions,
  };
};
