export type Role = 'doctor' | 'clinic' | null;

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  avatar?: string;
  phone?: string;
  bio?: string; // Para CV de médicos o descripción de clínicas
  linkedin_url?: string;
  dni?: string; // Para profesionales
  license_number?: string; // Matrícula
  license_image_url?: string; // Captura de Mi Argentina
  jurisdiction?: string; // Jurisdicción de la matrícula
  affidavit_accepted?: boolean; // Declaración jurada aceptada
  cuit?: string; // Para instituciones
  verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected';
  // Doctor specific
  secondary_specialties?: string[];
  years_of_experience?: string;
  specialty?: string;
  rating?: number;
  completion_rate?: number; // Porcentaje de asistencia perfecta (ej. 98)
  penalty_rate?: number; // Porcentaje de cancelaciones de instituciones
  cancellation_count?: number; // Cantidad total de cancelaciones
  // Clinic specific
  address?: string;
  availability?: string; // Disponibilidad horaria/días
  institution_type?: 'clinica_privada' | 'geriatrico' | 'sanatorio' | 'centro_medico' | 'medicina_laboral' | 'organizador_eventos' | 'otro';
  zone?: string;
  needed_specialties?: string[];
  contact_hours?: string;
  cv_url?: string; // URL del PDF en Supabase Storage
  created_at?: string;
}

export type ShiftStatus = 'open' | 'pending_confirmation' | 'confirmed' | 'completed' | 'cancelled' | 'noshow' | 'cancelled_by_clinic';

export interface Shift {
  id: string;
  clinic_id: string;
  clinic_name: string;
  clinic_avatar?: string;
  category: 'guardia' | 'evento' | 'empleo' | 'suplencia';
  job_duration?: 'tiempo_completo' | 'semanal' | 'mensual' | '3_meses' | 'otro';
  type: string; // e.g., 'Guardia 24hs', 'Cobertura de Torneo'
  specialty: string; // e.g., 'Pediatría', 'Clínica Médica', 'Terapia Intensiva'
  date: string; // ISO string
  start_time: string;
  end_time: string;
  location: string;
  zone?: string; // e.g., 'CABA', 'GBA Norte', 'GBA Sur'
  description?: string; // Long visual description
  requirements: string[];
  equipment_available?: string[];
  contact_person?: string;
  price: number;
  is_negotiable?: boolean; // Indicates if the price can be negotiated
  status: ShiftStatus;
  applicants: string[]; // array of doctor IDs
  confirmed_applicants?: string[]; // array of doctor IDs who confirmed their interest
  applicant_proposals?: Record<string, number>; // Maps doctor ID to proposed price
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

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'application' | 'assignment' | 'system' | 'message' | 'shift_status';
  read: boolean;
  shift_id?: string;
  created_at: string;
}
