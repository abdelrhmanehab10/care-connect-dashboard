export const toIsoDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const isIsoDateString = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export const parseLocalDateOnly = (value: string): Date | null => {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return null;
  }

  const [, yearRaw, monthRaw, dayRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!year || !month || !day) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  const isExactDate =
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day;
  return isExactDate ? parsed : null;
};

export const normalizeDateString = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (isIsoDateString(trimmed)) {
    const parsed = parseLocalDateOnly(trimmed);
    return parsed ? toIsoDate(parsed) : "";
  }

  const normalizedSeparators = trimmed.replace(/\//g, "-");
  if (isIsoDateString(normalizedSeparators)) {
    const parsed = parseLocalDateOnly(normalizedSeparators);
    return parsed ? toIsoDate(parsed) : "";
  }

  const splitByT = normalizedSeparators.split("T")[0] ?? "";
  if (isIsoDateString(splitByT)) {
    const parsed = parseLocalDateOnly(splitByT);
    return parsed ? toIsoDate(parsed) : "";
  }

  const splitBySpace = normalizedSeparators.split(" ")[0] ?? "";
  if (isIsoDateString(splitBySpace)) {
    const parsed = parseLocalDateOnly(splitBySpace);
    return parsed ? toIsoDate(parsed) : "";
  }

  const monthDayYearMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (monthDayYearMatch) {
    const month = monthDayYearMatch[1]?.padStart(2, "0") ?? "";
    const day = monthDayYearMatch[2]?.padStart(2, "0") ?? "";
    const year = monthDayYearMatch[3] ?? "";
    if (!year || !month || !day) {
      return "";
    }
    const iso = `${year}-${month}-${day}`;
    const parsed = parseLocalDateOnly(iso);
    return parsed ? toIsoDate(parsed) : "";
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return toIsoDate(parsed);
  }

  return "";
};

export const isSameCalendarDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const startOfWeekMonday = (value: Date) => {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date;
};

export const endOfWeekMonday = (value: Date) => {
  const date = startOfWeekMonday(value);
  date.setDate(date.getDate() + 6);
  return date;
};

export const startOfMonth = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), 1);

export const endOfMonth = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth() + 1, 0);
