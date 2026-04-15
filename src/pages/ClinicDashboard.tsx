import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { User, Shift } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Users, Calendar, Clock, DollarSign, MapPin, CheckCircle2, XCircle, UserCircle, Activity, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

interface ClinicDashboardProps {
  user: User;
}

export default function ClinicDashboard({ user }: ClinicDashboardProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShifts();
  }, [user.id]);

  const fetchShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('clinic_id', user.id)
        .order('date', { ascending: false });
        
      if (error) throw error;
      setShifts(data as Shift[]);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newShift = {
      clinic_id: user.id,
      clinic_name: user.name,
      category: formData.get('category') as 'guardia' | 'evento',
      specialty: formData.get('specialty') as string,
      type: formData.get('type') as string,
      price: Number(formData.get('price')),
      date: new Date(formData.get('date') as string).toISOString().split('T')[0],
      start_time: formData.get('startTime') as string,
      end_time: formData.get('endTime') as string,
      zone: formData.get('zone') as string,
      location: formData.get('location') as string,
      requirements: (formData.get('requirements') as string).split(',').map(s => s.trim()).filter(Boolean),
      equipment_available: (formData.get('equipmentAvailable') as string)?.split(',').map(s => s.trim()).filter(Boolean) || [],
      contact_person: formData.get('contactPerson') as string || null,
      status: 'open',
      applicants: []
    };

    try {
      const { error } = await supabase.from('shifts').insert([newShift]);
      if (error) throw error;
      
      setIsModalOpen(false);
      alert('Oportunidad publicada exitosamente');
      fetchShifts();
    } catch (error) {
      console.error("Error creating shift:", error);
      alert("Error al publicar la oportunidad.");
    }
  };

  const handleAssign = async (shiftId: string, doctorId: string) => {
    try {
      const { error } = await supabase
        .from('shifts')
        .update({
          assigned_doctor_id: doctorId,
          status: 'confirmed'
        })
        .eq('id', shiftId);
        
      if (error) throw error;
      
      alert('Médico asignado exitosamente');
      fetchShifts();
    } catch (error) {
      console.error("Error assigning doctor:", error);
      alert("Error al asignar médico.");
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-gray-500">Cargando panel...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
          <p className="text-gray-600">Panel de gestión de guardias y eventos</p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Publicar Oportunidad
        </button>
      </div>

      <div className="grid gap-6">
        {shifts.length > 0 ? (
          shifts.map(shift => (
            <ClinicShiftCard key={shift.id} shift={shift} onAssign={handleAssign} />
          ))
        ) : (
          <div className="py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200 border-dashed">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-lg font-medium text-gray-900">No tienes oportunidades publicadas</p>
            <p>Publica una nueva guardia o evento para empezar a recibir postulantes.</p>
          </div>
        )}
      </div>

      {/* Basic Modal for Creating Shift */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Publicar Nueva Oportunidad</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateShift} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="category" value="guardia" defaultChecked className="text-blue-600 focus:ring-blue-500" />
                      <span>Guardia Clínica</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="category" value="evento" className="text-blue-600 focus:ring-blue-500" />
                      <span>Evento (Deportivo, Maratón, etc.)</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad / Rol requerido</label>
                  <input type="text" name="specialty" required placeholder="Ej: Pediatría, Médico General..." className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Honorarios ($ ARS)</label>
                  <input type="number" name="price" required placeholder="Ej: 150000" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input type="date" name="date" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
                  <select name="zone" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>CABA</option>
                    <option>GBA Norte</option>
                    <option>GBA Sur</option>
                    <option>GBA Oeste</option>
                    <option>La Plata</option>
                    <option>Interior</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección exacta</label>
                  <input type="text" name="location" required placeholder="Ej: Av. Rivadavia 1234" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo / Descripción breve</label>
                  <input type="text" name="type" required placeholder="Ej: Guardia 24hs, Cobertura Torneo..." className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4 mt-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora Inicio</label>
                    <input type="time" name="startTime" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora Fin</label>
                    <input type="time" name="endTime" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <h3 className="text-sm font-bold text-gray-900 mt-4">Detalles Adicionales</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requisitos Médicos</label>
                  <textarea name="requirements" placeholder="Ej: Matrícula Nacional, Especialidad completa, Seguro de mala praxis..." className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2}></textarea>
                  <p className="text-xs text-gray-500 mt-1">Separe los requisitos con comas.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Equipamiento Disponible</label>
                  <textarea name="equipmentAvailable" placeholder="Ej: Ecógrafo portátil, Laboratorio 24hs, Rayos X..." className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2}></textarea>
                  <p className="text-xs text-gray-500 mt-1">Separe el equipamiento con comas.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Persona de Contacto</label>
                  <input type="text" name="contactPerson" placeholder="Ej: Dr. Juan Pérez (Jefe de Guardia)" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md font-medium">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700">
                  Publicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ClinicShiftCard({ shift, onAssign }: { shift: Shift, onAssign: (shiftId: string, doctorId: string) => void }) {
  const isConfirmed = shift.status === 'confirmed' || shift.status === 'completed';
  const [assignedDoctor, setAssignedDoctor] = useState<User | null>(null);
  const [applicants, setApplicants] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (shift.assigned_doctor_id) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', shift.assigned_doctor_id)
          .single();
        if (data) {
          setAssignedDoctor(data as User);
        }
      }

      if (shift.applicants && shift.applicants.length > 0) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .in('id', shift.applicants);
        
        if (data) {
          setApplicants(data as User[]);
        }
      }
    };

    fetchUsers();
  }, [shift.assigned_doctor_id, shift.applicants]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
      {/* Shift Details */}
      <div className="p-6 md:w-1/2 border-b md:border-b-0 md:border-r border-gray-200 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "inline-block px-2.5 py-1 rounded-full text-xs font-semibold",
                isConfirmed ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
              )}>
                {isConfirmed ? 'Asignada' : 'Buscando Médico'}
              </span>
              <span className={cn(
                "inline-block px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
                shift.category === 'evento' ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700"
              )}>
                {shift.category === 'evento' ? 'Evento' : 'Guardia'}
              </span>
            </div>
            <h3 className="font-bold text-xl text-gray-900">{shift.specialty}</h3>
            <p className="text-gray-600">{shift.type}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="capitalize">{format(new Date(shift.date), "d MMM yyyy", { locale: es })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>{shift.start_time} - {shift.end_time}</span>
          </div>
          <div className="flex items-start gap-2 col-span-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div className="flex flex-col">
              {shift.zone && <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{shift.zone}</span>}
              <a 
                href={`https://maps.google.com/?q=${encodeURIComponent(shift.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
              >
                <span className="truncate max-w-[200px]">{shift.location}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2 col-span-2 font-medium text-gray-900 pt-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span>${shift.price.toLocaleString('es-AR')}</span>
          </div>
          {shift.contact_person && (
            <div className="flex items-center gap-2 col-span-2 pt-1">
              <UserCircle className="w-4 h-4 text-gray-400" />
              <span>Contacto: {shift.contact_person}</span>
            </div>
          )}
        </div>
      </div>

      {/* Applicants / Assigned Doctor */}
      <div className="p-6 md:w-1/2 bg-gray-50 flex flex-col">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" />
          {isConfirmed ? 'Médico Asignado' : `Postulantes (${shift.applicants.length})`}
        </h4>

        {isConfirmed && assignedDoctor ? (
          <>
            <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                <UserCircle className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <p className="font-bold text-gray-900">{assignedDoctor.name}</p>
                <p className="text-sm text-gray-600">{assignedDoctor.specialty}</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-sm text-yellow-600">
                    ★ {assignedDoctor.rating}
                  </div>
                  {assignedDoctor.completion_rate && (
                    <div className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                      <Activity className="w-3 h-3" />
                      {assignedDoctor.completion_rate}% Asistencia
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Tracking Status */}
            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 text-sm">
              <h5 className="font-semibold text-gray-900 mb-2">Estado de la Cobertura</h5>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Confirmación 24hs:</span>
                  {shift.attendance_confirmed ? (
                    <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Confirmado</span>
                  ) : (
                    <span className="text-yellow-600 font-medium">Pendiente</span>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : applicants.length > 0 ? (
          <div className="space-y-3 overflow-y-auto max-h-48 pr-2">
            {applicants.map(applicant => (
              <div key={applicant.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                    <UserCircle className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{applicant.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-1 text-xs text-yellow-600">
                        ★ {applicant.rating}
                      </div>
                      {applicant.completion_rate && (
                        <div className="text-[10px] text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded-full">
                          {applicant.completion_rate}% Asistencia
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => onAssign(shift.id, applicant.id)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-sm font-medium transition-colors"
                >
                  Asignar
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
            <p>Aún no hay postulantes para esta guardia.</p>
          </div>
        )}
      </div>
    </div>
  );
}
