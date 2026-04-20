import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ViewProfileModal from '../components/ViewProfileModal';
import ShiftCard from '../components/ShiftCard';
import { User, Shift } from '../types';
import { format, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Calendar, Clock, DollarSign, CheckCircle2, ChevronRight, BriefcaseMedical, UserCircle, CalendarPlus, Filter, ExternalLink, Star, MessageSquare, Building2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn, areShiftsOverlapping } from '../lib/utils';
import ChatModal from '../components/ChatModal';

interface DoctorDashboardProps {
  user: User;
}

export default function DoctorDashboard({ user }: DoctorDashboardProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<{ shiftId: string; receiverId: string; receiverName: string } | null>(null);
  const [viewedProfileData, setViewedProfileData] = useState<User | null>(null);
  const [dismissedShiftIds, setDismissedShiftIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(`dismissed_shifts_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    fetchShifts();
    
    // Subscribe to shifts relevant to this doctor
    const channel = supabase
      .channel(`shifts-doctor-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shifts' },
        () => {
          fetchShifts();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const fetchShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      // Filter only shifts relevant to me
      const myData = (data as Shift[]).filter(s => {
        // Ignorar si el usuario eligió ocultarla
        if (dismissedShiftIds.includes(s.id)) return false;

        if (['confirmed', 'completed', 'noshow', 'cancelled_by_clinic'].includes(s.status)) {
          return s.assigned_doctor_id === user.id;
        }
        return s.applicants.includes(user.id) || s.assigned_doctor_id === user.id;
      });

      setShifts(myData);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissShift = (shiftId: string) => {
    const newDismissed = [...dismissedShiftIds, shiftId];
    setDismissedShiftIds(newDismissed);
    localStorage.setItem(`dismissed_shifts_${user.id}`, JSON.stringify(newDismissed));
    setShifts(prev => prev.filter(s => s.id !== shiftId));
    toast.success('Evento quitado de tu lista principal.');
  };

  const fetchProfileData = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
      if (error) throw error;
      setViewedProfileData(data as User);
    } catch (err) {
      toast.error('No se pudo cargar el perfil');
    }
  };

  const handleWithdraw = async (shiftId: string) => {
    try {
      const shift = shifts.find(s => s.id === shiftId);
      if (!shift) return;

      const newApplicants = shift.applicants.filter(id => id !== user.id);
      
      const updatePayload: any = { applicants: newApplicants };
      
      if (shift.applicant_proposals && shift.applicant_proposals[user.id]) {
        const newProposals = { ...shift.applicant_proposals };
        delete newProposals[user.id];
        updatePayload.applicant_proposals = newProposals;
      }

      const { error } = await supabase
        .from('shifts')
        .update(updatePayload)
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
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Mis Coberturas</h1>
          <p className="text-gray-500 mt-1 font-medium">Hacé el seguimiento de tus postulaciones y guardias asignadas.</p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-2xl flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span className="text-blue-700 font-black tracking-tight">{shifts.length} activas</span>
        </div>
      </div>

      {user.verification_status !== 'verified' && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-black text-amber-900 text-lg">Perfil en Revisión</h3>
            <p className="text-amber-700 mt-0.5 font-medium leading-relaxed">
              Tu cuenta está en proceso de certificación. Las instituciones pueden ver tu interés, 
              pero la asignación definitiva se habilitará una vez que validemos tu documentación.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {shifts.length > 0 ? (
          shifts.map(shift => (
            <ShiftCard 
              key={shift.id} 
              shift={shift} 
              userRole="doctor"
              isMyShift 
              userId={user.id} 
              userVerificationStatus={user.verification_status}
              onWithdraw={() => handleWithdraw(shift.id)}
              onDelete={() => handleDismissShift(shift.id)}
              onRefresh={fetchShifts}
              onOpenChat={() => setActiveChat({ shiftId: shift.id, receiverId: shift.clinic_id, receiverName: shift.clinic_name })}
              onViewProfile={() => fetchProfileData(shift.clinic_id)}
            />
          ))
        ) : (
          <div className="col-span-full py-24 text-center text-gray-500 bg-white rounded-3xl border-2 border-dashed border-gray-100">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-2xl font-black text-gray-900 tracking-tight">No tenés coberturas activas</p>
            <p className="mt-2 text-gray-500 max-w-sm mx-auto font-medium">Navegá al Feed de la Red para encontrar nuevas oportunidades y postularte.</p>
          </div>
        )}
      </div>

      {viewedProfileData && (
        <ViewProfileModal user={viewedProfileData} onClose={() => setViewedProfileData(null)} />
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
