import { computed, unref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import type { Ref } from "vue";
import { fetchAppointments } from "../services/appointments";
import { statusOptions, type AppointmentStatus } from "../data/options";
import type { Appointment } from "../types";

export type AppointmentUi = {
  id: string;
  date: string;
  patient: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  nurse: string;
  nurseStartTime: string;
  nurseEndTime: string;
  doctor: string;
  doctorStartTime: string;
  doctorEndTime: string;
  instructions: string;
};

type UseAppointmentsQueryParams = {
  page: Ref<number> | number;
  start?: Ref<string> | string;
  end?: Ref<string> | string;
};

const normalizeDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return value.replace(/\//g, "-");
};

const normalizeTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  if (value.includes("T")) {
    return value.slice(11, 16);
  }

  return value.slice(0, 5);
};

const mapAppointmentToUi = (appointment: Appointment): AppointmentUi => {
  const dateFromStart = appointment.start?.slice(0, 10);
  const date = normalizeDate(appointment.date ?? dateFromStart);
  const startTime = normalizeTime(appointment.start_time ?? appointment.start);
  const endTime = normalizeTime(appointment.end_time ?? appointment.end);

  return {
    id: String(appointment.id),
    date,
    patient: appointment.title ?? "-",
    startTime,
    endTime,
    status: "Pending",
    nurse: "-",
    nurseStartTime: startTime,
    nurseEndTime: endTime,
    doctor: "-",
    doctorStartTime: startTime,
    doctorEndTime: endTime,
    instructions: "-",
  };
};

export const statusBadgeClass = (status: AppointmentStatus) => {
  switch (status) {
    case "Confirmed":
      return "cc-badge--success";
    case "Pending":
      return "cc-badge--warning";
    case "Cancelled":
      return "cc-badge--danger";
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
    (query.data.value?.data ?? []).map(mapAppointmentToUi),
  );

  return {
    ...query,
    appointments,
    statusOptions,
  };
};
