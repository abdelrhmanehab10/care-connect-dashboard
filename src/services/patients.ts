import { http } from "../lib/api";
import type { PatientOption } from "../data/options";

type PatientAutocompleteItem = {
  id?: string | number | null;
  text?: string | null;
  name?: string | null;
  name_ar?: string | null;
  date_of_birth?: string | null;
  mobile?: string | null;
  address?:
    | {
        id?: string | number | null;
        address?: string | null;
        lat?: string | number | null;
        lng?: string | number | null;
      }
    | null;
  primary_nurse_id?: string | number | null;
  primary_doctor_id?: string | number | null;
  primary_social_worker_id?: string | number | null;
  primary_driver_id?: string | number | null;
  main_nurse_id?: string | number | null;
  main_doctor_id?: string | number | null;
  main_social_worker_id?: string | number | null;
  main_driver_id?: string | number | null;
  primary_nurse?:
    | { id?: string | number | null; name?: string | null }
    | null;
  primary_leader_nurse?:
    | { id?: string | number | null; name?: string | null }
    | null;
  primary_doctor?:
    | { id?: string | number | null; name?: string | null }
    | null;
  primary_social_worker?:
    | { id?: string | number | null; name?: string | null }
    | null;
  primary_driver?:
    | { id?: string | number | null; name?: string | null }
    | null;
};

const normalizeOptionalId = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? String(value) : "";
  }
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "";
  }
  const asNumber = Number(normalized);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return String(asNumber);
  }
  return normalized;
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

  const options = payload.map<PatientOption | null>((item) => {
    if (typeof item === "string") {
      const trimmed = item.trim();
      return trimmed ? { id: trimmed, name: trimmed } : null;
    }

    const typed = item as PatientAutocompleteItem;
    const id = String(typed.id ?? "").trim();
    const name = String(typed.name ?? "").trim() || String(typed.text ?? "").trim();

    if (!id || !name) {
      return null;
    }

    const primaryNurseId =
      normalizeOptionalId(typed.primary_nurse_id) ||
      normalizeOptionalId(typed.main_nurse_id) ||
      normalizeOptionalId(typed.primary_nurse?.id) ||
      normalizeOptionalId(typed.primary_leader_nurse?.id);
    const primaryDoctorId =
      normalizeOptionalId(typed.primary_doctor_id) ||
      normalizeOptionalId(typed.main_doctor_id) ||
      normalizeOptionalId(typed.primary_doctor?.id);
    const primarySocialWorkerId =
      normalizeOptionalId(typed.primary_social_worker_id) ||
      normalizeOptionalId(typed.main_social_worker_id) ||
      normalizeOptionalId(typed.primary_social_worker?.id);
    const primaryDriverId =
      normalizeOptionalId(typed.primary_driver_id) ||
      normalizeOptionalId(typed.main_driver_id) ||
      normalizeOptionalId(typed.primary_driver?.id);

    const option: PatientOption = { id, name };

    const nameAr = String(typed.name_ar ?? "").trim();
    if (nameAr) {
      option.name_ar = nameAr;
    }

    const dateOfBirth = String(typed.date_of_birth ?? "").trim();
    if (dateOfBirth) {
      option.date_of_birth = dateOfBirth;
    }

    const mobile = String(typed.mobile ?? "").trim();
    if (mobile) {
      option.mobile = mobile;
    }

    if (typed.address === null) {
      option.address = null;
    } else if (typed.address && typeof typed.address === "object") {
      option.address = {
        id: typed.address.id ?? null,
        address: typed.address.address ?? null,
        lat: typed.address.lat ?? null,
        lng: typed.address.lng ?? null,
      };
    }

    if (typed.primary_nurse === null) {
      option.primary_nurse = null;
    } else if (typed.primary_nurse) {
      option.primary_nurse = {
        id: typed.primary_nurse.id ?? null,
        name: String(typed.primary_nurse.name ?? "").trim() || null,
      };
    }

    if (typed.primary_leader_nurse === null) {
      option.primary_leader_nurse = null;
    } else if (typed.primary_leader_nurse) {
      option.primary_leader_nurse = {
        id: typed.primary_leader_nurse.id ?? null,
        name: String(typed.primary_leader_nurse.name ?? "").trim() || null,
      };
    }

    if (typed.primary_doctor === null) {
      option.primary_doctor = null;
    } else if (typed.primary_doctor) {
      option.primary_doctor = {
        id: typed.primary_doctor.id ?? null,
        name: String(typed.primary_doctor.name ?? "").trim() || null,
      };
    }

    if (typed.primary_social_worker === null) {
      option.primary_social_worker = null;
    } else if (typed.primary_social_worker) {
      option.primary_social_worker = {
        id: typed.primary_social_worker.id ?? null,
        name: String(typed.primary_social_worker.name ?? "").trim() || null,
      };
    }

    if (typed.primary_driver === null) {
      option.primary_driver = null;
    } else if (typed.primary_driver) {
      option.primary_driver = {
        id: typed.primary_driver.id ?? null,
        name: String(typed.primary_driver.name ?? "").trim() || null,
      };
    }

    if (primaryNurseId) {
      option.primary_nurse_id = primaryNurseId;
    }
    if (primaryDoctorId) {
      option.primary_doctor_id = primaryDoctorId;
    }
    if (primarySocialWorkerId) {
      option.primary_social_worker_id = primarySocialWorkerId;
    }
    if (primaryDriverId) {
      option.primary_driver_id = primaryDriverId;
    }

    return option;
  });

  return options.filter((item): item is PatientOption => item !== null);
};
