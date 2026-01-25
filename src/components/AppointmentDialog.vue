<script setup lang="ts">
import { computed, reactive, ref } from "vue";
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
  visitTypeOptions,
  weekdayOptions,
  type PatientOption,
  type Weekday,
} from "../data/options";
import type { NewAppointment } from "../composables/useAppointments";
import {
  autoCompletePt,
  datePickerPt,
  dialogPt,
  toggleSwitchPt,
} from "../ui/primevuePt";

const visible = defineModel<boolean>({ required: true });
const emit = defineEmits<{
  save: [payload: NewAppointment];
}>();

const selectedPatient = ref<PatientOption | string | null>(null);
const filteredPatients = ref<PatientOption[]>([]);
const instructions = ref("");
const nurseName = ref<string | null>(null);
const filteredNurses = ref<string[]>([]);
const doctorName = ref<string | null>(null);
const filteredDoctors = ref<string[]>([]);

const address = reactive({
  area: "",
  city: "",
  street: "",
});

const visit = reactive({
  type: "",
});

const nurseSchedule = reactive({
  startTime: null as Date | null,
  endTime: null as Date | null,
});

const doctorSchedule = reactive({
  startTime: null as Date | null,
  endTime: null as Date | null,
});

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

const isPatientOption = (value: unknown): value is PatientOption => {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as PatientOption).id === "string"
  );
};

const isPatientSelected = computed(() =>
  isPatientOption(selectedPatient.value)
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
  address.area = "";
  address.city = "";
  address.street = "";
  visit.type = "";
  nurseSchedule.startTime = null;
  nurseSchedule.endTime = null;
  doctorSchedule.startTime = null;
  doctorSchedule.endTime = null;
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

const handleSave = () => {
  if (!isPatientOption(selectedPatient.value)) {
    return;
  }

  const date = schedule.isRecurring
    ? schedule.recurringStartDate
    : schedule.appointmentDate;
  const startTime = schedule.isRecurring
    ? recurrenceRows.value[0]?.startTime ?? null
    : schedule.appointmentStartTime;
  const endTime = schedule.isRecurring
    ? recurrenceRows.value[0]?.endTime ?? null
    : schedule.appointmentEndTime;

  const formattedDate = formatDate(date);
  const formattedStartTime = formatTime(startTime);
  const formattedEndTime = formatTime(endTime);

  if (!formattedDate || !formattedStartTime || !formattedEndTime) {
    return;
  }

  const trimmedNurse = nurseName.value?.trim() ?? "";
  const trimmedDoctor = doctorName.value?.trim() ?? "";
  emit("save", {
    date: formattedDate,
    patient: selectedPatient.value.name,
    startTime: formattedStartTime,
    endTime: formattedEndTime,
    nurse: trimmedNurse || undefined,
    doctor: trimmedDoctor || undefined,
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

const removeRecurrenceRow = (rowId: string) => {
  if (recurrenceRows.value.length === 1) {
    return;
  }

  recurrenceRows.value = recurrenceRows.value.filter((row) => row.id !== rowId);
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
    name.toLowerCase().includes(query)
  );
};

const searchDoctors = (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase();
  if (!query) {
    filteredDoctors.value = [...doctorOptions];
    return;
  }

  filteredDoctors.value = doctorOptions.filter((name) =>
    name.toLowerCase().includes(query)
  );
};
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :modal="true"
    :draggable="false"
    :closable="false"
    :pt="dialogPt"
  >
    <template #header>
      <div class="d-flex align-items-center w-100">
        <span class="fw-semibold">Add appointment</span>
        <button
          type="button"
          class="btn-close ms-auto"
          aria-label="Close"
          @click="visible = false"
        ></button>
      </div>
    </template>

    <form class="d-flex flex-column gap-3">
      <div>
        <label for="patient" class="form-label fw-semibold">Patient</label>
        <AutoComplete
          v-model="selectedPatient"
          inputId="patient"
          optionLabel="name"
          :suggestions="filteredPatients"
          :completeOnFocus="true"
          :forceSelection="true"
          appendTo="self"
          panelClass="cc-autocomplete-panel"
          :pt="autoCompletePt"
          placeholder="Search by name or ID"
          @complete="searchPatients"
        >
          <template #option="slotProps">
            <div class="d-flex justify-content-between">
              <span>{{ slotProps.option.name }}</span>
            </div>
          </template>
        </AutoComplete>
      </div>

      <div class="border rounded-2 p-3 bg-white">
        <div class="fw-semibold mb-2">Address</div>
        <div v-if="!isPatientSelected" class="form-text text-muted mb-2">
          Select a patient to enable address fields.
        </div>
        <fieldset :disabled="!isPatientSelected" class="d-flex flex-column gap-3">
          <div>
            <label for="area" class="form-label">Area</label>
            <select id="area" v-model="address.area" class="form-select">
              <option value="" disabled>Select area</option>
              <option v-for="area in areaOptions" :key="area" :value="area">
                {{ area }}
              </option>
            </select>
          </div>
          <div>
            <label for="city" class="form-label">City</label>
            <input
              id="city"
              v-model="address.city"
              type="text"
              class="form-control"
              placeholder="Enter city"
            />
          </div>
          <div>
            <label for="address" class="form-label">Address</label>
            <textarea
              id="address"
              v-model="address.street"
              class="form-control"
              rows="3"
              placeholder="Enter street address"
            ></textarea>
          </div>
        </fieldset>
      </div>

      <div>
        <label for="visitType" class="form-label fw-semibold">Visit type</label>
        <select id="visitType" v-model="visit.type" class="form-select">
          <option value="" disabled>Select visit type</option>
          <option v-for="type in visitTypeOptions" :key="type" :value="type">
            {{ type }}
          </option>
        </select>
      </div>

      <div class="border rounded-2 p-3 bg-white">
        <div class="fw-semibold mb-2">Nurse</div>
        <div class="row g-3">
          <div class="col-12 col-lg-6">
            <label for="nurseName" class="form-label">Nurse name</label>
            <AutoComplete
              v-model="nurseName"
              inputId="nurseName"
              :suggestions="filteredNurses"
              :completeOnFocus="true"
              :forceSelection="true"
              appendTo="self"
              panelClass="cc-autocomplete-panel"
              :pt="autoCompletePt"
              placeholder="Search nurse"
              @complete="searchNurses"
            />
          </div>
          <div class="col-12 col-md-6 col-lg-3">
            <label for="nurseStartTime" class="form-label">Start time</label>
            <DatePicker
              v-model="nurseSchedule.startTime"
              inputId="nurseStartTime"
              timeOnly
              hourFormat="24"
              appendTo="self"
              panelClass="cc-datepicker-panel cc-time-panel cc-datepicker-panel-top-left"
              :pt="datePickerPt"
            />
          </div>
          <div class="col-12 col-md-6 col-lg-3">
            <label for="nurseEndTime" class="form-label">End time</label>
            <DatePicker
              v-model="nurseSchedule.endTime"
              inputId="nurseEndTime"
              timeOnly
              hourFormat="24"
              appendTo="self"
              panelClass="cc-datepicker-panel cc-time-panel cc-datepicker-panel-top-left"
              :pt="datePickerPt"
            />
          </div>
        </div>
      </div>

      <div class="border rounded-2 p-3 bg-white">
        <div class="fw-semibold mb-2">Doctor</div>
        <div class="row g-3">
          <div class="col-12 col-lg-6">
            <label for="doctorName" class="form-label">Doctor name</label>
            <AutoComplete
              v-model="doctorName"
              inputId="doctorName"
              :suggestions="filteredDoctors"
              :completeOnFocus="true"
              :forceSelection="true"
              appendTo="self"
              panelClass="cc-autocomplete-panel"
              :pt="autoCompletePt"
              placeholder="Search doctor"
              @complete="searchDoctors"
            />
          </div>
          <div class="col-12 col-md-6 col-lg-3">
            <label for="doctorStartTime" class="form-label">Start time</label>
            <DatePicker
              v-model="doctorSchedule.startTime"
              inputId="doctorStartTime"
              timeOnly
              hourFormat="24"
              appendTo="self"
              panelClass="cc-datepicker-panel cc-time-panel cc-datepicker-panel-top-left"
              :pt="datePickerPt"
            />
          </div>
          <div class="col-12 col-md-6 col-lg-3">
            <label for="doctorEndTime" class="form-label">End time</label>
            <DatePicker
              v-model="doctorSchedule.endTime"
              inputId="doctorEndTime"
              timeOnly
              hourFormat="24"
              appendTo="self"
              panelClass="cc-datepicker-panel cc-time-panel cc-datepicker-panel-top-left"
              :pt="datePickerPt"
            />
          </div>
        </div>
      </div>

      <div>
        <label for="instructions" class="form-label fw-semibold">Instructions</label>
        <textarea
          id="instructions"
          v-model="instructions"
          class="form-control"
          rows="3"
          placeholder="Add special instructions or notes"
        ></textarea>
      </div>

      <div class="border rounded-2 p-3 bg-white">
        <div class="d-flex flex-column gap-2 mb-2">
          <div class="fw-semibold">Date &amp; time</div>
          <div class="d-flex align-items-center gap-2 w-100">
            <label for="recurring" class="mb-0">Is recurring?</label>

            <ToggleSwitch
              v-model="schedule.isRecurring"
              inputId="recurring"
              :pt="toggleSwitchPt"
            />
          </div>
        </div>

        <div v-if="!schedule.isRecurring" class="row g-3">
          <div class="col-12 col-md-4">
            <label for="appointmentDate" class="form-label">Date</label>
            <DatePicker
              v-model="schedule.appointmentDate"
              inputId="appointmentDate"
              dateFormat="yy-mm-dd"
              appendTo="self"
              panelClass="cc-datepicker-panel cc-datepicker-panel-top-left"
              :pt="datePickerPt"
            />
          </div>
          <div class="col-12 col-md-4">
            <label for="appointmentStartTime" class="form-label">
              Start time
            </label>
            <DatePicker
              v-model="schedule.appointmentStartTime"
              inputId="appointmentStartTime"
              timeOnly
              hourFormat="24"
              appendTo="self"
              panelClass="cc-datepicker-panel cc-time-panel cc-datepicker-panel-top-left"
              :pt="datePickerPt"
            />
          </div>
          <div class="col-12 col-md-4">
            <label for="appointmentEndTime" class="form-label">End time</label>
            <DatePicker
              v-model="schedule.appointmentEndTime"
              inputId="appointmentEndTime"
              timeOnly
              hourFormat="24"
              appendTo="self"
              panelClass="cc-datepicker-panel cc-time-panel cc-datepicker-panel-top-left"
              :pt="datePickerPt"
            />
          </div>
        </div>

        <div v-else class="d-flex flex-column gap-3">
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <label for="recurringStartDate" class="form-label">Start date</label>
              <DatePicker
                v-model="schedule.recurringStartDate"
                inputId="recurringStartDate"
                dateFormat="yy-mm-dd"
                appendTo="self"
                panelClass="cc-datepicker-panel cc-datepicker-panel-top-left"
                :pt="datePickerPt"
              />
            </div>
            <div class="col-12 col-md-6">
              <label for="recurringEndDate" class="form-label">End date</label>
              <DatePicker
                v-model="schedule.recurringEndDate"
                inputId="recurringEndDate"
                dateFormat="yy-mm-dd"
                appendTo="self"
                panelClass="cc-datepicker-panel cc-datepicker-panel-top-left"
                :pt="datePickerPt"
              />
            </div>
          </div>

          <div class="d-flex flex-column gap-2">
            <div
              v-for="row in recurrenceRows"
              :key="row.id"
              class="row g-2 align-items-end"
            >
              <div class="col-12 col-md-4">
                <label :for="`day-${row.id}`" class="form-label">Day</label>
                <select
                  :id="`day-${row.id}`"
                  v-model="row.day"
                  class="form-select"
                >
                  <option v-for="day in weekdayOptions" :key="day" :value="day">
                    {{ day }}
                  </option>
                </select>
              </div>
              <div class="col-12 col-md-3">
                <label :for="`start-${row.id}`" class="form-label">
                  Start time
                </label>
                <DatePicker
                  v-model="row.startTime"
                  :inputId="`start-${row.id}`"
                  timeOnly
                  hourFormat="24"
                  appendTo="self"
                  panelClass="cc-datepicker-panel cc-time-panel cc-datepicker-panel-top-left"
                  :pt="datePickerPt"
                />
              </div>
              <div class="col-12 col-md-3">
                <label :for="`end-${row.id}`" class="form-label">End time</label>
                <DatePicker
                  v-model="row.endTime"
                  :inputId="`end-${row.id}`"
                  timeOnly
                  hourFormat="24"
                  appendTo="self"
                  panelClass="cc-datepicker-panel cc-time-panel cc-datepicker-panel-top-left"
                  :pt="datePickerPt"
                />
              </div>
              <div class="col-12 col-md-2 d-flex gap-2 align-items-stretch">
                <button
                  type="button"
                  class="btn btn-outline-success flex-grow-1 h-100"
                  @click="addRecurrenceRow"
                >
                  +
                </button>
                    <button
                      type="button"
                      class="btn btn-outline-danger flex-grow-1 h-100"
                      :disabled="recurrenceRows.length === 1"
                      @click="removeRecurrenceRow(row.id)"
                    >
                  -
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>

    <template #footer>
      <button type="button" class="btn btn-outline-secondary" @click="visible = false">
        Cancel
      </button>
      <button type="button" class="btn btn-warning text-white" @click="handleSave">
        Save
      </button>
    </template>
  </Dialog>
</template>
