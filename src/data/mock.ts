import { Shift, User } from '../types';

export const mockUsers: Record<string, User> = {
  'doc-1': {
    id: 'doc-1',
    name: 'Dr. Martín Pérez',
    role: 'doctor',
    email: 'martin.perez@example.com',
    specialty: 'Clínica Médica',
    rating: 4.8,
    completionRate: 98
  },
  'doc-2': {
    id: 'doc-2',
    name: 'Dra. Laura Gómez',
    role: 'doctor',
    email: 'laura.gomez@example.com',
    specialty: 'Pediatría',
    rating: 4.9,
    completionRate: 100
  },
  'clinic-1': {
    id: 'clinic-1',
    name: 'Sanatorio Los Arcos',
    role: 'clinic',
    email: 'rrhh@losarcos.com',
    address: 'Av. Juan B. Justo 909, CABA'
  },
  'clinic-2': {
    id: 'clinic-2',
    name: 'Clínica del Sol',
    role: 'clinic',
    email: 'guardias@clinicadelsol.com',
    address: 'Av. Coronel Díaz 2211, CABA'
  },
  'org-1': {
    id: 'org-1',
    name: 'Liga Amateur de Fútbol',
    role: 'clinic',
    email: 'contacto@ligaamateur.com',
    address: 'Pilar, Buenos Aires'
  }
};

export const mockShifts: Shift[] = [
  {
    id: 'shift-1',
    clinicId: 'clinic-1',
    clinicName: 'Sanatorio Los Arcos',
    category: 'guardia',
    type: 'Guardia 24hs',
    specialty: 'Clínica Médica',
    date: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
    startTime: '08:00',
    endTime: '08:00',
    location: 'Av. Juan B. Justo 909, CABA',
    zone: 'CABA',
    requirements: ['Matrícula Nacional', 'Seguro de Mala Praxis', 'Experiencia > 2 años'],
    equipmentAvailable: ['Monitor multiparamétrico', 'Respirador', 'Desfibrilador'],
    contactPerson: 'Dra. Ana Martínez (Jefa de Guardia)',
    price: 150000,
    status: 'open',
    applicants: ['doc-1'],
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'shift-2',
    clinicId: 'clinic-2',
    clinicName: 'Clínica del Sol',
    category: 'guardia',
    type: 'Guardia 12hs (Noche)',
    specialty: 'Pediatría',
    date: new Date(Date.now() + 86400000 * 3).toISOString(),
    startTime: '20:00',
    endTime: '08:00',
    location: 'Av. Coronel Díaz 2211, CABA',
    zone: 'CABA',
    requirements: ['Matrícula Nacional', 'Especialidad completa'],
    equipmentAvailable: ['Ecógrafo portátil', 'Laboratorio 24hs'],
    contactPerson: 'Dr. Carlos Ruiz',
    price: 90000,
    status: 'open',
    applicants: [],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'shift-3',
    clinicId: 'clinic-1',
    clinicName: 'Sanatorio Los Arcos',
    category: 'guardia',
    type: 'Refuerzo',
    specialty: 'Terapia Intensiva',
    date: new Date(Date.now() + 86400000 * 1).toISOString(),
    startTime: '14:00',
    endTime: '22:00',
    location: 'Av. Juan B. Justo 909, CABA',
    zone: 'CABA',
    requirements: ['Especialista en UTI'],
    equipmentAvailable: ['Cama UTI completa', 'Hemodiálisis'],
    contactPerson: 'Lic. María Torres',
    price: 120000,
    status: 'confirmed',
    applicants: ['doc-1', 'doc-2'],
    assignedDoctorId: 'doc-1',
    attendanceConfirmed: true,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'shift-today',
    clinicId: 'clinic-2',
    clinicName: 'Clínica del Sol',
    category: 'guardia',
    type: 'Guardia 12hs (Día)',
    specialty: 'Pediatría',
    date: new Date().toISOString(), // Today
    startTime: '08:00',
    endTime: '20:00',
    location: 'Av. Coronel Díaz 2211, CABA',
    zone: 'CABA',
    requirements: ['Matrícula Nacional'],
    contactPerson: 'Dr. Carlos Ruiz',
    price: 95000,
    status: 'confirmed',
    applicants: ['doc-1'],
    assignedDoctorId: 'doc-1',
    attendanceConfirmed: true,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'shift-4',
    clinicId: 'org-1',
    clinicName: 'Liga Amateur de Fútbol',
    category: 'evento',
    type: 'Cobertura de Torneo',
    specialty: 'Médico General / Deportólogo',
    date: new Date(Date.now() + 86400000 * 4).toISOString(),
    startTime: '09:00',
    endTime: '18:00',
    location: 'Predio Deportivo Norte, Pilar',
    zone: 'GBA Norte',
    requirements: ['Matrícula Nacional', 'Bolso de primeros auxilios'],
    equipmentAvailable: ['Desfibrilador (DEA) en el predio', 'Ambulancia de traslado en puerta'],
    contactPerson: 'Carlos Gómez (Organizador)',
    price: 80000,
    status: 'open',
    applicants: [],
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];
