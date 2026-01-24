import { computed, ref } from "vue";
import { statusOptions, type AppointmentStatus } from "../data/options";

export type Appointment = {
  id: string;
  date: string;
  patient: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  nurse: string;
  doctor: string;
};

const appointments = ref<Appointment[]>([
  {
    id: "A-1001",
    date: "2026-01-24",
    patient: "Amelia Rivera",
    startTime: "09:00",
    endTime: "09:30",
    status: "Confirmed",
    nurse: "Nora King",
    doctor: "Dr. Patel",
  },
  {
    id: "A-1002",
    date: "2026-01-24",
    patient: "Noah Patel",
    startTime: "10:00",
    endTime: "10:30",
    status: "Pending",
    nurse: "Maya Reed",
    doctor: "Dr. Chen",
  },
  {
    id: "A-1003",
    date: "2026-01-25",
    patient: "Sophia Nguyen",
    startTime: "11:15",
    endTime: "11:45",
    status: "Cancelled",
    nurse: "Eli Brooks",
    doctor: "Dr. Johnson",
  },
  {
    id: "A-1004",
    date: "2026-01-26",
    patient: "Liam Johnson",
    startTime: "08:30",
    endTime: "09:15",
    status: "Confirmed",
    nurse: "Nora King",
    doctor: "Dr. Patel",
  },
  {
    id: "A-1005",
    date: "2026-01-26",
    patient: "Isabella Chen",
    startTime: "13:00",
    endTime: "13:30",
    status: "Pending",
    nurse: "Maya Reed",
    doctor: "Dr. Diaz",
  },
]);

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

export const useAppointments = () => ({
  appointments,
  sortedAppointments,
  statusOptions,
  statusBadgeClass,
});
