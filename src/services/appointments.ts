import { http } from "../lib/api";
import type { Appointment, AppointmentDetails } from "../types";

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

export type AppointmentDetailsResponse = {
  data: AppointmentDetails;
  status: string;
  message: string;
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

export const fetchAppointmentDetails = async (
  appointmentId: number,
): Promise<AppointmentDetails> => {
  const response = await http.get(
    `/api/vue/appointments/details/${appointmentId}`,
  );
  const payload = response.data?.data ?? response.data;
  return payload as AppointmentDetails;
};

export const confirmAppointmentAll = async (
  appointmentId: number,
): Promise<unknown> => {
  const response = await http.get(
    `/api/vue/appointments/confirm-all/${appointmentId}`,
  );
  return response.data;
};
