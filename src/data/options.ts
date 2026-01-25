export type PatientOption = {
  id: string;
  name: string;
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

export const statusOptions = ["Confirmed", "Pending", "Cancelled"] as const;

export type AppointmentStatus = (typeof statusOptions)[number];
export type Weekday = (typeof weekdayOptions)[number];
