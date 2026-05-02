import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ViewProfileModal from '../components/ViewProfileModal';
import ShiftCard from '../components/ShiftCard';
import { User, Shift, Transaction } from '../types';
import { format, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Calendar, Clock, DollarSign, CheckCircle2, ChevronRight, BriefcaseMedical, UserCircle, CalendarPlus, Filter, ExternalLink, Star, MessageSquare, Building2, XCircle, Wallet, TrendingUp, ArrowUpRight, History } from 'lucide-react';
import { toast } from 'sonner';
import { cn, areShiftsOverlapping } from '../lib/utils';
import ChatModal from '../components/ChatModal';
import { Skeleton, ShiftCardSkeleton } from '../components/Skeleton';

interface DoctorDashboardProps {
  user: User;
}

export default function DoctorDashboard({ user }: DoctorDashboardProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<{ shiftId: string; receiverId: string; receiverName: string } | null>(null);
  const [viewedProfileData, setViewedProfileData] = useState<User | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dismissedShiftIds, setDismissedShiftIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(`dismissed_shifts_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    fetchShifts();
    fetchWalletBalance();
    
    // Subscribe to shifts relevant to this doctor
    const channel = supabase
      .channel(`shifts-doctor-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shifts' },
        () => {
          fetchShifts();
          fetchWalletBalance();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const fetchWalletBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('total_payment')
        .eq('assigned_doctor_id', user.id)
        .eq('payment_status', 'paid');
      
      if (error) throw error;
      
      const total = (data || []).reduce((acc, curr) => acc + (curr.total_payment || 0), 0);
      setWalletBalance(total);
    } catch (err) {
      console.error('Error fetching wallet balance:', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTransactions(data as Transaction[]);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  useEffect(() => {
    if (showHistory) {
      fetchTransactions();
    }
  }, [showHistory]);

  const fetchShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      // Filter only shifts relevant to me
      const now = new Date();
      const myData = (data as Shift[]).filter(s => {
        // Ignorar si el usuario eligió ocultarla
        if (dismissedShiftIds.includes(s.id)) return false;

        const shiftDate = new Date(s.date);
        const [startH, startM] = (s.start_time || "00:00").split(':').map(Number);
        const [endH, endM] = (s.end_time || "23:59").split(':').map(Number);
        
        const shiftStart = new Date(s.date);
        shiftStart.setHours(startH, startM, 0, 0);
        
        const shiftEnd = new Date(s.date);
        shiftEnd.setHours(endH, endM, 0, 0);

        const isAssigned = s.assigned_doctor_id === user.id;
        const isPast = shiftStart < now;
        
        // Si la guardia ya pasó
        if (isPast) {
          // Si no soy el asignado, desaparece
          if (!isAssigned) return false;
          // Si soy el asignado, la dejo 24hs más para que la califique
          const hoursSinceEnd = (now.getTime() - shiftEnd.getTime()) / (1000 * 60 * 60);
          if (hoursSinceEnd > 24) return false;
        }

        if (['confirmed', 'completed', 'noshow', 'cancelled_by_clinic'].includes(s.status)) {
          return isAssigned;
        }
        return s.applicants.includes(user.id) || isAssigned;
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
      const newConfirmed = (shift.confirmed_applicants || []).filter(id => id !== user.id);
      
      const updatePayload: any = { 
        applicants: newApplicants,
        confirmed_applicants: newConfirmed
      };
      
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

  const handleConfirmApplication = async (shiftId: string) => {
    try {
      const shift = shifts.find(s => s.id === shiftId);
      if (!shift) return;

      const confirmed = shift.confirmed_applicants || [];
      if (confirmed.includes(user.id)) return;

      const { error } = await supabase
        .from('shifts')
        .update({
          confirmed_applicants: [...confirmed, user.id]
        })
        .eq('id', shiftId);

      if (error) throw error;
      
      // Notify clinic that doctor confirmed
      await supabase.from('notifications').insert({
        user_id: shift.clinic_id,
        title: 'Postulación Confirmada',
        message: `El Dr. ${user.name} ha confirmado su interés oficial en tu guardia de ${shift.specialty}. Ya podés asignarle la cobertura.`,
        type: 'application',
        shift_id: shiftId
      });

      toast.success('¡Postulación confirmada oficialmente!');
      fetchShifts();
    } catch (error: any) {
      console.error("Error confirming application:", error);
      toast.error(`Error: ${error.message || "No se pudo confirmar la postulación"}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-10 w-24 rounded-2xl" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          <ShiftCardSkeleton />
          <ShiftCardSkeleton />
          <ShiftCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto px-4 sm:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Mis Postulaciones</h1>
            <p className="text-gray-500 mt-1 font-medium">Gestioná tus guardias de forma centralizada.</p>
          </div>
          <div className="bg-blue-50 px-4 py-2 rounded-2xl flex items-center gap-2 self-start md:self-center">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="text-blue-700 font-black tracking-tight">{shifts.length} activas</span>
          </div>
        </div>

        {/* Wallet Wallet Card */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet className="w-24 h-24 rotate-12" />
            </div>
            <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold tracking-wider uppercase border border-white/10">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        Fintech Médica
                    </div>
                </div>
                <div>
                    <p className="text-slate-400 text-sm font-medium">Billetera de Liquidación</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tight">$ {walletBalance.toLocaleString('es-AR')}</span>
                        <span className="text-xs text-green-400 font-bold bg-green-400/10 px-2 py-0.5 rounded">ARS</span>
                    </div>
                </div>
                <div className="pt-2 flex gap-3">
                    <button className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20">
                        <ArrowUpRight className="w-4 h-4" />
                        Retirar Dinero
                    </button>
                    <button 
                      onClick={() => setShowHistory(true)}
                      className="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/5" 
                      title="Ver Historial"
                    >
                        <History className="w-5 h-5" />
                    </button>
                </div>
            </div>
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
              onConfirmApplication={() => handleConfirmApplication(shift.id)}
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

      {showHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
                  <History className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Historial de Pagos</h2>
                  <p className="text-xs text-gray-500 font-medium">Billetera Express • Fintech Médica</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <XCircle className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {transactions.length > 0 ? (
                transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-blue-100 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        tx.type === 'credit' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                      )}>
                        {tx.type === 'credit' ? <ArrowUpRight className="w-5 h-5" /> : <ChevronRight className="w-5 h-5 rotate-90" />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{tx.description}</p>
                        <p className="text-[11px] text-gray-500">{format(new Date(tx.created_at), "d 'de' MMMM, HH:mm", { locale: es })}h</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-black text-sm",
                        tx.type === 'credit' ? "text-green-600" : "text-red-600"
                      )}>
                        {tx.type === 'credit' ? '+' : '-'}${tx.amount.toLocaleString('es-AR')}
                      </p>
                      <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase">
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                   <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 shadow-inner">
                      <History className="w-8 h-8 text-gray-300" />
                   </div>
                   <p className="text-gray-500 font-medium">Aún no tenés movimientos registrados.</p>
                   <p className="text-xs text-gray-400 mt-1">Tus guardias liquidadas aparecerán acá.</p>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
              <button 
                onClick={() => setShowHistory(false)}
                className="text-blue-600 font-bold text-sm hover:underline"
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
