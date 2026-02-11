import { http } from "../lib/api";
import type { PatientOption } from "../data/options";

type PatientAutocompleteItem = {
  id?: string | number | null;
  text?: string | null;
  name?: string | null;
};

export const fetchPatientAutocomplete = async (
  query: string,
  signal?: AbortSignal,
): Promise<PatientOption[]> => {
  const response = await http.get("/patients/autocomplete", {
    params: { q: query },
    signal,
  });
  const payload = response.data?.data ?? response.data;

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        return trimmed ? { id: trimmed, name: trimmed } : null;
      }

      const typed = item as PatientAutocompleteItem;
      const id = String(typed.id ?? "").trim();
      const name =
        String(typed.name ?? "").trim() || String(typed.text ?? "").trim();

      if (!id || !name) {
        return null;
      }

      return { id, name };
    })
    .filter((item): item is PatientOption => Boolean(item));
};
