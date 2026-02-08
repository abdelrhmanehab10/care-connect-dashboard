import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import {
  fetchAppointmentStatuses,
  type AppointmentStatusOption,
} from "../services/appointments";

export const useAppointmentStatusesQuery = () => {
  const query = useQuery({
    queryKey: ["appointment-statuses"],
    queryFn: fetchAppointmentStatuses,
    staleTime: 5 * 60_000,
  });

  const statuses = computed<AppointmentStatusOption[]>(() =>
    Array.isArray(query.data.value) ? query.data.value : [],
  );

  return {
    ...query,
    statuses,
  };
};
