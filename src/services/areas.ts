import { http } from "../lib/api";

export type AreaOption = {
  id: string;
  name: string;
};

type AreaPayload = {
  id?: number | string | null;
  name?: string | null;
};

export const fetchAreas = async (): Promise<AreaOption[]> => {
  const response = await http.get("/areas");
  const payload = response.data?.data ?? response.data;

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      const typed = item as AreaPayload;
      const id = String(typed.id ?? "").trim();
      const name = String(typed.name ?? "").trim();

      if (!id || !name) {
        return null;
      }

      return { id, name };
    })
    .filter((item): item is AreaOption => Boolean(item));
};
