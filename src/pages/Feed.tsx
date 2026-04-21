import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Shift } from '../types';
import ViewProfileModal from '../components/ViewProfileModal';
import ShiftCard from '../components/ShiftCard';
import { 
  Globe, Filter, Search, Building2, BriefcaseMedical, 
  LayoutDashboard, TrendingUp, Sparkles, XCircle, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import ChatModal from '../components/ChatModal';

interface FeedProps {
  user: User;
}

export default function Feed({ user }: FeedProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<{ shiftId: string; receiverId: string; receiverName: string } | null>(null);
  const [viewedProfileData, setViewedProfileData] = useState<User | null>(null);
  
  // States for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState('Todas');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedSpecialty, setSelectedSpecialty] = useState('Todas');

  const [negotiatingShiftId, setNegotiatingShiftId] = useState<string | null>(null);
  const [proposedPrice, setProposedPrice] = useState<string>('');

  useEffect(() => {
    fetchShifts();
    
    const channel = supabase
      .channel('feed-shifts-changes')
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
  }, []);

  const fetchShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('status', 'open')
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      // Filter out past shifts from feed
      const now = new Date();
      const openAndFuture = (data as Shift[]).filter(s => {
        const [h, m] = (s.start_time || "00:00").split(':').map(Number);
        const shiftStart = new Date(s.date);
        shiftStart.setHours(h, m, 0, 0);
        return shiftStart > now;
      });

      setShifts(openAndFuture);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    } finally {
      setLoading(false);
    }
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

  const handleApply = async (shiftId: string, customPrice?: number) => {
    try {
      if (user.verification_status !== 'verified') {
        toast.error('Tu cuenta está en proceso de verificación. No puedes postularte aún.');
        return;
      }

      const shift = shifts.find(s => s.id === shiftId);
      if (!shift) return;

      if (shift.applicants.includes(user.id)) {
        toast.error('Ya te has postulado a esta oportunidad');
        return;
      }

      const newApplicants = [...shift.applicants, user.id];
      const newProposals = { ...(shift.applicant_proposals || {}) };
      
      if (customPrice) {
        newProposals[user.id] = customPrice;
      }

      const { error } = await supabase
        .from('shifts')
        .update({ 
          applicants: newApplicants,
          applicant_proposals: newProposals
        })
        .eq('id', shiftId);

      if (error) throw error;

      // Create notification for clinic
      await supabase.from('notifications').insert({
        user_id: shift.clinic_id,
        title: 'Nueva Postulación',
        message: `El Dr. ${user.name} se ha postulado para la guardia de ${shift.specialty}.`,
        type: 'application',
        shift_id: shiftId
      });

      toast.success(customPrice ? 'Oferta enviada. No olvides CONFIRMARLA desde tu panel para que sea oficial.' : 'Interés enviado. No olvides CONFIRMAR la postulación desde tu panel.');
      setNegotiatingShiftId(null);
      fetchShifts();
    } catch (error) {
      toast.error('Error al enviar la postulación');
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
      toast.success('¡Postulación confirmada oficialmente!');
      fetchShifts();
    } catch (error: any) {
      console.error("Error confirming application:", error);
      toast.error(`Error: ${error.message || "No se pudo confirmar la postulación"}`);
    }
  };

  // Filter logic
  const filteredShifts = shifts.filter(s => {
    const matchesSearch = s.clinic_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesZone = selectedZone === 'Todas' || s.zone === selectedZone;
    const matchesCategory = selectedCategory === 'Todas' || s.category === selectedCategory;
    const matchesSpecialty = selectedSpecialty === 'Todas' || s.specialty === selectedSpecialty;
    
    // Professionals don't see shifts they already applied to in the "feed" to avoid clutter?
    // User requested "un lugar común", usually as a professional you want to see what's new.
    // If I already applied, I might still want to see it but marked. 
    // For now let's keep it simple: show all open shifts.
    return matchesSearch && matchesZone && matchesCategory && matchesSpecialty;
  });

  const availableZones = ['Todas', ...Array.from(new Set(shifts.map(s => s.zone).filter(Boolean)))];
  const availableSpecialties = ['Todas', ...Array.from(new Set(shifts.map(s => s.specialty)))];

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Actualizando el feed de la red...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto px-4 sm:px-6">
      {/* Feed Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-200">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Globe className="w-48 h-48" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-blue-100 font-bold mb-2 uppercase tracking-widest text-xs">
            <Sparkles className="w-4 h-4" />
            Red ABK en Tiempo Real
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Oportunidades de la Red</h1>
          <p className="text-blue-100 max-w-xl text-lg font-medium opacity-90 leading-relaxed">
            Descubrí y conectá con instituciones líderes. Todas las ofertas de la comunidad en un solo lugar.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sticky top-[72px] z-30 transition-all hover:shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative col-span-1 md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
            />
          </div>
          <select 
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
          >
            {availableSpecialties.map(s => <option key={s} value={s}>{s === 'Todas' ? 'Todas las Especialidades' : s}</option>)}
          </select>
          <select 
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
          >
            {availableZones.map(z => <option key={z} value={z}>{z === 'Todas' ? 'Todas las Zonas' : z}</option>)}
          </select>
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
          >
            <option value="Todas">Todas las Categorías</option>
            <option value="guardia">Guardia</option>
            <option value="evento">Evento</option>
            <option value="empleo">Empleo</option>
            <option value="suplencia">Suplencia</option>
          </select>
        </div>
      </div>

      {/* Grouped Feed Content */}
      {filteredShifts.length > 0 ? (
        <div className="space-y-12 pb-12">
          {Object.entries(
            filteredShifts.reduce((acc, shift) => {
              const clinicId = shift.clinic_id || 'unknown';
              if (!acc[clinicId]) acc[clinicId] = [];
              acc[clinicId].push(shift);
              return acc;
            }, {} as Record<string, Shift[]>)
          ).map(([clinicId, groupShifts]) => {
            const clinicName = groupShifts[0].clinic_name || 'Institución';
            const isMultiple = groupShifts.length > 1;
            
            return (
              <div key={clinicId} className="group animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-100 transition-transform group-hover:rotate-3">
                      <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 leading-tight">{clinicName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                          {groupShifts.length} {groupShifts.length === 1 ? 'Oportunidad' : 'Oportunidades'}
                        </span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span className="text-sm text-gray-400 font-medium italic">Red ABK Verificada</span>
                      </div>
                    </div>
                  </div>
                  {isMultiple && (
                    <div className="hidden sm:block">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b-2 border-gray-100 pb-1">Multioferta Institucional</span>
                    </div>
                  )}
                </div>

                <div className={cn(
                  "grid gap-4 sm:gap-6",
                  isMultiple 
                    ? "grid-cols-1" // One behind another as requested
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                )}>
                  {groupShifts.map((shift, idx) => (
                    <div key={shift.id} className={cn(
                      "transition-all duration-300 relative",
                      isMultiple ? "hover:translate-x-1" : "hover:-translate-y-1",
                      isMultiple && idx < groupShifts.length - 1 ? "after:content-[''] after:absolute after:-bottom-4 after:left-1/2 after:-translate-x-1/2 after:w-px after:h-4 after:bg-blue-100 hidden md:after:block" : ""
                    )}>
                      <ShiftCard 
                        shift={shift} 
                        userId={user.id}
                        userRole={user.role as 'doctor' | 'clinic'}
                        userVerificationStatus={user.verification_status}
                        isMyShift={shift.applicants.includes(user.id)}
                        onApply={() => handleApply(shift.id)} 
                        onConfirmApplication={() => handleConfirmApplication(shift.id)}
                        onNegotiate={() => {
                          setNegotiatingShiftId(shift.id);
                          setProposedPrice(shift.price.toString());
                        }}
                        onRefresh={fetchShifts} 
                        onViewProfile={() => fetchProfileData(shift.clinic_id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-32 bg-white rounded-3xl border-2 border-dashed border-gray-100">
          <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <LayoutDashboard className="w-12 h-12 text-gray-300" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">No se encontraron resultados</h3>
          <p className="text-gray-500 mt-2 max-w-sm mx-auto">Probá ajustando los filtros o buscando otros términos.</p>
          <button 
            onClick={() => {
              setSearchTerm('');
              setSelectedZone('Todas');
              setSelectedCategory('Todas');
              setSelectedSpecialty('Todas');
            }}
            className="mt-6 text-blue-600 font-bold hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Modals */}
      {viewedProfileData && (
        <ViewProfileModal user={viewedProfileData} onClose={() => setViewedProfileData(null)} />
      )}

      {negotiatingShiftId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-8 relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setNegotiatingShiftId(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors">
              <XCircle className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Ofertar nuevo precio</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Ingresá el honorario por el cual estarías dispuesto a cubrir esta oportunidad. La institución será notificada de tu propuesta.
            </p>
            
            <div className="mb-8 p-6 bg-blue-50 rounded-2xl border border-blue-100">
              <label className="block text-xs font-bold text-blue-700 uppercase tracking-widest mb-2">Precio propuesto ($ ARS)</label>
              <div className="relative">
                <DollarSign className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 text-blue-600" />
                <input 
                  type="number" 
                  value={proposedPrice}
                  onChange={(e) => setProposedPrice(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 bg-transparent border-b-2 border-blue-200 focus:border-blue-600 outline-none text-3xl font-black text-blue-900 transition-colors" 
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setNegotiatingShiftId(null)}
                className="flex-1 py-4 rounded-2xl font-bold bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all border border-gray-100"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  const price = Number(proposedPrice);
                  if (price > 0) {
                    handleApply(negotiatingShiftId, price);
                  } else {
                    toast.error('Por favor ingresa un precio válido');
                  }
                }}
                className="flex-1 py-4 rounded-2xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                Enviar Oferta
              </button>
            </div>
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
