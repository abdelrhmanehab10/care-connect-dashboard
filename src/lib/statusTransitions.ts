export const normalizeStatusKey = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

export const formatStatusLabel = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "-";
  }

  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const statusLevelLookup: Record<string, number> = {
  new: 1,
  waiting: 1,
  confirmed: 2,
  patient_confirmed: 2,
  rescheduled: 2,
  canceled: 3,
  cancelled: 3,
  completed: 3,
  no_show: 3,
};

export const getStatusLevel = (value: unknown) =>
  statusLevelLookup[normalizeStatusKey(value)] ?? 1;

export const isFinalStatus = (value: unknown) => getStatusLevel(value) >= 3;

export const isStatusTransitionAllowed = (from: unknown, to: unknown) => {
  const fromKey = normalizeStatusKey(from);
  const toKey = normalizeStatusKey(to);
  if (!fromKey || fromKey === toKey) return true;
  if (isFinalStatus(from)) return false;
  if (getStatusLevel(from) >= 2) {
    return isFinalStatus(to);
  }
  return true;
};
