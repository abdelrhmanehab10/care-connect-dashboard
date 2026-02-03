import { http } from "../lib/api";

export type VisitTypeOption = {
  id: string;
  name: string;
};

type VisitTypePayload = {
  id?: number | string | null;
  name?: string | null;
};

export const fetchVisitTypes = async (): Promise<VisitTypeOption[]> => {
  const response = await http.get("/api/visit-types");
  const payload = response.data?.data ?? response.data;

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      const typed = item as VisitTypePayload;
      const id = String(typed.id ?? "").trim();
      const name = String(typed.name ?? "").trim();

      if (!id || !name) {
        return null;
      }

      return { id, name };
    })
    .filter((item): item is VisitTypeOption => Boolean(item));
};
