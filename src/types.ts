export type Role = 'doctor' | 'clinic' | null;

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  avatar?: string;
  // Doctor specific
  specialty?: string;
  rating?: number;
  completion_rate?: number; // Porcentaje de asistencia perfecta (ej. 98)
  // Clinic specific
  address?: string;
  created_at?: string;
}

export type ShiftStatus = 'open' | 'pending_confirmation' | 'confirmed' | 'completed' | 'cancelled';

export interface Shift {
  id: string;
  clinic_id: string;
  clinic_name: string;
  category: 'guardia' | 'evento';
  type: string; // e.g., 'Guardia 24hs', 'Cobertura de Torneo'
  specialty: string; // e.g., 'Pediatría', 'Clínica Médica', 'Terapia Intensiva'
  date: string; // ISO string
  start_time: string;
  end_time: string;
  location: string;
  zone?: string; // e.g., 'CABA', 'GBA Norte', 'GBA Sur'
  requirements: string[];
  equipment_available?: string[];
  contact_person?: string;
  price: number;
  status: ShiftStatus;
  applicants: string[]; // array of doctor IDs
  assigned_doctor_id?: string;
  attendance_confirmed?: boolean; // Confirmación 24hs antes
  rating_for_doctor?: number; // 1 to 5, given by clinic
  review_for_doctor?: string;
  rating_for_clinic?: number; // 1 to 5, given by doctor
  review_for_clinic?: string;
  created_at?: string;
}

export interface Message {
  id: string;
  shift_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}
