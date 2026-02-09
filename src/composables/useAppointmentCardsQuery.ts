import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import {
  fetchAppointmentCards,
  type AppointmentCardsData,
} from "../services/appointments";

const emptyCardsData: AppointmentCardsData = {
  total: 0,
  by_status: [],
  periods: {
    today: 0,
    this_week: 0,
    this_month: 0,
  },
};

export const useAppointmentCardsQuery = () => {
  const query = useQuery({
    queryKey: ["appointment-cards"],
    queryFn: fetchAppointmentCards,
    staleTime: 30_000,
  });

  const cards = computed<AppointmentCardsData>(() => {
    const data = query.data.value;
    if (data && typeof data === "object") {
      return data as AppointmentCardsData;
    }
    return emptyCardsData;
  });

  return {
    ...query,
    cards,
  };
};
