<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import AutoComplete from "primevue/autocomplete";
import type {
  AutoCompleteCompleteEvent,
  AutoCompleteOptionSelectEvent,
} from "primevue/autocomplete";
import AppointmentCards from "./AppointmentCards.vue";
import AppAsyncAutocomplete from "./shared/AppAsyncAutocomplete.vue";
import type { AppointmentStatus, PatientOption } from "../data/options";
import { autoCompletePt } from "../ui/primevuePt";
import { fetchEmployeesByTitle } from "../services/employees";
import { fetchVisitTypes, type VisitType } from "../services/visitTypes";
import { fetchPatientAutocomplete } from "../services/patients";
import { useAppointmentStatusesQuery } from "../composables/useAppointmentStatusesQuery";
import type { AppointmentStatusOption } from "../services/appointments";

const props = defineProps<{
  employeeOptions: string[];
  patientOptions: PatientOption[];
  visitTypeOptions: string[];
  quickPatientLabel: string;
  quickDoctorLabel: string;
  isCalendarView?: boolean;
}>();

const employeeFilter = defineModel<string | null>("employeeFilter", {
  default: null,
});
const patientFilter = defineModel<PatientOption | null>("patientFilter", {
  default: null,
});
const visitTypeFilter = defineModel<string | null>("visitTypeFilter", {
  default: null,
});
const stateFilter = defineModel<AppointmentStatusOption | null>("stateFilter", {
  default: null,
});
const statusTagFilter = defineModel<AppointmentStatus | null>(
  "statusTagFilter",
  {
    default: null,
  },
);
const startDate = defineModel<Date | null>("startDate", { default: null });
const endDate = defineModel<Date | null>("endDate", { default: null });

const filteredEmployees = ref<string[]>([]);
const fetchedEmployees = ref<string[]>([]);
const isEmployeesLoading = ref(false);
const patientInput = ref<PatientOption | string | null>(null);
const employeeInput = ref<string | null>(null);
const filteredVisitTypes = ref<string[]>([]);
const fetchedVisitTypes = ref<VisitType[]>([]);
const isVisitTypesLoading = ref(false);
const visitTypeInput = ref<string | null>(null);
const filteredStates = ref<AppointmentStatusOption[]>([]);
const stateInput = ref<AppointmentStatusOption | null>(null);

const {
  statuses: appointmentStatuses,
  isLoading: isStatesLoading,
  isFetching: isStatesFetching,
} = useAppointmentStatusesQuery();

const isStatesBusy = computed(
  () => isStatesLoading.value || isStatesFetching.value,
);

const stateOptions = computed(() => appointmentStatuses.value);
const isCalendarView = computed(() => Boolean(props.isCalendarView));

const searchEmployees = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  if (!query) {
    filteredEmployees.value = [
      ...(fetchedEmployees.value.length
        ? fetchedEmployees.value
        : props.employeeOptions),
    ];
    return;
  }
  const source =
    fetchedEmployees.value.length > 0
      ? fetchedEmployees.value
      : props.employeeOptions;
  filteredEmployees.value = source.filter((name) =>
    name.toLowerCase().includes(query),
  );
};

const handleEmployeeSelect = (event: AutoCompleteOptionSelectEvent) => {
  employeeFilter.value = event.value as string;
  employeeInput.value = event.value as string;
};

const fetchPatientSuggestions = (query: string, signal: AbortSignal) =>
  fetchPatientAutocomplete(query, signal);

const handlePatientSelect = (event: AutoCompleteOptionSelectEvent) => {
  patientFilter.value = event.value as PatientOption;
  patientInput.value = event.value as PatientOption;
};

const handlePatientModelUpdate = (value: unknown) => {
  const typed = value as PatientOption | string | null;
  patientInput.value = typed;
  if (typed === null) {
    patientFilter.value = null;
    return;
  }
  if (typeof typed === "object") {
    patientFilter.value = typed as PatientOption;
    return;
  }
  patientFilter.value = null;
};

const handleVisitTypeSelect = (event: AutoCompleteOptionSelectEvent) => {
  visitTypeFilter.value = event.value as string;
  visitTypeInput.value = event.value as string;
};

const handleStateSelect = (event: AutoCompleteOptionSelectEvent) => {
  stateFilter.value = event.value as AppointmentStatusOption;
  stateInput.value = event.value as AppointmentStatusOption;
};

const searchVisitTypes = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  if (!query) {
    filteredVisitTypes.value = [
      ...((fetchedVisitTypes.value.length
        ? fetchedVisitTypes.value.map((type) => type.name)
        : props.visitTypeOptions) as string[]),
    ];
    return;
  }
  const source =
    fetchedVisitTypes.value.length > 0
      ? fetchedVisitTypes.value.map((type) => type.name)
      : props.visitTypeOptions;
  filteredVisitTypes.value = source.filter((name) =>
    name.toLowerCase().includes(query),
  );
};

const searchStates = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  const source = stateOptions.value;
  if (!query) {
    filteredStates.value = [...source];
    return;
  }
  filteredStates.value = source.filter((option) =>
    option.key.toLowerCase().includes(query),
  );
};

const startOfWeek = (value: Date) => {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date;
};

const endOfWeek = (value: Date) => {
  const date = startOfWeek(value);
  date.setDate(date.getDate() + 6);
  return date;
};

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const isTodayActive = computed(() => {
  if (!startDate.value || !endDate.value) return false;
  const now = new Date();
  return isSameDay(startDate.value, now) && isSameDay(endDate.value, now);
});

const isThisWeekActive = computed(() => {
  if (!startDate.value || !endDate.value) return false;
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  return (
    isSameDay(startDate.value, weekStart) && isSameDay(endDate.value, weekEnd)
  );
});

const toggleStatusTag = (status: AppointmentStatus) => {
  statusTagFilter.value = statusTagFilter.value === status ? null : status;
};

const toggleToday = () => {
  if (isTodayActive.value) {
    startDate.value = null;
    endDate.value = null;
    return;
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  startDate.value = today;
  endDate.value = new Date(today);
};

const toggleThisWeek = () => {
  if (isThisWeekActive.value) {
    startDate.value = null;
    endDate.value = null;
    return;
  }
  const now = new Date();
  startDate.value = startOfWeek(now);
  endDate.value = endOfWeek(now);
};

const normalizeStateValue = (value: string) => value.trim().toLowerCase();

const toggleStateFilter = (value: string) => {
  const normalized = normalizeStateValue(value);
  const current = stateFilter.value;
  const currentValue = current
    ? normalizeStateValue(current.value ?? current.key ?? "")
    : "";
  if (currentValue === normalized) {
    stateFilter.value = null;
    return;
  }
  const match = stateOptions.value.find((option) => {
    return (
      normalizeStateValue(option.value) === normalized ||
      normalizeStateValue(option.key) === normalized
    );
  });
  if (!match) {
    stateFilter.value = {
      key: value,
      value,
      level: 0,
      is_final: false,
    };
    return;
  }
  stateFilter.value = match;
};

const toggleQuickPatient = () => {
  const patientName = props.quickPatientLabel;
  if (!patientName || patientName === "Patient") return;
  const match = props.patientOptions.find(
    (option) => option.name.toLowerCase() === patientName.toLowerCase(),
  );
  if (!match) return;
  if (patientFilter.value?.id === match.id) {
    patientFilter.value = null;
    patientInput.value = null;
    return;
  }
  patientFilter.value = match;
  patientInput.value = match;
};

const toggleQuickDoctor = () => {
  const doctorName = props.quickDoctorLabel;
  if (!doctorName || doctorName === "Doctor") return;
  if (employeeFilter.value === doctorName) {
    employeeFilter.value = null;
    employeeInput.value = null;
    return;
  }
  employeeFilter.value = doctorName;
  employeeInput.value = doctorName;
};

const clearFilters = () => {
  employeeFilter.value = null;
  employeeInput.value = null;
  patientFilter.value = null;
  patientInput.value = null;
  statusTagFilter.value = null;
  startDate.value = null;
  endDate.value = null;
  visitTypeFilter.value = null;
  visitTypeInput.value = null;
  stateFilter.value = null;
  stateInput.value = null;
  filteredEmployees.value = [];
  filteredVisitTypes.value = [];
  filteredStates.value = [];
};

const loadEmployees = async () => {
  isEmployeesLoading.value = true;
  try {
    const [nurses, doctors] = await Promise.all([
      fetchEmployeesByTitle("nurse"),
      fetchEmployeesByTitle("doctor"),
    ]);
    const unique = Array.from(new Set([...nurses, ...doctors]));
    fetchedEmployees.value = unique;
    if (filteredEmployees.value.length === 0) {
      filteredEmployees.value = [...unique];
    }
  } catch (error) {
    console.error("Failed to load employees.", error);
    fetchedEmployees.value = [];
  } finally {
    isEmployeesLoading.value = false;
  }
};

const loadVisitTypes = async () => {
  isVisitTypesLoading.value = true;
  try {
    fetchedVisitTypes.value = await fetchVisitTypes();
    if (filteredVisitTypes.value.length === 0) {
      filteredVisitTypes.value = fetchedVisitTypes.value.map(
        (type) => type.name,
      );
    }
  } catch (error) {
    console.error("Failed to load visit types.", error);
    fetchedVisitTypes.value = [];
  } finally {
    isVisitTypesLoading.value = false;
  }
};

const setDefaultTodayRange = () => {
  if (startDate.value || endDate.value) return;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  startDate.value = today;
  endDate.value = new Date(today);
};

const formatDateInputValue = (value: Date | null) => {
  if (!value) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInputValue = (value: string): Date | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return new Date(year, month - 1, day);
};

const startDateInput = computed({
  get: () => formatDateInputValue(startDate.value),
  set: (value: string) => {
    startDate.value = parseDateInputValue(value);
  },
});

const endDateInput = computed({
  get: () => formatDateInputValue(endDate.value),
  set: (value: string) => {
    endDate.value = parseDateInputValue(value);
  },
});

onMounted(() => {
  if (!isCalendarView.value) {
    setDefaultTodayRange();
  }
  void loadEmployees();
  void loadVisitTypes();
});

watch(isCalendarView, (value) => {
  if (!value) {
    setDefaultTodayRange();
  }
});

watch(
  () => employeeFilter.value,
  (value) => {
    if (employeeInput.value !== value) {
      employeeInput.value = value;
    }
  },
);

watch(
  () => employeeInput.value,
  (value) => {
    if (value === null) {
      employeeFilter.value = null;
    }
  },
);

watch(
  () => patientFilter.value,
  (value) => {
    if (!value && patientInput.value !== null) {
      patientInput.value = null;
    } else if (value && patientInput.value !== value) {
      patientInput.value = value;
    }
  },
);

watch(
  () => visitTypeFilter.value,
  (value) => {
    if (visitTypeInput.value !== value) {
      visitTypeInput.value = value;
    }
  },
);

watch(
  () => visitTypeInput.value,
  (value) => {
    if (value === null) {
      visitTypeFilter.value = null;
    }
  },
);

watch(
  () => stateFilter.value,
  (value) => {
    if (stateInput.value !== value) {
      stateInput.value = value;
    }
  },
);

watch(
  () => stateInput.value,
  (value) => {
    if (value === null) {
      stateFilter.value = null;
      return;
    }
    if (typeof value === "object") {
      stateFilter.value = value as AppointmentStatusOption;
    }
  },
);

</script>

<template>
  <div class="border p-3 rounded mb-2">
    <AppointmentCards :is-today-active="isTodayActive" :is-this-week-active="isThisWeekActive"
      :active-state-filter="stateFilter?.value ?? stateFilter?.key ?? null"
      :status-tag-filter="statusTagFilter" :quick-patient-label="quickPatientLabel"
      :quick-doctor-label="quickDoctorLabel" :patient-filter="patientFilter" :employee-filter="employeeFilter"
      :is-disabled="isCalendarView" @toggle-today="toggleToday" @toggle-week="toggleThisWeek"
      @toggle-status="toggleStatusTag" @filter-state="toggleStateFilter" @toggle-patient="toggleQuickPatient"
      @toggle-doctor="toggleQuickDoctor" />
    <div class="row">
      <div class="col-md-2">
        <label for="employeeFilter" class="cc-label">Employee</label>
        <AutoComplete v-model="employeeInput" inputId="employeeFilter" :suggestions="filteredEmployees"
          :forceSelection="true" :completeOnFocus="true" :autoOptionFocus="true" appendTo="body"
          panelClass="cc-autocomplete-panel" inputClass="cc-input" :pt="autoCompletePt"
          :placeholder="isEmployeesLoading ? 'Loading employees...' : 'Search nurse or doctor'"
          @complete="searchEmployees" @option-select="handleEmployeeSelect" @item-select="handleEmployeeSelect" />
      </div>
      <div class="col-md-2">
        <label for="patientFilter" class="cc-label">Patient</label>
        <AppAsyncAutocomplete
          :modelValue="patientInput"
          inputId="patientFilter"
          optionLabel="name"
          appendTo="body"
          panelClass="cc-autocomplete-panel"
          inputClass="cc-input"
          :pt="autoCompletePt"
          placeholder="Search patient"
          :fetcher="fetchPatientSuggestions"
          @update:modelValue="handlePatientModelUpdate"
          @option-select="handlePatientSelect"
          @error="(error) => console.error('Failed to load patient suggestions.', error)"
        />
      </div>
      <!-- <div class="col-md-2">
        <label for="filterStartDate" class="cc-label">Start date</label>
        <DatePicker v-model="startDate" inputId="filterStartDate" dateFormat="yy-mm-dd" appendTo="body"
          panelClass="cc-datepicker-panel" :pt="datePickerPt" placeholder="Start date" :disabled="isCalendarView" />
      </div> -->
      <!-- <div class="col-md-2">
        <label for="filterEndDate" class="cc-label">End date</label>
        <DatePicker
          v-model="endDate"
          inputId="filterEndDate"
          dateFormat="yy-mm-dd"
          appendTo="body"
          panelClass="cc-datepicker-panel"
          :pt="datePickerPt"
          placeholder="End date"
          :disabled="isCalendarView"
        />
      </div> -->
      <div class="col-md-2">
        <label for="filterStartDate" class="cc-label">Start Date</label>
        <input
          id="filterStartDate"
          type="date"
          class="form-control cc-input"
          v-model="startDateInput"
          :disabled="isCalendarView"
        />
      </div>

      <div class="col-md-2">
        <label for="filterEndDate" class="cc-label">End Date</label>
        <input
          id="filterEndDate"
          type="date"
          class="form-control cc-input"
          v-model="endDateInput"
          :disabled="isCalendarView"
        />
      </div>

      <div class="col-md-2">
        <label for="visitTypeFilter" class="cc-label">Visit Type</label>
        <AutoComplete v-model="visitTypeInput" inputId="visitTypeFilter" :suggestions="filteredVisitTypes"
          :forceSelection="true" :completeOnFocus="true" :autoOptionFocus="true" appendTo="body"
          panelClass="cc-autocomplete-panel" inputClass="cc-input" :pt="autoCompletePt"
          :placeholder="isVisitTypesLoading ? 'Loading visit types...' : 'Select visit type'"
          @complete="searchVisitTypes" @option-select="handleVisitTypeSelect" @item-select="handleVisitTypeSelect" />
      </div>

      <div class="col-md-2">
        <label for="stateFilter" class="cc-label">Status</label>
        <AutoComplete v-model="stateInput" inputId="stateFilter" :suggestions="filteredStates" optionLabel="key"
          :forceSelection="true" :completeOnFocus="true" :autoOptionFocus="true" appendTo="body"
          panelClass="cc-autocomplete-panel" inputClass="cc-input" :pt="autoCompletePt"
          :placeholder="isStatesBusy ? 'Loading states...' : 'Select Status'" @complete="searchStates"
          @option-select="handleStateSelect" @item-select="handleStateSelect" />
      </div>
      <div class="cc-filters-actions">
        <button type="button" class="rounded cc-btn-sm cc-btn-input bg-danger text-light mt-3 mb-2 cc-btn-full"
          @click="clearFilters">
          Clear Filters
        </button>
      </div>
    </div>
  </div>
</template>
