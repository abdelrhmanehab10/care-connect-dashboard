import { http } from "../lib/api";

export type VisitType = {
  id: string;
  name: string;
  providers: string[];
  duration?: number | string | null;
};

export const fetchVisitTypes = async (): Promise<VisitType[]> => {
  const { data } = await http.get("/visit-types");

  return data.data;
};
