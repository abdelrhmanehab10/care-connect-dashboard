import { http } from "../lib/api";

export type VisitType = {
  id: string;
  name: string;
  providers: string[];
};

export const fetchVisitTypes = async (): Promise<VisitType[]> => {
  const { data } = await http.get("/visit-types");

  return data.data;
};
