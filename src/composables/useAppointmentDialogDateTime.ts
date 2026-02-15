import {
  normalizeDateString,
  parseLocalDateOnly,
  toIsoDate,
} from "../lib/dateUtils";

const minutesInDay = 24 * 60;

export const formatNativeDateValue = (value: Date | null) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "";
  }
  return toIsoDate(value);
};

export const parseNativeDateValue = (value: string) => {
  return parseLocalDateOnly(value);
};

export const parseClockToMinutes = (value: string) => {
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

export const formatMinutesToClock = (value: number) => {
  const normalized = ((value % minutesInDay) + minutesInDay) % minutesInDay;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export const durationHoursToMs = (durationHours: number) =>
  Math.round(durationHours * 60 * 60 * 1000);

export const formatDurationHoursLabel = (hours: number) =>
  Number.isInteger(hours)
    ? `${hours} hour${hours === 1 ? "" : "s"}`
    : `${hours} hours`;

export const formatDate = (value: Date | null) => {
  if (!value) {
    return "";
  }
  return toIsoDate(value);
};

export const formatTime = (value: Date | string | null) => {
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

export const normalizeTimeInput = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  const [, rawHours = "", rawMinutes = ""] = match ?? [];
  if (!rawHours || !rawMinutes) return null;
  const hours = rawHours.padStart(2, "0");
  const minutes = rawMinutes;
  return `${hours}:${minutes}`;
};

export const normalizeDateValue = (value: string | null | undefined) => {
  return normalizeDateString(value);
};

export const isValidTime = (value: string) =>
  /^\d{1,2}:\d{2}(:\d{2})?$/.test(value);

export const parseDateOnly = (value: string | null | undefined) => {
  const normalized = normalizeDateValue(value);
  if (!normalized) {
    return null;
  }
  return parseLocalDateOnly(normalized);
};

export const parseDateTime = (
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

export const cloneDateValue = (value: Date | null) =>
  value ? new Date(value.getTime()) : null;
