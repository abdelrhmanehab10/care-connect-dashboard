export type Appointment = {
  id: number;
  patient_name: string;
  start_time: string;
  end_time: string;
  status: string;
  date: string;
  nurse_name: string;
  doctor_name: string;
  social_worker_name?: string;
  visit_type: string;
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
