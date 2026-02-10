import { http } from "../lib/api";

export type EmployeeTitle = "nurse" | "doctor" | "social_worker" | "driver";

type EmployeePayload = {
  id?: number | string | null;
  name?: string | null;
  full_name?: string | null;
};

const toEmployeeName = (item: EmployeePayload) => {
  const name = String(item.name ?? "").trim();
  if (name) return name;
  const fullName = String(item.full_name ?? "").trim();
  return fullName;
};

export const fetchEmployeesByTitle = async (
  title: EmployeeTitle,
  query?: string,
): Promise<string[]> => {
  const response = await http.get("/employees/search", {
    params: {
      title,
      q: query?.trim() || undefined,
    },
  });

  const payload = response.data?.data ?? response.data;
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => toEmployeeName(item as EmployeePayload))
    .filter((name) => name.length > 0);
};
