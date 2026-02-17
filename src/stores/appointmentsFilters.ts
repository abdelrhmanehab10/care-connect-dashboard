import { defineStore } from "pinia";
import { ref } from "vue";
import type { EmployeeOption } from "../services/employees";
import type { AppointmentStatusOption } from "../services/appointments";
import type { AppointmentStatus, PatientOption } from "../data/options";

export const useAppointmentsFiltersStore = defineStore(
  "appointmentsFilters",
  () => {
    const employeeFilter = ref<EmployeeOption | null>(null);
    const patientFilter = ref<PatientOption | null>(null);
    const visitTypeFilter = ref<string | null>(null);
    const stateFilter = ref<AppointmentStatusOption | null>(null);
    const statusTagFilter = ref<AppointmentStatus | null>(null);
    const startDate = ref<Date | null>(null);
    const endDate = ref<Date | null>(null);

    const reset = () => {
      employeeFilter.value = null;
      patientFilter.value = null;
      visitTypeFilter.value = null;
      stateFilter.value = null;
      statusTagFilter.value = null;
      startDate.value = null;
      endDate.value = null;
    };

    return {
      employeeFilter,
      patientFilter,
      visitTypeFilter,
      stateFilter,
      statusTagFilter,
      startDate,
      endDate,
      reset,
    };
  },
);
