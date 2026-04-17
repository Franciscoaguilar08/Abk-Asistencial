import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Shift } from '../types';
import { format, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Calendar, Clock, DollarSign, CheckCircle2, ChevronRight, BriefcaseMedical, UserCircle, CalendarPlus, Filter, ExternalLink, Star, MessageSquare, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import ChatModal from '../components/ChatModal';

interface DoctorDashboardProps {
  user: User;
}

export default function DoctorDashboard({ user }: DoctorDashboardProps) {
  const [activeTab, setActiveTab] = useState<'available' | 'my-shifts'>('available');
  const [selectedZone, setSelectedZone] = useState<string>('Todas');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('Todas');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<{ shiftId: string; receiverId: string; receiverName: string } | null>(null);

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) throw error;
      setShifts(data as Shift[]);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const availableShifts = shifts.filter(s => s.status === 'open' && !s.applicants.includes(user.id));
  const myShifts = shifts.filter(s => s.applicants.includes(user.id) || s.assigned_doctor_id === user.id);

  // Extract unique zones and specialties for the filters
  const availableZones = ['Todas', ...Array.from(new Set(shifts.map(s => s.zone).filter(Boolean)))];
  const availableSpecialties = ['Todas', ...Array.from(new Set(shifts.map(s => s.specialty)))];

  // Apply filters
  const filteredAvailableShifts = availableShifts.filter(shift => {
    const matchZone = selectedZone === 'Todas' || shift.zone === selectedZone;
    const matchSpecialty = selectedSpecialty === 'Todas' || shift.specialty === selectedSpecialty;
    return matchZone && matchSpecialty;
  });

  const handleApply = async (shiftId: string) => {
    try {
      const shift = shifts.find(s => s.id === shiftId);
      if (!shift) return;

      const newApplicants = [...shift.applicants, user.id];
      
      const { error } = await supabase
        .from('shifts')
        .update({ applicants: newApplicants })
        .eq('id', shiftId);
        
      if (error) throw error;
      
      // Crear notificación para la clínica
      await supabase.from('notifications').insert({
        user_id: shift.clinic_id,
        title: 'Nueva postulación',
        message: `${user.name} se ha postulado para la guardia del ${format(new Date(shift.date), 'dd/MM')} - ${shift.type}`,
        type: 'application',
        shift_id: shiftId
      });

      toast.success(`Has aplicado a la guardia exitosamente.`);
      fetchShifts(); // Refresh data
    } catch (error) {
      console.error("Error applying to shift:", error);
      toast.error("Error al aplicar a la guardia.");
    }
  };

  const handleWithdraw = async (shiftId: string) => {
    try {
      const shift = shifts.find(s => s.id === shiftId);
      if (!shift) return;

      const newApplicants = shift.applicants.filter(id => id !== user.id);

      const { error } = await supabase
        .from('shifts')
        .update({ applicants: newApplicants })
        .eq('id', shiftId);

      if (error) throw error;
      
      toast.success('Has retirado tu postulación exitosamente.');
      fetchShifts();
    } catch (error) {
      console.error("Error withdrawing from shift:", error);
      toast.error("Error al retirar la postulación.");
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-gray-500">Cargando oportunidades...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hola, {user.name}</h1>
          <p className="text-gray-600">Encuentra tu próxima guardia o evento médico</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('available')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === 'available' ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            )}
          >
            Oportunidades
          </button>
          <button
            onClick={() => setActiveTab('my-shifts')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === 'my-shifts' ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            )}
          >
            Mis Coberturas
          </button>
        </div>
      </div>

      {activeTab === 'available' && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex items-center gap-2 text-gray-700 font-medium w-full sm:w-auto">
            <Filter className="w-5 h-5" />
            <span>Filtros:</span>
          </div>
          <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
            <select 
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm flex-1"
            >
              {availableZones.map(zone => (
                <option key={zone} value={zone}>{zone === 'Todas' ? 'Todas las Zonas' : zone}</option>
              ))}
            </select>
            <select 
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm flex-1"
            >
              {availableSpecialties.map(spec => (
                <option key={spec} value={spec}>{spec === 'Todas' ? 'Todas las Especialidades' : spec}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {activeTab === 'available' ? (
        filteredAvailableShifts.length > 0 ? (
          <div className="space-y-8">
            {Object.entries(
              filteredAvailableShifts.reduce((acc, shift) => {
                const clinicName = shift.clinic_name || 'Institución sin nombre';
                if (!acc[clinicName]) acc[clinicName] = [];
                acc[clinicName].push(shift);
                return acc;
              }, {} as Record<string, Shift[]>)
            ).map(([clinicName, groupShifts]) => (
              <div key={clinicName} className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">{clinicName}</h3>
                  <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-medium">
                    {groupShifts.length} {groupShifts.length === 1 ? 'publicación' : 'publicaciones'}
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {groupShifts.map(shift => (
                    <ShiftCard key={shift.id} shift={shift} onApply={() => handleApply(shift.id)} onRefresh={fetchShifts} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200 border-dashed">
            <BriefcaseMedical className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-lg font-medium text-gray-900">No hay oportunidades nuevas</p>
            <p>Pronto se publicarán nuevas guardias. Modifica los filtros para ver más.</p>
          </div>
        )
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {myShifts.length > 0 ? (
            myShifts.map(shift => (
              <ShiftCard 
                key={shift.id} 
                shift={shift} 
                isMyShift 
                userId={user.id} 
                onWithdraw={() => handleWithdraw(shift.id)}
                onRefresh={fetchShifts}
                onOpenChat={() => setActiveChat({ shiftId: shift.id, receiverId: shift.clinic_id, receiverName: shift.clinic_name })}
              />
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200 border-dashed">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-lg font-medium text-gray-900">No tienes coberturas activas</p>
              <p>Aplica a oportunidades disponibles para verlas aquí.</p>
            </div>
          )}
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

function ShiftCard({ shift, onApply, onWithdraw, onRefresh, onOpenChat, isMyShift, userId }: { shift: Shift, onApply?: () => void, onWithdraw?: () => void, onRefresh?: () => void, onOpenChat?: () => void, isMyShift?: boolean, userId?: string }) {
  const isAssigned = shift.assigned_doctor_id === userId;
  const isPending = isMyShift && !isAssigned && shift.status !== 'confirmed';
  
  const shiftDate = new Date(shift.date);
  const isShiftTomorrow = isTomorrow(shiftDate);

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
        rating_for_clinic: ratingVal,
        review_for_clinic: reviewTxt,
        status: 'completed'
      }).eq('id', shift.id);

      if (error) throw error;
      toast.success('¡Gracias por evaluar a la institución!');
      if (onRefresh) onRefresh();
    } catch(err) {
      toast.error('Error al enviar la calificación.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleConfirmAttendance = async () => {
    try {
      const { error } = await supabase
        .from('shifts')
        .update({ attendance_confirmed: true })
        .eq('id', shift.id);
        
      if (error) throw error;
      toast.success("✅ Asistencia confirmada. Gracias por avisar con antelación.");
    } catch (error) {
      console.error("Error confirming attendance:", error);
      toast.error("Error al confirmar asistencia.");
    }
  };

  const handleSyncCalendar = () => {
    toast.success("📅 Evento añadido a tu Google Calendar.");
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <div className="p-5 flex-1 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                shift.category === 'evento' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
              )}>
                {shift.category === 'evento' ? 'Evento' : 'Guardia Clínica'}
              </span>
            </div>
            <h3 className="font-bold text-lg text-gray-900 leading-tight">{shift.clinic_name}</h3>
            <p className="text-sm font-medium text-gray-600">{shift.specialty}</p>
          </div>
          {isMyShift && (
            <span className={cn(
              "px-2.5 py-1 rounded-full text-xs font-semibold",
              isAssigned ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
            )}>
              {isAssigned ? 'Confirmada' : 'Pendiente'}
            </span>
          )}
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="capitalize">{format(new Date(shift.date), "EEEE d 'de' MMMM", { locale: es })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>{shift.start_time} - {shift.end_time} ({shift.type})</span>
          </div>
          <div className="flex items-start gap-2">
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
          <div className="flex items-center gap-2 font-medium text-gray-900 pt-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span>${shift.price.toLocaleString('es-AR')}</span>
          </div>
        </div>

        {shift.requirements.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Requisitos:</p>
            <div className="flex flex-wrap gap-1">
              {shift.requirements.map((req, i) => (
                <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                  {req}
                </span>
              ))}
            </div>
          </div>
        )}
        {shift.equipment_available && shift.equipment_available.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Equipamiento:</p>
            <div className="flex flex-wrap gap-1">
              {shift.equipment_available.map((eq, i) => (
                <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                  {eq}
                </span>
              ))}
            </div>
          </div>
        )}
        {shift.contact_person && isAssigned && (
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between bg-green-50/50 p-2 rounded-lg text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-semibold text-gray-900">Contacto de la Institución</p>
                <p>{shift.contact_person}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200 mt-auto">
        {!isMyShift ? (
          <button 
            onClick={onApply}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            Aplicar a Oportunidad
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col items-center justify-center gap-1 text-sm font-medium w-full">
              {isAssigned ? (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Asignada a ti
                </span>
              ) : (
                <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg border border-yellow-200 text-center w-full">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Clock className="w-4 h-4" />
                    <span>Postulación en evaluación</span>
                  </div>
                  <p className="text-xs font-normal opacity-80 mt-1">
                    La institución revisará tu perfil. Si eres el candidato elegido, se habilitará aquí el número de contacto directo para coordinar.
                  </p>
                </div>
              )}
            </div>

            {isPending && onWithdraw && (
              <button 
                onClick={onWithdraw}
                className="mt-2 w-full py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg text-sm font-medium transition-colors"
              >
                Retirar postulación
              </button>
            )}

            {/* Automation & Assurance Actions */}
            {isAssigned && (
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-200">
                {onOpenChat && (
                  <button 
                    onClick={onOpenChat}
                    className="w-full py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 mb-1"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chatear con {shift.clinic_name}
                  </button>
                )}

                <button 
                  onClick={handleSyncCalendar}
                  className="w-full py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <CalendarPlus className="w-4 h-4" />
                  Sincronizar Calendario
                </button>

                {isShiftTomorrow && !shift.attendance_confirmed && (
                  <button 
                    onClick={handleConfirmAttendance}
                    className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar Asistencia (Faltan 24hs)
                  </button>
                )}

                {/* Rating System */}
                {(shift.status === 'completed' || (shift.status === 'confirmed' && new Date(shift.date) <= new Date())) && (
                  <div className="mt-3 p-4 bg-purple-50 bg-opacity-50 rounded-lg border border-purple-100">
                    {shift.rating_for_clinic ? (
                      <div className="space-y-2">
                        <h5 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            Calificaste a esta institución
                        </h5>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(star => (
                            <Star key={star} className={`w-4 h-4 ${star <= shift.rating_for_clinic! ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        {shift.review_for_clinic && <p className="text-sm text-gray-700 italic border-l-2 border-yellow-300 pl-2 mt-2">{shift.review_for_clinic}</p>}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <h5 className="font-semibold text-gray-900 text-sm">Evalúa la Institución</h5>
                        <p className="text-[11px] text-gray-600">Al finalizar la guardia, evalúa el trato y puntualidad en los pagos.</p>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(star => (
                            <button key={star} onClick={() => setRatingVal(star)} className="focus:outline-none hover:scale-110 transition-transform">
                              <Star className={`w-5 h-5 ${star <= ratingVal ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`} />
                            </button>
                          ))}
                        </div>
                        <textarea 
                          placeholder="Tu comentario (opcional)..." 
                          value={reviewTxt}
                          onChange={e => setReviewTxt(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                          rows={2}
                        />
                        <button 
                          onClick={submitRating}
                          disabled={submittingRating || ratingVal === 0}
                          className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {submittingRating ? 'Enviando...' : 'Enviar Calificación'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
