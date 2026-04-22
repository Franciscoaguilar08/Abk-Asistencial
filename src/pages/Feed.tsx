import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Shift } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ViewProfileModal from '../components/ViewProfileModal';
import ShiftCard from '../components/ShiftCard';
import { 
  Globe, Filter, Search, Building2, BriefcaseMedical, 
  LayoutDashboard, TrendingUp, XCircle, DollarSign,
  ChevronDown, ChevronUp, MapPin, Calendar, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import ChatModal from '../components/ChatModal';

interface FeedProps {
  user: User;
}

// Sub-component for Grouped Clinic Cards
function ClinicGroup({ 
  clinicName, 
  shifts, 
  user,
  onApply,
  onConfirmApplication,
  onNegotiate,
  onRefresh,
  onViewProfile 
}: { 
  clinicName: string, 
  shifts: Shift[], 
  user: User,
  onApply: (id: string) => void,
  onConfirmApplication: (id: string) => void,
  onNegotiate: (id: string, price: number) => void,
  onRefresh: () => void,
  onViewProfile: (id: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const firstShift = shifts[0];

  return (
    <div className={cn(
      "bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col transition-all duration-500 h-fit",
      isExpanded ? "col-span-full shadow-xl shadow-blue-100/20 ring-4 ring-blue-50/50" : ""
    )}>
      {/* Header */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full p-5 flex items-center justify-between transition-colors border-b border-gray-100",
          isExpanded ? "bg-blue-600 text-white" : "bg-gray-50/50 hover:bg-gray-50"
        )}
      >
        <div className="flex items-center gap-3 text-left">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border overflow-hidden shrink-0",
            isExpanded ? "bg-white/20 border-white/20" : "bg-white border-gray-100"
          )}>
            {firstShift.clinic_avatar ? (
              <img src={firstShift.clinic_avatar} alt={clinicName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Building2 className={cn("w-6 h-6", isExpanded ? "text-white" : "text-blue-600")} />
            )}
          </div>
          <div>
            <h3 className={cn("font-bold leading-tight", isExpanded ? "text-white" : "text-gray-900")}>{clinicName}</h3>
            <p className={cn("text-xs font-medium", isExpanded ? "text-blue-100" : "text-gray-500")}>
              {shifts.length} publicaciones activas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider shadow-sm",
            isExpanded ? "bg-white text-blue-600" : "bg-blue-600 text-white shadow-blue-200"
          )}>
            {isExpanded ? 'Cerrar' : 'Ver Galería'}
          </span>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {/* Expanded Gallery of Full Cards */}
      {isExpanded && (
        <div className="p-6 bg-gray-50/30 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {shifts.map((shift) => (
              <div key={shift.id} className="h-full">
                <ShiftCard 
                  shift={shift} 
                  userId={user.id}
                  userRole={user.role as 'doctor' | 'clinic'}
                  userVerificationStatus={user.verification_status}
                  isMyShift={shift.applicants.includes(user.id)}
                  clinicTotalCount={1}
                  onApply={() => onApply(shift.id)} 
                  onConfirmApplication={() => onConfirmApplication(shift.id)}
                  onNegotiate={() => onNegotiate(shift.id, shift.price)}
                  onRefresh={onRefresh} 
                  onViewProfile={() => onViewProfile(shift.clinic_id)}
                />
              </div>
            ))}
          </div>
          
          <div className="mt-8 flex justify-center">
            <button 
              onClick={() => setIsExpanded(false)}
              className="px-8 py-3 bg-white border border-gray-200 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
            >
              Cerrar lista de {clinicName}
            </button>
          </div>
        </div>
      )}

      {/* Collapsed Preview */}
      {!isExpanded && (
        <div className="p-4 bg-white">
          <div className="flex items-center justify-between text-xs text-gray-500 px-3 py-2.5 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setIsExpanded(true)}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="font-medium">Próxima: {format(new Date(firstShift.date), 'EEE d MMM', { locale: es })} • {firstShift.specialty}</span>
            </div>
            <div className="flex items-center gap-1 text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              <span>+ información</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
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

  // Filter logic
  const filteredShifts = shifts.filter(s => {
    const matchesSearch = s.clinic_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesZone = selectedZone === 'Todas' || s.zone === selectedZone;
    const matchesCategory = selectedCategory === 'Todas' || s.category === selectedCategory;
    const matchesSpecialty = selectedSpecialty === 'Todas' || s.specialty === selectedSpecialty;
    
    return matchesSearch && matchesZone && matchesCategory && matchesSpecialty;
  });

  // Calculate counts per clinic for a subtle indicator
  const clinicCounts = filteredShifts.reduce((acc, shift) => {
    const name = shift.clinic_name;
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Sort by clinic name to keep related offers together in the grid
  const sortedShifts = [...filteredShifts].sort((a, b) => a.clinic_name.localeCompare(b.clinic_name));

  // Group by clinic for Option A
  const groupedByClinic = sortedShifts.reduce((acc, shift) => {
    const key = shift.clinic_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(shift);
    return acc;
  }, {} as Record<string, Shift[]>);

  const clinicEntries = Object.entries(groupedByClinic);

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
      <div className="relative overflow-hidden bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-blue-600">
          <Globe className="w-48 h-48" />
        </div>
        <div className="relative z-10 space-y-2">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">Oportunidades de la Red</h1>
          <p className="text-gray-500 max-w-xl text-lg font-medium leading-relaxed">
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

      {/* Feed Content - Grouped/Flat Hybrid Grid */}
      {clinicEntries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12 items-start">
          {clinicEntries.map(([clinicName, clinicShifts]) => {
            // Case 1: More than 3 shifts -> Use the Grouped Card (as requested)
            if (clinicShifts.length > 3) {
              return (
                <div key={clinicName} className="animate-in fade-in slide-in-from-bottom-4 duration-300 col-span-1 md:col-span-1 lg:col-span-1 has-[.col-span-full]:col-span-full transition-all">
                  <ClinicGroup 
                    clinicName={clinicName}
                    shifts={clinicShifts}
                    user={user}
                    onApply={handleApply}
                    onConfirmApplication={handleConfirmApplication}
                    onNegotiate={(id, price) => {
                      setNegotiatingShiftId(id);
                      setProposedPrice(price.toString());
                    }}
                    onRefresh={fetchShifts}
                    onViewProfile={fetchProfileData}
                  />
                </div>
              );
            }

            // Case 2: 3 or fewer shifts -> Show them as individual ShiftCards in the main grid
            return clinicShifts.map(shift => (
              <div key={shift.id} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <ShiftCard 
                  shift={shift} 
                  userId={user.id}
                  userRole={user.role as 'doctor' | 'clinic'}
                  userVerificationStatus={user.verification_status}
                  isMyShift={shift.applicants.includes(user.id)}
                  clinicTotalCount={clinicShifts.length}
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
            ));
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
