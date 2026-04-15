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
  completionRate?: number; // Porcentaje de asistencia perfecta (ej. 98)
  // Clinic specific
  address?: string;
}

export type ShiftStatus = 'open' | 'pending_confirmation' | 'confirmed' | 'completed' | 'cancelled';

export interface Shift {
  id: string;
  clinicId: string;
  clinicName: string;
  category: 'guardia' | 'evento';
  type: string; // e.g., 'Guardia 24hs', 'Cobertura de Torneo'
  specialty: string; // e.g., 'Pediatría', 'Clínica Médica', 'Terapia Intensiva'
  date: string; // ISO string
  startTime: string;
  endTime: string;
  location: string;
  zone?: string; // e.g., 'CABA', 'GBA Norte', 'GBA Sur'
  requirements: string[];
  equipmentAvailable?: string[];
  contactPerson?: string;
  price: number;
  status: ShiftStatus;
  applicants: string[]; // array of doctor IDs
  assignedDoctorId?: string;
  attendanceConfirmed?: boolean; // Confirmación 24hs antes
  createdAt: string;
}
