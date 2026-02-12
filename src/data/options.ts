export type PatientAddressOption = {
  id?: number | string | null;
  address?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
};

export type PatientPrimaryStaffOption = {
  id?: number | string | null;
  name?: string | null;
};

export type PatientOption = {
  id: string;
  name: string;
  name_ar?: string;
  date_of_birth?: string;
  mobile?: string;
  address?: PatientAddressOption | null;
  primary_doctor?: PatientPrimaryStaffOption | null;
  primary_nurse?: PatientPrimaryStaffOption | null;
  primary_leader_nurse?: PatientPrimaryStaffOption | null;
  primary_social_worker?: PatientPrimaryStaffOption | null;
  primary_driver?: PatientPrimaryStaffOption | null;
  primary_nurse_id?: string;
  primary_doctor_id?: string;
  primary_social_worker_id?: string;
  primary_driver_id?: string;
};

export const patientOptions: PatientOption[] = [
  { id: "PT-1001", name: "Amelia Rivera" },
  { id: "PT-1002", name: "Noah Patel" },
  { id: "PT-1003", name: "Sophia Nguyen" },
  { id: "PT-1004", name: "Liam Johnson" },
  { id: "PT-1005", name: "Isabella Chen" },
];

export const nurseOptions = [
  "Nora King",
  "Maya Reed",
  "Eli Brooks",
  "Ava Sinclair",
  "Jordan Lee",
] as const;

export const doctorOptions = [
  "Dr. Patel",
  "Dr. Chen",
  "Dr. Johnson",
  "Dr. Diaz",
  "Dr. Alvarez",
] as const;

export const socialWorkerOptions = [
  "Avery Morgan",
  "Harper Bailey",
  "Riley Evans",
  "Quinn Carter",
  "Emerson Lee",
] as const;

export const areaOptions = [
  "Downtown",
  "Riverside",
  "North Hills",
  "Lakeside",
  "Old Town",
] as const;

export const visitTypeOptions = [
  "Initial Visit",
  "Follow Up",
  "Home Visit",
] as const;

export const weekdayOptions = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const statusOptions = [
  "new",
  "waiting",
  "confirmed",
  "patient_confirmed",
  "rescheduled",
  "canceled",
  "completed",
  "no_show",
] as const;

export type AppointmentStatus = (typeof statusOptions)[number];
export type Weekday = (typeof weekdayOptions)[number];
