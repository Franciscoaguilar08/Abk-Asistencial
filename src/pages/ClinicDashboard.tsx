import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { User, Shift } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Users, Calendar, Clock, DollarSign, MapPin, CheckCircle2, XCircle, UserCircle, Activity, ExternalLink, Star, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import ChatModal from '../components/ChatModal';

interface ClinicDashboardProps {
  user: User;
}

export default function ClinicDashboard({ user }: ClinicDashboardProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<{ shiftId: string; receiverId: string; receiverName: string } | null>(null);

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
      toast.success('Oportunidad publicada exitosamente');
      fetchShifts();
    } catch (error) {
      console.error("Error creating shift:", error);
      toast.error("Error al publicar la oportunidad.");
    }
  };

  const handleAssign = async (shiftId: string, doctorId: string) => {
    try {
      const shift = shifts.find(s => s.id === shiftId);
      if (!shift) return;

      const { error } = await supabase
        .from('shifts')
        .update({
          assigned_doctor_id: doctorId,
          status: 'confirmed'
        })
        .eq('id', shiftId);
        
      if (error) throw error;
      
      // Crear notificación para el profesional
      await supabase.from('notifications').insert({
        user_id: doctorId,
        title: '¡Guardia Confirmada!',
        message: `${user.name} te ha asignado a la guardia del ${format(new Date(shift.date), 'dd/MM')} - ${shift.type}`,
        type: 'assignment',
        shift_id: shiftId
      });

      toast.success('Profesional asignado exitosamente');
      fetchShifts();
    } catch (error) {
      console.error("Error assigning doctor:", error);
      toast.error("Error al asignar profesional.");
    }
  };

  const handleCancel = async (shiftId: string) => {
    try {
        const { error } = await supabase
            .from('shifts')
            .update({ status: 'cancelled' })
            .eq('id', shiftId);

        if (error) throw error;
        
        toast.success('Publicación eliminada exitosamente');
        fetchShifts();
    } catch (error) {
        console.error("Error cancelling shift:", error);
        toast.error("Error al eliminar la publicación.");
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
            <ClinicShiftCard 
              key={shift.id} 
              shift={shift} 
              onAssign={handleAssign} 
              onCancel={() => handleCancel(shift.id)}
              onRefresh={fetchShifts}
              onOpenChat={(docId, docName) => setActiveChat({ shiftId: shift.id, receiverId: docId, receiverName: docName })}
            />
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
                  <input type="text" name="specialty" required placeholder="Ej: Pediatría, Kinesiología, Odontología..." className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requisitos del Profesional</label>
                  <textarea name="requirements" placeholder="Ej: Matrícula Nacional, Especialidad completa, Seguro de mala praxis..." className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2}></textarea>
                  <p className="text-xs text-gray-500 mt-1">Separe los requisitos con comas.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Equipamiento Disponible</label>
                  <textarea name="equipmentAvailable" placeholder="Ej: Ecógrafo portátil, Laboratorio 24hs, Rayos X..." className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2}></textarea>
                  <p className="text-xs text-gray-500 mt-1">Separe el equipamiento con comas.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datos de Contacto (Privado)</label>
                  <input type="text" name="contactPerson" placeholder="Ej: Dr. Juan Pérez (WhatsApp: 11-1234-5678)" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="text-xs text-gray-500 mt-1">Este dato solo será visible para el profesional una vez que lo asignes a la guardia.</p>
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

      {activeChat && (
        <ChatModal 
          shiftId={activeChat.shiftId}
          currentUserId={user.id}
          receiverId={activeChat.receiverId}
          receiverName={activeChat.receiverName}
          onClose={() => setActiveChat(null)}
        />
      )}
    </div>
  );
}

function ClinicShiftCard({ shift, onAssign, onCancel, onRefresh, onOpenChat }: { shift: Shift, onAssign: (shiftId: string, doctorId: string) => void, onCancel: () => void, onRefresh: () => void, onOpenChat: (docId: string, docName: string) => void }) {
  const isConfirmed = shift.status === 'confirmed' || shift.status === 'completed';
  const isCancelled = shift.status === 'cancelled';
  const [assignedDoctor, setAssignedDoctor] = useState<User | null>(null);

  if (isCancelled) return null; // Or render a cancelled state if preferred
  const [applicants, setApplicants] = useState<User[]>([]);

  const [ratingVal, setRatingVal] = useState(0);
  const [reviewTxt, setReviewTxt] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const submitRating = async () => {
    if (ratingVal === 0) {
      toast.error('Selecciona entre 1 y 5 estrellas.');
      return;
    }
    setSubmittingRating(true);
    try {
      const { error } = await supabase.from('shifts').update({
        rating_for_doctor: ratingVal,
        review_for_doctor: reviewTxt,
        status: 'completed'
      }).eq('id', shift.id);

      if (error) throw error;
      toast.success('¡Gracias por calificar al profesional!');
      onRefresh();
    } catch(err) {
      toast.error('Error al enviar la calificación.');
    } finally {
      setSubmittingRating(false);
    }
  };

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
                {isConfirmed ? 'Asignada' : 'Buscando Profesional'}
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
          {!isConfirmed && (
            <button 
                onClick={onCancel}
                className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors border border-transparent hover:border-red-200"
                title="Eliminar Guardia"
            >
                <XCircle className="w-5 h-5" />
            </button>
          )}
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
        </div>
      </div>

      {/* Applicants / Assigned Doctor */}
      <div className="p-6 md:w-1/2 bg-gray-50 flex flex-col">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" />
          {isConfirmed ? 'Profesional Asignado' : `Postulantes (${shift.applicants.length})`}
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
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-semibold text-gray-900">Estado de la Cobertura</h5>
                {(shift.status === 'confirmed' || shift.status === 'completed') && assignedDoctor && (
                  <button 
                    onClick={() => onOpenChat(assignedDoctor.id, assignedDoctor.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md font-medium transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat Directo
                  </button>
                )}
              </div>
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

            {/* Rating System */}
            {shift.status === 'completed' || (isConfirmed && new Date(shift.date) <= new Date()) ? (
              <div className="mt-4 p-4 bg-blue-50 bg-opacity-50 rounded-lg border border-blue-100">
                {shift.rating_for_doctor ? (
                   <div className="space-y-2">
                     <h5 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        Calificaste a este profesional
                     </h5>
                     <div className="flex gap-1">
                       {[1,2,3,4,5].map(star => (
                         <Star key={star} className={`w-4 h-4 ${star <= shift.rating_for_doctor! ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                       ))}
                     </div>
                     {shift.review_for_doctor && <p className="text-sm text-gray-700 italic border-l-2 border-yellow-300 pl-2 mt-2">{shift.review_for_doctor}</p>}
                   </div>
                ) : (
                  <div className="space-y-3">
                    <h5 className="font-semibold text-gray-900">Evalúa al profesional</h5>
                    <p className="text-xs text-gray-600">24hs después de la fecha de la guardia, puedes calificar el desempeño para mantener la calidad de la red.</p>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(star => (
                        <button key={star} onClick={() => setRatingVal(star)} className="focus:outline-none hover:scale-110 transition-transform">
                          <Star className={`w-6 h-6 ${star <= ratingVal ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`} />
                        </button>
                      ))}
                    </div>
                    <textarea 
                      placeholder="Deja un comentario sobre su desempeño (opcional)..." 
                      value={reviewTxt}
                      onChange={e => setReviewTxt(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                      rows={2}
                    />
                    <button 
                      onClick={submitRating}
                      disabled={submittingRating || ratingVal === 0}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {submittingRating ? 'Enviando...' : 'Enviar Calificación'}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
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
            <Users className="w-10 h-10 text-gray-300 mb-2" />
            <p className="font-medium text-gray-900">Aún no hay postulantes</p>
            <p className="text-sm mt-1 max-w-[250px]">
              Te notificaremos cuando un profesional se postule. Al aceptar a un profesional, le compartiremos tus datos para coordinar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
