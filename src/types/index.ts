export type Confirmation = {
  id: number;
  appointment_id: number;
  employee_id: number;
  confirmed_by: number;
  created_at: string;
  updated_at: string;
};

export type CareMember = {
  employee: {
    id: number;
    name: string;
  };
  role: string;
  start_time: string;
  end_time: string;
};

export type Appointment = {
  id: number;
  patient: {
    id: number | string;
    name: string;
    date_of_birth: string;
    phone?: string;
    mobile?: string;
  };
  patient_address?: {
    id?: number;
    area_id?: number | string;
    city?: string;
    address?: string;
    lat?: number;
    lng?: number;
  } | null;
  care_team?: CareMember[];
  start_time: string;
  end_time: string;
  date: string;
  status: string;
  nurse: {
    id: number;
    name: string;
  };
  doctor: {
    id: number;
    name: string;
  };
  social_worker?: {
    id: number;
    name: string;
  } | null;
  visit_type: string;
  state?: string | null;
};

export type AppointmentDetails = Appointment & {
  patient_address: {
    id: number;
    area_id: number;
    city: string;
    address: string;
    lat: number;
    lng: number;
  };
  confirmations?: Confirmation[];
  confirmation?: Confirmation[];
  care_team: CareMember[];
};
