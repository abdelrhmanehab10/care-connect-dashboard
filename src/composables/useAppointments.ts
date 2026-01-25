import { computed, ref, watch } from "vue";
import { statusOptions, type AppointmentStatus } from "../data/options";

export type Appointment = {
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
  instructions: string;
};

export type NewAppointment = {
  date: string;
  patient: string;
  startTime: string;
  endTime: string;
  status?: AppointmentStatus;
  nurse?: string;
  nurseStartTime?: string;
  nurseEndTime?: string;
  doctor?: string;
  instructions?: string;
};

const defaultAppointments: Appointment[] = [
  {
    id: "A-1001",
    date: "2026-01-24",
    patient: "Amelia Rivera",
    startTime: "09:00",
    endTime: "09:30",
    status: "Confirmed",
    nurse: "Nora King",
    nurseStartTime: "09:00",
    nurseEndTime: "09:30",
    doctor: "Dr. Patel",
    instructions: "",
  },
  {
    id: "A-1002",
    date: "2026-01-24",
    patient: "Noah Patel",
    startTime: "10:00",
    endTime: "10:30",
    status: "Pending",
    nurse: "Maya Reed",
    nurseStartTime: "10:00",
    nurseEndTime: "10:30",
    doctor: "Dr. Chen",
    instructions: "",
  },
  {
    id: "A-1003",
    date: "2026-01-25",
    patient: "Sophia Nguyen",
    startTime: "11:15",
    endTime: "11:45",
    status: "Cancelled",
    nurse: "Eli Brooks",
    nurseStartTime: "11:15",
    nurseEndTime: "11:45",
    doctor: "Dr. Johnson",
    instructions: "",
  },
  {
    id: "A-1004",
    date: "2026-01-26",
    patient: "Liam Johnson",
    startTime: "08:30",
    endTime: "09:15",
    status: "Confirmed",
    nurse: "Nora King",
    nurseStartTime: "08:30",
    nurseEndTime: "09:15",
    doctor: "Dr. Patel",
    instructions: "",
  },
  {
    id: "A-1005",
    date: "2026-01-26",
    patient: "Isabella Chen",
    startTime: "13:00",
    endTime: "13:30",
    status: "Pending",
    nurse: "Maya Reed",
    nurseStartTime: "13:00",
    nurseEndTime: "13:30",
    doctor: "Dr. Diaz",
    instructions: "",
  },
];

const STORAGE_KEY = "care-connect-appointments";
const hasStorage = typeof window !== "undefined" && "localStorage" in window;

const normalizeAppointment = (value: unknown): Appointment | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.date !== "string" ||
    typeof record.patient !== "string" ||
    typeof record.startTime !== "string" ||
    typeof record.endTime !== "string"
  ) {
    return null;
  }

  const status = statusOptions.includes(record.status as AppointmentStatus)
    ? (record.status as AppointmentStatus)
    : "Pending";

  return {
    id: typeof record.id === "string" ? record.id : "A-0000",
    date: record.date,
    patient: record.patient,
    startTime: record.startTime,
    endTime: record.endTime,
    status,
    nurse: typeof record.nurse === "string" ? record.nurse : "TBD",
    nurseStartTime:
      typeof record.nurseStartTime === "string" ? record.nurseStartTime : "",
    nurseEndTime:
      typeof record.nurseEndTime === "string" ? record.nurseEndTime : "",
    doctor: typeof record.doctor === "string" ? record.doctor : "TBD",
    instructions:
      typeof record.instructions === "string" ? record.instructions : "",
  };
};

const loadAppointments = (): Appointment[] => {
  if (!hasStorage) {
    return [...defaultAppointments];
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [...defaultAppointments];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [...defaultAppointments];
    }

    const normalized = parsed
      .map((entry) => normalizeAppointment(entry))
      .filter((entry): entry is Appointment => Boolean(entry));

    return normalized.length ? normalized : [...defaultAppointments];
  } catch {
    return [...defaultAppointments];
  }
};

const appointments = ref<Appointment[]>(loadAppointments());

const sortedAppointments = computed(() => {
  return [...appointments.value].sort((a, b) => {
    if (a.date === b.date) {
      return a.startTime.localeCompare(b.startTime);
    }
    return a.date.localeCompare(b.date);
  });
});

const statusBadgeClass = (status: AppointmentStatus) => {
  switch (status) {
    case "Confirmed":
      return "text-bg-success";
    case "Pending":
      return "text-bg-warning";
    case "Cancelled":
      return "text-bg-danger";
    default:
      return "text-bg-secondary";
  }
};

const nextAppointmentId = () => {
  const maxId = appointments.value.reduce((max, appointment) => {
    const match = appointment.id.match(/A-(\d+)/);
    const matchId = match?.[1];
    if (!matchId) {
      return max;
    }
    return Math.max(max, Number.parseInt(matchId, 10));
  }, 0);

  return `A-${String(maxId + 1).padStart(4, "0")}`;
};

const addAppointment = (payload: NewAppointment) => {
  appointments.value.push({
    id: nextAppointmentId(),
    date: payload.date,
    patient: payload.patient,
    startTime: payload.startTime,
    endTime: payload.endTime,
    status: payload.status ?? "Pending",
    nurse: payload.nurse ?? "TBD",
    nurseStartTime: payload.nurseStartTime ?? "",
    nurseEndTime: payload.nurseEndTime ?? "",
    doctor: payload.doctor ?? "TBD",
    instructions: payload.instructions ?? "",
  });
};

const updateAppointment = (updated: Appointment) => {
  const index = appointments.value.findIndex(
    (appointment) => appointment.id === updated.id
  );

  if (index === -1) {
    return;
  }

  appointments.value[index] = { ...appointments.value[index], ...updated };
};

const persistAppointments = (value: Appointment[]) => {
  if (!hasStorage) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
};

let hasWatcher = false;
const ensurePersistence = () => {
  if (hasWatcher) {
    return;
  }

  hasWatcher = true;
  watch(
    appointments,
    (value) => {
      persistAppointments(value);
    },
    { deep: true, immediate: true }
  );
};

export const useAppointments = () => {
  ensurePersistence();

  return {
    appointments,
    sortedAppointments,
    statusOptions,
    statusBadgeClass,
    addAppointment,
    updateAppointment,
  };
};
