<script setup lang="ts">
import { computed, isRef, reactive, ref, watch, type Ref } from "vue";
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { z } from "zod";
import type { AutoCompleteCompleteEvent } from "primevue/autocomplete";
import AutoComplete from "primevue/autocomplete";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import ToggleSwitch from "primevue/toggleswitch";
import {
  areaOptions,
  doctorOptions,
  nurseOptions,
  patientOptions,
  socialWorkerOptions,
  visitTypeOptions,
  weekdayOptions,
  type PatientOption,
  type Weekday,
} from "../data/options";
import {
  autoCompletePt,
  datePickerPt,
  dialogPt,
  toggleSwitchPt,
} from "../ui/primevuePt";

const visible = defineModel<boolean>({ required: true });
const emit = defineEmits<{
  save: [payload: any];
}>();

const selectedPatient = ref<PatientOption | string | null>(null);
const filteredPatients = ref<PatientOption[]>([]);
const instructions = ref("");
const nurseName = ref<string | null>(null);
const filteredNurses = ref<string[]>([]);
const doctorName = ref<string | null>(null);
const filteredDoctors = ref<string[]>([]);
const socialWorkerName = ref<string | null>(null);
const filteredSocialWorkers = ref<string[]>([]);
const nurseAssignmentMode = ref<"primary" | "custom">("primary");
const doctorAssignmentMode = ref<"primary" | "custom">("primary");
const socialWorkerAssignmentMode = ref<"primary" | "custom">("primary");
const { handleSubmit } = useForm({
  validationSchema: toTypedSchema(z.object({})),
});

const address = reactive({
  area: "",
  city: "",
  street: "",
});

const visit = reactive({
  type: "",
});

const showNurseSection = computed(() => {
  return (
    visit.type === "Initial Visit" ||
    visit.type === "Follow Up" ||
    visit.type === "Home Visit"
  );
});

const showDoctorSection = computed(() => {
  return visit.type === "Initial Visit" || visit.type === "Follow Up";
});

const showSocialWorkerSection = computed(() => {
  return visit.type === "Initial Visit";
});

const nurseSchedule = reactive({
  startTime: null as Date | null,
  endTime: null as Date | null,
});

const doctorSchedule = reactive({
  startTime: null as Date | null,
  endTime: null as Date | null,
});

const socialWorkerSchedule = reactive({
  startTime: null as Date | null,
  endTime: null as Date | null,
});

type EmployeeRecurrenceRow = {
  id: string;
  day: Weekday;
  startTime: Date | null;
  endTime: Date | null;
};

type EmployeeRowsLike = EmployeeRecurrenceRow[] | Ref<EmployeeRecurrenceRow[]>;

const schedule = reactive({
  isRecurring: false,
  appointmentDate: null as Date | null,
  appointmentStartTime: null as Date | null,
  appointmentEndTime: null as Date | null,
  recurringStartDate: null as Date | null,
  recurringEndDate: null as Date | null,
});

type RecurrenceRow = {
  id: string;
  day: Weekday;
  startTime: Date | null;
  endTime: Date | null;
};

const defaultWeekday = weekdayOptions[0];
let recurrenceRowId = 1;
const recurrenceRows = ref<RecurrenceRow[]>([
  {
    id: `row-${recurrenceRowId++}`,
    day: defaultWeekday,
    startTime: null,
    endTime: null,
  },
]);
let employeeRecurrenceRowId = 1;
const nurseRecurrenceRows = ref<EmployeeRecurrenceRow[]>([
  {
    id: `nurse-row-${employeeRecurrenceRowId++}`,
    day: defaultWeekday,
    startTime: null,
    endTime: null,
  },
]);
const doctorRecurrenceRows = ref<EmployeeRecurrenceRow[]>([
  {
    id: `doctor-row-${employeeRecurrenceRowId++}`,
    day: defaultWeekday,
    startTime: null,
    endTime: null,
  },
]);
const socialWorkerRecurrenceRows = ref<EmployeeRecurrenceRow[]>([
  {
    id: `social-row-${employeeRecurrenceRowId++}`,
    day: defaultWeekday,
    startTime: null,
    endTime: null,
  },
]);

const isPatientOption = (value: unknown): value is PatientOption => {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as PatientOption).id === "string"
  );
};

const isPatientSelected = computed(() =>
  isPatientOption(selectedPatient.value),
);

const formatDate = (value: Date | null) => {
  if (!value) {
    return "";
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTime = (value: Date | null) => {
  if (!value) {
    return "";
  }

  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const resetForm = () => {
  selectedPatient.value = null;
  filteredPatients.value = [];
  nurseName.value = null;
  filteredNurses.value = [];
  doctorName.value = null;
  filteredDoctors.value = [];
  socialWorkerName.value = null;
  filteredSocialWorkers.value = [];
  nurseAssignmentMode.value = "primary";
  doctorAssignmentMode.value = "primary";
  socialWorkerAssignmentMode.value = "primary";
  nurseName.value = null;
  doctorName.value = null;
  socialWorkerName.value = null;
  address.area = "";
  address.city = "";
  address.street = "";
  visit.type = "";
  nurseSchedule.startTime = null;
  nurseSchedule.endTime = null;
  doctorSchedule.startTime = null;
  doctorSchedule.endTime = null;
  socialWorkerSchedule.startTime = null;
  socialWorkerSchedule.endTime = null;
  nurseRecurrenceRows.value = [
    {
      id: `nurse-row-${employeeRecurrenceRowId++}`,
      day: defaultWeekday,
      startTime: null,
      endTime: null,
    },
  ];
  doctorRecurrenceRows.value = [
    {
      id: `doctor-row-${employeeRecurrenceRowId++}`,
      day: defaultWeekday,
      startTime: null,
      endTime: null,
    },
  ];
  socialWorkerRecurrenceRows.value = [
    {
      id: `social-row-${employeeRecurrenceRowId++}`,
      day: defaultWeekday,
      startTime: null,
      endTime: null,
    },
  ];
  schedule.isRecurring = false;
  schedule.appointmentDate = null;
  schedule.appointmentStartTime = null;
  schedule.appointmentEndTime = null;
  schedule.recurringStartDate = null;
  schedule.recurringEndDate = null;
  instructions.value = "";
  recurrenceRowId = 1;
  recurrenceRows.value = [
    {
      id: `row-${recurrenceRowId++}`,
      day: defaultWeekday,
      startTime: null,
      endTime: null,
    },
  ];
};

watch(nurseAssignmentMode, (value) => {
  if (value === "primary") {
    nurseName.value = null;
    filteredNurses.value = [];
    nurseSchedule.startTime = null;
    nurseSchedule.endTime = null;
    nurseRecurrenceRows.value = [
      {
        id: `nurse-row-${employeeRecurrenceRowId++}`,
        day: defaultWeekday,
        startTime: null,
        endTime: null,
      },
    ];
  }
});

watch(doctorAssignmentMode, (value) => {
  if (value === "primary") {
    doctorName.value = null;
    filteredDoctors.value = [];
    doctorSchedule.startTime = null;
    doctorSchedule.endTime = null;
    doctorRecurrenceRows.value = [
      {
        id: `doctor-row-${employeeRecurrenceRowId++}`,
        day: defaultWeekday,
        startTime: null,
        endTime: null,
      },
    ];
  }
});

watch(socialWorkerAssignmentMode, (value) => {
  if (value === "primary") {
    socialWorkerName.value = null;
    filteredSocialWorkers.value = [];
    socialWorkerSchedule.startTime = null;
    socialWorkerSchedule.endTime = null;
    socialWorkerRecurrenceRows.value = [
      {
        id: `social-row-${employeeRecurrenceRowId++}`,
        day: defaultWeekday,
        startTime: null,
        endTime: null,
      },
    ];
  }
});

const handleSave = () => {
  if (!isPatientOption(selectedPatient.value)) {
    return;
  }

  const date = schedule.isRecurring
    ? schedule.recurringStartDate
    : schedule.appointmentDate;
  const startTime = schedule.isRecurring
    ? (recurrenceRows.value[0]?.startTime ?? null)
    : schedule.appointmentStartTime;
  const endTime = schedule.isRecurring
    ? (recurrenceRows.value[0]?.endTime ?? null)
    : schedule.appointmentEndTime;

  const formattedDate = formatDate(date);
  const formattedStartTime = formatTime(startTime);
  const formattedEndTime = formatTime(endTime);

  if (!formattedDate || !formattedStartTime || !formattedEndTime) {
    return;
  }

  const trimmedNurse = showNurseSection.value
    ? (nurseName.value?.trim() ?? "")
    : "";
  const trimmedDoctor = showDoctorSection.value
    ? (doctorName.value?.trim() ?? "")
    : "";
  const formattedNurseStartTime = showNurseSection.value
    ? formatTime(nurseSchedule.startTime)
    : "";
  const formattedNurseEndTime = showNurseSection.value
    ? formatTime(nurseSchedule.endTime)
    : "";
  const formattedDoctorStartTime = showDoctorSection.value
    ? formatTime(doctorSchedule.startTime)
    : "";
  const formattedDoctorEndTime = showDoctorSection.value
    ? formatTime(doctorSchedule.endTime)
    : "";
  const trimmedInstructions = instructions.value.trim();
  emit("save", {
    date: formattedDate,
    patient: selectedPatient.value.name,
    startTime: formattedStartTime,
    endTime: formattedEndTime,
    nurse: trimmedNurse || undefined,
    nurseStartTime: formattedNurseStartTime || undefined,
    nurseEndTime: formattedNurseEndTime || undefined,
    doctor: trimmedDoctor || undefined,
    doctorStartTime: formattedDoctorStartTime || undefined,
    doctorEndTime: formattedDoctorEndTime || undefined,
    instructions: trimmedInstructions || undefined,
  });

  visible.value = false;
  resetForm();
};

const addRecurrenceRow = () => {
  recurrenceRows.value.push({
    id: `row-${recurrenceRowId++}`,
    day: defaultWeekday,
    startTime: null,
    endTime: null,
  });
};

const submitForm = handleSubmit(() => {
  handleSave();
});

const removeRecurrenceRow = (rowId: string) => {
  if (recurrenceRows.value.length === 1) {
    return;
  }

  recurrenceRows.value = recurrenceRows.value.filter((row) => row.id !== rowId);
};

const resolveEmployeeRows = (rows: EmployeeRowsLike) => {
  return isRef(rows) ? rows.value : rows;
};

const addEmployeeRecurrenceRow = (rows: EmployeeRowsLike) => {
  const target = resolveEmployeeRows(rows);
  target.push({
    id: `emp-row-${employeeRecurrenceRowId++}`,
    day: defaultWeekday,
    startTime: null,
    endTime: null,
  });
};

const removeEmployeeRecurrenceRow = (
  rows: EmployeeRowsLike,
  rowId: string,
) => {
  const target = resolveEmployeeRows(rows);
  if (target.length === 1) {
    return;
  }

  const index = target.findIndex((row) => row.id === rowId);
  if (index >= 0) {
    target.splice(index, 1);
  }
};

const searchPatients = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  if (!query) {
    filteredPatients.value = [...patientOptions];
    return;
  }

  filteredPatients.value = patientOptions.filter((patient) => {
    return (
      patient.name.toLowerCase().includes(query) ||
      patient.id.toLowerCase().includes(query)
    );
  });
};

const searchNurses = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  if (!query) {
    filteredNurses.value = [...nurseOptions];
    return;
  }

  filteredNurses.value = nurseOptions.filter((name) =>
    name.toLowerCase().includes(query),
  );
};

const searchDoctors = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  if (!query) {
    filteredDoctors.value = [...doctorOptions];
    return;
  }

  filteredDoctors.value = doctorOptions.filter((name) =>
    name.toLowerCase().includes(query),
  );
};

const searchSocialWorkers = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  if (!query) {
    filteredSocialWorkers.value = [...socialWorkerOptions];
    return;
  }

  filteredSocialWorkers.value = socialWorkerOptions.filter((name) =>
    name.toLowerCase().includes(query),
  );
};
</script>
<template>
  <Dialog v-model:visible="visible" :modal="true" :draggable="false" :closable="false" :pt="dialogPt">
    <template #header>
      <div class="cc-row cc-row-between">
        <span class="cc-dialog-title">Add appointment</span>
        <button type="button" class="cc-icon-btn cc-dialog-close" aria-label="Close" @click="visible = false"></button>
      </div>
    </template>

    <form class="cc-stack" @submit.prevent="submitForm">
      <div>
        <label for="patient" class="cc-label cc-label-strong">Patient</label>
        <AutoComplete v-model="selectedPatient" inputId="patient" optionLabel="name" :suggestions="filteredPatients"
          :completeOnFocus="true" :forceSelection="true" appendTo="body" panelClass="cc-autocomplete-panel"
          :pt="autoCompletePt" placeholder="Search by name or ID" @complete="searchPatients">
          <template #option="slotProps">
            <div class="cc-row cc-row-between">
              <span>{{ slotProps.option.name }}</span>
            </div>
          </template>
        </AutoComplete>
      </div>

      <div class="cc-panel">
        <div class="cc-section-title">Address</div>
        <div v-if="!isPatientSelected" class="cc-help-text">
          Select a patient to enable address fields.
        </div>
        <fieldset :disabled="!isPatientSelected" class="cc-stack">
          <div>
            <label for="area" class="cc-label">Area</label>
            <select id="area" v-model="address.area" class="cc-select">
              <option value="" disabled>Select area</option>
              <option v-for="area in areaOptions" :key="area" :value="area">
                {{ area }}
              </option>
            </select>
          </div>
          <div>
            <label for="city" class="cc-label">City</label>
            <input id="city" v-model="address.city" type="text" class="cc-input" placeholder="Enter city" />
          </div>
          <div>
            <label for="address" class="cc-label">Address</label>
            <textarea id="address" v-model="address.street" class="cc-textarea" rows="3"
              placeholder="Enter street address"></textarea>
          </div>
        </fieldset>
      </div>

      <div>
        <label for="visitType" class="cc-label cc-label-strong">Visit type</label>
        <select id="visitType" v-model="visit.type" class="cc-select">
          <option value="" disabled>Select visit type</option>
          <option v-for="type in visitTypeOptions" :key="type" :value="type">
            {{ type }}
          </option>
        </select>
      </div>

      <div class="cc-panel">
        <div class="cc-stack cc-stack-sm">
          <div class="cc-section-title">Date &amp; time</div>
          <div class="cc-row">
            <label for="recurring" class="cc-label-inline">Is recurring?</label>

            <ToggleSwitch v-model="schedule.isRecurring" inputId="recurring" :pt="toggleSwitchPt" />
          </div>
        </div>

        <div v-if="!schedule.isRecurring" class="cc-stack">
          <div class="cc-grid">
            <label for="appointmentDate" class="cc-label">Date</label>
            <DatePicker v-model="schedule.appointmentDate" inputId="appointmentDate" dateFormat="yy-mm-dd"
              appendTo="body" panelClass="cc-datepicker-panel" :pt="datePickerPt" />
          </div>
          <div class="cc-grid cc-grid-2">
            <div>
              <label class="cc-label" for="appointmentStartTime">Start time</label>

              <div class="input-group">
                <input id="appointmentStartTime" type="time" class="form-control"
                  v-model="schedule.appointmentStartTime" />

              </div>
            </div>

            <div>
              <label class="cc-label" for="appointmentEndTime">End time</label>

              <div class="input-group">
                <input id="appointmentEndTime" type="time" class="form-control" v-model="schedule.appointmentEndTime" />

              </div>
            </div>
          </div>

        </div>

        <div v-else class="cc-stack">
          <div class="cc-grid cc-grid-2">
            <div>
              <label for="recurringStartDate" class="cc-label">Start date</label>
              <DatePicker v-model="schedule.recurringStartDate" inputId="recurringStartDate" dateFormat="yy-mm-dd"
                appendTo="body" panelClass="cc-datepicker-panel" :pt="datePickerPt" />
            </div>
            <div>
              <label for="recurringEndDate" class="cc-label">End date</label>
              <DatePicker v-model="schedule.recurringEndDate" inputId="recurringEndDate" dateFormat="yy-mm-dd"
                appendTo="body" panelClass="cc-datepicker-panel" :pt="datePickerPt" />
            </div>
          </div>

          <div class="cc-stack cc-stack-sm">
            <!-- Rows -->
            <div v-for="row in recurrenceRows" :key="row.id" class="cc-grid cc-grid-recurrence">
              <div>
                <label :for="`day-${row.id}`" class="cc-label">Day</label>
                <select :id="`day-${row.id}`" v-model="row.day" class="cc-select">
                  <option v-for="day in weekdayOptions" :key="day" :value="day">
                    {{ day }}
                  </option>
                </select>
              </div>

              <div>
                <label :for="`start-${row.id}`" class="cc-label">Start Time</label>
                <input :id="`start-${row.id}`" type="time" class="cc-input" v-model="row.startTime" />
              </div>

              <div>
                <label :for="`end-${row.id}`" class="cc-label">End Time</label>
                <input :id="`end-${row.id}`" type="time" class="cc-input" v-model="row.endTime" />
              </div>

              <!-- Delete button on the right -->
              <div class="cc-delete-col">
                <button type="button" class="cc-btn cc-btn-danger cc-btn-square" :disabled="recurrenceRows.length === 1"
                  @click="removeRecurrenceRow(row.id)" aria-label="Remove row" title="Remove">
                  ×
                </button>
              </div>
            </div>

            <!-- Add button full width under -->
            <button type="button" class="plus-btn cc-btn-add-row" @click="addRecurrenceRow">
              +
            </button>
          </div>

        </div>
      </div>

      <div v-if="showNurseSection" class="cc-panel">
        <div class="cc-section-title">Nurse</div>
        <div class="cc-stack">
          <div class="cc-row cc-row-wrap">
            <label class="cc-row cc-stack-sm">
              <input v-model="nurseAssignmentMode" type="radio" name="nurseAssignmentMode" value="primary" />
              <span class="cc-label-inline">Primary nurse</span>
            </label>
            <label class="cc-row cc-stack-sm">
              <input v-model="nurseAssignmentMode" type="radio" name="nurseAssignmentMode" value="custom" />
              <span class="cc-label-inline">Custom nurse</span>
            </label>
          </div>
          <div v-if="nurseAssignmentMode === 'custom'" class="cc-stack">
            <div class="cc-grid">
              <label for="nurseName" class="cc-label">Nurse name</label>
              <AutoComplete v-model="nurseName" inputId="nurseName" :suggestions="filteredNurses"
                :completeOnFocus="true" :forceSelection="true" appendTo="body" panelClass="cc-autocomplete-panel"
                :pt="autoCompletePt" placeholder="Search nurse" @complete="searchNurses" />
            </div>
            <div v-if="!schedule.isRecurring" class="cc-grid cc-grid-2">
              <div>
                <label for="nurseStartTime" class="cc-label">Start time</label>
                <DatePicker v-model="nurseSchedule.startTime" inputId="nurseStartTime" timeOnly hourFormat="24"
                  appendTo="body" panelClass="cc-datepicker-panel cc-time-panel" :pt="datePickerPt" />
              </div>
              <div>
                <label for="nurseEndTime" class="cc-label">End time</label>
                <DatePicker v-model="nurseSchedule.endTime" inputId="nurseEndTime" timeOnly hourFormat="24"
                  appendTo="body" panelClass="cc-datepicker-panel cc-time-panel" :pt="datePickerPt" />
              </div>
            </div>
            <div v-else class="cc-stack cc-stack-sm">
              <div v-for="row in nurseRecurrenceRows" :key="row.id" class="cc-grid cc-grid-4 cc-grid-align-end">
                <div>
                  <label :for="`nurse-day-${row.id}`" class="cc-label">Day</label>
                  <select :id="`nurse-day-${row.id}`" v-model="row.day" class="cc-select">
                    <option v-for="day in weekdayOptions" :key="day" :value="day">
                      {{ day }}
                    </option>
                  </select>
                </div>
                <div>
                  <label :for="`nurse-start-${row.id}`" class="cc-label">
                    Start time
                  </label>
                  <DatePicker v-model="row.startTime" :inputId="`nurse-start-${row.id}`" timeOnly hourFormat="24"
                    appendTo="body" panelClass="cc-datepicker-panel cc-time-panel" :pt="datePickerPt" />
                </div>
                <div>
                  <label :for="`nurse-end-${row.id}`" class="cc-label">End time</label>
                  <DatePicker v-model="row.endTime" :inputId="`nurse-end-${row.id}`" timeOnly hourFormat="24"
                    appendTo="body" panelClass="cc-datepicker-panel cc-time-panel" :pt="datePickerPt" />
                </div>
                <div class="cc-row cc-row-stretch">
                  <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm cc-btn-fill"
                    @click="addEmployeeRecurrenceRow(nurseRecurrenceRows)">
                    +
                  </button>
                  <button type="button" class="cc-btn cc-btn-outline-danger cc-btn-sm cc-btn-fill"
                    :disabled="nurseRecurrenceRows.length === 1"
                    @click="removeEmployeeRecurrenceRow(nurseRecurrenceRows, row.id)">
                    -
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showDoctorSection" class="cc-panel">
        <div class="cc-section-title">Doctor</div>
        <div class="cc-stack">
          <div class="cc-row cc-row-wrap">
            <label class="cc-row cc-stack-sm">
              <input v-model="doctorAssignmentMode" type="radio" name="doctorAssignmentMode" value="primary" />
              <span class="cc-label-inline">Primary doctor</span>
            </label>
            <label class="cc-row cc-stack-sm">
              <input v-model="doctorAssignmentMode" type="radio" name="doctorAssignmentMode" value="custom" />
              <span class="cc-label-inline">Custom doctor</span>
            </label>
          </div>
          <div v-if="doctorAssignmentMode === 'custom'" class="cc-stack">
            <div class="cc-grid">
              <label for="doctorName" class="cc-label">Doctor name</label>
              <AutoComplete v-model="doctorName" inputId="doctorName" :suggestions="filteredDoctors"
                :completeOnFocus="true" :forceSelection="true" appendTo="body" panelClass="cc-autocomplete-panel"
                :pt="autoCompletePt" placeholder="Search doctor" @complete="searchDoctors" />
            </div>
            <div v-if="!schedule.isRecurring" class="cc-grid cc-grid-2">
              <div>
                <label for="doctorStartTime" class="cc-label">Start time</label>
                <DatePicker v-model="doctorSchedule.startTime" inputId="doctorStartTime" timeOnly hourFormat="24"
                  appendTo="body" panelClass="cc-datepicker-panel cc-time-panel" :pt="datePickerPt" />
              </div>
              <div>
                <label for="doctorEndTime" class="cc-label">End time</label>
                <DatePicker v-model="doctorSchedule.endTime" inputId="doctorEndTime" timeOnly hourFormat="24"
                  appendTo="body" panelClass="cc-datepicker-panel cc-time-panel" :pt="datePickerPt" />
              </div>
            </div>
            <div v-else class="cc-stack cc-stack-sm">
              <div v-for="row in doctorRecurrenceRows" :key="row.id" class="cc-grid cc-grid-4 cc-grid-align-end">
                <div>
                  <label :for="`doctor-day-${row.id}`" class="cc-label">Day</label>
                  <select :id="`doctor-day-${row.id}`" v-model="row.day" class="cc-select">
                    <option v-for="day in weekdayOptions" :key="day" :value="day">
                      {{ day }}
                    </option>
                  </select>
                </div>
                <div>
                  <label :for="`doctor-start-${row.id}`" class="cc-label">
                    Start time
                  </label>
                  <DatePicker v-model="row.startTime" :inputId="`doctor-start-${row.id}`" timeOnly hourFormat="24"
                    appendTo="body" panelClass="cc-datepicker-panel cc-time-panel" :pt="datePickerPt" />
                </div>
                <div>
                  <label :for="`doctor-end-${row.id}`" class="cc-label">End time</label>
                  <DatePicker v-model="row.endTime" :inputId="`doctor-end-${row.id}`" timeOnly hourFormat="24"
                    appendTo="body" panelClass="cc-datepicker-panel cc-time-panel" :pt="datePickerPt" />
                </div>
                <div class="cc-row cc-row-stretch">
                  <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm cc-btn-fill"
                    @click="addEmployeeRecurrenceRow(doctorRecurrenceRows)">
                    +
                  </button>
                  <button type="button" class="cc-btn cc-btn-outline-danger cc-btn-sm cc-btn-fill"
                    :disabled="doctorRecurrenceRows.length === 1"
                    @click="removeEmployeeRecurrenceRow(doctorRecurrenceRows, row.id)">
                    -
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showSocialWorkerSection" class="cc-panel">
        <div class="cc-section-title">Social worker</div>
        <div class="cc-stack">
          <div class="cc-row cc-row-wrap">
            <label class="cc-row cc-stack-sm">
              <input v-model="socialWorkerAssignmentMode" type="radio" name="socialWorkerAssignmentMode"
                value="primary" />
              <span class="cc-label-inline">Primary social worker</span>
            </label>
            <label class="cc-row cc-stack-sm">
              <input v-model="socialWorkerAssignmentMode" type="radio" name="socialWorkerAssignmentMode"
                value="custom" />
              <span class="cc-label-inline">Custom social worker</span>
            </label>
          </div>
          <div v-if="socialWorkerAssignmentMode === 'custom'" class="cc-stack">
            <div class="cc-grid">
              <label for="socialWorkerName" class="cc-label">
                Social worker name
              </label>
              <AutoComplete v-model="socialWorkerName" inputId="socialWorkerName" :suggestions="filteredSocialWorkers"
                :completeOnFocus="true" :forceSelection="true" appendTo="body" panelClass="cc-autocomplete-panel"
                :pt="autoCompletePt" placeholder="Search social worker" @complete="searchSocialWorkers" />
            </div>
            <div v-if="!schedule.isRecurring" class="cc-grid cc-grid-2">
              <div>
                <label for="socialWorkerStartTime" class="cc-label">
                  Start time
                </label>
                <DatePicker v-model="socialWorkerSchedule.startTime" inputId="socialWorkerStartTime" timeOnly
                  hourFormat="24" appendTo="body" panelClass="cc-datepicker-panel cc-time-panel" :pt="datePickerPt" />
              </div>
              <div>
                <label for="socialWorkerEndTime" class="cc-label">End time</label>
                <DatePicker v-model="socialWorkerSchedule.endTime" inputId="socialWorkerEndTime" timeOnly
                  hourFormat="24" appendTo="body" panelClass="cc-datepicker-panel cc-time-panel" :pt="datePickerPt" />
              </div>
            </div>
            <div v-else class="cc-stack cc-stack-sm">
              <div v-for="row in socialWorkerRecurrenceRows" :key="row.id" class="cc-grid cc-grid-4 cc-grid-align-end">
                <div>
                  <label :for="`social-day-${row.id}`" class="cc-label">Day</label>
                  <select :id="`social-day-${row.id}`" v-model="row.day" class="cc-select">
                    <option v-for="day in weekdayOptions" :key="day" :value="day">
                      {{ day }}
                    </option>
                  </select>
                </div>
                <div>
                  <label :for="`social-start-${row.id}`" class="cc-label">
                    Start time
                  </label>
                  <DatePicker v-model="row.startTime" :inputId="`social-start-${row.id}`" timeOnly hourFormat="24"
                    appendTo="body" panelClass="cc-datepicker-panel cc-time-panel" :pt="datePickerPt" />
                </div>
                <div>
                  <label :for="`social-end-${row.id}`" class="cc-label">End time</label>
                  <DatePicker v-model="row.endTime" :inputId="`social-end-${row.id}`" timeOnly hourFormat="24"
                    appendTo="body" panelClass="cc-datepicker-panel cc-time-panel" :pt="datePickerPt" />
                </div>
                <div class="cc-row cc-row-stretch">
                  <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm cc-btn-fill"
                    @click="addEmployeeRecurrenceRow(socialWorkerRecurrenceRows)">
                    +
                  </button>
                  <button type="button" class="cc-btn cc-btn-outline-danger cc-btn-sm cc-btn-fill"
                    :disabled="socialWorkerRecurrenceRows.length === 1"
                    @click="removeEmployeeRecurrenceRow(socialWorkerRecurrenceRows, row.id)">
                    -
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label for="instructions" class="cc-label cc-label-strong">
          Instructions
        </label>
        <textarea id="instructions" v-model="instructions" class="cc-textarea" rows="3"
          placeholder="Add special instructions or notes"></textarea>
      </div>
    </form>

    <template #footer>
      <button type="button" class="cc-btn cc-btn-outline bg-danger text-light" @click="visible = false">
        Cancel
      </button>
      <button type="submit" class="cc-btn  save  text-light">
        Save
      </button>
    </template>
  </Dialog>
</template>
