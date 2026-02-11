import { http } from "../lib/api";

export type EmployeeTitle = "nurse" | "doctor" | "social_worker" | "driver";

export type EmployeeOption = {
  id: number;
  name: string;
};

type EmployeePayload = {
  id?: number | string | null;
  employee_id?: number | string | null;
  name?: string | null;
  full_name?: string | null;
};

const toEmployeeName = (item: EmployeePayload) => {
  const name = String(item.name ?? "").trim();
  if (name) return name;
  const fullName = String(item.full_name ?? "").trim();
  return fullName;
};

const toEmployeeOption = (item: EmployeePayload): EmployeeOption | null => {
  const name = toEmployeeName(item);
  const rawId = item.id ?? item.employee_id;
  const id =
    typeof rawId === "number" ? rawId : Number(String(rawId ?? "").trim());
  if (!name || !Number.isFinite(id) || id <= 0) {
    return null;
  }
  return { id, name };
};

export const fetchEmployeesByTitle = async (
  title: EmployeeTitle,
  query?: string,
  signal?: AbortSignal,
): Promise<string[]> => {
  const response = await http.get("/employees/search", {
    params: {
      title,
      q: query?.trim() || undefined,
    },
    signal,
  });

  const payload = response.data?.data ?? response.data;
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => toEmployeeName(item as EmployeePayload))
    .filter((name) => name.length > 0);
};

export const fetchEmployeeOptionsByTitle = async (
  title: EmployeeTitle,
  query?: string,
  signal?: AbortSignal,
): Promise<EmployeeOption[]> => {
  const response = await http.get("/employees/search", {
    params: {
      title,
      q: query?.trim() || undefined,
    },
    signal,
  });

  const payload = response.data?.data ?? response.data;
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => toEmployeeOption(item as EmployeePayload))
    .filter((option): option is EmployeeOption => Boolean(option));
};
