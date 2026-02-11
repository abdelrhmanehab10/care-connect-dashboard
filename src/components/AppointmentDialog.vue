<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  isRef,
  onMounted,
  reactive,
  ref,
  toRefs,
  watch,
  type Ref,
} from "vue";
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { z } from "zod";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import ToggleSwitch from "primevue/toggleswitch";
import { Loader2 } from "lucide-vue-next";
import AppAsyncAutocomplete from "./shared/AppAsyncAutocomplete.vue";
import { type PatientOption, type Weekday } from "../data/options";
import {
  autoCompletePt,
  datePickerPt,
  dialogPt,
  toggleSwitchPt,
} from "../ui/primevuePt";
import type { Appointment } from "../types";
import type { CreateAppointmentPayload } from "../services/appointments";
import { fetchVisitTypes, type VisitType } from "../services/visitTypes";
import { fetchEmployeesByTitle } from "../services/employees";
import { fetchPatientAutocomplete } from "../services/patients";

const visible = defineModel<boolean>({ required: true });
type ToastMessage = {
  severity?: string;
  summary?: string;
  detail?: string;
  life?: number;
};
type ToastApi = {
  add: (message: ToastMessage) => void;
};
const componentInstance = getCurrentInstance();
const toast = (componentInstance?.appContext.config.globalProperties.$toast ??
  null) as ToastApi | null;
const props = withDefaults(
  defineProps<{
    appointment?: Appointment | null;
    isLoading?: boolean;
    patientOptions: PatientOption[];
    nurseOptions: readonly string[];
    doctorOptions: readonly string[];
    socialWorkerOptions: readonly string[];
    visitTypeOptions: readonly string[];
    weekdayOptions: readonly Weekday[];
    isSaving?: boolean;
    errorMessage?: string | null;
  }>(),
  {
    appointment: null,
    isLoading: false,
    isSaving: false,
    errorMessage: null,
  },
);
const { patientOptions, visitTypeOptions, weekdayOptions } = toRefs(props);
const dialogTitle = computed(() =>
  props.appointment ? "Edit Appointment" : "Add Appointment",
);
const isBusy = computed(() => props.isLoading || props.isSaving);
const emit = defineEmits<{
  save: [payload: CreateAppointmentPayload];
}>();

type LocationValue = {
  lat: number;
  lng: number;
  address?: string;
};

const defaultMapLocation: LocationValue = {
  lat: 24.7136,
  lng: 46.6753,
};

const selectedPatient = ref<PatientOption | string | null>(null);
const fetchedVisitTypes = ref<VisitType[]>([]);
const isVisitTypesLoading = ref(false);
const mapLocation = ref<LocationValue | null>(null);
const instructions = ref("");
const hasAttemptedSubmit = ref(false);
const pendingSaveAction = ref<"create" | "update" | null>(null);
const nurseName = ref<string | null>(null);
const doctorName = ref<string | null>(null);
const socialWorkerName = ref<string | null>(null);
const driverName = ref<string | null>(null);
const primaryNurseName = ref<string | null>(null);
const primaryDoctorName = ref<string | null>(null);
const primarySocialWorkerName = ref<string | null>(null);
const primaryDriverName = ref<string | null>(null);
const nurseAssignmentMode = ref<"primary" | "custom">("primary");
const doctorAssignmentMode = ref<"primary" | "custom">("primary");
const socialWorkerAssignmentMode = ref<"primary" | "custom">("primary");
const driverAssignmentMode = ref<"primary" | "custom">("primary");
const nurseScheduleType = ref<"same" | "custom">("same");
const doctorScheduleType = ref<"same" | "custom">("same");
const socialWorkerScheduleType = ref<"same" | "custom">("same");
const driverScheduleType = ref<"same" | "custom">("same");
const { handleSubmit } = useForm({
  validationSchema: toTypedSchema(z.object({})),
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

const socialWorkerSchedule = reactive({
  startTime: null as Date | null,
  endTime: null as Date | null,
});

const driverSchedule = reactive({
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
  appointmentStartTime: null as string | null,
  appointmentEndTime: null as string | null,
  recurringStartDate: null as Date | null,
  recurringEndDate: null as Date | null,
});

const formatNativeDateValue = (value: Date | null) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "";
  }
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseNativeDateValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const [yearRaw, monthRaw, dayRaw] = trimmed.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!year || !month || !day) {
    return null;
  }
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const appointmentDateInput = computed({
  get: () => formatNativeDateValue(schedule.appointmentDate),
  set: (value: string) => {
    schedule.appointmentDate = parseNativeDateValue(value);
  },
});

const recurringStartDateInput = computed({
  get: () => formatNativeDateValue(schedule.recurringStartDate),
  set: (value: string) => {
    schedule.recurringStartDate = parseNativeDateValue(value);
  },
});

const recurringEndDateInput = computed({
  get: () => formatNativeDateValue(schedule.recurringEndDate),
  set: (value: string) => {
    schedule.recurringEndDate = parseNativeDateValue(value);
  },
});

type RecurrenceRow = {
  id: string;
  day: Weekday;
  startTime: Date | null;
  endTime: Date | null;
};

const getDefaultWeekday = () => weekdayOptions.value[0] ?? "Monday";
let recurrenceRowId = 1;
const recurrenceRows = ref<RecurrenceRow[]>([
  {
    id: `row-${recurrenceRowId++}`,
    day: getDefaultWeekday(),
    startTime: null,
    endTime: null,
  },
]);
let employeeRecurrenceRowId = 1;
const nurseRecurrenceRows = ref<EmployeeRecurrenceRow[]>([
  {
    id: `nurse-row-${employeeRecurrenceRowId++}`,
    day: getDefaultWeekday(),
    startTime: null,
    endTime: null,
  },
]);
const doctorRecurrenceRows = ref<EmployeeRecurrenceRow[]>([
  {
    id: `doctor-row-${employeeRecurrenceRowId++}`,
    day: getDefaultWeekday(),
    startTime: null,
    endTime: null,
  },
]);
const socialWorkerRecurrenceRows = ref<EmployeeRecurrenceRow[]>([
  {
    id: `social-row-${employeeRecurrenceRowId++}`,
    day: getDefaultWeekday(),
    startTime: null,
    endTime: null,
  },
]);
const driverRecurrenceRows = ref<EmployeeRecurrenceRow[]>([
  {
    id: `driver-row-${employeeRecurrenceRowId++}`,
    day: getDefaultWeekday(),
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

const fallbackVisitTypes = computed<VisitType[]>(() =>
  (visitTypeOptions.value ?? []).map((name) => ({
    id: name,
    name,
    providers: [],
    duration: null,
  })),
);

const availableVisitTypes = computed(() =>
  fetchedVisitTypes.value.length
    ? fetchedVisitTypes.value
    : fallbackVisitTypes.value,
);

const normalizeProvider = (value: string) => {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  return normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;
};
const selectedVisitType = computed(
  () =>
    availableVisitTypes.value.find((type) => type.name === visit.type) ?? null,
);
const parseVisitTypeDurationHours = (value: unknown): number | null => {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};
const selectedVisitDurationHours = computed(() =>
  parseVisitTypeDurationHours(selectedVisitType.value?.duration),
);
const visitProviders = computed(() =>
  (selectedVisitType.value?.providers ?? []).map(normalizeProvider),
);
const hasProvider = (provider: string) =>
  visitProviders.value.includes(provider);

const showNurseSection = computed(() => hasProvider("nurse"));
const showDoctorSection = computed(() => hasProvider("doctor"));
const showSocialWorkerSection = computed(() => hasProvider("social_worker"));
const showDriverSection = computed(() => hasProvider("driver"));

const formatPrimaryLabel = (label: string, name: string | null) =>
  name ? `${label} (${name})` : label;

const primaryNurseLabel = computed(() =>
  formatPrimaryLabel("Primary nurse", primaryNurseName.value),
);
const primaryDoctorLabel = computed(() =>
  formatPrimaryLabel("Primary doctor", primaryDoctorName.value),
);
const primarySocialWorkerLabel = computed(() =>
  formatPrimaryLabel("Primary social worker", primarySocialWorkerName.value),
);
const primaryDriverLabel = computed(() =>
  formatPrimaryLabel("Primary driver", primaryDriverName.value),
);

const normalizeRole = (role: string) =>
  role.trim().toLowerCase().replace(/\s+/g, "_");

const isPrimaryFlag = (value: unknown) =>
  value === 1 || value === "1" || value === true;

const resolvePrimaryStaffName = (
  appointment: Appointment,
  role: "nurse" | "doctor" | "social_worker" | "driver",
) => {
  const patient = (appointment as Appointment & { patient?: any }).patient;
  const fromPatient =
    role === "nurse"
      ? patient?.primary_nurse?.name ?? patient?.primary_leader_nurse?.name
      : role === "doctor"
        ? patient?.primary_doctor?.name
        : role === "social_worker"
          ? patient?.primary_social_worker?.name
          : patient?.primary_driver?.name;
  const fromAppointment =
    role === "nurse"
      ? appointment.nurse?.name
      : role === "doctor"
        ? appointment.doctor?.name
        : role === "social_worker"
          ? appointment.social_worker?.name
          : "";
  const careTeamName = (appointment.care_team ?? []).find(
    (member) => normalizeRole(member.role ?? "") === role,
  )?.employee?.name;
  const candidates = [fromPatient, fromAppointment, careTeamName]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  return candidates[0] ?? "";
};

const resolveScheduleTimes = () => {
  const date = schedule.isRecurring
    ? schedule.recurringStartDate
    : schedule.appointmentDate;
  const startTime = schedule.isRecurring
    ? (recurrenceRows.value[0]?.startTime ?? null)
    : schedule.appointmentStartTime;
  const endTime = schedule.isRecurring
    ? (recurrenceRows.value[0]?.endTime ?? null)
    : schedule.appointmentEndTime;

  return { date, startTime, endTime };
};

const parseClockToMinutes = (value: string) => {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  const [, rawHours = "", rawMinutes = ""] = match ?? [];
  if (!rawHours || !rawMinutes) {
    return null;
  }
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
};

const formatDurationHoursLabel = (hours: number) =>
  Number.isInteger(hours)
    ? `${hours} hour${hours === 1 ? "" : "s"}`
    : `${hours} hours`;

const validationSchema = z
  .object({
    patientSelected: z.boolean(),
    visitType: z.string(),
    visitTypeDurationHours: z.number().nullable(),
    isRecurring: z.boolean(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    nurseRequired: z.boolean(),
    nurseName: z.string().optional(),
    nurseTimesRequired: z.boolean().optional(),
    nurseTimesValid: z.boolean().optional(),
    doctorRequired: z.boolean(),
    doctorName: z.string().optional(),
    doctorTimesRequired: z.boolean().optional(),
    doctorTimesValid: z.boolean().optional(),
    socialWorkerRequired: z.boolean(),
    socialWorkerName: z.string().optional(),
    socialWorkerTimesRequired: z.boolean().optional(),
    socialWorkerTimesValid: z.boolean().optional(),
    driverRequired: z.boolean(),
    driverName: z.string().optional(),
    driverTimesRequired: z.boolean().optional(),
    driverTimesValid: z.boolean().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.patientSelected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["patient"],
        message: "Patient is required.",
      });
    }

    if (!values.visitType.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["visitType"],
        message: "Visit type is required.",
      });
    }

    if (!values.date.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: values.isRecurring
          ? "Start date is required."
          : "Date is required.",
      });
    }

    if (!values.startTime.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startTime"],
        message: "Start time is required.",
      });
    }

    if (!values.endTime.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "End time is required.",
      });
    }

    if (
      values.startTime.trim() &&
      values.endTime.trim() &&
      values.startTime >= values.endTime
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "End time must be after start time.",
      });
    }

    if (
      !values.isRecurring &&
      values.visitTypeDurationHours !== null &&
      values.startTime.trim() &&
      values.endTime.trim()
    ) {
      const startMinutes = parseClockToMinutes(values.startTime);
      const endMinutes = parseClockToMinutes(values.endTime);
      if (
        startMinutes !== null &&
        endMinutes !== null &&
        endMinutes > startMinutes
      ) {
        const allowedMinutes = Math.round(values.visitTypeDurationHours * 60);
        const actualMinutes = endMinutes - startMinutes;
        if (actualMinutes > allowedMinutes) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["endTime"],
            message: `Duration must be within ${formatDurationHoursLabel(values.visitTypeDurationHours)}.`,
          });
        }
      }
    }

    if (values.nurseRequired && !(values.nurseName?.trim() ?? "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nurse"],
        message: "Nurse is required.",
      });
    }

    if (values.nurseTimesRequired && values.nurseTimesValid === false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startTime"],
        message: "Nurse start and end time are required.",
      });
    }

    if (values.doctorRequired && !(values.doctorName?.trim() ?? "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["doctor"],
        message: "Doctor is required.",
      });
    }

    if (values.doctorTimesRequired && values.doctorTimesValid === false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startTime"],
        message: "Doctor start and end time are required.",
      });
    }

    if (
      values.socialWorkerRequired &&
      !(values.socialWorkerName?.trim() ?? "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["socialWorker"],
        message: "Social worker is required.",
      });
    }

    if (
      values.socialWorkerTimesRequired &&
      values.socialWorkerTimesValid === false
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startTime"],
        message: "Social worker start and end time are required.",
      });
    }

    if (values.driverRequired && !(values.driverName?.trim() ?? "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["driver"],
        message: "Driver is required.",
      });
    }

    if (values.driverTimesRequired && values.driverTimesValid === false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startTime"],
        message: "Driver start and end time are required.",
      });
    }
  });

const hasCompleteTimeRange = (
  start: Date | string | null,
  end: Date | string | null,
) => Boolean(formatTime(start) && formatTime(end));

const hasValidRecurringTimes = (rows: EmployeeRecurrenceRow[]) =>
  rows.every(
    (row) =>
      Boolean(formatTime(row.startTime)) && Boolean(formatTime(row.endTime)),
  );

const buildValidationPayload = () => {
  const { date, startTime, endTime } = resolveScheduleTimes();
  const isRecurring = schedule.isRecurring;
  const nurseTimesRequired = isRecurring
    ? showNurseSection.value && nurseScheduleType.value === "custom"
    : showNurseSection.value && nurseAssignmentMode.value === "custom";
  const doctorTimesRequired = isRecurring
    ? showDoctorSection.value && doctorScheduleType.value === "custom"
    : showDoctorSection.value && doctorAssignmentMode.value === "custom";
  const socialWorkerTimesRequired = isRecurring
    ? showSocialWorkerSection.value &&
    socialWorkerScheduleType.value === "custom"
    : showSocialWorkerSection.value &&
    socialWorkerAssignmentMode.value === "custom";
  const driverTimesRequired = isRecurring
    ? showDriverSection.value && driverScheduleType.value === "custom"
    : showDriverSection.value && driverAssignmentMode.value === "custom";
  const nurseTimesValid = isRecurring
    ? nurseScheduleType.value === "custom"
      ? hasValidRecurringTimes(nurseRecurrenceRows.value)
      : true
    : hasCompleteTimeRange(nurseSchedule.startTime, nurseSchedule.endTime);
  const doctorTimesValid = isRecurring
    ? doctorScheduleType.value === "custom"
      ? hasValidRecurringTimes(doctorRecurrenceRows.value)
      : true
    : hasCompleteTimeRange(doctorSchedule.startTime, doctorSchedule.endTime);
  const socialWorkerTimesValid = isRecurring
    ? socialWorkerScheduleType.value === "custom"
      ? hasValidRecurringTimes(socialWorkerRecurrenceRows.value)
      : true
    : hasCompleteTimeRange(
      socialWorkerSchedule.startTime,
      socialWorkerSchedule.endTime,
    );
  const driverTimesValid = isRecurring
    ? driverScheduleType.value === "custom"
      ? hasValidRecurringTimes(driverRecurrenceRows.value)
      : true
    : hasCompleteTimeRange(driverSchedule.startTime, driverSchedule.endTime);
  return {
    patientSelected: isPatientOption(selectedPatient.value),
    visitType: visit.type ?? "",
    visitTypeDurationHours: selectedVisitDurationHours.value,
    isRecurring,
    date: formatDate(date),
    startTime: formatTime(startTime),
    endTime: formatTime(endTime),
    nurseRequired:
      showNurseSection.value && nurseAssignmentMode.value === "custom",
    nurseName: nurseName.value ?? "",
    nurseTimesRequired,
    nurseTimesValid,
    doctorRequired:
      showDoctorSection.value && doctorAssignmentMode.value === "custom",
    doctorName: doctorName.value ?? "",
    doctorTimesRequired,
    doctorTimesValid,
    socialWorkerRequired:
      showSocialWorkerSection.value &&
      socialWorkerAssignmentMode.value === "custom",
    socialWorkerName: socialWorkerName.value ?? "",
    socialWorkerTimesRequired,
    socialWorkerTimesValid,
    driverRequired:
      showDriverSection.value && driverAssignmentMode.value === "custom",
    driverName: driverName.value ?? "",
    driverTimesRequired,
    driverTimesValid,
  };
};

const validationErrors = computed(() => {
  const result = validationSchema.safeParse(buildValidationPayload());
  if (result.success) {
    return {};
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
});

const formatDate = (value: Date | null) => {
  if (!value) {
    return "";
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTime = (value: Date | string | null) => {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
    const [, rawHours = "", rawMinutes = ""] = match ?? [];
    if (!rawHours || !rawMinutes) return "";
    const hours = rawHours.padStart(2, "0");
    const minutes = rawMinutes;
    return `${hours}:${minutes}`;
  }
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "";
  }
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const normalizeTimeInput = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  const [, rawHours = "", rawMinutes = ""] = match ?? [];
  if (!rawHours || !rawMinutes) return null;
  const hours = rawHours.padStart(2, "0");
  const minutes = rawMinutes;
  return `${hours}:${minutes}`;
};

const buildRecurringSlots = (rows: EmployeeRecurrenceRow[]) =>
  rows
    .map((row) => ({
      day: row.day,
      start_time: formatTime(row.startTime),
      end_time: formatTime(row.endTime),
    }))
    .filter((row) => row.start_time && row.end_time);

const normalizeDateValue = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const normalizedSeparators = trimmed.replace(/\//g, "-");
  const splitByT = normalizedSeparators.split("T")[0] ?? "";
  const splitBySpace = splitByT.split(" ")[0] ?? "";
  return splitBySpace;
};

const isValidTime = (value: string) => /^\d{1,2}:\d{2}(:\d{2})?$/.test(value);

const parseDateOnly = (value: string | null | undefined) => {
  const normalized = normalizeDateValue(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const parseDateTime = (
  dateValue: string | null | undefined,
  timeValue: string | null | undefined,
) => {
  const normalizedDate = normalizeDateValue(dateValue);
  if (!normalizedDate) {
    return null;
  }

  if (timeValue && isValidTime(timeValue)) {
    const parsed = new Date(`${normalizedDate}T${timeValue}`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return parseDateOnly(normalizedDate);
};

const resolveAppointmentLocation = (
  appointment: Appointment | null,
): LocationValue => {
  const address = appointment?.patient_address?.address ?? "";
  const latRaw = appointment?.patient_address?.lat;
  const lngRaw = appointment?.patient_address?.lng;
  const lat =
    typeof latRaw === "number" ? latRaw : Number(String(latRaw ?? "").trim());
  const lng =
    typeof lngRaw === "number" ? lngRaw : Number(String(lngRaw ?? "").trim());
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return {
      lat,
      lng,
      address: address || undefined,
    };
  }
  return { ...defaultMapLocation };
};

const resetForm = () => {
  hasAttemptedSubmit.value = false;
  selectedPatient.value = null;
  nurseName.value = null;
  doctorName.value = null;
  socialWorkerName.value = null;
  driverName.value = null;
  primaryNurseName.value = null;
  primaryDoctorName.value = null;
  primarySocialWorkerName.value = null;
  primaryDriverName.value = null;
  nurseAssignmentMode.value = "primary";
  doctorAssignmentMode.value = "primary";
  socialWorkerAssignmentMode.value = "primary";
  driverAssignmentMode.value = "primary";
  nurseScheduleType.value = "same";
  doctorScheduleType.value = "same";
  socialWorkerScheduleType.value = "same";
  driverScheduleType.value = "same";
  nurseName.value = null;
  doctorName.value = null;
  socialWorkerName.value = null;
  driverName.value = null;
  primaryNurseName.value = null;
  primaryDoctorName.value = null;
  primarySocialWorkerName.value = null;
  primaryDriverName.value = null;
  visit.type = "";
  nurseSchedule.startTime = null;
  nurseSchedule.endTime = null;
  doctorSchedule.startTime = null;
  doctorSchedule.endTime = null;
  socialWorkerSchedule.startTime = null;
  socialWorkerSchedule.endTime = null;
  driverSchedule.startTime = null;
  driverSchedule.endTime = null;
  nurseRecurrenceRows.value = [
    {
      id: `nurse-row-${employeeRecurrenceRowId++}`,
      day: getDefaultWeekday(),
      startTime: null,
      endTime: null,
    },
  ];
  doctorRecurrenceRows.value = [
    {
      id: `doctor-row-${employeeRecurrenceRowId++}`,
      day: getDefaultWeekday(),
      startTime: null,
      endTime: null,
    },
  ];
  socialWorkerRecurrenceRows.value = [
    {
      id: `social-row-${employeeRecurrenceRowId++}`,
      day: getDefaultWeekday(),
      startTime: null,
      endTime: null,
    },
  ];
  driverRecurrenceRows.value = [
    {
      id: `driver-row-${employeeRecurrenceRowId++}`,
      day: getDefaultWeekday(),
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
  mapLocation.value = { ...defaultMapLocation };
  recurrenceRowId = 1;
  recurrenceRows.value = [
    {
      id: `row-${recurrenceRowId++}`,
      day: getDefaultWeekday(),
      startTime: null,
      endTime: null,
    },
  ];
};

const resolveAppointmentPatient = (
  appointment: Appointment,
): PatientOption | null => {
  const name = appointment.patient?.name ?? "";
  const id = appointment.patient?.id;
  if (name || id) {
    return {
      id: String(id ?? name),
      name: name || String(id ?? ""),
    };
  }

  const patientMatch = patientOptions.value.find(
    (patient) =>
      patient.name.toLowerCase() ===
      (appointment.patient?.name ?? "").toLowerCase(),
  );
  return patientMatch ?? null;
};

const applyDurationTimeDefaults = (durationHours: number) => {
  const now = new Date();
  const durationMs = Math.round(durationHours * 60 * 60 * 1000);
  const end = new Date(now.getTime() + durationMs);
  schedule.isRecurring = false;
  schedule.appointmentDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  schedule.appointmentStartTime = formatTime(now);
  schedule.appointmentEndTime = formatTime(end);
};

const loadVisitTypes = async () => {
  isVisitTypesLoading.value = true;
  try {
    fetchedVisitTypes.value = await fetchVisitTypes();
  } catch (error) {
    console.error("Failed to load visit types.", error);
    fetchedVisitTypes.value = [];
  } finally {
    isVisitTypesLoading.value = false;
  }
};

const applyAppointment = (appointment: Appointment) => {
  resetForm();
  selectedPatient.value = resolveAppointmentPatient(appointment);
  mapLocation.value = resolveAppointmentLocation(appointment);

  visit.type = appointment.visit_type ?? "";
  schedule.isRecurring = false;
  schedule.appointmentDate = parseDateOnly(appointment.date);
  schedule.appointmentStartTime = normalizeTimeInput(
    appointment.start_time,
  );
  schedule.appointmentEndTime = normalizeTimeInput(appointment.end_time);

  const nurseNameValue = appointment.nurse?.name?.trim() ?? "";
  const doctorNameValue = appointment.doctor?.name?.trim() ?? "";
  const socialWorkerNameValue = appointment.social_worker?.name?.trim() ?? "";
  const driverNameValue =
    (appointment as Appointment & { driver?: { name?: string | null } }).driver
      ?.name?.trim() ?? "";

  primaryNurseName.value =
    resolvePrimaryStaffName(appointment, "nurse") || null;
  primaryDoctorName.value =
    resolvePrimaryStaffName(appointment, "doctor") || null;
  primarySocialWorkerName.value =
    resolvePrimaryStaffName(appointment, "social_worker") || null;
  primaryDriverName.value =
    resolvePrimaryStaffName(appointment, "driver") || null;

  const isPrimaryNurse = isPrimaryFlag(
    (appointment as Appointment & { main_nurse?: unknown }).main_nurse,
  );
  nurseAssignmentMode.value = isPrimaryNurse
    ? "primary"
    : nurseNameValue
      ? "custom"
      : "primary";
  nurseName.value = isPrimaryNurse ? null : nurseNameValue || null;
  nurseScheduleType.value = "same";

  const isPrimaryDoctor = isPrimaryFlag(
    (appointment as Appointment & { main_doctor?: unknown }).main_doctor,
  );
  doctorAssignmentMode.value = isPrimaryDoctor
    ? "primary"
    : doctorNameValue
      ? "custom"
      : "primary";
  doctorName.value = isPrimaryDoctor ? null : doctorNameValue || null;
  doctorScheduleType.value = "same";

  const isPrimarySocialWorker = isPrimaryFlag(
    (appointment as Appointment & { main_social_worker?: unknown })
      .main_social_worker,
  );
  socialWorkerAssignmentMode.value = isPrimarySocialWorker
    ? "primary"
    : socialWorkerNameValue
      ? "custom"
      : "primary";
  socialWorkerName.value = isPrimarySocialWorker
    ? null
    : socialWorkerNameValue || null;
  socialWorkerScheduleType.value = "same";

  const isPrimaryDriver = isPrimaryFlag(
    (appointment as Appointment & { main_driver?: unknown }).main_driver,
  );
  driverAssignmentMode.value = isPrimaryDriver
    ? "primary"
    : driverNameValue
      ? "custom"
      : "primary";
  driverName.value = isPrimaryDriver ? null : driverNameValue || null;
  driverScheduleType.value = "same";

  const careTeam = appointment.care_team ?? [];
  const findCareMember = (role: string) =>
    careTeam.find(
      (member) => normalizeRole(member.role ?? "") === normalizeRole(role),
    );
  const mapCareTime = (
    member: (typeof careTeam)[number] | undefined,
    scheduleTarget: { startTime: Date | null; endTime: Date | null },
  ) => {
    if (!member) return;
    scheduleTarget.startTime = parseDateTime(
      appointment.date,
      member.start_time,
    );
    scheduleTarget.endTime = parseDateTime(appointment.date, member.end_time);
  };

  const nurseMember = findCareMember("nurse");
  const doctorMember = findCareMember("doctor");
  const socialWorkerMember = findCareMember("social_worker");
  const driverMember = findCareMember("driver");

  mapCareTime(nurseMember, nurseSchedule);
  mapCareTime(doctorMember, doctorSchedule);
  mapCareTime(socialWorkerMember, socialWorkerSchedule);
  mapCareTime(driverMember, driverSchedule);

  if (!isPrimaryNurse && !nurseName.value && nurseMember?.employee?.name) {
    nurseAssignmentMode.value = "custom";
    nurseName.value = nurseMember.employee.name;
  }
  if (!isPrimaryDoctor && !doctorName.value && doctorMember?.employee?.name) {
    doctorAssignmentMode.value = "custom";
    doctorName.value = doctorMember.employee.name;
  }
  if (
    !isPrimarySocialWorker &&
    !socialWorkerName.value &&
    socialWorkerMember?.employee?.name
  ) {
    socialWorkerAssignmentMode.value = "custom";
    socialWorkerName.value = socialWorkerMember.employee.name;
  }
  if (!isPrimaryDriver && !driverName.value && driverMember?.employee?.name) {
    driverAssignmentMode.value = "custom";
    driverName.value = driverMember.employee.name;
  }
};

watch(nurseAssignmentMode, (value) => {
  if (value === "primary") {
    nurseName.value = null;
    nurseSchedule.startTime = null;
    nurseSchedule.endTime = null;
    nurseRecurrenceRows.value = [
      {
        id: `nurse-row-${employeeRecurrenceRowId++}`,
        day: getDefaultWeekday(),
        startTime: null,
        endTime: null,
      },
    ];
  }
});

watch(doctorAssignmentMode, (value) => {
  if (value === "primary") {
    doctorName.value = null;
    doctorSchedule.startTime = null;
    doctorSchedule.endTime = null;
    doctorRecurrenceRows.value = [
      {
        id: `doctor-row-${employeeRecurrenceRowId++}`,
        day: getDefaultWeekday(),
        startTime: null,
        endTime: null,
      },
    ];
  }
});

watch(socialWorkerAssignmentMode, (value) => {
  if (value === "primary") {
    socialWorkerName.value = null;
    socialWorkerSchedule.startTime = null;
    socialWorkerSchedule.endTime = null;
    socialWorkerRecurrenceRows.value = [
      {
        id: `social-row-${employeeRecurrenceRowId++}`,
        day: getDefaultWeekday(),
        startTime: null,
        endTime: null,
      },
    ];
  }
});

watch(driverAssignmentMode, (value) => {
  if (value === "primary") {
    driverName.value = null;
    driverSchedule.startTime = null;
    driverSchedule.endTime = null;
    driverRecurrenceRows.value = [
      {
        id: `driver-row-${employeeRecurrenceRowId++}`,
        day: getDefaultWeekday(),
        startTime: null,
        endTime: null,
      },
    ];
  }
});

watch(
  () => [visible.value, props.appointment] as const,
  ([isVisible, appointment]) => {
    if (!isVisible) {
      return;
    }

    if (appointment) {
      applyAppointment(appointment);
    } else {
      resetForm();
    }
  },
);

watch(selectedVisitDurationHours, (durationHours) => {
  if (!visible.value || props.appointment || durationHours === null) {
    return;
  }

  applyDurationTimeDefaults(durationHours);
});

watch(visible, (value) => {
  if (!value) {
    pendingSaveAction.value = null;
    resetForm();
  }
});

watch(
  () => props.isSaving,
  (isSaving, wasSaving) => {
    if (isSaving || !wasSaving || !pendingSaveAction.value) {
      return;
    }

    const action = pendingSaveAction.value;
    const errorDetail = props.errorMessage?.trim() ?? "";
    if (errorDetail) {
      toast?.add({
        severity: "error",
        summary:
          action === "update" ? "Failed to update appointment" : "Failed to create appointment",
        detail: errorDetail,
        life: 4000,
      });
    } else {
      toast?.add({
        severity: "success",
        summary:
          action === "update" ? "Appointment updated" : "Appointment created",
        detail:
          action === "update"
            ? "Appointment changes saved successfully."
            : "Appointment saved successfully.",
        life: 3000,
      });
    }

    pendingSaveAction.value = null;
  },
);

onMounted(() => {
  void loadVisitTypes();
});

const handleSave = () => {
  if (props.isSaving) {
    return;
  }
  hasAttemptedSubmit.value = true;
  if (Object.keys(validationErrors.value).length > 0) {
    return;
  }

  if (!isPatientOption(selectedPatient.value)) {
    return;
  }

  const { date, startTime, endTime } = resolveScheduleTimes();

  const formattedDate = formatDate(date);
  const formattedStartTime = formatTime(startTime);
  const formattedEndTime = formatTime(endTime);

  if (!formattedDate || !formattedStartTime || !formattedEndTime) {
    return;
  }

  const visitTypeId =
    availableVisitTypes.value.find((type) => type.name === visit.type)?.id ??
    "";

  const trimmedInstructions = instructions.value.trim();

  const employeeSlots: CreateAppointmentPayload["employee_slots"] = {};
  const shouldIncludeNurse = showNurseSection.value;
  const shouldIncludeDoctor = showDoctorSection.value;
  const shouldIncludeSocialWorker = showSocialWorkerSection.value;
  const shouldIncludeDriver = showDriverSection.value;

  if (shouldIncludeNurse) {
    if (schedule.isRecurring) {
      if (nurseScheduleType.value === "custom") {
        const slots = buildRecurringSlots(nurseRecurrenceRows.value);
        if (slots.length) {
          employeeSlots.nurse = slots;
        }
      }
    } else {
      const nurseSlotStart = formatTime(nurseSchedule.startTime);
      const nurseSlotEnd = formatTime(nurseSchedule.endTime);
      if (nurseSlotStart && nurseSlotEnd) {
        employeeSlots.nurse = {
          start_time: nurseSlotStart,
          end_time: nurseSlotEnd,
        };
      }
    }
  }

  if (shouldIncludeDoctor) {
    if (schedule.isRecurring) {
      if (doctorScheduleType.value === "custom") {
        const slots = buildRecurringSlots(doctorRecurrenceRows.value);
        if (slots.length) {
          employeeSlots.doctor = slots;
        }
      }
    } else {
      const doctorSlotStart = formatTime(doctorSchedule.startTime);
      const doctorSlotEnd = formatTime(doctorSchedule.endTime);
      if (doctorSlotStart && doctorSlotEnd) {
        employeeSlots.doctor = {
          start_time: doctorSlotStart,
          end_time: doctorSlotEnd,
        };
      }
    }
  }

  if (shouldIncludeSocialWorker) {
    if (schedule.isRecurring) {
      if (socialWorkerScheduleType.value === "custom") {
        const slots = buildRecurringSlots(socialWorkerRecurrenceRows.value);
        if (slots.length) {
          employeeSlots.social_worker = slots;
        }
      }
    } else {
      const socialSlotStart = formatTime(socialWorkerSchedule.startTime);
      const socialSlotEnd = formatTime(socialWorkerSchedule.endTime);
      if (socialSlotStart && socialSlotEnd) {
        employeeSlots.social_worker = {
          start_time: socialSlotStart,
          end_time: socialSlotEnd,
        };
      }
    }
  }

  if (shouldIncludeDriver) {
    if (schedule.isRecurring) {
      if (driverScheduleType.value === "custom") {
        const slots = buildRecurringSlots(driverRecurrenceRows.value);
        if (slots.length) {
          employeeSlots.driver = slots;
        }
      }
    } else {
      const driverSlotStart = formatTime(driverSchedule.startTime);
      const driverSlotEnd = formatTime(driverSchedule.endTime);
      if (driverSlotStart && driverSlotEnd) {
        employeeSlots.driver = {
          start_time: driverSlotStart,
          end_time: driverSlotEnd,
        };
      }
    }
  }

  const resolvedLocation = mapLocation.value ?? defaultMapLocation;
  const locationAddress = resolvedLocation.address ?? "";
  const locationLat = Number.isFinite(resolvedLocation.lat)
    ? String(resolvedLocation.lat)
    : "";
  const locationLng = Number.isFinite(resolvedLocation.lng)
    ? String(resolvedLocation.lng)
    : "";

  const payload: CreateAppointmentPayload = {
    patient_id: selectedPatient.value.id,
    new_address: {
      address: locationAddress,
      lat: locationLat,
      lng: locationLng,
    },
    visit_type_id: visitTypeId,
    is_recurring: schedule.isRecurring ? "1" : "0",
    date: formattedDate,
    start_time: formattedStartTime,
    end_time: formattedEndTime,
    main_nurse:
      showNurseSection.value && nurseAssignmentMode.value === "primary"
        ? "1"
        : "0",
    nurse_schedule_type: schedule.isRecurring
      ? nurseScheduleType.value
      : "same",
    employee_slots: Object.keys(employeeSlots).length
      ? employeeSlots
      : undefined,
    main_doctor:
      showDoctorSection.value && doctorAssignmentMode.value === "primary"
        ? "1"
        : "0",
    doctor_id: "",
    doctor_schedule_type: schedule.isRecurring
      ? doctorScheduleType.value
      : "same",
    main_social_worker:
      showSocialWorkerSection.value &&
        socialWorkerAssignmentMode.value === "primary"
        ? "1"
        : "0",
    social_worker_id: "",
    social_worker_schedule_type: schedule.isRecurring
      ? socialWorkerScheduleType.value
      : "same",
    driver_schedule_type: schedule.isRecurring
      ? driverScheduleType.value
      : "same",
    driver_id: "",
    instructions: trimmedInstructions,
  };

  pendingSaveAction.value = props.appointment ? "update" : "create";
  emit("save", payload);
};

const addRecurrenceRow = () => {
  recurrenceRows.value.push({
    id: `row-${recurrenceRowId++}`,
    day: getDefaultWeekday(),
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
    day: getDefaultWeekday(),
    startTime: null,
    endTime: null,
  });
};

const removeEmployeeRecurrenceRow = (rows: EmployeeRowsLike, rowId: string) => {
  const target = resolveEmployeeRows(rows);
  if (target.length === 1) {
    return;
  }

  const index = target.findIndex((row) => row.id === rowId);
  if (index >= 0) {
    target.splice(index, 1);
  }
};

const fetchPatientSuggestions = (query: string, signal: AbortSignal) =>
  fetchPatientAutocomplete(query, signal);

const fetchNurseSuggestions = (query: string, signal: AbortSignal) =>
  fetchEmployeesByTitle("nurse", query.trim().toLowerCase(), signal);

const fetchDoctorSuggestions = (query: string, signal: AbortSignal) =>
  fetchEmployeesByTitle("doctor", query.trim().toLowerCase(), signal);

const fetchSocialWorkerSuggestions = (query: string, signal: AbortSignal) =>
  fetchEmployeesByTitle("social_worker", query.trim().toLowerCase(), signal);

const fetchDriverSuggestions = (query: string, signal: AbortSignal) =>
  fetchEmployeesByTitle("driver", query.trim().toLowerCase(), signal);

</script>
<template>
  <Dialog v-model:visible="visible" :modal="true" :draggable="false" :closable="false" :pt="dialogPt">
    <template #header>
      <div class="cc-row cc-row-between">
        <span class="cc-dialog-title">{{ dialogTitle }}</span>
        <button type="button" class="cc-icon-btn cc-dialog-close" aria-label="Close" @click="visible = false"></button>
      </div>
    </template>

    <form id="appointment-form" class="cc-stack cc-dialog-form" @submit.prevent="submitForm">
      <div v-if="props.isLoading" class="cc-dialog-loading">
        <div class="cc-dialog-loading-content" role="status" aria-live="polite">
          <Loader2 class="cc-icon cc-icon-spinner" aria-hidden="true" />
          <span>Loading appointment details...</span>
        </div>
      </div>
      <fieldset :disabled="isBusy" class="cc-stack">
        <div>
          <label for="patient" class="cc-label cc-label-strong">Patient</label>
          <AppAsyncAutocomplete v-model="selectedPatient" inputId="patient" optionLabel="name" appendTo="body"
            panelClass="cc-autocomplete-panel" :pt="autoCompletePt" placeholder="Search by name or ID"
            :fetcher="fetchPatientSuggestions"
            @error="(error) => console.error('Failed to load patient suggestions.', error)">
            <template #option="slotProps">
              <div class="cc-row cc-row-between">
                <span>{{ slotProps.option.name }}</span>
              </div>
            </template>
          </AppAsyncAutocomplete>
          <div v-if="hasAttemptedSubmit && validationErrors.patient" class="cc-help-text cc-help-text--error">
            {{ validationErrors.patient }}
          </div>
        </div>

        <div class="cc-panel">
          <div class="cc-section-title">Address</div>
          <AppointmentMap v-model="mapLocation" :lat="defaultMapLocation.lat" :lng="defaultMapLocation.lng" :zoom="9"
            height="360px" @selected="mapLocation = $event" />
        </div>

        <div>
          <label for="visitType" class="cc-label cc-label-strong">Visit Type</label>
          <select id="visitType" v-model="visit.type" class="cc-select">
            <option value="" disabled>
              {{
                isVisitTypesLoading
                  ? "Loading visit types..."
                  : "Select visit Type"
              }}
            </option>
            <option v-for="type in availableVisitTypes" :key="type.id" :value="type.name">
              {{ type.name }}
            </option>
          </select>
          <div v-if="hasAttemptedSubmit && validationErrors.visitType" class="cc-help-text cc-help-text--error">
            {{ validationErrors.visitType }}
          </div>
        </div>

        <div class="cc-panel">
          <div class="cc-stack cc-stack-sm">
            <div class="cc-section-title">Date &amp; Time</div>
            <div class="cc-row">
              <label for="recurring" class="cc-label-inline">Is recurring?</label>

              <ToggleSwitch v-model="schedule.isRecurring" inputId="recurring" :pt="toggleSwitchPt" />
            </div>
          </div>

          <div v-if="!schedule.isRecurring" class="cc-stack">
            <div class="cc-grid">
              <label for="appointmentDate" class="cc-label">Date</label>
              <input id="appointmentDate" v-model="appointmentDateInput" type="date" class="form-control" />

              <div v-if="hasAttemptedSubmit && validationErrors.date" class="cc-help-text cc-help-text--error">
                {{ validationErrors.date }}
              </div>
            </div>
            <div class="cc-grid cc-grid-2">
              <div>
                <label class="cc-label" for="appointmentStartTime">Start Time</label>

                <div class="input-group">
                  <input id="appointmentStartTime" type="time" class="form-control"
                    v-model="schedule.appointmentStartTime" />
                </div>
                <div v-if="hasAttemptedSubmit && validationErrors.startTime" class="cc-help-text cc-help-text--error">
                  {{ validationErrors.startTime }}
                </div>
              </div>

              <div>
                <label class="cc-label" for="appointmentEndTime">End Time</label>

                <div class="input-group">
                  <input id="appointmentEndTime" type="time" class="form-control"
                    v-model="schedule.appointmentEndTime" />
                </div>
                <div v-if="hasAttemptedSubmit && validationErrors.endTime" class="cc-help-text cc-help-text--error">
                  {{ validationErrors.endTime }}
                </div>
              </div>
            </div>
          </div>

          <div v-else class="cc-stack">
            <div class="cc-grid cc-grid-2">
              <div>
                <label for="recurringStartDate" class="cc-label">Start Date</label>
                <input id="recurringStartDate" v-model="recurringStartDateInput" type="date" class="form-control" />
                <div v-if="hasAttemptedSubmit && validationErrors.date" class="cc-help-text cc-help-text--error">
                  {{ validationErrors.date }}
                </div>
              </div>

              <div>
                <label for="recurringEndDate" class="cc-label">End Date</label>
                <input id="recurringEndDate" v-model="recurringEndDateInput" type="date" class="form-control" />
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
                  <DatePicker v-model="row.startTime" :inputId="`start-${row.id}`" timeOnly hourFormat="24"
                    appendTo="body" panelClass="cc-datepicker-panel cc-time-panel" :pt="datePickerPt" />
                </div>

                <div>
                  <label :for="`end-${row.id}`" class="cc-label">End Time</label>
                  <DatePicker v-model="row.endTime" :inputId="`end-${row.id}`" timeOnly hourFormat="24" appendTo="body"
                    panelClass="cc-datepicker-panel cc-time-panel" :pt="datePickerPt" />
                </div>

                <!-- Delete button on the right -->
                <div class="cc-delete-col">
                  <button type="button" class="cc-btn cc-btn-danger cc-btn-square"
                    :disabled="recurrenceRows.length === 1" @click="removeRecurrenceRow(row.id)" aria-label="Remove row"
                    title="Remove">
                    ×
                  </button>
                </div>
              </div>

              <!-- Add button full width under -->
              <button type="button" class="plus-btn cc-btn-add-row" @click="addRecurrenceRow">
                +
              </button>
              <div v-if="hasAttemptedSubmit && validationErrors.startTime" class="cc-help-text cc-help-text--error">
                {{ validationErrors.startTime }}
              </div>
              <div v-if="hasAttemptedSubmit && validationErrors.endTime" class="cc-help-text cc-help-text--error">
                {{ validationErrors.endTime }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="showNurseSection" class="cc-panel">
          <div class="cc-section-title">Nurse</div>
          <div class="cc-stack">
            <div class="cc-row cc-row-wrap">
              <label class="cc-row cc-stack-sm">
                <input v-model="nurseAssignmentMode" type="radio" name="nurseAssignmentMode" value="primary" />
                <span class="cc-label-inline">{{ primaryNurseLabel }}</span>
              </label>
              <label class="cc-row cc-stack-sm">
                <input v-model="nurseAssignmentMode" type="radio" name="nurseAssignmentMode" value="custom" />
                <span class="cc-label-inline">Cover by nurse</span>
              </label>
            </div>
            <div v-if="schedule.isRecurring" class="cc-row cc-row-wrap">
              <label class="cc-row cc-stack-sm">
                <input v-model="nurseScheduleType" type="radio" name="nurseScheduleType" value="same" />
                <span class="cc-label-inline">Same schedule</span>
              </label>
              <label class="cc-row cc-stack-sm">
                <input v-model="nurseScheduleType" type="radio" name="nurseScheduleType" value="custom" />
                <span class="cc-label-inline">Custom schedule</span>
              </label>
            </div>
            <div class="cc-stack">
              <div v-if="nurseAssignmentMode === 'custom'" class="cc-grid">
                <label for="nurseName" class="cc-label">Nurse name</label>
                <AppAsyncAutocomplete v-model="nurseName" inputId="nurseName" appendTo="body"
                  panelClass="cc-autocomplete-panel" :pt="autoCompletePt" placeholder="Search nurse"
                  :fetcher="fetchNurseSuggestions"
                  @error="(error) => console.error('Failed to load nurses.', error)" />
                <div v-if="hasAttemptedSubmit && validationErrors.nurse" class="cc-help-text cc-help-text--error">
                  {{ validationErrors.nurse }}
                </div>
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
              <div v-else-if="nurseScheduleType === 'custom'" class="cc-stack cc-stack-sm">
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
                      :disabled="nurseRecurrenceRows.length === 1" @click="
                        removeEmployeeRecurrenceRow(nurseRecurrenceRows, row.id)
                        ">
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
                <span class="cc-label-inline">{{ primaryDoctorLabel }}</span>
              </label>
              <label class="cc-row cc-stack-sm">
                <input v-model="doctorAssignmentMode" type="radio" name="doctorAssignmentMode" value="custom" />
                <span class="cc-label-inline">Cover by doctor</span>
              </label>
            </div>
            <div v-if="schedule.isRecurring" class="cc-row cc-row-wrap">
              <label class="cc-row cc-stack-sm">
                <input v-model="doctorScheduleType" type="radio" name="doctorScheduleType" value="same" />
                <span class="cc-label-inline">Same schedule</span>
              </label>
              <label class="cc-row cc-stack-sm">
                <input v-model="doctorScheduleType" type="radio" name="doctorScheduleType" value="custom" />
                <span class="cc-label-inline">Custom schedule</span>
              </label>
            </div>
            <div class="cc-stack">
              <div v-if="doctorAssignmentMode === 'custom'" class="cc-grid">
                <label for="doctorName" class="cc-label">Doctor name</label>
                <AppAsyncAutocomplete v-model="doctorName" inputId="doctorName" appendTo="body"
                  panelClass="cc-autocomplete-panel" :pt="autoCompletePt" placeholder="Search doctor"
                  :fetcher="fetchDoctorSuggestions"
                  @error="(error) => console.error('Failed to load doctors.', error)" />
                <div v-if="hasAttemptedSubmit && validationErrors.doctor" class="cc-help-text cc-help-text--error">
                  {{ validationErrors.doctor }}
                </div>
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
              <div v-else-if="doctorScheduleType === 'custom'" class="cc-stack cc-stack-sm">
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
                      :disabled="doctorRecurrenceRows.length === 1" @click="
                        removeEmployeeRecurrenceRow(
                          doctorRecurrenceRows,
                          row.id,
                        )
                        ">
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
                <span class="cc-label-inline">
                  {{ primarySocialWorkerLabel }}
                </span>
              </label>
              <label class="cc-row cc-stack-sm">
                <input v-model="socialWorkerAssignmentMode" type="radio" name="socialWorkerAssignmentMode"
                  value="custom" />
                <span class="cc-label-inline">Cover by social worker</span>
              </label>
            </div>
            <div v-if="schedule.isRecurring" class="cc-row cc-row-wrap">
              <label class="cc-row cc-stack-sm">
                <input v-model="socialWorkerScheduleType" type="radio" name="socialWorkerScheduleType" value="same" />
                <span class="cc-label-inline">Same schedule</span>
              </label>
              <label class="cc-row cc-stack-sm">
                <input v-model="socialWorkerScheduleType" type="radio" name="socialWorkerScheduleType" value="custom" />
                <span class="cc-label-inline">Custom schedule</span>
              </label>
            </div>
            <div class="cc-stack">
              <div v-if="socialWorkerAssignmentMode === 'custom'" class="cc-grid">
                <label for="socialWorkerName" class="cc-label">
                  Social worker name
                </label>
                <AppAsyncAutocomplete v-model="socialWorkerName" inputId="socialWorkerName" appendTo="body"
                  panelClass="cc-autocomplete-panel" :pt="autoCompletePt" placeholder="Search social worker"
                  :fetcher="fetchSocialWorkerSuggestions"
                  @error="(error) => console.error('Failed to load social workers.', error)" />
                <div v-if="hasAttemptedSubmit && validationErrors.socialWorker"
                  class="cc-help-text cc-help-text--error">
                  {{ validationErrors.socialWorker }}
                </div>
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
              <div v-else-if="socialWorkerScheduleType === 'custom'" class="cc-stack cc-stack-sm">
                <div v-for="row in socialWorkerRecurrenceRows" :key="row.id"
                  class="cc-grid cc-grid-4 cc-grid-align-end">
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
                    <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm cc-btn-fill" @click="
                      addEmployeeRecurrenceRow(socialWorkerRecurrenceRows)
                      ">
                      +
                    </button>
                    <button type="button" class="cc-btn cc-btn-outline-danger cc-btn-sm cc-btn-fill"
                      :disabled="socialWorkerRecurrenceRows.length === 1" @click="
                        removeEmployeeRecurrenceRow(
                          socialWorkerRecurrenceRows,
                          row.id,
                        )
                        ">
                      -
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="showDriverSection" class="cc-panel">
          <div class="cc-section-title">Driver</div>
          <div class="cc-stack">
            <div class="cc-row cc-row-wrap">
              <label class="cc-row cc-stack-sm">
                <input v-model="driverAssignmentMode" type="radio" name="driverAssignmentMode" value="primary" />
                <span class="cc-label-inline">{{ primaryDriverLabel }}</span>
              </label>
              <label class="cc-row cc-stack-sm">
                <input v-model="driverAssignmentMode" type="radio" name="driverAssignmentMode" value="custom" />
                <span class="cc-label-inline">Cover by driver</span>
              </label>
            </div>
            <div v-if="schedule.isRecurring" class="cc-row cc-row-wrap">
              <label class="cc-row cc-stack-sm">
                <input v-model="driverScheduleType" type="radio" name="driverScheduleType" value="same" />
                <span class="cc-label-inline">Same schedule</span>
              </label>
              <label class="cc-row cc-stack-sm">
                <input v-model="driverScheduleType" type="radio" name="driverScheduleType" value="custom" />
                <span class="cc-label-inline">Custom schedule</span>
              </label>
            </div>
            <div class="cc-stack">
              <div v-if="driverAssignmentMode === 'custom'" class="cc-grid">
                <label for="driverName" class="cc-label">Driver name</label>
                <AppAsyncAutocomplete v-model="driverName" inputId="driverName" appendTo="body"
                  panelClass="cc-autocomplete-panel" :pt="autoCompletePt" placeholder="Search driver"
                  :fetcher="fetchDriverSuggestions"
                  @error="(error) => console.error('Failed to load drivers.', error)" />
                <div v-if="hasAttemptedSubmit && validationErrors.driver" class="cc-help-text cc-help-text--error">
                  {{ validationErrors.driver }}
                </div>
              </div>
              <div v-if="!schedule.isRecurring" class="cc-grid cc-grid-2">
                <div>
                  <label for="driverStartTime" class="cc-label">
                    Start time
                  </label>
                  <DatePicker v-model="driverSchedule.startTime" inputId="driverStartTime" timeOnly hourFormat="24"
                    appendTo="body" panelClass="cc-datepicker-panel cc-time-panel" :pt="datePickerPt" />
                </div>
                <div>
                  <label for="driverEndTime" class="cc-label">End time</label>
                  <DatePicker v-model="driverSchedule.endTime" inputId="driverEndTime" timeOnly hourFormat="24"
                    appendTo="body" panelClass="cc-datepicker-panel cc-time-panel" :pt="datePickerPt" />
                </div>
              </div>
              <div v-else-if="driverScheduleType === 'custom'" class="cc-stack cc-stack-sm">
                <div v-for="row in driverRecurrenceRows" :key="row.id" class="cc-grid cc-grid-4 cc-grid-align-end">
                  <div>
                    <label :for="`driver-day-${row.id}`" class="cc-label">
                      Day
                    </label>
                    <select :id="`driver-day-${row.id}`" v-model="row.day" class="cc-select">
                      <option v-for="day in weekdayOptions" :key="day" :value="day">
                        {{ day }}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label :for="`driver-start-${row.id}`" class="cc-label">
                      Start time
                    </label>
                    <DatePicker v-model="row.startTime" :inputId="`driver-start-${row.id}`" timeOnly hourFormat="24"
                      appendTo="body" panelClass="cc-datepicker-panel cc-time-panel" :pt="datePickerPt" />
                  </div>
                  <div>
                    <label :for="`driver-end-${row.id}`" class="cc-label">
                      End time
                    </label>
                    <DatePicker v-model="row.endTime" :inputId="`driver-end-${row.id}`" timeOnly hourFormat="24"
                      appendTo="body" panelClass="cc-datepicker-panel cc-time-panel" :pt="datePickerPt" />
                  </div>
                  <div class="cc-row cc-row-stretch">
                    <button type="button" class="cc-btn cc-btn-outline-success cc-btn-sm cc-btn-fill"
                      @click="addEmployeeRecurrenceRow(driverRecurrenceRows)">
                      +
                    </button>
                    <button type="button" class="cc-btn cc-btn-outline-danger cc-btn-sm cc-btn-fill"
                      :disabled="driverRecurrenceRows.length === 1" @click="
                        removeEmployeeRecurrenceRow(
                          driverRecurrenceRows,
                          row.id,
                        )
                        ">
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
        <div v-if="props.errorMessage" class="cc-help-text cc-help-text--error">
          {{ props.errorMessage }}
        </div>
      </fieldset>
    </form>

    <template #footer>
      <button type="button" class="cc-btn cc-btn-outline bg-danger text-light" :disabled="props.isSaving"
        @click="visible = false">
        Cancel
      </button>
      <button type="submit" class="cc-btn save text-light" form="appointment-form" :disabled="isBusy">
        <Loader2 v-if="props.isSaving" class="cc-icon cc-icon-spinner" />
        <span>{{ props.isSaving ? "Saving..." : "Save" }}</span>
      </button>
    </template>
  </Dialog>
</template>
