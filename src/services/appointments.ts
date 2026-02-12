import { http } from "../lib/api";
import type { Appointment, AppointmentDetails } from "../types";

export type AppointmentsQueryParams = {
  page?: number;
  start?: string;
  end?: string;
  status?: string;
  employee?: string;
  patient?: string;
  patient_id?: string;
  visit_type?: string;
  visit_type_id?: string;
  state?: string;
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

export type AppointmentLogEntry = {
  employee: string;
  patient: string;
  action: string;
  time: string;
};

export type AppointmentLogResponse = {
  data: AppointmentLogEntry[];
  status: string;
  message: string;
};

export type AppointmentStatusOption = {
  key: string;
  value: string;
  level: number;
  is_final: boolean;
};

export type AppointmentCardsStatusCount = {
  status: string;
  name: string;
  count: number;
};

export type AppointmentCardsPeriods = {
  today: number;
  this_week: number;
  this_month: number;
};

export type AppointmentCardsData = {
  total: number;
  by_status: AppointmentCardsStatusCount[];
  periods: AppointmentCardsPeriods;
};

export type AppointmentCardsResponse = {
  data: AppointmentCardsData;
  status: string;
  message: string;
};

export type CreateAppointmentPayload = {
  patient_id: string;
  new_address: {
    address: string;
    lat: string;
    lng: string;
  };
  visit_type_id: string;
  is_recurring: "0" | "1";
  date: string;
  start_time: string;
  end_time: string;
  main_nurse?: string;
  nurse_schedule_type?: string;
  employee_slots?: {
    nurse?: { start_time: string; end_time: string } | EmployeeRecurringSlot[];
    doctor?: { start_time: string; end_time: string } | EmployeeRecurringSlot[];
    social_worker?:
      | { start_time: string; end_time: string }
      | EmployeeRecurringSlot[];
    driver?: { start_time: string; end_time: string } | EmployeeRecurringSlot[];
  };
  main_doctor?: string;
  doctor_id?: string;
  doctor_schedule_type?: string;
  main_social_worker?: string;
  social_worker_id?: string;
  social_worker_schedule_type?: string;
  driver_schedule_type?: string;
  driver_id?: string;
  instructions?: string;
};

type EmployeeRecurringSlot = {
  day: string;
  start_time: string;
  end_time: string;
};

export type UpdateAppointmentPayload = Partial<CreateAppointmentPayload> & {
  nurse_id?: string;
  status?: string;
  reason?: string;
};

export const fetchAppointments = async (
  params: AppointmentsQueryParams,
): Promise<AppointmentsResponse> => {
  const body: Record<string, string | boolean | undefined> = {
    start: params.start ?? "",
    end: params.end ?? "",
    view_pagination: true,
  };

  if (params.status) body.status = params.status;
  if (params.employee) body.employee = params.employee;
  if (params.patient) body.patient = params.patient;
  if (params.patient_id) body.patient_id = params.patient_id;
  if (params.visit_type) body.visit_type = params.visit_type;
  if (params.visit_type_id) body.visit_type_id = params.visit_type_id;
  if (params.state) body.status = params.state;

  const response = await http.post("/vue/appointments/list", body, {
    params: {
      page: params.page ?? 1,
    },
  });

  return response.data;
};

export const fetchAppointmentStatuses = async (): Promise<
  AppointmentStatusOption[]
> => {
  const response = await http.get("/vue/appointments/status-list");
  const payload = response.data;

  if (Array.isArray(payload)) {
    return payload as AppointmentStatusOption[];
  }

  if (Array.isArray(payload?.data)) {
    return payload.data as AppointmentStatusOption[];
  }

  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data as AppointmentStatusOption[];
  }

  return [];
};

export const fetchAppointmentCards =
  async (): Promise<AppointmentCardsData> => {
    const response = await http.get("/vue/appointments/cards");
    const payload = response.data;
    if (payload?.data) {
      return payload.data as AppointmentCardsData;
    }
    return payload as AppointmentCardsData;
  };

export const fetchAppointmentDetails = async (
  appointmentId: number,
): Promise<AppointmentDetails> => {
  const response = await http.get(`/vue/appointments/details/${appointmentId}`);
  const payload = response.data?.data ?? response.data;
  return payload as AppointmentDetails;
};

export const fetchAppointmentLog = async (
  appointmentId: number,
): Promise<AppointmentLogEntry[]> => {
  const response = await http.get(`/vue/appointments/log/${appointmentId}`);
  const payload = response.data;
  if (Array.isArray(payload?.data)) {
    return payload.data as AppointmentLogEntry[];
  }
  if (Array.isArray(payload)) {
    return payload as AppointmentLogEntry[];
  }
  return [];
};

export const createAppointment = async (
  payload: CreateAppointmentPayload,
): Promise<unknown> => {
  const response = await http.post("/vue/appointments/create", payload);
  return response.data;
};

export const updateAppointment = async (
  appointmentId: number,
  payload: UpdateAppointmentPayload,
): Promise<unknown> => {
  const response = await http.post(
    `/vue/appointments/update/${appointmentId}`,
    payload,
  );
  return response.data;
};

export const confirmAppointmentAll = async (
  appointmentId: number,
): Promise<unknown> => {
  const response = await http.get(`/vue/appointments/confirm-all/${appointmentId}`);
  return response.data;
};

export const confirmAppointmentEmployee = async (
  appointmentId: number,
  employeeId: number,
): Promise<unknown> => {
  const response = await http.get(`/vue/appointments/confirm/${appointmentId}/${employeeId}`);
  return response.data;
};

export const quickNoShowAppointment = async (
  appointmentId: number,
): Promise<unknown> => {
  const response = await http.post(`/vue/appointments/quick-no-show/${appointmentId}`);
  return response.data;
};

export type CancelAppointmentPayload = {
  reason?: string;
  notes?: string;
};

export const cancelAppointment = async (
  appointmentId: number,
  payload: CancelAppointmentPayload = {},
): Promise<unknown> => {
  const response = await http.post(
    `/vue/appointments/cancel/${appointmentId}`,
    payload,
  );
  return response.data;
};
