export type Appointment = {
  id: number;
  patient: {
    id: number;
    name: string;
    date_of_birth: string;
  };
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

type Confirmation = {
  id: number;
  appointment_id: number;
  employee_id: number;
  confirmed_by: number;
  created_at: string;
  updated_at: string;
};

export type AppointmentDetails = Appointment & {
  confirmation: Confirmation[];
  care_team: [];
};
