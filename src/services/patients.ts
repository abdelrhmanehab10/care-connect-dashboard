import { http } from "../lib/api";
import type { PatientOption } from "../data/options";

export const fetchPatientAutocomplete = async (
  query: string,
): Promise<PatientOption[]> => {
  const response = await http.get("/api/patients/autocomplete", {
    params: { q: query },
  });
  const payload = response.data?.data ?? response.data;
  return Array.isArray(payload) ? (payload as PatientOption[]) : [];
};
