import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Shift } from '../types';
import { format, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  MapPin, Calendar, Clock, DollarSign, CheckCircle2, ChevronRight, 
  UserCircle, ExternalLink, Star, MessageSquare, XCircle, BriefcaseMedical 
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface ShiftCardProps {
  shift: Shift;
  onApply?: () => void;
  onWithdraw?: () => void;
  onConfirmApplication?: () => void;
  onRefresh?: () => void;
  onOpenChat?: () => void;
  onNegotiate?: () => void;
  onViewProfile?: () => void;
  isMyShift?: boolean;
  userId?: string;
  userRole?: 'doctor' | 'clinic';
  userVerificationStatus?: string;
  onDelete?: () => void;
}

export default function ShiftCard({ 
  shift, 
  onApply, 
  onWithdraw, 
  onConfirmApplication,
  onRefresh, 
  onOpenChat, 
  onNegotiate, 
  onViewProfile, 
  onDelete,
  isMyShift, 
  userId, 
  userRole = 'doctor',
  userVerificationStatus 
}: ShiftCardProps) {
  const isVerified = userVerificationStatus === 'verified';
  const isAssigned = shift.assigned_doctor_id === userId;
  const isTerminal = shift.status === 'completed' || shift.status === 'noshow' || shift.status === 'cancelled_by_clinic';
  
  const shiftDate = new Date(shift.date);
  const [startHour, startMinute] = (shift.start_time || "00:00").split(':').map(Number);
  const shiftFullDate = new Date(shift.date);
  shiftFullDate.setHours(startHour, startMinute, 0, 0);
  
  const isShiftTomorrow = isTomorrow(shiftDate);

  const hoursUntilShift = (shiftFullDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
  const canWithdraw = hoursUntilShift > 24;

  const [ratingVal, setRatingVal] = useState(0);
  const [reviewTxt, setReviewTxt] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [localConfirmed, setLocalConfirmed] = useState(false);

  const isConfirmedApplication = localConfirmed || shift.confirmed_applicants?.includes(userId || '');

  const handleConfirmApplication = async () => {
    if (!onConfirmApplication) return;
    setLocalConfirmed(true);
    setIsConfirming(true);
    try {
      await onConfirmApplication();
    } catch (error) {
      setLocalConfirmed(false);
      throw error;
    } finally {
      setIsConfirming(false);
    }
  };

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
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error confirming attendance:", error);
      toast.error("Error al confirmar asistencia.");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full">
      <div className="p-5 flex-1 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                shift.category === 'evento' ? "bg-purple-100 text-purple-700" : 
                shift.category === 'empleo' ? "bg-green-100 text-green-700" :
                shift.category === 'suplencia' ? "bg-orange-100 text-orange-700" :
                "bg-blue-100 text-blue-700"
              )}>
                {shift.category === 'evento' ? 'Evento' : 
                 shift.category === 'empleo' ? 'Empleo' :
                 shift.category === 'suplencia' ? 'Suplencia' :
                 'Guardia Clínica'}
              </span>
              {shift.job_duration && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wider">
                  {shift.job_duration === 'tiempo_completo' ? 'Tiempo Completo' :
                   shift.job_duration === 'semanal' ? 'Semanal' :
                   shift.job_duration === '3_meses' ? '3 Meses' : 'Fijo/Temporal'}
                </span>
              )}
            </div>
            <button onClick={onViewProfile} className="text-left group mb-1 block">
              <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors leading-tight flex items-center gap-1">
                {shift.clinic_name}
                <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
            </button>
            <p className="text-sm font-medium text-gray-600">{shift.specialty}</p>
          </div>
          {isMyShift && userRole === 'doctor' && (
            <div className="flex flex-col items-end gap-2">
              <span className={cn(
                "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
                shift.status === 'noshow' ? "bg-red-100 text-red-700" :
                shift.status === 'cancelled_by_clinic' ? "bg-orange-100 text-orange-700" :
                isAssigned ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
              )}>
                {shift.status === 'noshow' ? 'Ausencia' : 
                shift.status === 'cancelled_by_clinic' ? 'Cancelada por Clínica' :
                isAssigned ? 'Confirmada' : 'Pendiente'}
              </span>
              {isTerminal && onDelete && (
                <button 
                  onClick={onDelete}
                  className="p-1 px-2 text-[10px] font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-all flex items-center gap-1"
                  title="Quitar de mi vista"
                >
                  <XCircle className="w-3 h-3" />
                  Quitar
                </button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          {shift.description && (
            <div className="bg-blue-50/30 p-3 rounded-lg border border-blue-100 text-gray-900 text-sm mb-2 leading-relaxed">
              {shift.description}
            </div>
          )}
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
            <span>${shift.price.toLocaleString('es-AR')} {shift.is_negotiable && <span className="text-xs text-gray-500 font-normal ml-1">(Apto a negociar)</span>}</span>
          </div>
          {isMyShift && userRole === 'doctor' && shift.applicant_proposals?.[userId!] && (
            <div className="flex items-center gap-2 font-medium pt-1">
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                Tu oferta: ${shift.applicant_proposals[userId!].toLocaleString('es-AR')}
              </span>
            </div>
          )}
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
        {shift.contact_person && isAssigned && userRole === 'doctor' && (
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
        {userRole === 'doctor' ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col items-center justify-center gap-1 text-sm font-medium w-full">
              {shift.status === 'noshow' ? (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-center w-full">
                  <p className="font-bold">Inasistencia registrada</p>
                  <p className="text-xs font-normal opacity-80 mt-1">
                    Esta guardia se marcó como inasistencia. Esto afecta tu porcentaje de cumplimiento.
                  </p>
                </div>
              ) : shift.status === 'cancelled_by_clinic' ? (
                <div className="bg-orange-50 text-orange-700 p-3 rounded-lg border border-orange-200 text-center w-full">
                  <p className="font-bold">Cancelada por la institución</p>
                  <p className="text-xs font-normal opacity-80 mt-1">
                    La clínica canceló esta guardia después de confirmarte.
                  </p>
                </div>
              ) : isAssigned ? (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Asignada a ti
                </span>
              ) : isConfirmedApplication ? (
                <div className="bg-green-50 text-green-700 p-3 rounded-lg border border-green-200 text-center w-full animate-in fade-in zoom-in-95 duration-300">
                   <div className="flex items-center justify-center gap-2 mb-1">
                     <CheckCircle2 className="w-4 h-4" />
                     <span className="font-bold">Postulación Confirmada</span>
                   </div>
                   <p className="text-[11px] font-medium opacity-80">
                     Tu perfil ha sido enviado oficialmente y está siendo revisado por la institución.
                   </p>
                </div>
              ) : (
                <div className="w-full space-y-2">
                  {!isMyShift ? (
                    /* Initial postulation button in Feed */
                    <button 
                      onClick={onApply}
                      disabled={!isVerified}
                      className={cn(
                        "w-full py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm",
                        isVerified 
                          ? "bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]" 
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      )}
                    >
                      <BriefcaseMedical className="w-4 h-4" />
                      Postular
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    /* Confirmation button in Dashboard */
                    <button 
                      onClick={handleConfirmApplication}
                      disabled={isConfirming}
                      className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 active:scale-[0.98] text-white rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                    >
                      {isConfirming ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Confirmando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Confirmar Postulación
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            {isMyShift && onWithdraw && !isAssigned && shift.status === 'open' && (
              <div className="mt-1 w-full">
                {!canWithdraw && (
                  <p className="text-[10px] text-red-500 text-center mb-1 font-medium italic">
                    {hoursUntilShift > 0 
                      ? `No puedes retirar tu postulación faltando menos de 24hs (faltan ${Math.floor(hoursUntilShift)}hs)`
                      : "La guardia ya ha comenzado"
                    }
                  </p>
                )}
                <button 
                  onClick={() => setIsWithdrawModalOpen(true)}
                  disabled={!canWithdraw}
                  className={cn(
                    "w-full py-2 bg-white border rounded-lg text-sm font-medium transition-colors",
                    canWithdraw 
                      ? "border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200"
                      : "border-gray-100 text-gray-400 cursor-not-allowed"
                  )}
                >
                  {canWithdraw 
                    ? 'Retirar postulación' 
                    : hoursUntilShift > 0 
                      ? `Retiro bloqueado (faltan ${Math.floor(hoursUntilShift)}hs)`
                      : 'Retiro bloqueado'
                  }
                </button>
              </div>
            )}

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

                  {isShiftTomorrow && !shift.attendance_confirmed && (
                    <button 
                      onClick={handleConfirmAttendance}
                      className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmar Asistencia (Faltan 24hs)
                    </button>
                  )}

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
        ) : (
          /* Clinic Marketplace View - No Apply button, just info */
          <div className="py-2 text-center text-gray-500 italic">
            <p className="text-xs font-medium">Vista de referencia institucional</p>
          </div>
        )}
      </div>

      {isWithdrawModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">¿Estás seguro?</h3>
            <p className="text-gray-600 text-sm mb-6">
              Estás a punto de retirar tu postulación para <strong>{shift.specialty}</strong> en <strong>{shift.clinic_name}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setIsWithdrawModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200"
              >
                No, mantener
              </button>
              <button 
                onClick={() => {
                  setIsWithdrawModalOpen(false);
                  onWithdraw?.();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
              >
                Sí, retirar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
