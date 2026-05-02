import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Location, ClinicStaff } from '../types';
import { 
  Building2, MapPin, Users2, Plus, Settings, Search, 
  ShieldCheck, MessageSquare, UserCircle, MapPinned, 
  PlusCircle, Loader2, Activity, X
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import ViewProfileModal from '../components/ViewProfileModal';

export default function InstitutionalManagement() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'locations' | 'staff'>('locations');
  const [locations, setLocations] = useState<Location[]>([]);
  const [staff, setStaff] = useState<ClinicStaff[]>([]);
  const [viewedProfileData, setViewedProfileData] = useState<User | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        setUser(userData as User);
        fetchLocations(authUser.id);
        fetchStaff(authUser.id);
      }
      setLoading(false);
    };
    getUser();
  }, []);

  const fetchLocations = async (clinicId: string) => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('clinic_id', clinicId);
      if (error) throw error;
      setLocations(data as Location[]);
    } catch (err) {
      console.error('Error fetching locations:', err);
    }
  };

  const fetchStaff = async (clinicId: string) => {
    try {
      const { data, error } = await supabase
        .from('clinic_staff')
        .select('*, doctor:users(*)')
        .eq('clinic_id', clinicId);
      if (error) throw error;
      setStaff(data as ClinicStaff[]);
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  };

  const handleAddLocation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    
    const formData = new FormData(e.currentTarget);
    const newLocation = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      clinic_id: user.id
    };

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('locations').insert(newLocation);
      if (error) throw error;
      toast.success('Sede agregada correctamente');
      setIsLocationModalOpen(false);
      fetchLocations(user.id);
    } catch (err: any) {
      toast.error(err.message || 'Error al agregar sede');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStaff = async (doctorEmail: string) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      // Find doctor by email
      const { data: doctor, error: doctorError } = await supabase
        .from('users')
        .select('id')
        .eq('email', doctorEmail)
        .eq('role', 'doctor')
        .single();

      if (doctorError || !doctor) {
        throw new Error('No se encontró un médico con ese correo electrónico.');
      }

      // Check if already in staff
      const { data: existing } = await supabase
        .from('clinic_staff')
        .select('id')
        .eq('clinic_id', user.id)
        .eq('doctor_id', doctor.id)
        .maybeSingle();

      if (existing) {
        throw new Error('Este profesional ya forma parte de su plantel.');
      }

      const { error } = await supabase.from('clinic_staff').insert({
        clinic_id: user.id,
        doctor_id: doctor.id,
        is_regular: true
      });

      if (error) throw error;
      toast.success('Profesional vinculado al plantel');
      setIsStaffModalOpen(false);
      fetchStaff(user.id);
    } catch (err: any) {
      toast.error(err.message || 'Error al vincular profesional');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchProfileData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      setViewedProfileData(data as User);
    } catch (err) {
      console.error('Error fetching profile:', err);
      toast.error('No se pudo cargar el perfil');
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <Building2 className="w-32 h-32 rotate-12" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white tracking-tight">Gestión Institucional</h1>
          <p className="text-slate-400 mt-1 font-medium italic">Unificando sedes, servicios y plantel profesional.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('locations')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all",
            activeTab === 'locations' ? "bg-white text-slate-900 shadow-sm" : "text-gray-500 hover:bg-white/50"
          )}
        >
          <MapPinned className="w-4 h-4" />
          Multi-sede
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all",
            activeTab === 'staff' ? "bg-white text-slate-900 shadow-sm" : "text-gray-500 hover:bg-white/50"
          )}
        >
          <Users2 className="w-4 h-4" />
          Plantel Médico
        </button>
      </div>

      {activeTab === 'locations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div 
              onClick={() => setIsLocationModalOpen(true)}
              className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-blue-400 hover:bg-blue-50/30 transition-all group cursor-pointer"
            >
                <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Agregar Sede</h3>
                  <p className="text-sm text-slate-500 font-medium">Sumá un nuevo centro o sucursal a la red.</p>
                </div>
            </div>
            
            {locations.length > 0 ? locations.map(loc => (
              <div key={loc.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all space-y-4">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <button className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors">
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">{loc.name}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1 font-medium">
                    <MapPin className="w-3 h-3" />
                    {loc.address}, {loc.city}
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                   <div className="flex-1 bg-green-50 text-green-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                     Operativa
                   </div>
                </div>
              </div>
            )) : (
              <div className="bg-slate-50 p-8 rounded-[2rem] border border-gray-100 flex flex-col items-center justify-center text-center opacity-60">
                 <MapPinned className="w-12 h-12 text-slate-300 mb-2" />
                 <p className="text-slate-500 text-sm font-medium italic">Sede Principal configurada</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="space-y-6">
           <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
               <div className="relative w-full md:w-96">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <input 
                  type="text" 
                  placeholder="Buscar profesional en el plantel..."
                   className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                 />
               </div>
               <button 
                onClick={() => setIsStaffModalOpen(true)}
                className="w-full md:w-auto px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
               >
                 <Plus className="w-4 h-4" />
                 Agregar Profesional
               </button>
             </div>
             
             <div className="divide-y divide-gray-50">
               {staff.length > 0 ? (
                 staff.map(member => (
                   <div key={member.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                     <div className="flex items-center gap-4">
                       <div className="relative">
                         <img 
                          src={member.doctor?.avatar || `https://ui-avatars.com/api/?name=${member.doctor?.name || 'Doctor'}&background=random`} 
                          alt={member.doctor?.name}
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm"
                         />
                         <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-lg flex items-center justify-center">
                            <ShieldCheck className="w-3 h-3 text-white" />
                         </div>
                       </div>
                       <div>
                         <h4 className="font-black text-slate-900 tracking-tight">{member.doctor?.name}</h4>
                         <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{member.service_name || 'Servicio General'}</p>
                       </div>
                     </div>
                     
                     <div className="flex flex-wrap items-center gap-4">
                        <div className="text-center px-4">
                           <p className="text-[10px] text-gray-400 font-bold uppercase">Asistencia</p>
                           <p className="text-sm font-black text-green-600">{member.doctor?.completion_rate || 100}%</p>
                        </div>
                        <div className="text-center px-4 border-l border-gray-100">
                           <p className="text-[10px] text-gray-400 font-bold uppercase">Tipo</p>
                           <p className="text-sm font-black text-blue-600">{member.is_regular ? 'Planta' : 'Reemplazo'}</p>
                        </div>
                        <button className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors">
                          <MessageSquare className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => member.doctor && fetchProfileData(member.doctor.id)}
                          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black text-slate-700 hover:bg-gray-50 transition-all flex items-center gap-2"
                        >
                          <UserCircle className="w-4 h-4" />
                          Perfil
                        </button>
                     </div>
                   </div>
                 ))
               ) : (
                 <div className="p-12 text-center">
                    <Users2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium italic">El plantel está vacío. Agregá tus profesionales de confianza rápidamente.</p>
                 </div>
               )}
             </div>
           </div>
        </div>
      )}

      {viewedProfileData && (
        <ViewProfileModal user={viewedProfileData} onClose={() => setViewedProfileData(null)} />
      )}

      {/* Modals */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-slate-50">
               <div>
                 <h2 className="text-2xl font-black text-slate-900 tracking-tight">Nueva Sede</h2>
                 <p className="text-slate-500 text-xs font-medium">Registrá un nuevo centro o sucursal.</p>
               </div>
               <button onClick={() => setIsLocationModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                 <X className="w-6 h-6 text-slate-400" />
               </button>
            </div>
            <form onSubmit={handleAddLocation} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nombre de la Sede</label>
                <input required name="name" type="text" placeholder="Ej: Sanatorio Central ABK" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Dirección</label>
                <input required name="address" type="text" placeholder="Ej: Av. Callao 1234" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Ciudad</label>
                <input required name="city" type="text" placeholder="Ej: CABA" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
              </div>
              <button 
                disabled={isSubmitting}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlusCircle className="w-5 h-5" />}
                Guardar Sede
              </button>
            </form>
          </div>
        </div>
      )}

      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-slate-50">
               <div>
                 <h2 className="text-2xl font-black text-slate-900 tracking-tight">Vincular Médico</h2>
                 <p className="text-slate-500 text-xs font-medium">Agregá un profesional a tu plantel fijo.</p>
               </div>
               <button onClick={() => setIsStaffModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                 <X className="w-6 h-6 text-slate-400" />
               </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="p-4 bg-blue-50 rounded-2xl flex items-start gap-3">
                 <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                 <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                   Ingresá el correo electrónico con el que el profesional está registrado en la plataforma ABK para enviarle la vinculación.
                 </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Email del Profesional</label>
                <input 
                  id="doctor_email"
                  type="email" 
                  placeholder="doctor@ejemplo.com" 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" 
                />
              </div>
              <button 
                disabled={isSubmitting}
                onClick={() => {
                  const email = (document.getElementById('doctor_email') as HTMLInputElement).value;
                  if (!email) return toast.error('Ingrese un email');
                  handleAddStaff(email);
                }}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users2 className="w-5 h-5" />}
                Vincular al Plantel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
