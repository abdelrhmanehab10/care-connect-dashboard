import { http } from "../lib/api";
import type { Appointment } from "../types";

export type AppointmentsQueryParams = {
  page?: number;
  start?: string;
  end?: string;
};

export type AppointmentsResponse = {
  data: Appointment[];
  status: string;
  message: string;
  hasMorePages: boolean;
  nextPageURL: string | null;
  total: number;
  perPage: number;
  currentPage: number;
};

export const fetchAppointments = async (
  params: AppointmentsQueryParams,
): Promise<AppointmentsResponse> => {
  const response = await http.post(
    "/api/vue/appointments/list",
    {
      start: params.start ?? "",
      end: params.end ?? "",
      view_pagination: true,
    },
    {
      params: {
        page: params.page ?? 1,
      },
    },
  );

  return response.data;
};
